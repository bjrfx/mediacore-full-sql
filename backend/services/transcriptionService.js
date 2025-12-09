/**
 * Transcription Service
 * 
 * Generates subtitles from audio/video files using audio analysis.
 * Uses fluent-ffmpeg for audio extraction and simple word detection.
 * 
 * For full offline STT, you would need Vosk with native bindings on a VPS.
 * This version provides a simpler approach that works on shared hosting.
 */

const path = require('path');
const fs = require('fs').promises;
const { existsSync, createReadStream, createWriteStream } = require('fs');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

// Configuration
const SUBTITLES_DIR = path.join(__dirname, '..', 'public', 'subtitles');
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE_PATH = process.env.FFPROBE_PATH || 'ffprobe';

// Ensure directories exist
async function ensureDirectories() {
  try {
    if (!existsSync(SUBTITLES_DIR)) {
      await fs.mkdir(SUBTITLES_DIR, { recursive: true });
    }
    if (!existsSync(TEMP_DIR)) {
      await fs.mkdir(TEMP_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('[Transcription] Error creating directories:', error);
  }
}

ensureDirectories();

/**
 * Get media duration using ffprobe
 */
async function getMediaDuration(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ];

    const ffprobe = spawn(FFPROBE_PATH, args);
    let output = '';
    let error = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      error += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(duration);
      } else {
        reject(new Error(`ffprobe error: ${error}`));
      }
    });

    ffprobe.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Detect silence/speech segments in audio using ffmpeg
 * Returns timestamps of speech segments
 */
