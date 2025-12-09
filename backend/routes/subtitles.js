/**
 * Subtitle Routes
 * 
 * Handles subtitle generation, retrieval, and management
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { query } = require('../config/db');
const checkAuth = require('../middleware/checkAuth');
const checkAdminAuth = require('../middleware/checkAdminAuth');
const transcriptionService = require('../services/transcriptionService');

// Configure multer for subtitle file uploads
const subtitleUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.srt', '.vtt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .srt and .vtt files are allowed'));
    }
  }
});

// Base upload path
const UPLOAD_BASE_PATH = process.env.UPLOAD_PATH || path.join(__dirname, '..', 'public');

/**
 * GET /api/subtitles/:mediaId
 * Get subtitles for a media file (public)
 */
router.get('/:mediaId', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const format = req.query.format || 'json';
    
    // Check if media exists and has subtitles
    const [media] = await query(
      'SELECT id, title, has_subtitles, subtitle_status FROM media WHERE id = ?',
      [mediaId]
    );
    
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found'
      });
    }
    
    if (!media.has_subtitles) {
      return res.status(404).json({
        success: false,
        error: 'No subtitles available for this media'
      });
    }
    
    // Get subtitles
    const result = await transcriptionService.getSubtitles(mediaId, format);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    // Set appropriate content type
    if (format === 'vtt') {
      res.set('Content-Type', 'text/vtt');
      return res.send(result.data);
    } else if (format === 'srt') {
      res.set('Content-Type', 'text/plain');
      return res.send(result.data);
    }
    
    res.json({
      success: true,
      mediaId: mediaId,
      title: media.title,
      subtitles: result.data
    });
    
  } catch (error) {
    console.error('[Subtitles] Error getting subtitles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subtitles'
    });
  }
});

/**
 * GET /api/subtitles/:mediaId/status
 * Get subtitle generation status
 */
router.get('/:mediaId/status', async (req, res) => {
  try {
    const { mediaId } = req.params;
    
    const [media] = await query(
      'SELECT id, title, has_subtitles, subtitle_status, subtitle_id FROM media WHERE id = ?',
      [mediaId]
    );
    
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found'
      });
    }
    
    res.json({
      success: true,
      mediaId: mediaId,
      hasSubtitles: !!media.has_subtitles,
      status: media.subtitle_status || 'none',
      subtitleId: media.subtitle_id
    });
    
  } catch (error) {
    console.error('[Subtitles] Error getting status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subtitle status'
    });
  }
});

/**
 * POST /api/subtitles/:mediaId/process
 * Process media file to generate subtitles (Admin only)
 */
router.post('/:mediaId/process', checkAdminAuth, async (req, res) => {
  try {
    const { mediaId } = req.params;
    
    // Get media info
    const [media] = await query(
      'SELECT id, title, type, file_path FROM media WHERE id = ?',
      [mediaId]
    );
    
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found'
      });
    }
    
    if (!['audio', 'video'].includes(media.type)) {
      return res.status(400).json({
        success: false,
        error: 'Only audio and video files can have subtitles'
      });
    }
    
    // Update status to processing
    await query(
      'UPDATE media SET subtitle_status = ? WHERE id = ?',
      ['processing', mediaId]
    );
    
    // Get file path
    const filePath = path.join(UPLOAD_BASE_PATH, media.file_path);
    
    // Process asynchronously
    transcriptionService.processMedia(mediaId, filePath)
      .then(async (result) => {
        if (result.success) {
          await query(
            `UPDATE media SET 
              has_subtitles = 1,
              subtitle_status = 'completed',
              subtitle_id = ?
            WHERE id = ?`,
            [result.subtitleId, mediaId]
          );
          console.log(`[Subtitles] Processing completed for ${mediaId}`);
        } else {
          await query(
            `UPDATE media SET subtitle_status = 'failed' WHERE id = ?`,
            [mediaId]
          );
          console.error(`[Subtitles] Processing failed for ${mediaId}:`, result.error);
        }
      })
      .catch(async (error) => {
        await query(
          `UPDATE media SET subtitle_status = 'failed' WHERE id = ?`,
          [mediaId]
        );
        console.error(`[Subtitles] Processing error for ${mediaId}:`, error);
      });
    
    res.json({
      success: true,
      message: 'Subtitle processing started',
      mediaId: mediaId,
      status: 'processing'
    });
    
  } catch (error) {
    console.error('[Subtitles] Error starting processing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start subtitle processing'
    });
  }
});

/**
 * POST /api/subtitles/:mediaId/import
 * Import subtitles from SRT/VTT file (Admin only)
 */
