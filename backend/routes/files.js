/**
 * File Manager Routes
 * 
 * Handles file browsing, bulk uploads, folder management, and file operations
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const unzipper = require('unzipper');

// Import services and middleware
const fileStorage = require('../services/fileStorage');
const { mediaDAO } = require('../data/dao');
const db = require('../config/db');
const { checkAdminAuth } = require('../middleware');

// Multer configuration for bulk uploads
const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../public');
const UPLOAD_DIR = path.join(UPLOAD_BASE_PATH, 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Get target directory from request body or default to appropriate folder
    const targetDir = req.body.targetDir || '';
    const fileType = req.body.fileType || 'auto';
    
    let destPath;
    if (targetDir) {
      destPath = path.join(UPLOAD_DIR, targetDir);
    } else {
      // Auto-detect destination based on file type
      const ext = path.extname(file.originalname).toLowerCase();
      if (['.mp4', '.mov', '.webm', '.avi', '.mkv'].includes(ext)) {
        destPath = path.join(UPLOAD_DIR, 'video');
      } else if (['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'].includes(ext)) {
        destPath = path.join(UPLOAD_DIR, 'audio');
      } else if (['.srt', '.vtt', '.txt'].includes(ext)) {
        destPath = path.join(UPLOAD_DIR, 'subtitles');
      } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        destPath = path.join(UPLOAD_DIR, 'thumbnails');
      } else {
        destPath = path.join(UPLOAD_DIR, 'temp');
      }
    }
    
    // Ensure directory exists
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    // Preserve original filename or generate unique name
    const preserveName = req.body.preserveNames === 'true';
    
    if (preserveName) {
      cb(null, file.originalname);
    } else {
      const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB max file size
  },
});

// =============================================================================
// FILE BROWSING ROUTES
// =============================================================================

/**
 * GET /api/files
 * Get directory contents (non-recursive)
 */
router.get('/api/files', checkAdminAuth, async (req, res) => {
  try {
    const { dir = '', type } = req.query;
    
    const contents = await fileStorage.getDirectoryContents(dir);
    
    // Filter by type if specified
    let filteredContents = contents;
    if (type && type !== 'all') {
      filteredContents = contents.filter(item => 
        item.isDirectory || item.type === type
      );
    }
    
    res.json({
      success: true,
      data: filteredContents,
      count: filteredContents.length,
      path: dir || '/'
    });
  } catch (error) {
    console.error('Error getting directory contents:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get directory contents'
    });
  }
});

/**
 * GET /api/files/tree
 * Get directory tree structure
 */
router.get('/api/files/tree', checkAdminAuth, async (req, res) => {
  try {
    const tree = await fileStorage.getDirectoryTree();
    
    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('Error getting directory tree:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get directory tree'
    });
  }
});

/**
 * GET /api/files/search
 * Search files by name or type
 */
router.get('/api/files/search', checkAdminAuth, async (req, res) => {
  try {
    const { q = '', type } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Search query must be at least 2 characters'
      });
    }
    
    const results = await fileStorage.searchFiles(q, type);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      query: q
    });
  } catch (error) {
    console.error('Error searching files:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to search files'
    });
  }
});

/**
 * GET /api/files/hls
 * Get all HLS directories
 */
router.get('/api/files/hls', checkAdminAuth, async (req, res) => {
  try {
    const hlsFiles = await fileStorage.getHLSFiles();
    
    res.json({
      success: true,
      data: hlsFiles,
      count: hlsFiles.length
    });
  } catch (error) {
    console.error('Error getting HLS files:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get HLS files'
    });
  }
});

/**
 * GET /api/files/stats
 * Get storage statistics
 */
router.get('/api/files/stats', checkAdminAuth, async (req, res) => {
  try {
    const stats = await fileStorage.getStorageStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting storage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get storage stats'
    });
  }
});

/**
 * GET /api/files/metadata
 * Get file metadata
 */
router.get('/api/files/metadata', checkAdminAuth, async (req, res) => {
  try {
    const { path: filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'File path is required'
      });
    }
    
    const metadata = await fileStorage.getFileMetadata(filePath);
    
    res.json({
      success: true,
      data: metadata
    });
  } catch (error) {
    console.error('Error getting file metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get file metadata'
    });
  }
});

// =============================================================================
// FILE UPLOAD ROUTES
// =============================================================================

/**
 * POST /api/files/upload
 * Upload single or multiple files
 */
router.post('/api/files/upload', checkAdminAuth, upload.array('files', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'No files uploaded'
      });
    }
    
    const uploadedFiles = req.files.map(file => {
      const relativePath = path.relative(UPLOAD_DIR, file.path);
      const fileType = fileStorage.detectFileType(file.originalname, file.mimetype);
      
      return {
        name: file.filename,
        originalName: file.originalname,
        path: relativePath,
        publicUrl: `/uploads/${relativePath.replace(/\\/g, '/')}`,
        type: fileType,
        size: file.size,
        mimetype: file.mimetype
      };
    });
    
    res.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      data: uploadedFiles,
      count: uploadedFiles.length
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to upload files'
    });
  }
});

/**
 * POST /api/files/upload-folder
 * Upload folder (zip file that will be extracted)
 */
