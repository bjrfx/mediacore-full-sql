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
const unzipper = require('unzipper');

// =============================================================================
// MULTER CONFIGURATION FOR FILE UPLOADS
// =============================================================================

// Production-only configuration - single path for cPanel hosting
const UPLOAD_BASE_PATH = '/home/masakali/mediacoreapi-sql.masakalirestrobar.ca/backend/public';
const UPLOAD_DIR = path.join(UPLOAD_BASE_PATH, 'uploads');
const HLS_UPLOAD_DIR = path.join(UPLOAD_DIR, 'hls');
const PRODUCTION_URL = 'https://mediacoreapi-sql.masakalirestrobar.ca';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB for regular uploads
const MAX_HLS_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB for HLS bundles

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
  ],
  subtitle: [
    'text/plain', 'text/vtt', 'application/x-subrip',
    'text/srt', 'application/octet-stream'
  ],
  hls: [
    'application/x-mpegURL', 'application/vnd.apple.mpegURL',
    'video/MP2T', 'video/mp2t', 'application/octet-stream',
    'application/zip', 'application/x-zip-compressed'
  ]
};

const ALLOWED_EXTENSIONS = {
  video: ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.mpeg', '.mpg'],
  audio: ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'],
  subtitle: ['.srt', '.vtt', '.txt'],
  hls: ['.m3u8', '.ts', '.zip']
};

// Ensure upload directory exists on server
const ensureUploadDir = () => {
  // In production (cPanel), directories should already exist
  // This function just returns the path
  return UPLOAD_DIR;
};

// Ensure HLS upload directory exists
const ensureHLSUploadDir = (mediaId) => {
  const hlsDir = path.join(HLS_UPLOAD_DIR, mediaId);
  if (!fs.existsSync(hlsDir)) {
    fs.mkdirSync(hlsDir, { recursive: true });
  }
  return hlsDir;
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

// Subtitle storage configuration
const subtitleStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subtitleDir = path.join(uploadPath, 'subtitles');
    if (!fs.existsSync(subtitleDir)) {
      fs.mkdirSync(subtitleDir, { recursive: true });
    }
    cb(null, subtitleDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${uniqueId}${ext}`);
  }
});

// Subtitle file filter
const subtitleFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();
  
  const isValidSubtitle = ALLOWED_EXTENSIONS.subtitle.includes(ext) || 
                          ALLOWED_MIME_TYPES.subtitle.includes(mimeType);
  
  if (isValidSubtitle) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid subtitle file type. Allowed: ${ALLOWED_EXTENSIONS.subtitle.join(', ')}`), false);
  }
};

const subtitleUpload = multer({
  storage: subtitleStorage,
  fileFilter: subtitleFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max for subtitles
});

// HLS ZIP storage configuration (for uploading HLS bundles as ZIP)
const hlsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store ZIP temporarily in uploads directory
    const tempDir = path.join(uploadPath, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `hls_${Date.now()}_${uniqueId}${ext}`);
  }
});

