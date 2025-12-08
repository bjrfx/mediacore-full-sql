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

// =============================================================================
// MULTER CONFIGURATION FOR FILE UPLOADS
// =============================================================================

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';
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

// Ensure upload directory exists
const ensureUploadDir = () => {
  const uploadPath = path.resolve(UPLOAD_DIR);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  return uploadPath;
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
    
    const filters = {};
    if (type && ['video', 'audio'].includes(type)) {
      filters.type = type;
    }
    if (language) {
      filters.language = language;
    }
    
    const mediaList = await mediaDAO.getAll(
      filters,
      orderBy,
      order,
      parseInt(limit)
    );
    
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
    const media = await mediaDAO.getById(id);
    
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media content not found'
      });
    }
    
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

// =============================================================================
// ADMIN ROUTES - MEDIA CRUD
// =============================================================================

/**
 * POST /admin/media
 * Upload new media content (Admin only)
 * Body: title, subtitle, language, contentGroupId, type
 * File: multipart/form-data with 'file' field
 */
router.post('/admin/media', checkAdminAuth, upload.single('file'), async (req, res) => {
  try {
    const { title, subtitle, language = 'en', contentGroupId } = req.body;
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
    
    // Construct file path and URL
    const relativePath = `/public/uploads/${type}/${file.filename}`;
    const fileUrl = `${req.protocol}://${req.get('host')}${relativePath}`;
    
    // Prepare media data  
    const mediaId = uuidv4();
    const result = await db.query(
      `INSERT INTO media (id, title, subtitle, type, url, language, content_group_id, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        mediaId,
        title,
        subtitle || null,
        type,
        fileUrl,
        language,
        finalContentGroupId
      ]
    );
    
    // Fetch the created media
    const media = await db.queryOne('SELECT * FROM media WHERE id = ?', [mediaId]);
    
    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      data: media
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
    
    const media = await db.query(query, params);
    
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