router.post('/api/files/upload-folder', checkAdminAuth, upload.single('folder'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'No folder uploaded'
      });
    }
    
    const { targetDir = 'temp' } = req.body;
    const zipPath = req.file.path;
    const extractPath = path.join(UPLOAD_DIR, targetDir);
    
    // Ensure extraction directory exists
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }
    
    // Extract zip file
    await fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .promise();
    
    // Delete zip file after extraction
    fs.unlinkSync(zipPath);
    
    // Get extracted contents
    const contents = await fileStorage.getDirectoryContents(targetDir);
    
    res.json({
      success: true,
      message: 'Folder uploaded and extracted successfully',
      data: contents,
      extractedTo: targetDir
    });
  } catch (error) {
    console.error('Error uploading folder:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to upload folder'
    });
  }
});

// =============================================================================
// FILE MANAGEMENT ROUTES
// =============================================================================

/**
 * POST /api/files/folder
 * Create a new folder
 */
router.post('/api/files/folder', checkAdminAuth, async (req, res) => {
  try {
    const { name, parentDir = '' } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Folder name is required'
      });
    }
    
    const folderPath = path.join(parentDir, name);
    const result = await fileStorage.createDirectory(folderPath);
    
    res.json({
      success: true,
      message: 'Folder created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create folder'
    });
  }
});

/**
 * PUT /api/files/move
 * Move file or folder
 */
router.put('/api/files/move', checkAdminAuth, async (req, res) => {
  try {
    const { sourcePath, destPath } = req.body;
    
    if (!sourcePath || !destPath) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Source and destination paths are required'
      });
    }
    
    const result = await fileStorage.moveFile(sourcePath, destPath);
    
    res.json({
      success: true,
      message: 'File moved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error moving file:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to move file'
    });
  }
});

/**
 * DELETE /api/files
 * Delete file or folder
 */
router.delete('/api/files', checkAdminAuth, async (req, res) => {
  try {
    const { path: filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'File path is required'
      });
    }
    
    const result = await fileStorage.deleteFile(filePath);
    
    res.json({
      success: true,
      message: 'File deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete file'
    });
  }
});

/**
 * DELETE /api/files/batch
 * Delete multiple files
 */
router.delete('/api/files/batch', checkAdminAuth, async (req, res) => {
  try {
    const { paths } = req.body;
    
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Paths array is required'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const filePath of paths) {
      try {
        const result = await fileStorage.deleteFile(filePath);
        results.push({ path: filePath, success: true });
      } catch (error) {
        errors.push({ path: filePath, error: error.message });
      }
    }
    
    res.json({
      success: errors.length === 0,
      message: `Deleted ${results.length} file(s)`,
      data: {
        deleted: results,
        failed: errors
      }
    });
  } catch (error) {
    console.error('Error deleting files:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete files'
    });
  }
});

// =============================================================================
// MEDIA CREATION FROM FILE MANAGER
// =============================================================================

/**
 * POST /api/files/create-media
 * Create media entries from files in file manager
 */
router.post('/api/files/create-media', checkAdminAuth, async (req, res) => {
  try {
    const { files, artistId, albumId, language = 'en' } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Files array is required'
      });
    }
    
    const createdMedia = [];
    const errors = [];
    
    for (const file of files) {
      try {
        const { path: filePath, name, type, subtitlePath, thumbnailPath } = file;
        
        // Validate file type is audio or video
        if (!['audio', 'video', 'hls'].includes(type)) {
          errors.push({ file: name, error: 'Invalid file type. Must be audio, video, or HLS' });
          continue;
        }
        
        // Get file metadata
        const metadata = await fileStorage.getFileMetadata(filePath);
        
        // Create media entry
        const mediaId = uuidv4();
        const mediaData = {
          id: mediaId,
          title: name.replace(/\.[^/.]+$/, ''), // Remove extension
          type: type === 'hls' ? 'video' : type,
          url: metadata.publicUrl,
          thumbnail_url: thumbnailPath || null,
          artist_id: artistId || null,
          album_id: albumId || null,
          language: language,
          file_size: metadata.size,
          is_hls: type === 'hls',
          hls_playlist_url: type === 'hls' ? metadata.publicUrl : null,
        };
        
        const insertId = await mediaDAO.create(mediaData);
        
        // Add subtitle if provided
        if (subtitlePath) {
          const subtitleMetadata = await fileStorage.getFileMetadata(subtitlePath);
          const ext = path.extname(subtitlePath).toLowerCase();
          const format = ext === '.vtt' ? 'vtt' : ext === '.srt' ? 'srt' : 'txt';
          
          await db.query(
            `INSERT INTO subtitles (id, media_id, language, format, file_path, is_default) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [uuidv4(), mediaId, language, format, subtitleMetadata.publicUrl, true]
          );
        }
        
        createdMedia.push({
          id: mediaId,
          title: mediaData.title,
          type: mediaData.type,
          url: mediaData.url,
          thumbnail: mediaData.thumbnail_url,
        });
      } catch (error) {
        console.error('Error creating media from file:', error);
        errors.push({ file: file.name, error: error.message });
      }
    }
    
    res.json({
      success: errors.length === 0,
      message: `Created ${createdMedia.length} media entries`,
      data: {
        created: createdMedia,
        failed: errors
      },
      count: createdMedia.length
    });
  } catch (error) {
    console.error('Error creating media from files:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create media from files'
    });
  }
});

module.exports = router;