// HLS file filter
const hlsFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();
  
  const isValidHLS = ALLOWED_EXTENSIONS.hls.includes(ext) || 
                     ALLOWED_MIME_TYPES.hls.includes(mimeType);
  
  if (isValidHLS) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid HLS file type. Allowed: ${ALLOWED_EXTENSIONS.hls.join(', ')}`), false);
  }
};

const hlsUpload = multer({
  storage: hlsStorage,
  fileFilter: hlsFilter,
  limits: { fileSize: MAX_HLS_FILE_SIZE } // 2GB max for HLS bundles
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
 * POST /admin/media/hls
 * Upload HLS video content (Admin only)
 * Accepts a ZIP file containing .m3u8 playlist and .ts segment files
 * Body: title, subtitle, language, contentGroupId, artistId, albumId
 * File: multipart/form-data with 'hlsBundle' field (ZIP file)
 */
router.post('/admin/media/hls', checkAdminAuth, hlsUpload.single('hlsBundle'), async (req, res) => {
  const mediaId = uuidv4();
  let hlsDir = null;
  
  try {
    const { title, subtitle, language = 'en', contentGroupId, artistId, albumId, duration, type = 'video', description } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'No HLS bundle uploaded. Please upload a ZIP file containing .m3u8 and .ts files.'
      });
    }
    
    if (!title) {
      // Clean up uploaded file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Title is required'
      });
    }
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Create HLS directory for this media
    hlsDir = ensureHLSUploadDir(mediaId);
    
    // Variables to track HLS content
    let playlistFilename = null;
    let totalSize = 0;
    let segmentCount = 0;
    
    if (ext === '.zip') {
      // Extract ZIP file to HLS directory
      console.log(`📦 Extracting HLS bundle to ${hlsDir}`);
      
      await new Promise((resolve, reject) => {
        fs.createReadStream(file.path)
          .pipe(unzipper.Parse())
          .on('entry', async (entry) => {
            const fileName = path.basename(entry.path);
            const fileExt = path.extname(fileName).toLowerCase();
            
            // Valid HLS file extensions: .m3u8 (playlist), .ts (MPEG-TS segments), 
            // .m4s (fragmented MP4 segments), .m4a (audio init), .mp4 (init segments)
            const validExtensions = ['.m3u8', '.ts', '.m4s', '.m4a', '.mp4'];
            
            // Only extract valid HLS files, ignore directories and other files
            if (entry.type === 'File' && validExtensions.includes(fileExt)) {
              const outputPath = path.join(hlsDir, fileName);
              
              // Track the playlist file
              if (fileExt === '.m3u8') {
                playlistFilename = fileName;
              } else if (['.ts', '.m4s'].includes(fileExt)) {
                segmentCount++;
              }
              
              entry.pipe(fs.createWriteStream(outputPath));
              totalSize += entry.vars?.uncompressedSize || 0;
            } else {
              entry.autodrain();
            }
          })
          .on('close', resolve)
          .on('error', reject);
      });
      
      // Clean up the temporary ZIP file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
    } else if (ext === '.m3u8') {
      // Single m3u8 file uploaded - move it to HLS directory
      playlistFilename = file.filename;
      fs.renameSync(file.path, path.join(hlsDir, playlistFilename));
      totalSize = file.size;
      
    } else {
      // Clean up and reject
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      if (hlsDir && fs.existsSync(hlsDir)) {
        fs.rmSync(hlsDir, { recursive: true });
      }
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid file type. Please upload a ZIP file containing HLS content (.m3u8 and .ts files)'
      });
    }
    
    // Verify we have a playlist file
    if (!playlistFilename) {
      // Check if there's a .m3u8 file in the directory
      const files = fs.readdirSync(hlsDir);
      playlistFilename = files.find(f => f.endsWith('.m3u8'));
      
      if (!playlistFilename) {
        // Clean up and reject
        if (hlsDir && fs.existsSync(hlsDir)) {
          fs.rmSync(hlsDir, { recursive: true });
        }
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'No .m3u8 playlist file found in the uploaded bundle'
        });
      }
    }
    
    // Calculate total size of all files in HLS directory
    const hlsFiles = fs.readdirSync(hlsDir);
    totalSize = hlsFiles.reduce((sum, filename) => {
      const filePath = path.join(hlsDir, filename);
      const stats = fs.statSync(filePath);
      return sum + stats.size;
    }, 0);
    
    // Count segments (.ts for MPEG-TS, .m4s for fragmented MP4)
    segmentCount = hlsFiles.filter(f => f.endsWith('.ts') || f.endsWith('.m4s')).length;
    
    // Construct the playlist URL
    const playlistUrl = `${PRODUCTION_URL}/uploads/hls/${mediaId}/${playlistFilename}`;
    
    // Generate contentGroupId if not provided
    const finalContentGroupId = contentGroupId || `cg_${Date.now()}_${uuidv4().substring(0, 8)}`;
    
    // Validate type (only 'video' or 'audio' allowed)
    const mediaType = ['video', 'audio'].includes(type) ? type : 'video';
    
    // Insert into database with HLS flag
    await db.query(
      `INSERT INTO media (id, title, type, file_path, language, content_group_id, file_size, artist_id, album_id, duration, is_hls, hls_playlist_url, description, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        mediaId,
        title,
        mediaType,
        playlistUrl, // Store playlist URL as file_path
        language,
        finalContentGroupId,
        totalSize,
        artistId || null,
        albumId || null,
        duration ? parseInt(duration) : null,
        true, // is_hls = true
        playlistUrl, // hls_playlist_url
        description || null
      ]
    );
    
    // Fetch the created media
    const media = await db.queryOne('SELECT * FROM media WHERE id = ?', [mediaId]);
    
    console.log(`✅ HLS upload complete: ${segmentCount} segments, playlist: ${playlistFilename}`);
    
    res.status(201).json({
      success: true,
      message: 'HLS media uploaded successfully',
      data: {
        ...media,
        isHls: true,
        hlsPlaylistUrl: playlistUrl,
        segmentCount,
        hlsDirectory: `/uploads/hls/${mediaId}/`
      }
    });
    
  } catch (error) {
    console.error('Error uploading HLS media:', error);
    
    // Clean up files on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (hlsDir && fs.existsSync(hlsDir)) {
      fs.rmSync(hlsDir, { recursive: true });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to upload HLS media: ' + error.message
    });
  }
});

