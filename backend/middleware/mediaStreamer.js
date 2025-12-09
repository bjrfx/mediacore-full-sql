/**
 * Media Streaming Middleware
 * 
 * Provides HTTP Range request support for audio/video streaming.
 * This is essential for mobile playback where players need to:
 * - Start playback before full download
 * - Seek to different positions
 * - Resume interrupted downloads
 */

const fs = require('fs');
const path = require('path');

// MIME types for media files
const MIME_TYPES = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/**
 * Stream media file with Range request support
 */
const streamMedia = (req, res, filePath) => {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: 'Media file not found'
    });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  // Get range header
  const range = req.headers.range;

  if (range) {
    // Parse Range header (e.g., "bytes=0-1023")
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // Validate range
    if (start >= fileSize || end >= fileSize) {
      res.status(416).set({
        'Content-Range': `bytes */${fileSize}`
      });
      return res.end();
    }

    const chunkSize = (end - start) + 1;

    // Create read stream for the requested range
    const stream = fs.createReadStream(filePath, { start, end });

    // Send partial content response
    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length'
    });

    // Pipe the stream to response
    stream.pipe(res);

    // Handle stream errors
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Stream Error',
          message: 'Failed to stream media file'
        });
      }
    });

  } else {
    // No range requested - send entire file
    // For mobile, this should rarely happen as players use Range requests
    res.set({
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Stream Error',
          message: 'Failed to stream media file'
        });
      }
    });
  }
};

/**
 * Express middleware for streaming media from /stream/:type/:filename
 */
const mediaStreamMiddleware = (uploadsDir) => {
  return (req, res, next) => {
    const { type, filename } = req.params;
    
    // Validate type
    if (!['audio', 'video', 'journal'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid media type'
      });
    }

    // Security: Prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(uploadsDir, type, sanitizedFilename);

    // Ensure file is within uploads directory
    if (!filePath.startsWith(path.resolve(uploadsDir))) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Invalid file path'
      });
    }

    streamMedia(req, res, filePath);
  };
};

/**
 * Create streaming routes for the app
 */
const createStreamingRoutes = (app, uploadsDir) => {
  const baseUploadsDir = uploadsDir || path.join(__dirname, '..', 'public', 'uploads');

  // Stream endpoint: /stream/audio/filename.mp3 or /stream/video/filename.mp4
  app.get('/stream/:type/:filename', mediaStreamMiddleware(baseUploadsDir));

  // Also handle /uploads path with Range support (override static)
  app.get('/uploads/:type/:filename', (req, res, next) => {
    const { type, filename } = req.params;
    
    // Only handle media types
    if (!['audio', 'video', 'journal'].includes(type)) {
      return next(); // Let static middleware handle it
    }

    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(baseUploadsDir, type, sanitizedFilename);

    // Check if Range header present - use streaming
    if (req.headers.range) {
      streamMedia(req, res, filePath);
    } else {
      // For non-range requests, still add Accept-Ranges header
      // but let the file be served normally with caching
      res.set({
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Accept-Ranges'
      });
      next();
    }
  });

  console.log('📺 Media streaming routes configured with Range support');
};

module.exports = {
  streamMedia,
  mediaStreamMiddleware,
  createStreamingRoutes
};
