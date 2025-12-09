/**
 * Media Routes - MySQL Only
 * 
 * Handles all media-related API endpoints using MySQL database.
 * Includes public feed, media details, language support, and admin CRUD operations.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

// Import MySQL DAO and middleware
const { mediaDAO } = require('../data/dao');
const db = require('../config/db');
const { checkAuth, checkAdminAuth, checkApiKeyPermissions } = require('../middleware');

// Import STT service for subtitle generation
const sttService = require('../services/sttService');

// =============================================================================
// MULTER CONFIGURATION FOR FILE UPLOADS
// =============================================================================

// Production-only configuration - single path for cPanel hosting
const UPLOAD_BASE_PATH = '/home/masakali/mediacoreapi-sql.masakalirestrobar.ca/backend/public';
const UPLOAD_DIR = path.join(UPLOAD_BASE_PATH, 'uploads');
const PRODUCTION_URL = 'https://mediacoreapi-sql.masakalirestrobar.ca';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

// Allowed file types
const ALLOWED_MIME_TYPES = {
  video: [
    'video/mp4', 'video/quicktime', 'video/webm',
    'video/x-msvideo', 'video/x-matroska', 'video/mpeg'
  ],
  audio: [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
    'audio/wave', 'audio/x-m4a', 'audio/m4a', 'audio/mp4',
    'audio/aac', 'audio/x-aac', 'audio/ogg', 'audio/flac'
  ]
};

const ALLOWED_EXTENSIONS = {
  video: ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.mpeg', '.mpg'],
  audio: ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']
};

// Ensure upload directory exists on server
const ensureUploadDir = () => {
  // In production (cPanel), directories should already exist
  // This function just returns the path
  return UPLOAD_DIR;
};

const uploadPath = ensureUploadDir();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let type = req.body.type || req.query.type || 'video';
    
    // Infer from file mimetype
    if (file.mimetype.startsWith('audio/')) {
      type = 'audio';
    }
    
    const typeDir = path.join(uploadPath, type === 'audio' ? 'audio' : 'video');
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }
    
    // Store detected type for later use
    req.detectedType = type;
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${uniqueId}${ext}`);
  }
});

// File filter for validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();
  
  // Check if extension or mimetype is allowed
  const isValidVideo = ALLOWED_EXTENSIONS.video.includes(ext) || 
                        ALLOWED_MIME_TYPES.video.includes(mimeType);
  const isValidAudio = ALLOWED_EXTENSIONS.audio.includes(ext) || 
                        ALLOWED_MIME_TYPES.audio.includes(mimeType);
  
  if (isValidVideo || isValidAudio) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${[...ALLOWED_EXTENSIONS.video, ...ALLOWED_EXTENSIONS.audio].join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

// =============================================================================
// LANGUAGE INFORMATION
// =============================================================================

const LANGUAGE_INFO = {
  en: { name: 'English', nativeName: 'English' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी' },
  te: { name: 'Telugu', nativeName: 'తెలుగు' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം' },
  mr: { name: 'Marathi', nativeName: 'मराठी' },
  bn: { name: 'Bengali', nativeName: 'বাংলা' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  ur: { name: 'Urdu', nativeName: 'اردو' },
  es: { name: 'Spanish', nativeName: 'Español' },
  fr: { name: 'French', nativeName: 'Français' },
  de: { name: 'German', nativeName: 'Deutsch' },
  ja: { name: 'Japanese', nativeName: '日本語' },
  ko: { name: 'Korean', nativeName: '한국어' },
  zh: { name: 'Chinese', nativeName: '中文' },
  ar: { name: 'Arabic', nativeName: 'العربية' },
  pt: { name: 'Portuguese', nativeName: 'Português' },
  ru: { name: 'Russian', nativeName: 'Русский' }
};

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

/**
 * GET /api/feed
 * Get media feed with filters
 * Query params: type, language, limit, orderBy, order
 */