/**
 * POST /admin/media/hls/segments
 * Upload individual HLS segment files to an existing HLS media item
 * Useful for adding segments one by one or resuming interrupted uploads
 * Body: mediaId
 * Files: multipart/form-data with 'segments' field (multiple .ts or .m3u8 files)
 */
router.post('/admin/media/hls/segments', checkAdminAuth, hlsUpload.array('segments', 500), async (req, res) => {
  try {
    const { mediaId } = req.body;
    const files = req.files;
    
    if (!mediaId) {
      // Clean up uploaded files
      if (files) {
        files.forEach(f => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'mediaId is required'
      });
    }
    
    // Verify media exists and is HLS
    const media = await db.queryOne('SELECT * FROM media WHERE id = ?', [mediaId]);
    if (!media) {
      if (files) {
        files.forEach(f => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
      }
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media not found'
      });
    }
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'No segment files uploaded'
      });
    }
    
    // Ensure HLS directory exists
    const hlsDir = ensureHLSUploadDir(mediaId);
    
    let addedFiles = [];
    let playlistUpdated = false;
    
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (ext === '.ts' || ext === '.m3u8') {
        const destPath = path.join(hlsDir, file.originalname);
        fs.renameSync(file.path, destPath);
        addedFiles.push(file.originalname);
        
        if (ext === '.m3u8') {
          playlistUpdated = true;
          // Update playlist URL if this is a new/updated playlist
          const playlistUrl = `${PRODUCTION_URL}/uploads/hls/${mediaId}/${file.originalname}`;
          await db.query(
            'UPDATE media SET hls_playlist_url = ?, file_path = ?, updated_at = NOW() WHERE id = ?',
            [playlistUrl, playlistUrl, mediaId]
          );
        }
      } else {
        // Clean up invalid file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }
    
    // Update file size in database
    const hlsFiles = fs.readdirSync(hlsDir);
    const totalSize = hlsFiles.reduce((sum, filename) => {
      const filePath = path.join(hlsDir, filename);
      const stats = fs.statSync(filePath);
      return sum + stats.size;
    }, 0);
    
    await db.query(
      'UPDATE media SET file_size = ?, updated_at = NOW() WHERE id = ?',
      [totalSize, mediaId]
    );
    
    res.json({
      success: true,
      message: `Added ${addedFiles.length} segment(s) to HLS media`,
      data: {
        mediaId,
        addedFiles,
        totalFiles: hlsFiles.length,
        totalSize,
        playlistUpdated
      }
    });
    
  } catch (error) {
    console.error('Error adding HLS segments:', error);
    
    // Clean up files
    if (req.files) {
      req.files.forEach(f => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to add HLS segments'
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

// =============================================================================
// SUBTITLE/LYRICS ROUTES
// =============================================================================

/**
 * GET /api/media/:id/subtitles
 * Get all subtitles/lyrics for a media item
 */
router.get('/api/media/:id/subtitles', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if media exists
    const media = await mediaDAO.getById(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media content not found'
      });
    }
    
    // Get all subtitles for this media
    const subtitles = await db.query(
      'SELECT * FROM subtitles WHERE media_id = ? ORDER BY is_default DESC, created_at ASC',
      [id]
    );
    
    // Transform to camelCase
    const formattedSubtitles = subtitles.map(sub => ({
      id: sub.id,
      mediaId: sub.media_id,
      language: sub.language,
      format: sub.format,
      label: sub.label,
      fileUrl: sub.file_path,
      isDefault: !!sub.is_default,
      createdAt: sub.created_at,
      updatedAt: sub.updated_at
    }));
    
    res.json({
      success: true,
      count: formattedSubtitles.length,
      data: formattedSubtitles
    });
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
 * GET /api/subtitles/:id/content
 * Get subtitle file content (for parsing)
 */
router.get('/api/subtitles/:id/content', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    
    const subtitle = await db.queryOne('SELECT * FROM subtitles WHERE id = ?', [id]);
    
    if (!subtitle) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Subtitle not found'
      });
    }
    
    // Return subtitle info with file URL for frontend to fetch
    res.json({
      success: true,
      data: {
        id: subtitle.id,
        mediaId: subtitle.media_id,
        language: subtitle.language,
        format: subtitle.format,
        label: subtitle.label,
        fileUrl: subtitle.file_path,
        isDefault: !!subtitle.is_default
      }
    });
  } catch (error) {
    console.error('Error fetching subtitle content:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch subtitle content'
    });
  }
});

/**
 * POST /admin/media/:id/subtitles
 * Upload subtitle/lyrics file for a media item (Admin only)
 * Body: language, label, isDefault
 * File: multipart/form-data with 'subtitle' field
 */