async function detectSpeechSegments(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', filePath,
      '-af', 'silencedetect=noise=-30dB:d=0.5',
      '-f', 'null',
      '-'
    ];

    const ffmpeg = spawn(FFMPEG_PATH, args);
    let output = '';

    ffmpeg.stderr.on('data', (data) => {
      output += data.toString();
    });

    ffmpeg.on('close', (code) => {
      // Parse silence detection output
      const silenceStarts = [];
      const silenceEnds = [];
      
      const startRegex = /silence_start: ([\d.]+)/g;
      const endRegex = /silence_end: ([\d.]+)/g;
      
      let match;
      while ((match = startRegex.exec(output)) !== null) {
        silenceStarts.push(parseFloat(match[1]));
      }
      while ((match = endRegex.exec(output)) !== null) {
        silenceEnds.push(parseFloat(match[1]));
      }
      
      resolve({ silenceStarts, silenceEnds });
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Generate placeholder subtitle segments based on audio analysis
 * Creates timed segments that can be edited later
 */
async function generateSubtitleSegments(filePath, duration) {
  try {
    // Detect speech segments
    const { silenceStarts, silenceEnds } = await detectSpeechSegments(filePath);
    
    const segments = [];
    let segmentIndex = 1;
    
    if (silenceStarts.length === 0 && silenceEnds.length === 0) {
      // No silence detected, create segments every 4 seconds
      const segmentDuration = 4;
      for (let start = 0; start < duration; start += segmentDuration) {
        const end = Math.min(start + segmentDuration, duration);
        segments.push({
          index: segmentIndex++,
          start: start,
          end: end,
          text: `[Segment ${segmentIndex - 1}]` // Placeholder text
        });
      }
    } else {
      // Build speech segments from silence gaps
      let currentPos = 0;
      
      // Handle speech before first silence
      if (silenceStarts.length > 0 && silenceStarts[0] > 0.5) {
        segments.push({
          index: segmentIndex++,
          start: 0,
          end: silenceStarts[0],
          text: `[Segment ${segmentIndex - 1}]`
        });
      }
      
      // Handle gaps between silence periods (speech segments)
      for (let i = 0; i < silenceEnds.length; i++) {
        const speechStart = silenceEnds[i];
        const speechEnd = i + 1 < silenceStarts.length ? silenceStarts[i + 1] : duration;
        
        if (speechEnd - speechStart > 0.5) { // At least 0.5 seconds of speech
          segments.push({
            index: segmentIndex++,
            start: speechStart,
            end: speechEnd,
            text: `[Segment ${segmentIndex - 1}]`
          });
        }
      }
    }
    
    // Limit segments to reasonable length (max 6 seconds each)
    const refinedSegments = [];
    let idx = 1;
    for (const seg of segments) {
      const segDuration = seg.end - seg.start;
      if (segDuration > 6) {
        // Split into smaller segments
        let start = seg.start;
        while (start < seg.end) {
          const end = Math.min(start + 4, seg.end);
          refinedSegments.push({
            index: idx++,
            start: start,
            end: end,
            text: `[Line ${idx - 1}]`
          });
          start = end;
        }
      } else {
        refinedSegments.push({
          ...seg,
          index: idx++,
          text: `[Line ${idx - 1}]`
        });
      }
    }
    
    return refinedSegments;
  } catch (error) {
    console.error('[Transcription] Error detecting speech:', error);
    // Fallback: create segments every 4 seconds
    const segments = [];
    const segmentDuration = 4;
    let idx = 1;
    for (let start = 0; start < duration; start += segmentDuration) {
      const end = Math.min(start + segmentDuration, duration);
      segments.push({
        index: idx++,
        start: start,
        end: end,
        text: `[Line ${idx - 1}]`
      });
    }
    return segments;
  }
}

/**
 * Format time for SRT (HH:MM:SS,mmm)
 */
function formatSrtTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
}

/**
 * Format time for VTT (HH:MM:SS.mmm)
 */
function formatVttTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

/**
 * Generate SRT content from segments
 */
function generateSrt(segments) {
  return segments.map(seg => 
    `${seg.index}\n${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n${seg.text}\n`
  ).join('\n');
}

/**
 * Generate VTT content from segments
 */
function generateVtt(segments) {
  const header = 'WEBVTT\n\n';
  const cues = segments.map(seg => 
    `${formatVttTime(seg.start)} --> ${formatVttTime(seg.end)}\n${seg.text}\n`
  ).join('\n');
  return header + cues;
}

/**
 * Generate JSON format for Spotify-like lyrics display
 */
function generateLyricsJson(segments) {
  return segments.map(seg => ({
    startTime: seg.start,
    endTime: seg.end,
    text: seg.text,
    words: seg.text.split(' ').map((word, i, arr) => ({
      word: word,
      startTime: seg.start + (i / arr.length) * (seg.end - seg.start),
      endTime: seg.start + ((i + 1) / arr.length) * (seg.end - seg.start)
    }))
  }));
}

/**
 * Process media file and generate subtitles
 * 
 * @param {string} mediaId - Media ID from database
 * @param {string} filePath - Path to the media file
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Subtitle data
 */
async function processMedia(mediaId, filePath, options = {}) {
  const startTime = Date.now();
  
  try {
    console.log(`[Transcription] Processing media: ${mediaId}`);
    console.log(`[Transcription] File path: ${filePath}`);
    
    // Check if file exists
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Get media duration
    const duration = await getMediaDuration(filePath);
    console.log(`[Transcription] Media duration: ${duration} seconds`);
    
    // Generate subtitle segments based on audio analysis
    const segments = await generateSubtitleSegments(filePath, duration);
    console.log(`[Transcription] Generated ${segments.length} segments`);
    
    // Generate subtitle files
    const subtitleId = uuidv4();
    const srtPath = path.join(SUBTITLES_DIR, `${mediaId}.srt`);
    const vttPath = path.join(SUBTITLES_DIR, `${mediaId}.vtt`);
    const jsonPath = path.join(SUBTITLES_DIR, `${mediaId}.json`);
    
    const srtContent = generateSrt(segments);
    const vttContent = generateVtt(segments);
    const jsonContent = generateLyricsJson(segments);
    
    // Write files
    await fs.writeFile(srtPath, srtContent, 'utf8');
    await fs.writeFile(vttPath, vttContent, 'utf8');
    await fs.writeFile(jsonPath, JSON.stringify(jsonContent, null, 2), 'utf8');
    
    const processingTime = (Date.now() - startTime) / 1000;
    
    console.log(`[Transcription] Completed in ${processingTime}s`);
    
    return {
      success: true,
      subtitleId: subtitleId,
      mediaId: mediaId,
      lineCount: segments.length,
      duration: duration,
      srtPath: `/subtitles/${mediaId}.srt`,
      vttPath: `/subtitles/${mediaId}.vtt`,
      jsonPath: `/subtitles/${mediaId}.json`,
      textJson: jsonContent,
      processingTime: processingTime
    };
    
  } catch (error) {
    console.error(`[Transcription] Error processing media: ${error.message}`);
    return {
      success: false,
      error: error.message,
      mediaId: mediaId
    };
  }
}

/**
 * Update subtitle text for a specific line
 * 
 * @param {string} mediaId - Media ID
 * @param {number} lineIndex - Line index to update
 * @param {string} newText - New text for the line
 * @returns {Promise<Object>} - Updated subtitle data
 */
async function updateSubtitleLine(mediaId, lineIndex, newText) {
  try {
    const jsonPath = path.join(SUBTITLES_DIR, `${mediaId}.json`);
    
    if (!existsSync(jsonPath)) {
      throw new Error('Subtitles not found');
    }
    
    const content = await fs.readFile(jsonPath, 'utf8');
    const subtitles = JSON.parse(content);
    
    if (lineIndex < 0 || lineIndex >= subtitles.length) {
      throw new Error('Invalid line index');
    }
    
    // Update the line
    subtitles[lineIndex].text = newText;
    subtitles[lineIndex].words = newText.split(' ').map((word, i, arr) => ({
      word: word,
      startTime: subtitles[lineIndex].startTime + (i / arr.length) * (subtitles[lineIndex].endTime - subtitles[lineIndex].startTime),
      endTime: subtitles[lineIndex].startTime + ((i + 1) / arr.length) * (subtitles[lineIndex].endTime - subtitles[lineIndex].startTime)
    }));
    
    // Regenerate all formats
    const segments = subtitles.map((sub, idx) => ({
      index: idx + 1,
      start: sub.startTime,
      end: sub.endTime,
      text: sub.text
    }));
    
    const srtPath = path.join(SUBTITLES_DIR, `${mediaId}.srt`);
    const vttPath = path.join(SUBTITLES_DIR, `${mediaId}.vtt`);
    
    await fs.writeFile(srtPath, generateSrt(segments), 'utf8');
    await fs.writeFile(vttPath, generateVtt(segments), 'utf8');
    await fs.writeFile(jsonPath, JSON.stringify(subtitles, null, 2), 'utf8');
    
    return {
      success: true,
      subtitles: subtitles
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get subtitles for a media file
 * 
 * @param {string} mediaId - Media ID
 * @param {string} format - Format: 'json', 'srt', 'vtt'
 * @returns {Promise<Object>} - Subtitle data
 */
async function getSubtitles(mediaId, format = 'json') {
  try {
    const filePath = path.join(SUBTITLES_DIR, `${mediaId}.${format}`);
    
    if (!existsSync(filePath)) {
      return {
        success: false,
        error: 'Subtitles not found'
      };
    }
    
    const content = await fs.readFile(filePath, 'utf8');
    
    if (format === 'json') {
      return {
        success: true,
        data: JSON.parse(content)
      };
    } else {
      return {
        success: true,
        data: content
      };
    }
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete subtitles for a media file
 * 
 * @param {string} mediaId - Media ID
 * @returns {Promise<Object>} - Result
 */
async function deleteSubtitles(mediaId) {
  try {
    const formats = ['srt', 'vtt', 'json'];
    
    for (const format of formats) {
      const filePath = path.join(SUBTITLES_DIR, `${mediaId}.${format}`);
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
      }
    }
    
    return { success: true };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Import subtitles from SRT/VTT file
 * 
 * @param {string} mediaId - Media ID
 * @param {string} content - SRT or VTT content
 * @param {string} format - 'srt' or 'vtt'
 * @returns {Promise<Object>} - Result
 */
async function importSubtitles(mediaId, content, format) {
  try {
    let segments = [];
    
    if (format === 'srt') {
      // Parse SRT
      const blocks = content.trim().split(/\n\n+/);
      for (const block of blocks) {
        const lines = block.split('\n');
        if (lines.length >= 3) {
          const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
          if (timeMatch) {
            const startTime = parseSrtTime(timeMatch[1]);
            const endTime = parseSrtTime(timeMatch[2]);
            const text = lines.slice(2).join(' ');
            segments.push({
              startTime,
              endTime,
              text,
              words: text.split(' ').map((word, i, arr) => ({
                word,
                startTime: startTime + (i / arr.length) * (endTime - startTime),
                endTime: startTime + ((i + 1) / arr.length) * (endTime - startTime)
              }))
            });
          }
        }
      }
    } else if (format === 'vtt') {
      // Parse VTT
      const lines = content.split('\n');
      let i = 0;
      // Skip header
      while (i < lines.length && !lines[i].includes('-->')) i++;
      
      while (i < lines.length) {
        const timeMatch = lines[i].match(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/);
        if (timeMatch) {
          const startTime = parseVttTime(timeMatch[1]);
          const endTime = parseVttTime(timeMatch[2]);
          i++;
          let text = '';
          while (i < lines.length && lines[i].trim() && !lines[i].includes('-->')) {
            text += (text ? ' ' : '') + lines[i].trim();
            i++;
          }
          if (text) {
            segments.push({
              startTime,
              endTime,
              text,
              words: text.split(' ').map((word, j, arr) => ({
                word,
                startTime: startTime + (j / arr.length) * (endTime - startTime),
                endTime: startTime + ((j + 1) / arr.length) * (endTime - startTime)
              }))
            });
          }
        } else {
          i++;
        }
      }
    }
    
    if (segments.length === 0) {
      throw new Error('No valid subtitles found in file');
    }
    
    // Save all formats
    const srtSegments = segments.map((seg, idx) => ({
      index: idx + 1,
      start: seg.startTime,
      end: seg.endTime,
      text: seg.text
    }));
    
    const srtPath = path.join(SUBTITLES_DIR, `${mediaId}.srt`);
    const vttPath = path.join(SUBTITLES_DIR, `${mediaId}.vtt`);
    const jsonPath = path.join(SUBTITLES_DIR, `${mediaId}.json`);
    
    await fs.writeFile(srtPath, generateSrt(srtSegments), 'utf8');
    await fs.writeFile(vttPath, generateVtt(srtSegments), 'utf8');
    await fs.writeFile(jsonPath, JSON.stringify(segments, null, 2), 'utf8');
    
    return {
      success: true,
      lineCount: segments.length,
      subtitles: segments
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function parseSrtTime(timeStr) {
  const [time, millis] = timeStr.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(millis) / 1000;
}

function parseVttTime(timeStr) {
  const [time, millis] = timeStr.split('.');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(millis) / 1000;
}

module.exports = {
  processMedia,
  getSubtitles,
  updateSubtitleLine,
  deleteSubtitles,
  importSubtitles,
  SUBTITLES_DIR
};