router.get('/api/feed', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { 
      type, 
      language, 
      limit = 50, 
      orderBy = 'createdAt', 
      order = 'desc' 
    } = req.query;
    
    // Map camelCase orderBy to snake_case column names
    const orderByMap = {
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'title': 'title',
      'duration': 'duration'
    };
    const dbOrderBy = orderByMap[orderBy] || 'created_at';
    const dbOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Build query with artist join
    let query = `
      SELECT 
        m.*,
        a.name as artist_name
      FROM media m
      LEFT JOIN artists a ON m.artist_id = a.id
      WHERE 1=1
    `;
    const params = [];
    
    if (type && ['video', 'audio'].includes(type)) {
      query += ' AND m.type = ?';
      params.push(type);
    }
    if (language) {
      query += ' AND m.language = ?';
      params.push(language);
    }
    
    query += ` ORDER BY m.${dbOrderBy} ${dbOrder} LIMIT ?`;
    params.push(parseInt(limit));
    
    const rows = await db.query(query, params);
    
    // Transform to camelCase and include artistName
    const mediaList = rows.map(row => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle || '',
      artistName: row.artist_name || row.subtitle || '',
      artistId: row.artist_id,
      albumId: row.album_id,
      description: row.description,
      type: row.type,
      language: row.language,
      duration: row.duration,
      fileUrl: row.file_path,
      filePath: row.file_path,
      fileSize: row.file_size,
      thumbnailUrl: row.thumbnail_url,
      contentGroupId: row.content_group_id,
      subscriptionTier: row.subscription_tier,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json({
      success: true,
      count: mediaList.length,
      data: mediaList
    });
  } catch (error) {
    console.error('Error fetching media feed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch media content'
    });
  }
});

/**
 * GET /api/media/:id
 * Get a single media item by ID with available language variants
 */
router.get('/api/media/:id', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get media with artist name
    const query = `
      SELECT 
        m.*,
        a.name as artist_name
      FROM media m
      LEFT JOIN artists a ON m.artist_id = a.id
      WHERE m.id = ?
    `;
    const rows = await db.query(query, [id]);
    const row = rows[0];
    
    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media content not found'
      });
    }
    
    // Transform to camelCase
    const media = {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle || '',
      artistName: row.artist_name || row.subtitle || '',
      artistId: row.artist_id,
      albumId: row.album_id,
      description: row.description,
      type: row.type,
      language: row.language,
      duration: row.duration,
      fileUrl: row.file_path,
      filePath: row.file_path,
      fileSize: row.file_size,
      thumbnailUrl: row.thumbnail_url,
      contentGroupId: row.content_group_id,
      subscriptionTier: row.subscription_tier,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    // Get available languages if part of a content group
    if (media.contentGroupId) {
      const variants = await mediaDAO.getLanguageVariants(media.contentGroupId);
      media.availableLanguages = variants.map(v => v.language || 'en');
    } else {
      media.availableLanguages = [media.language || 'en'];
    }
    
    res.json({
      success: true,
      data: media
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch media content'
    });
  }
});

/**
 * GET /api/languages
 * Get list of available languages with content counts
 */
router.get('/api/languages', checkApiKeyPermissions(), async (req, res) => {
  try {
    const db = require('../config/db');
    
    // Get language counts from database
    const [rows] = await db.query(`
      SELECT language, COUNT(*) as count
      FROM media
      GROUP BY language
      ORDER BY count DESC
    `);
    
    const languageCounts = {};
    rows.forEach(row => {
      const lang = row.language || 'en';
      languageCounts[lang] = row.count;
    });
    
    // Map to language info
    const languages = Object.keys(languageCounts).map(code => ({
      code,
      name: LANGUAGE_INFO[code]?.name || code,
      nativeName: LANGUAGE_INFO[code]?.nativeName || code,
      count: languageCounts[code]
    }));
    
    res.json({
      success: true,
      data: languages
    });
  } catch (error) {
    console.error('Error fetching languages:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch languages'
    });
  }
});

/**
 * GET /api/media/languages/:contentGroupId
 * Get all language variants of a specific content group
 */
router.get('/api/media/languages/:contentGroupId', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { contentGroupId } = req.params;
    const variants = await mediaDAO.getLanguageVariants(contentGroupId);
    
    if (!variants || variants.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'No content found for this content group'
      });
    }
    
    // Enrich with language info
    const enrichedVariants = variants.map(v => ({
      ...v,
      languageInfo: LANGUAGE_INFO[v.language] || { name: v.language, nativeName: v.language }
    }));
    
    res.json({
      success: true,
      contentGroupId,
      count: enrichedVariants.length,
      data: enrichedVariants
    });
  } catch (error) {
    console.error('Error fetching language variants:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch language variants'
    });
  }
});

/**
 * GET /api/media/:id/download
 * Download media file (Admin only - requires authentication)
 */
router.get('/api/media/:id/download', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const media = await mediaDAO.getById(id);
    
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media content not found'
      });
    }
    
    const filePath = path.resolve('.' + media.filePath);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media file not found on server'
      });
    }
    
    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${media.originalName || media.filename}"`);
    res.setHeader('Content-Type', media.mimeType || 'application/octet-stream');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error downloading media:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to download media'
    });
  }
});

