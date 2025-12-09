/**
 * Subtitle Parser Utilities
 * 
 * Parses SRT, VTT, and TXT subtitle formats into a common structure
 * that can be used for both Spotify-like lyrics display and video subtitles.
 */

/**
 * Subtitle cue structure:
 * {
 *   id: string | number,
 *   startTime: number (in seconds),
 *   endTime: number (in seconds),
 *   text: string
 * }
 */

/**
 * Parse time string to seconds
 * Supports formats: "00:00:00,000", "00:00:00.000", "00:00.000"
 */
export function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  
  // Normalize separator (both comma and period are valid)
  const normalized = timeStr.trim().replace(',', '.');
  
  const parts = normalized.split(':');
  
  if (parts.length === 3) {
    // HH:MM:SS.mmm format
    const [hours, minutes, secondsAndMs] = parts;
    const [seconds, ms = '0'] = secondsAndMs.split('.');
    return (
      parseInt(hours, 10) * 3600 +
      parseInt(minutes, 10) * 60 +
      parseInt(seconds, 10) +
      parseInt(ms.padEnd(3, '0').slice(0, 3), 10) / 1000
    );
  } else if (parts.length === 2) {
    // MM:SS.mmm format
    const [minutes, secondsAndMs] = parts;
    const [seconds, ms = '0'] = secondsAndMs.split('.');
    return (
      parseInt(minutes, 10) * 60 +
      parseInt(seconds, 10) +
      parseInt(ms.padEnd(3, '0').slice(0, 3), 10) / 1000
    );
  }
  
  return 0;
}

/**
 * Format seconds to display time (MM:SS)
 */
export function formatSecondsToDisplay(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse SRT subtitle format
 * SRT format example:
 * 1
 * 00:00:01,000 --> 00:00:04,000
 * First subtitle text
 * 
 * 2
 * 00:00:05,000 --> 00:00:08,000
 * Second subtitle text
 */
export function parseSRT(content) {
  if (!content) return [];
  
  const cues = [];
  const blocks = content.trim().split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    
    if (lines.length < 2) continue;
    
    // Find the timing line (contains "-->")
    let timingLineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timingLineIndex = i;
        break;
      }
    }
    
    const timingLine = lines[timingLineIndex];
    const timingMatch = timingLine.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
    
    if (!timingMatch) continue;
    
    const startTime = parseTimeToSeconds(timingMatch[1]);
    const endTime = parseTimeToSeconds(timingMatch[2]);
    
    // Get the ID (line before timing) or generate one
    const id = timingLineIndex > 0 ? lines[timingLineIndex - 1].trim() : cues.length + 1;
    
    // Get text (all lines after timing)
    const textLines = lines.slice(timingLineIndex + 1);
    const text = textLines
      .join('\n')
      .replace(/<[^>]+>/g, '') // Remove HTML tags like <i>, <b>
      .trim();
    
    if (text) {
      cues.push({
        id,
        startTime,
        endTime,
        text
      });
    }
  }
  
  return cues;
}

/**
 * Parse VTT (WebVTT) subtitle format
 * VTT format example:
 * WEBVTT
 * 
 * 00:00:01.000 --> 00:00:04.000
 * First subtitle text
 * 
 * 00:00:05.000 --> 00:00:08.000
 * Second subtitle text
 */
export function parseVTT(content) {
  if (!content) return [];
  
  const cues = [];
  
  // Remove WEBVTT header and split into blocks
  let vttContent = content.replace(/^WEBVTT.*?(\n\n|\r\n\r\n)/s, '');
  
  // Handle optional NOTE blocks and STYLE blocks
  vttContent = vttContent.replace(/NOTE[^\n]*\n([^\n]*\n)*\n/g, '');
  vttContent = vttContent.replace(/STYLE[^\n]*\n([^\n]*\n)*\n/g, '');
  
  const blocks = vttContent.trim().split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    
    if (lines.length < 1) continue;
    
    // Find the timing line
    let timingLineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timingLineIndex = i;
        break;
      }
    }
    
    const timingLine = lines[timingLineIndex];
    // VTT can have simpler timing format without hours
    const timingMatch = timingLine.match(/(\d{1,2}:)?(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}:\d{2}\.\d{3})/);
    
    if (!timingMatch) continue;
    
    const startTimeStr = (timingMatch[1] || '') + timingMatch[2];
    const endTimeStr = (timingMatch[3] || '') + timingMatch[4];
    
    const startTime = parseTimeToSeconds(startTimeStr);
    const endTime = parseTimeToSeconds(endTimeStr);
    
    // Get ID (optional line before timing) or generate one
    const id = timingLineIndex > 0 ? lines[timingLineIndex - 1].trim() : cues.length + 1;
    
    // Get text (all lines after timing)
    const textLines = lines.slice(timingLineIndex + 1);
    const text = textLines
      .join('\n')
      .replace(/<[^>]+>/g, '') // Remove HTML tags and VTT cue settings
      .replace(/<\/[^>]+>/g, '')
      .trim();
    
    if (text) {
      cues.push({
        id,
        startTime,
        endTime,
        text
      });
    }
  }
  
  return cues;
}