router.post('/admin/media/:id/subtitles', checkAdminAuth, subtitleUpload.single('subtitle'), async (req, res) => {
  try {
    const { id: mediaId } = req.params;
    const { language = 'en', label, isDefault = false } = req.body;
    const file = req.file;
    
    // Check if media exists
    const media = await mediaDAO.getById(mediaId);
    if (!media) {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media content not found'
      });
    }
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'No subtitle file uploaded'
      });
    }
    
    // Determine format from file extension
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    const format = ['srt', 'vtt', 'txt'].includes(ext) ? ext : 'txt';
    
    // Construct file URL
    const fileUrl = `${PRODUCTION_URL}/uploads/subtitles/${file.filename}`;
    
    // If setting as default, unset other defaults for this media
    if (isDefault === true || isDefault === 'true') {
      await db.query('UPDATE subtitles SET is_default = FALSE WHERE media_id = ?', [mediaId]);
    }
    
    // Generate subtitle ID and insert
    const subtitleId = uuidv4();
    await db.query(
      `INSERT INTO subtitles (id, media_id, language, format, label, file_path, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        subtitleId,
        mediaId,
        language,
        format,
        label || `${LANGUAGE_INFO[language]?.name || language} (${format.toUpperCase()})`,
        fileUrl,
        isDefault === true || isDefault === 'true'
      ]
    );
    
    // Fetch created subtitle
    const subtitle = await db.queryOne('SELECT * FROM subtitles WHERE id = ?', [subtitleId]);
    
    res.status(201).json({
      success: true,
      message: 'Subtitle uploaded successfully',
      data: {
        id: subtitle.id,
        mediaId: subtitle.media_id,
        language: subtitle.language,
        format: subtitle.format,
        label: subtitle.label,
        fileUrl: subtitle.file_path,
        isDefault: !!subtitle.is_default,
        createdAt: subtitle.created_at,
        updatedAt: subtitle.updated_at
      }
    });
    
  } catch (error) {
    console.error('Error uploading subtitle:', error);
    
    // Clean up file if it was uploaded
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to upload subtitle'
    });
  }
});

/**
 * PUT /admin/subtitles/:id
 * Update subtitle metadata (Admin only)
 * Body: language, label, isDefault
 */
router.put('/admin/subtitles/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { language, label, isDefault } = req.body;
    
    const subtitle = await db.queryOne('SELECT * FROM subtitles WHERE id = ?', [id]);
    
    if (!subtitle) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Subtitle not found'
      });
    }
    
    // If setting as default, unset other defaults for this media
    if (isDefault === true || isDefault === 'true') {
      await db.query('UPDATE subtitles SET is_default = FALSE WHERE media_id = ?', [subtitle.media_id]);
    }
    
    // Build update query
    const updates = [];
    const values = [];
    
    if (language !== undefined) {
      updates.push('language = ?');
      values.push(language);
    }
    if (label !== undefined) {
      updates.push('label = ?');
      values.push(label);
    }
    if (isDefault !== undefined) {
      updates.push('is_default = ?');
      values.push(isDefault === true || isDefault === 'true');
    }
    
    if (updates.length > 0) {
      values.push(id);
      await db.query(
        `UPDATE subtitles SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );
    }
    
    // Fetch updated subtitle
    const updatedSubtitle = await db.queryOne('SELECT * FROM subtitles WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Subtitle updated successfully',
      data: {
        id: updatedSubtitle.id,
        mediaId: updatedSubtitle.media_id,
        language: updatedSubtitle.language,
        format: updatedSubtitle.format,
        label: updatedSubtitle.label,
        fileUrl: updatedSubtitle.file_path,
        isDefault: !!updatedSubtitle.is_default,
        createdAt: updatedSubtitle.created_at,
        updatedAt: updatedSubtitle.updated_at
      }
    });
    
  } catch (error) {
    console.error('Error updating subtitle:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update subtitle'
    });
  }
});

/**
 * DELETE /admin/subtitles/:id
 * Delete subtitle and file (Admin only)
 */
router.delete('/admin/subtitles/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const subtitle = await db.queryOne('SELECT * FROM subtitles WHERE id = ?', [id]);
    
    if (!subtitle) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Subtitle not found'
      });
    }
    
    // Try to delete the physical file
    if (subtitle.file_path) {
      try {
        // Extract filename from URL
        const urlParts = subtitle.file_path.split('/');
        const filename = urlParts[urlParts.length - 1];
        const filePath = path.join(uploadPath, 'subtitles', filename);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted subtitle file: ${filePath}`);
        }
      } catch (fileErr) {
        console.error('Error deleting subtitle file:', fileErr);
        // Continue with database deletion even if file deletion fails
      }
    }
    
    // Delete from database
    await db.query('DELETE FROM subtitles WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Subtitle deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting subtitle:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete subtitle'
    });
  }
});

module.exports = router;