/**
 * GET /api/media/:id/subtitles
 * Get subtitles/lyrics for a media item (Spotify-style sync)
 */
router.get('/api/media/:id/subtitles', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    const format = req.query.format || 'json'; // json, srt, vtt
    
    // First check if media exists and has subtitles
    const media = await db.queryOne(
      'SELECT id, has_subtitles, subtitle_id, subtitle_status FROM media WHERE id = ?',
      [id]
    );
    
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media not found'
      });
    }
    
    // Check subtitle status
    if (media.subtitle_status === 'processing') {
      return res.json({
        success: true,
        status: 'processing',
        message: 'Subtitles are still being generated'
      });
    }
    
    if (media.subtitle_status === 'failed' || !media.has_subtitles) {
      return res.json({
        success: true,
        status: 'unavailable',
        message: 'Subtitles not available for this media'
      });
    }
    
    // Get subtitles from STT service
    const subtitleResult = await sttService.getSubtitles(id);
    
    if (!subtitleResult.success) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Subtitles not found'
      });
    }
    
    // Return based on requested format
    if (format === 'json') {
      res.json({
        success: true,
        status: 'available',
        data: subtitleResult.data
      });
    } else {
      // Redirect to subtitle file
      const filePath = format === 'vtt' 
        ? subtitleResult.data.vtt_path 
        : subtitleResult.data.subtitle_path;
      
      res.json({
        success: true,
        status: 'available',
        url: filePath
      });
    }
    
  } catch (error) {
    console.error('Error fetching subtitles:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch subtitles'
    });
  }
});

/**
 * POST /api/media/:id/generate-subtitles
 * Manually trigger subtitle generation for a media item
 */
router.post('/api/media/:id/generate-subtitles', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { language } = req.body;
    
    // Get media
    const media = await db.queryOne('SELECT * FROM media WHERE id = ?', [id]);
    
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media not found'
      });
    }
    
    // Update status to processing
    await db.query(
      `UPDATE media SET subtitle_status = 'processing' WHERE id = ?`,
      [id]
    );
    
    // Trigger transcription
    const fileUrl = media.file_path;
    const lang = language || media.language || 'en';
    
    // Non-blocking
    sttService.requestTranscription(id, fileUrl, lang)
      .then(async (result) => {
        if (result.success) {
          await db.query(
            `UPDATE media SET 
              has_subtitles = 1, 
              subtitle_id = ?, 
              subtitle_status = 'completed',
              updated_at = NOW()
            WHERE id = ?`,
            [result.subtitleId, id]
          );
        } else {
          await db.query(
            `UPDATE media SET subtitle_status = 'failed' WHERE id = ?`,
            [id]
          );
        }
      })
      .catch(() => {
        db.query(`UPDATE media SET subtitle_status = 'failed' WHERE id = ?`, [id]);
      });
    
    res.json({
      success: true,
      message: 'Subtitle generation started',
      status: 'processing'
    });
    
  } catch (error) {
    console.error('Error triggering subtitle generation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to start subtitle generation'
    });
  }
});

// =============================================================================
// ADMIN ROUTES - MEDIA CRUD
// =============================================================================

/**
 * POST /admin/media
 * Upload new media content (Admin only)
 * Body: title, subtitle, language, contentGroupId, type, artistId, albumId
 * File: multipart/form-data with 'file' field
 */