/**
 * Parse plain text lyrics (no timing)
 * Returns each line as a separate cue without timing info
 */
export function parseTXT(content) {
  if (!content) return [];
  
  const lines = content.trim().split('\n');
  const cues = [];
  
  lines.forEach((line, index) => {
    const text = line.trim();
    if (text) {
      cues.push({
        id: index + 1,
        startTime: null, // No timing for plain text
        endTime: null,
        text
      });
    }
  });
  
  return cues;
}

/**
 * Auto-detect format and parse subtitles
 */
export function parseSubtitles(content, format = null) {
  if (!content) return { cues: [], format: 'unknown', hasTimestamps: false };
  
  // Auto-detect format if not specified
  let detectedFormat = format?.toLowerCase();
  
  if (!detectedFormat) {
    if (content.trim().startsWith('WEBVTT')) {
      detectedFormat = 'vtt';
    } else if (content.match(/^\d+\s*\n\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->/m)) {
      detectedFormat = 'srt';
    } else if (content.includes('-->')) {
      // Could be VTT without header or SRT
      detectedFormat = content.includes(',') ? 'srt' : 'vtt';
    } else {
      detectedFormat = 'txt';
    }
  }
  
  let cues = [];
  
  switch (detectedFormat) {
    case 'srt':
      cues = parseSRT(content);
      break;
    case 'vtt':
      cues = parseVTT(content);
      break;
    case 'txt':
    default:
      cues = parseTXT(content);
      detectedFormat = 'txt';
      break;
  }
  
  const hasTimestamps = cues.length > 0 && cues[0].startTime !== null;
  
  return {
    cues,
    format: detectedFormat,
    hasTimestamps
  };
}

/**
 * Find the current active cue based on playback time
 * Returns the cue that should be highlighted (either currently playing or most recently played)
 */
export function findActiveCue(cues, currentTime) {
  if (!cues || cues.length === 0 || currentTime === null || currentTime === undefined) {
    return null;
  }
  
  let lastPassedIndex = -1;
  
  // Find the cue that is currently active OR the last one we passed
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    
    if (cue.startTime === null) continue;
    
    // If we're within this cue's time range, it's active
    if (cue.endTime !== null && currentTime >= cue.startTime && currentTime <= cue.endTime) {
      return { cue, index: i };
    }
    
    // If we've passed this cue's start time, remember it
    if (currentTime >= cue.startTime) {
      lastPassedIndex = i;
    }
    
    // If the current cue starts after current time, we've gone too far
    if (currentTime < cue.startTime) {
      break;
    }
  }
  
  // Return the last cue we passed (most recent lyric)
  if (lastPassedIndex >= 0) {
    return { cue: cues[lastPassedIndex], index: lastPassedIndex };
  }
  
  return null;
}

/**
 * Get cues around the current cue for context display
 */
export function getSurroundingCues(cues, currentIndex, before = 3, after = 3) {
  if (!cues || cues.length === 0 || currentIndex === null) {
    return { before: [], current: null, after: [] };
  }
  
  const safeIndex = Math.max(0, Math.min(currentIndex, cues.length - 1));
  
  return {
    before: cues.slice(Math.max(0, safeIndex - before), safeIndex),
    current: cues[safeIndex],
    after: cues.slice(safeIndex + 1, safeIndex + 1 + after)
  };
}

export default {
  parseTimeToSeconds,
  formatSecondsToDisplay,
  parseSRT,
  parseVTT,
  parseTXT,
  parseSubtitles,
  findActiveCue,
  getSurroundingCues
};
