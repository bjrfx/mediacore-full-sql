/**
 * Speech-to-Text Service Integration
 * 
 * Calls the Python Vosk STT backend to generate subtitles
 */

// STT Service configuration
const STT_SERVICE_URL = process.env.STT_SERVICE_URL || 'https://mediacoreapi-sql.masakalirestrobar.ca/stt';
const STT_API_KEY = process.env.STT_API_KEY || '';

/**
 * Request subtitle generation for a media file
 * 
 * @param {string} mediaId - The media ID from the database
 * @param {string} fileUrl - The URL to the media file
 * @param {string} language - Language code (default: 'en')
 * @returns {Promise<Object>} - Subtitle generation result
 */
async function requestTranscription(mediaId, fileUrl, language = 'en') {
  try {
    console.log(`[STT] Requesting transcription for media: ${mediaId}`);
    console.log(`[STT] File URL: ${fileUrl}`);
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add API key if configured
    if (STT_API_KEY) {
      headers['X-API-Key'] = STT_API_KEY;
    }
    
    const response = await fetch(`${STT_SERVICE_URL}/api/transcribe-url`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        file_url: fileUrl,
        media_id: mediaId,
        language: language
      }),
      // Long timeout for processing
      signal: AbortSignal.timeout(600000) // 10 minutes
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`[STT] Transcription successful for ${mediaId}`);
      console.log(`[STT] Generated ${result.data?.line_count || 0} subtitle lines`);
      return {
        success: true,
        subtitleId: result.data.subtitle_id,
        subtitlePath: result.data.subtitle_path,
        vttPath: result.data.vtt_path,
        textJson: result.data.text_json,
        lineCount: result.data.line_count,
        processingTime: result.data.processing_time
      };
    } else {
      console.error(`[STT] Transcription failed: ${result.message}`);
      return {
        success: false,
        error: result.error || 'Transcription failed',
        message: result.message
      };
    }
    
  } catch (error) {
    console.error(`[STT] Error requesting transcription: ${error.message}`);
    return {
      success: false,
      error: 'Service Error',
      message: error.message
    };
  }
}

/**
 * Get subtitles for a media file
 * 
 * @param {string} mediaId - The media ID
 * @returns {Promise<Object>} - Subtitle data
 */
async function getSubtitles(mediaId) {
  try {
    const headers = {};
    if (STT_API_KEY) {
      headers['X-API-Key'] = STT_API_KEY;
    }
    
    const response = await fetch(`${STT_SERVICE_URL}/api/subtitles/${mediaId}`, {
      headers
    });
    
    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    } else {
      return {
        success: false,
        error: result.error,
        message: result.message
      };
    }
    
  } catch (error) {
    console.error(`[STT] Error fetching subtitles: ${error.message}`);
    return {
      success: false,
      error: 'Service Error',
      message: error.message
    };
  }
}

/**
 * Check STT service health
 * 
 * @returns {Promise<Object>} - Health status
 */
async function checkHealth() {
  try {
    const response = await fetch(`${STT_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000)
    });
    
    const result = await response.json();
    return {
      available: result.success,
      status: result.status
    };
    
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
}

module.exports = {
  requestTranscription,
  getSubtitles,
  checkHealth,
  STT_SERVICE_URL
};