router.post('/:mediaId/import', checkAdminAuth, subtitleUpload.single('subtitle'), async (req, res) => {
  try {
    const { mediaId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No subtitle file provided'
      });
    }
    
    // Get media info
    const [media] = await query(
      'SELECT id, title FROM media WHERE id = ?',
      [mediaId]
    );
    
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found'
      });
    }
    
    // Determine format
    const ext = path.extname(req.file.originalname).toLowerCase();
    const format = ext === '.srt' ? 'srt' : 'vtt';
    const content = req.file.buffer.toString('utf8');
    
    // Import subtitles
    const result = await transcriptionService.importSubtitles(mediaId, content, format);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Update database
    await query(
      `UPDATE media SET 
        has_subtitles = 1,
        subtitle_status = 'completed'
      WHERE id = ?`,
      [mediaId]
    );
    
    res.json({
      success: true,
      message: 'Subtitles imported successfully',
      mediaId: mediaId,
      lineCount: result.lineCount
    });
    
  } catch (error) {
    console.error('[Subtitles] Error importing subtitles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import subtitles'
    });
  }
});

/**
 * PUT /api/subtitles/:mediaId/line/:lineIndex
 * Update a specific subtitle line (Admin only)
 */
router.put('/:mediaId/line/:lineIndex', checkAdminAuth, async (req, res) => {
  try {
    const { mediaId, lineIndex } = req.params;
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }
    
    const result = await transcriptionService.updateSubtitleLine(
      mediaId,
      parseInt(lineIndex),
      text
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      message: 'Subtitle line updated',
      subtitles: result.subtitles
    });
    
  } catch (error) {
    console.error('[Subtitles] Error updating line:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subtitle line'
    });
  }
});

/**
 * DELETE /api/subtitles/:mediaId
 * Delete subtitles for a media file (Admin only)
 */
router.delete('/:mediaId', checkAdminAuth, async (req, res) => {
  try {
    const { mediaId } = req.params;
    
    // Delete subtitle files
    await transcriptionService.deleteSubtitles(mediaId);
    
    // Update database
    await query(
      `UPDATE media SET 
        has_subtitles = 0,
        subtitle_status = NULL,
        subtitle_id = NULL
      WHERE id = ?`,
      [mediaId]
    );
    
    res.json({
      success: true,
      message: 'Subtitles deleted'
    });
    
  } catch (error) {
    console.error('[Subtitles] Error deleting subtitles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete subtitles'
    });
  }
});

/**
 * GET /admin/subtitles/pending
 * Get list of media without subtitles (Admin only)
 */
router.get('/admin/pending', checkAdminAuth, async (req, res) => {
  try {
    const media = await query(
      `SELECT id, title, type, duration, created_at, subtitle_status
       FROM media 
       WHERE type IN ('audio', 'video') 
       AND (has_subtitles = 0 OR has_subtitles IS NULL)
       ORDER BY created_at DESC
       LIMIT 100`
    );
    
    res.json({
      success: true,
      count: media.length,
      media: media
    });
    
  } catch (error) {
    console.error('[Subtitles] Error getting pending media:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending media'
    });
  }
});

/**
 * POST /admin/subtitles/batch-process
 * Process multiple media files (Admin only)
 */
router.post('/admin/batch-process', checkAdminAuth, async (req, res) => {
  try {
    const { mediaIds } = req.body;
    
    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'mediaIds array is required'
      });
    }
    
    // Limit batch size
    const batchSize = Math.min(mediaIds.length, 10);
    const processIds = mediaIds.slice(0, batchSize);
    
    // Get media info
    const placeholders = processIds.map(() => '?').join(',');
    const mediaList = await query(
      `SELECT id, title, type, file_path FROM media 
       WHERE id IN (${placeholders}) AND type IN ('audio', 'video')`,
      processIds
    );
    
    // Start processing each file
    for (const media of mediaList) {
      await query(
        'UPDATE media SET subtitle_status = ? WHERE id = ?',
        ['pending', media.id]
      );
    }
    
    // Process asynchronously
    processMediaBatch(mediaList);
    
    res.json({
      success: true,
      message: `Started processing ${mediaList.length} files`,
      queued: mediaList.map(m => ({ id: m.id, title: m.title }))
    });
    
  } catch (error) {
    console.error('[Subtitles] Error batch processing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start batch processing'
    });
  }
});

// Helper function for batch processing
async function processMediaBatch(mediaList) {
  for (const media of mediaList) {
    try {
      await query(
        'UPDATE media SET subtitle_status = ? WHERE id = ?',
        ['processing', media.id]
      );
      
      const filePath = path.join(UPLOAD_BASE_PATH, media.file_path);
      const result = await transcriptionService.processMedia(media.id, filePath);
      
      if (result.success) {
        await query(
          `UPDATE media SET 
            has_subtitles = 1,
            subtitle_status = 'completed',
            subtitle_id = ?
          WHERE id = ?`,
          [result.subtitleId, media.id]
        );
      } else {
        await query(
          `UPDATE media SET subtitle_status = 'failed' WHERE id = ?`,
          [media.id]
        );
      }
    } catch (error) {
      console.error(`[Subtitles] Batch processing error for ${media.id}:`, error);
      await query(
        `UPDATE media SET subtitle_status = 'failed' WHERE id = ?`,
        [media.id]
      );
    }
  }
}

module.exports = router;