router.post('/admin/media', checkAdminAuth, upload.single('file'), async (req, res) => {
  try {
    const { title, subtitle, language = 'en', contentGroupId, artistId, albumId } = req.body;
    const file = req.file;
    
    // Get type from body, query, or detected type
    let type = req.body.type || req.query.type || req.detectedType || 'video';
    
    // Double-check: if file is audio but type says video, correct it
    if (file && file.mimetype.startsWith('audio/')) {
      type = 'audio';
    }
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'No file uploaded'
      });
    }
    
    if (!title) {
      // Clean up uploaded file
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Title is required'
      });
    }
    
    // Generate contentGroupId if not provided
    const finalContentGroupId = contentGroupId || `cg_${Date.now()}_${uuidv4().substring(0, 8)}`;
    
    // Construct file URL (file is already saved by multer to /home/masakali/.../backend/public/uploads/)
    const fileUrl = `${PRODUCTION_URL}/uploads/${type}/${file.filename}`;
    
    // Get file size from uploaded file
    const fileSize = file.size || 0;
    
    // Prepare media data  
    const mediaId = uuidv4();
    const result = await db.query(
      `INSERT INTO media (id, title, type, file_path, language, content_group_id, file_size, artist_id, album_id, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        mediaId,
        title,
        type,
        fileUrl,
        language,
        finalContentGroupId,
        fileSize,
        artistId || null,
        albumId || null
      ]
    );
    
    // Fetch the created media
    const media = await db.queryOne('SELECT * FROM media WHERE id = ?', [mediaId]);
    
    // Trigger subtitle generation asynchronously (don't wait for completion)
    // This will process in the background
    const generateSubtitles = req.body.generateSubtitles !== 'false';
    if (generateSubtitles) {
      console.log(`[Media Upload] Triggering subtitle generation for ${mediaId}`);
      
      // Non-blocking subtitle generation
      sttService.requestTranscription(mediaId, fileUrl, language)
        .then(async (sttResult) => {
          if (sttResult.success) {
            // Update media record with subtitle info
            await db.query(
              `UPDATE media SET 
                has_subtitles = 1, 
                subtitle_id = ?, 
                subtitle_status = 'completed',
                updated_at = NOW()
              WHERE id = ?`,
              [sttResult.subtitleId, mediaId]
            );
            console.log(`[Media Upload] Subtitles generated for ${mediaId}: ${sttResult.lineCount} lines`);
          } else {
            // Update status to failed
            await db.query(
              `UPDATE media SET 
                subtitle_status = 'failed',
                updated_at = NOW()
              WHERE id = ?`,
              [mediaId]
            );
            console.error(`[Media Upload] Subtitle generation failed for ${mediaId}: ${sttResult.message}`);
          }
        })
        .catch((err) => {
          console.error(`[Media Upload] Subtitle service error for ${mediaId}:`, err.message);
        });
      
      // Update status to processing
      await db.query(
        `UPDATE media SET subtitle_status = 'processing' WHERE id = ?`,
        [mediaId]
      );
    }
    
    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      data: {
        ...media,
        subtitleStatus: generateSubtitles ? 'processing' : null
      }
    });
    
  } catch (error) {
    console.error('Error uploading media:', error);
    
    // Clean up file if it was uploaded
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to upload media'
    });
  }
});

/**
 * GET /admin/media
 * Get all media for admin panel (Admin only)
 * Query: limit, offset, type, language
 */
router.get('/admin/media', checkAdminAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, type, language } = req.query;
    
    let query = 'SELECT * FROM media WHERE 1=1';
    const params = [];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    if (language) {
      query += ' AND language = ?';
      params.push(language);
    }
    
    // Get total count
    const [countResult] = await db.query(
      query.replace('SELECT *', 'SELECT COUNT(*) as count'),
      params
    );
    const total = countResult[0]?.count || 0;
    
    // Get paginated results
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const mediaResults = await db.query(query, params);
    
    // Transform snake_case to camelCase for frontend
    const media = mediaResults.map(item => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      type: item.type,
      filePath: item.file_path,
      thumbnailUrl: item.thumbnail_url,
      fileSize: item.file_size,
      duration: item.duration,
      artistId: item.artist_id,
      albumId: item.album_id,
      language: item.language,
      contentGroupId: item.content_group_id,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
    
    res.json({
      success: true,
      count: media.length,
      total,
      data: media
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch media'
    });
  }
});

/**
 * PUT /admin/media/:id
 * Update media metadata (Admin only)
 * Body: title, subtitle, artistId, albumId
 */
router.put('/admin/media/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, artistId, albumId } = req.body;
    
    const media = await mediaDAO.getById(id);
    
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media content not found'
      });
    }
    
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (artistId !== undefined) updateData.artistId = artistId;
    if (albumId !== undefined) updateData.albumId = albumId;
    
    const updatedMedia = await mediaDAO.update(id, updateData);
    
    res.json({
      success: true,
      message: 'Media updated successfully',
      data: updatedMedia
    });
    
  } catch (error) {
    console.error('Error updating media:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update media'
    });
  }
});

/**
 * DELETE /admin/media/:id
 * Delete media content and optionally the file (Admin only)
 * Query param: deleteFile (true/false, default: true)
 */
router.delete('/admin/media/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteFile = true } = req.query;
    
    const media = await mediaDAO.getById(id);
    
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media content not found'
      });
    }
    
    // Delete the physical file if requested
    if (deleteFile !== 'false' && media.filePath) {
      const filePath = path.resolve('.' + media.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted file: ${filePath}`);
      }
    }
    
    // Delete from database
    await mediaDAO.delete(id);
    
    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete media'
    });
  }
});

module.exports = router;
