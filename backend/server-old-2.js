/**
 * MediaCore API Server
 * 
 * A Node.js/Express backend for managing media content with MySQL database
 * and JWT authentication with role-based API key permissions.
 * 
 * Compatible with cPanel's Node.js App environment.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// MySQL database and middleware imports
const db = require('./config/db');
const { checkAdminAuth, checkAuth, checkApiKeyPermissions } = require('./middleware');
const { 
  PERMISSION_PRESETS, 
  validatePermissions, 
  getPermissionsByAccessType 
} = require('./middleware/checkApiKeyPermissions');

// Initialize Express app
const app = express();

// =============================================================================
// CONFIGURATION (Hardcoded for cPanel)
// =============================================================================

const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const CORS_ORIGIN = '*';

// Allowed file types
const ALLOWED_MIME_TYPES = {
  video: [
    'video/mp4',
    'video/quicktime',      // .mov
    'video/webm',
    'video/x-msvideo',      // .avi
    'video/x-matroska',     // .mkv
    'video/mpeg'
  ],
  audio: [
    'audio/mpeg',           // .mp3
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/wave',
    'audio/x-m4a',
    'audio/m4a',
    'audio/mp4',            // .m4a can also be this
    'audio/aac',
    'audio/x-aac',
    'audio/ogg',
    'audio/flac'
  ]
};

const ALLOWED_EXTENSIONS = {
  video: ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.mpeg', '.mpg'],
  audio: ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']
};

// =============================================================================
// DOWNLOAD RATE LIMITER (In-Memory)
// =============================================================================

const downloadRateLimiter = {
  requests: new Map(), // userId -> { count, resetTime }
  maxRequests: 50,     // Max downloads per window
  windowMs: 60 * 60 * 1000, // 1 hour window
  
  check(userId) {
    const now = Date.now();
    const userLimit = this.requests.get(userId);
    
    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance on each request
      this.cleanup(now);
    }
    
    if (!userLimit || now > userLimit.resetTime) {
      // New window
      this.requests.set(userId, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }
    
    if (userLimit.count >= this.maxRequests) {
      const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
      return { 
        allowed: false, 
        remaining: 0, 
        retryAfter,
        resetTime: userLimit.resetTime
      };
    }
    
    userLimit.count++;
    return { allowed: true, remaining: this.maxRequests - userLimit.count };
  },
  
  cleanup(now) {
    for (const [userId, limit] of this.requests.entries()) {
      if (now > limit.resetTime) {
        this.requests.delete(userId);
      }
    }
  }
};

// =============================================================================
// ENSURE UPLOAD DIRECTORY EXISTS
// =============================================================================

const ensureUploadDir = () => {
  const uploadPath = path.resolve(UPLOAD_DIR);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log(`📁 Created upload directory: ${uploadPath}`);
  }
  return uploadPath;
};

const uploadPath = ensureUploadDir();

// =============================================================================
// MULTER CONFIGURATION
// =============================================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Try to get type from body, query, or infer from file mimetype
    let type = req.body.type || req.query.type || 'video';
    
    // If type still not determined, infer from file mimetype
    if (!type || type === 'video') {
      if (file.mimetype.startsWith('audio/')) {
        type = 'audio';
      }
    }
    
    const typeDir = path.join(uploadPath, type === 'audio' ? 'audio' : 'video');
    
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }
    
    // Store type for later use
    req.detectedType = type;
    
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uniqueId}${ext}`;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Determine type from multiple sources since body might not be parsed yet
  // 1. Check req.body.type (might be available if type field comes before file in form)
  // 2. Check query parameter
  // 3. Infer from file mimetype
  // 4. Infer from file extension
  let type = req.body.type || req.query.type;
  
  // If type not explicitly provided, infer from file
  if (!type) {
    if (file.mimetype.startsWith('audio/') || ALLOWED_EXTENSIONS.audio.includes(ext)) {
      type = 'audio';
    } else {
      type = 'video';
    }
  }
  
  // Store detected type on request for later use by route handler
  req.detectedType = type;
  
  const allowedExts = ALLOWED_EXTENSIONS[type] || ALLOWED_EXTENSIONS.video;
  const allowedMimes = ALLOWED_MIME_TYPES[type] || ALLOWED_MIME_TYPES.video;
  
  // Check if extension is allowed for this type
  const extAllowed = allowedExts.includes(ext);
  
  // Check if MIME type is allowed (or starts with video/audio based on type)
  const mimeAllowed = allowedMimes.includes(file.mimetype) || 
                      (type === 'video' && file.mimetype.startsWith('video/')) ||
                      (type === 'audio' && file.mimetype.startsWith('audio/'));
  
  console.log(`📁 File upload validation: ext=${ext}, mime=${file.mimetype}, type=${type}, extAllowed=${extAllowed}, mimeAllowed=${mimeAllowed}`);
  
  // Allow if extension matches (primary check)
  if (extAllowed) {
    if (!mimeAllowed) {
      console.log(`⚠️ File accepted with mismatched MIME type: ${file.mimetype} for extension ${ext}`);
    }
    cb(null, true);
  } else {
    // Check if the extension belongs to the OTHER type (common mistake)
    const otherType = type === 'video' ? 'audio' : 'video';
    const otherExts = ALLOWED_EXTENSIONS[otherType];
    
    if (otherExts.includes(ext)) {
      cb(new Error(`Invalid file type. You're uploading a ${otherType} file (${ext}) but selected type="${type}". Please set type="${otherType}" in your form data.`), false);
    } else {
      cb(new Error(`Invalid file type "${ext}" for ${type}. Allowed extensions: ${allowedExts.join(', ')}`), false);
    }
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// =============================================================================
// MIDDLEWARE
// =============================================================================

// CORS configuration
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded media)
app.use('/public', express.static(path.resolve('./public')));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Analytics tracking middleware (after logging, before routes)
app.use(analyticsTracker);

// Request logging middleware for requestLogs collection
app.use(requestLogger);

// =============================================================================
// HEALTH CHECK ROUTE
// =============================================================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MediaCore API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// AUTHENTICATION ROUTES
// =============================================================================

const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// =============================================================================
// PUBLIC API ROUTES (Require API Key with appropriate permissions)
// =============================================================================

/**
 * GET /api/feed
 * Returns a list of all media content
 * Requires: API Key with 'read:media' permission
 * 
 * Query Parameters:
 * - type: Filter by media type (video/audio)
 * - language: Filter by language code (e.g., "en", "hi", "te")
 * - limit: Maximum results to return (default: 50)
 * - orderBy: Field to order by (default: createdAt)
 * - order: Sort order - asc/desc (default: desc)
 */
app.get('/api/feed', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { type, language, limit = 50, orderBy = 'createdAt', order = 'desc' } = req.query;
    
    let query = db.collection('media_content');
    
    // Filter by type if specified
    if (type && ['video', 'audio'].includes(type)) {
      query = query.where('type', '==', type);
    }
    
    // Filter by language if specified
    if (language) {
      query = query.where('language', '==', language);
    }
    
    // Order results
    query = query.orderBy(orderBy, order);
    
    // Limit results
    query = query.limit(parseInt(limit));
    
    const snapshot = await query.get();
    
    const mediaList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
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
 * Get a single media item by ID
 * Requires: API Key with 'read:media' permission
 * 
 * Response includes:
 * - availableLanguages: Array of language codes for all variants of this content
 */
app.get('/api/media/:id', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('media_content').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media content not found'
      });
    }

    const mediaData = {
      id: doc.id,
      ...doc.data()
    };

    // Get available languages if part of a content group
    if (mediaData.contentGroupId) {
      const variantsSnapshot = await db.collection('media_content')
        .where('contentGroupId', '==', mediaData.contentGroupId)
        .get();
      
      mediaData.availableLanguages = variantsSnapshot.docs.map(v => v.data().language || 'en');
    } else {
      mediaData.availableLanguages = [mediaData.language || 'en'];
    }

    res.json({
      success: true,
      data: mediaData
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

// =============================================================================
// LANGUAGE SUPPORT ROUTES (Multi-language content)
// =============================================================================

// Language information mapping
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

/**
 * GET /api/languages
 * Get list of available languages with content counts
 * Requires: API Key with 'read:media' permission
 * 
 * Response:
 * - data: Array of { code, name, nativeName, count }
 */
app.get('/api/languages', checkApiKeyPermissions(), async (req, res) => {
  try {
    // Get all media documents to count languages
    const snapshot = await db.collection('media_content').get();
    
    const languageCounts = {};
    snapshot.docs.forEach(doc => {
      const lang = doc.data().language || 'en';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });
    
    // Map to language info with counts
    const languages = Object.entries(languageCounts)
      .map(([code, count]) => ({
        code,
        name: LANGUAGE_INFO[code]?.name || code.toUpperCase(),
        nativeName: LANGUAGE_INFO[code]?.nativeName || code.toUpperCase(),
        count
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    res.json({
      success: true,
      count: languages.length,
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
 * Get all language variants for a specific content group
 * Requires: API Key with 'read:media' permission
 * 
 * Used by the player for language switching between content variants
 */
app.get('/api/media/languages/:contentGroupId', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { contentGroupId } = req.params;
    
    if (!contentGroupId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Content group ID is required'
      });
    }
    
    // Query media with matching contentGroupId
    const snapshot = await db.collection('media_content')
      .where('contentGroupId', '==', contentGroupId)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'No content found for this content group'
      });
    }
    
    const variants = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      count: variants.length,
      data: variants
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
 * Download/stream media file with proxy support for CORS bypass
 * Requires: Firebase Authentication (logged-in users only)
 * Supports: Range requests for partial downloads/resume
 */
app.get('/api/media/:id/download', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Rate limiting check
    const rateLimitResult = downloadRateLimiter.check(req.user.uid);
    res.setHeader('X-RateLimit-Limit', downloadRateLimiter.maxRequests);
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
    
    if (!rateLimitResult.allowed) {
      res.setHeader('Retry-After', rateLimitResult.retryAfter);
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'Download rate limit exceeded. Please try again later.',
        retryAfter: rateLimitResult.retryAfter
      });
    }
    
    // Look up media record in database
    const doc = await db.collection('media_content').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media content not found'
      });
    }

    const mediaData = doc.data();
    const { fileUrl, filePath, mimeType, fileSize, filename, originalName, type } = mediaData;

    // Log download request for analytics
    await db.collection('download_logs').add({
      mediaId: id,
      userId: req.user.uid,
      userEmail: req.user.email,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'] || 'Unknown',
      ip: req.ip || req.headers['x-forwarded-for'] || 'Unknown'
    });

    // Determine content type
    const contentType = mimeType || (type === 'audio' ? 'audio/mpeg' : 'video/mp4');
    
    // Determine filename for download
    const downloadFilename = originalName || filename || `media-${id}.${type === 'audio' ? 'mp3' : 'mp4'}`;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, X-RateLimit-Limit, X-RateLimit-Remaining');

    // Check if file is accessed via local file system path
    if (filePath) {
      const absolutePath = path.resolve('.' + filePath);
      
      // Verify file exists
      if (!fs.existsSync(absolutePath)) {
        console.error(`File not found at path: ${absolutePath}`);
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Media file not found on server'
        });
      }

      const stat = fs.statSync(absolutePath);
      const totalSize = stat.size;

      // Handle range requests for partial downloads/resume
      const range = req.headers.range;
      
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
        const chunkSize = (end - start) + 1;

        // Validate range
        if (start >= totalSize || end >= totalSize) {
          res.status(416).setHeader('Content-Range', `bytes */${totalSize}`);
          return res.end();
        }

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', chunkSize);
        res.setHeader('Content-Type', contentType);

        const stream = fs.createReadStream(absolutePath, { start, end });
        stream.pipe(res);

        stream.on('error', (err) => {
          console.error('Stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: 'Stream Error',
              message: 'Error streaming file'
            });
          }
        });
      } else {
        // Full file download
        res.setHeader('Content-Length', totalSize);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadFilename)}"`);

        const stream = fs.createReadStream(absolutePath);
        stream.pipe(res);

        stream.on('error', (err) => {
          console.error('Stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: 'Stream Error',
              message: 'Error streaming file'
            });
          }
        });
      }
    } 
    // File accessed via URL (remote/CDN)
    else if (fileUrl) {
      const https = require('https');
      const http = require('http');
      const urlModule = require('url');
      
      const parsedUrl = urlModule.parse(fileUrl);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      // Build request options
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        method: 'GET',
        headers: {}
      };

      // Forward range header if present
      if (req.headers.range) {
        options.headers['Range'] = req.headers.range;
      }

      const proxyReq = protocol.request(options, (proxyRes) => {
        // Forward status code
        res.status(proxyRes.statusCode);

        // Forward relevant headers
        if (proxyRes.headers['content-length']) {
          res.setHeader('Content-Length', proxyRes.headers['content-length']);
        }
        if (proxyRes.headers['content-range']) {
          res.setHeader('Content-Range', proxyRes.headers['content-range']);
        }
        if (proxyRes.headers['accept-ranges']) {
          res.setHeader('Accept-Ranges', proxyRes.headers['accept-ranges']);
        }
        
        res.setHeader('Content-Type', proxyRes.headers['content-type'] || contentType);
        
        // Only set Content-Disposition for full downloads (not range requests)
        if (!req.headers.range) {
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadFilename)}"`);
        }

        // Pipe the response
        proxyRes.pipe(res);

        proxyRes.on('error', (err) => {
          console.error('Proxy response error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: 'Proxy Error',
              message: 'Error proxying file'
            });
          }
        });
      });

      proxyReq.on('error', (err) => {
        console.error('Proxy request error:', err);
        if (!res.headersSent) {
          res.status(502).json({
            success: false,
            error: 'Bad Gateway',
            message: 'Failed to fetch file from remote server'
          });
        }
      });

      proxyReq.end();
    } else {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'No file URL or path available for this media'
      });
    }

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
 * OPTIONS /api/media/:id/download
 * Handle preflight CORS requests for download endpoint
 */
app.options('/api/media/:id/download', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.status(204).end();
});

/**
 * GET /api/settings
 * Get app settings
 * Requires: API Key with 'read:settings' permission
 */
app.get('/api/settings', checkApiKeyPermissions(), async (req, res) => {
  try {
    const doc = await db.collection('app_settings').doc('general').get();
    
    const settings = doc.exists ? doc.data() : {
      appName: 'MediaCore',
      version: '1.0.0',
      defaultSettings: true
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch settings'
    });
  }
});

// =============================================================================
// USER SUBSCRIPTION ROUTES (Require Firebase Authentication)
// =============================================================================

// Subscription tier features configuration
const SUBSCRIPTION_TIERS = {
  free: {
    playbackLimit: 600,        // 10 minutes in seconds
    resetInterval: 7200000,    // 2 hours in milliseconds
    languages: ['en'],
    offline: false,
    adFree: false,
    apiAccess: false
  },
  premium: {
    playbackLimit: 18000,      // 5 hours in seconds
    resetInterval: 86400000,   // 24 hours in milliseconds
    languages: 'all',
    offline: true,
    adFree: true,
    apiAccess: false
  },
  premium_plus: {
    playbackLimit: -1,         // Unlimited
    resetInterval: 0,
    languages: 'all',
    offline: true,
    adFree: true,
    apiAccess: false
  },
  enterprise: {
    playbackLimit: -1,         // Unlimited
    resetInterval: 0,
    languages: 'all',
    offline: true,
    adFree: true,
    apiAccess: true
  }
};

/**
 * GET /api/user/subscription
 * Get current user's subscription tier and features
 * Requires: Firebase Authentication (logged-in users)
 */
app.get('/api/user/subscription', checkAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    
    // Get user's custom claims from Firebase Auth
    const userRecord = await auth.getUser(uid);
    let subscriptionTier = userRecord.customClaims?.subscriptionTier;
    let updatedAt = null;
    
    // If no custom claim, check Firestore user_subscriptions collection as fallback
    if (!subscriptionTier) {
      const subscriptionDoc = await db.collection('user_subscriptions').doc(uid).get();
      if (subscriptionDoc.exists) {
        subscriptionTier = subscriptionDoc.data().subscriptionTier;
        updatedAt = subscriptionDoc.data().updatedAt;
      }
    }
    
    // Default to 'free' if no subscription found
    subscriptionTier = subscriptionTier || 'free';
    
    // Get tier features
    const tierFeatures = SUBSCRIPTION_TIERS[subscriptionTier] || SUBSCRIPTION_TIERS.free;

    res.json({
      success: true,
      data: {
        subscriptionTier,
        updatedAt: updatedAt || new Date().toISOString(),
        ...tierFeatures,
        features: {
          languages: tierFeatures.languages,
          offline: tierFeatures.offline,
          adFree: tierFeatures.adFree,
          apiAccess: tierFeatures.apiAccess
        }
      }
    });
  } catch (error) {
    console.error('Error getting user subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get subscription information'
    });
  }
});

// =============================================================================
// USER STATS ROUTES (Require Firebase Authentication)
// =============================================================================

/**
 * GET /api/user/stats
 * Get current user's listening statistics
 * Requires: Firebase Authentication (logged-in users)
 */
app.get('/api/user/stats', checkAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    
    // Get user's overall stats
    const statsDoc = await db.collection('users').doc(uid).collection('stats').doc('overall').get();
    const stats = statsDoc.exists ? statsDoc.data() : {
      totalListeningTime: 0,
      totalPlays: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedDate: null
    };

    // Get weekly activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    
    const dailyActivitySnapshot = await db.collection('users').doc(uid)
      .collection('dailyActivity')
      .where('__name__', '>=', weekAgoStr)
      .orderBy('__name__', 'desc')
      .get();
    
    const weeklyActivity = {};
    dailyActivitySnapshot.docs.forEach(doc => {
      weeklyActivity[doc.id] = doc.data().listeningTime || 0;
    });

    // Get play history for top tracks and artists (last 30 days)
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    const playsSnapshot = await db.collection('users').doc(uid)
      .collection('plays')
      .where('playedAt', '>=', monthAgo)
      .orderBy('playedAt', 'desc')
      .limit(500)
      .get();

    // Calculate unique tracks and artists, and top items
    const trackCounts = {};
    const artistCounts = {};
    const trackInfo = {};
    const artistInfo = {};
    let uniqueTracks = new Set();
    let uniqueArtists = new Set();
    let lastPlayedAt = null;

    playsSnapshot.docs.forEach(doc => {
      const play = doc.data();
      const mediaId = play.mediaId;
      const artistId = play.artistId;
      
      if (mediaId) {
        uniqueTracks.add(mediaId);
        trackCounts[mediaId] = (trackCounts[mediaId] || 0) + 1;
        if (play.title) {
          trackInfo[mediaId] = { title: play.title, artist: play.artistName || '' };
        }
      }
      
      if (artistId) {
        uniqueArtists.add(artistId);
        artistCounts[artistId] = (artistCounts[artistId] || 0) + 1;
        if (play.artistName) {
          artistInfo[artistId] = { name: play.artistName };
        }
      }

      // Track last played timestamp
      if (play.playedAt && (!lastPlayedAt || play.playedAt.toDate() > lastPlayedAt)) {
        lastPlayedAt = play.playedAt.toDate();
      }
    });

    // Build top tracks (top 10)
    const topTracks = Object.entries(trackCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([mediaId, playCount]) => ({
        mediaId,
        playCount,
        title: trackInfo[mediaId]?.title || 'Unknown',
        artist: trackInfo[mediaId]?.artist || 'Unknown'
      }));

    // Build top artists (top 10)
    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([artistId, playCount]) => ({
        artistId,
        playCount,
        name: artistInfo[artistId]?.name || 'Unknown'
      }));

    res.json({
      success: true,
      data: {
        totalListeningTime: stats.totalListeningTime || 0,
        totalPlays: stats.totalPlays || 0,
        uniqueTracks: uniqueTracks.size,
        uniqueArtists: uniqueArtists.size,
        currentStreak: stats.currentStreak || 0,
        longestStreak: stats.longestStreak || 0,
        lastPlayedAt: lastPlayedAt ? lastPlayedAt.toISOString() : null,
        weeklyActivity,
        topTracks,
        topArtists
      }
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get user statistics'
    });
  }
});

/**
 * POST /api/user/stats/play
 * Record a play event for the current user
 * Requires: Firebase Authentication (logged-in users)
 * 
 * Body: {
 *   mediaId: string,
 *   duration: number (seconds listened),
 *   completed: boolean,
 *   artistId?: string,
 *   title?: string,
 *   artistName?: string
 * }
 */
app.post('/api/user/stats/play', checkAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { mediaId, duration, completed, artistId, title, artistName } = req.body;

    // Validate required fields
    if (!mediaId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'mediaId is required'
      });
    }

    if (typeof duration !== 'number' || duration < 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'duration must be a positive number (seconds)'
      });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Record the play event
    const playData = {
      mediaId,
      duration,
      completed: completed || false,
      artistId: artistId || null,
      title: title || null,
      artistName: artistName || null,
      playedAt: now
    };

    await db.collection('users').doc(uid).collection('plays').add(playData);

    // 2. Update daily activity
    const dailyRef = db.collection('users').doc(uid).collection('dailyActivity').doc(today);
    const dailyDoc = await dailyRef.get();
    
    if (dailyDoc.exists) {
      await dailyRef.update({
        listeningTime: (dailyDoc.data().listeningTime || 0) + duration,
        playCount: (dailyDoc.data().playCount || 0) + 1
      });
    } else {
      await dailyRef.set({
        listeningTime: duration,
        playCount: 1,
        date: today
      });
    }

    // 3. Update overall stats and streak
    const statsRef = db.collection('users').doc(uid).collection('stats').doc('overall');
    const statsDoc = await statsRef.get();
    const currentStats = statsDoc.exists ? statsDoc.data() : {
      totalListeningTime: 0,
      totalPlays: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedDate: null
    };

    // Calculate streak
    let newStreak = currentStats.currentStreak || 0;
    const lastPlayedDate = currentStats.lastPlayedDate;
    
    if (lastPlayedDate) {
      const lastDate = new Date(lastPlayedDate);
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastPlayedDate === today) {
        // Same day, streak unchanged
      } else if (lastPlayedDate === yesterdayStr) {
        // Consecutive day, increment streak
        newStreak += 1;
      } else {
        // Streak broken, reset to 1
        newStreak = 1;
      }
    } else {
      // First play ever
      newStreak = 1;
    }

    const newLongestStreak = Math.max(currentStats.longestStreak || 0, newStreak);

    // Update stats
    const updatedStats = {
      totalListeningTime: (currentStats.totalListeningTime || 0) + duration,
      totalPlays: (currentStats.totalPlays || 0) + 1,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastPlayedDate: today,
      lastPlayedAt: now.toISOString()
    };

    await statsRef.set(updatedStats, { merge: true });

    res.json({
      success: true,
      message: 'Play recorded successfully',
      stats: {
        totalListeningTime: updatedStats.totalListeningTime,
        totalPlays: updatedStats.totalPlays,
        currentStreak: updatedStats.currentStreak,
        longestStreak: updatedStats.longestStreak,
        todayListeningTime: (dailyDoc.exists ? dailyDoc.data().listeningTime : 0) + duration
      }
    });
  } catch (error) {
    console.error('Error recording play:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to record play event'
    });
  }
});

/**
 * DELETE /api/user/stats
 * Reset user's listening statistics (for testing/privacy)
 * Requires: Firebase Authentication (logged-in users)
 */
app.delete('/api/user/stats', checkAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { confirm } = req.query;

    if (confirm !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Add ?confirm=true to confirm deletion of all stats'
      });
    }

    // Delete all plays
    const playsSnapshot = await db.collection('users').doc(uid).collection('plays').get();
    const batch1 = db.batch();
    playsSnapshot.docs.forEach(doc => batch1.delete(doc.ref));
    await batch1.commit();

    // Delete all daily activity
    const dailySnapshot = await db.collection('users').doc(uid).collection('dailyActivity').get();
    const batch2 = db.batch();
    dailySnapshot.docs.forEach(doc => batch2.delete(doc.ref));
    await batch2.commit();

    // Reset overall stats
    await db.collection('users').doc(uid).collection('stats').doc('overall').delete();

    res.json({
      success: true,
      message: 'All listening statistics have been reset'
    });
  } catch (error) {
    console.error('Error resetting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to reset statistics'
    });
  }
});

// =============================================================================
// USER PRESENCE / HEARTBEAT ROUTES
// =============================================================================

// In-memory store for online users (for quick access)
// Also persisted to Firestore for reliability
const onlineUsersCache = new Map(); // uid -> { user data, lastSeen }

/**
 * Get location from IP address using ip-api.com
 * @param {string} ip - IP address to lookup
 * @returns {Promise<string|null>} - Location string or null
 */
const getLocationFromIP = async (ip) => {
  try {
    // Skip for localhost/private IPs
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'Unknown' || 
        ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return 'Local Network';
    }
    
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=city,country`);
    const data = await response.json();
    
    if (data.city && data.country) {
      return `${data.city}, ${data.country}`;
    }
    return null;
  } catch (error) {
    console.error('Geolocation lookup failed:', error);
    return null;
  }
};

/**
 * POST /api/user/heartbeat
 * Update user's online presence status
 * Requires: Firebase Authentication (logged-in users)
 * 
 * Users should call this every 30 seconds while active
 * Captures session info: IP address, user agent, and geolocation
 */
app.post('/api/user/heartbeat', checkAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const now = new Date();
    
    // Extract session info from request
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'Unknown';
    const userAgent = req.headers['user-agent'] || '';
    
    // Get geolocation from IP (non-blocking)
    const location = await getLocationFromIP(ipAddress);
    
    // Get additional user info from Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUser(uid);
    } catch (e) {
      userRecord = { displayName: null, email: req.user.email, photoURL: null };
    }

    const presenceData = {
      uid,
      email: userRecord.email || req.user.email,
      displayName: userRecord.displayName || null,
      photoURL: userRecord.photoURL || null,
      lastSeen: now.toISOString(),
      lastActive: now,
      ipAddress,
      userAgent,
      location
    };

    // Update in-memory cache
    onlineUsersCache.set(uid, presenceData);

    // Persist to Firestore for reliability across server restarts
    await db.collection('userPresence').doc(uid).set({
      uid,
      email: presenceData.email,
      displayName: presenceData.displayName,
      photoURL: presenceData.photoURL,
      lastActive: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: now.toISOString(),
      ipAddress,
      userAgent,
      location
    }, { merge: true });

    res.json({ 
      success: true,
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update heartbeat'
    });
  }
});

/**
 * GET /api/user/presence
 * Get current user's presence status
 * Requires: Firebase Authentication (logged-in users)
 */
app.get('/api/user/presence', checkAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    
    const presenceDoc = await db.collection('userPresence').doc(uid).get();
    
    if (!presenceDoc.exists) {
      return res.json({
        success: true,
        data: {
          isOnline: false,
          lastSeen: null
        }
      });
    }

    const data = presenceDoc.data();
    const lastActive = data.lastActive?.toDate ? data.lastActive.toDate() : new Date(data.lastActive);
    const isOnline = (Date.now() - lastActive.getTime()) < 120000; // 2 minutes

    res.json({
      success: true,
      data: {
        isOnline,
        lastSeen: lastActive.toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting presence:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get presence status'
    });
  }
});

// =============================================================================
// ADMIN ROUTES (Require Firebase Admin Authentication)
// =============================================================================

/**
 * GET /admin/users/online
 * Get list of currently online users with session info
 * Requires: Firebase Admin Authentication
 */
app.get('/admin/users/online', checkAdminAuth, async (req, res) => {
  try {
    const { threshold = 120 } = req.query; // Default 2 minutes (120 seconds)
    const ONLINE_THRESHOLD = parseInt(threshold) * 1000; // Convert to milliseconds
    const now = Date.now();
    const cutoffTime = new Date(now - ONLINE_THRESHOLD);

    // First, try to get from Firestore (more reliable)
    const snapshot = await db.collection('userPresence')
      .where('lastActive', '>', cutoffTime)
      .orderBy('lastActive', 'desc')
      .get();

    const onlineUsers = snapshot.docs.map(doc => {
      const data = doc.data();
      const lastActive = data.lastActive?.toDate ? data.lastActive.toDate() : new Date(data.lastActive);
      return {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        lastSeen: lastActive.toISOString(),
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        location: data.location || null
      };
    });

    // Also clean up in-memory cache
    onlineUsersCache.forEach((user, uid) => {
      const lastSeen = new Date(user.lastSeen).getTime();
      if (now - lastSeen > ONLINE_THRESHOLD) {
        onlineUsersCache.delete(uid);
      }
    });

    res.json({
      success: true,
      data: {
        count: onlineUsers.length,
        thresholdSeconds: parseInt(threshold),
        users: onlineUsers
      }
    });
  } catch (error) {
    console.error('Error getting online users:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get online users'
    });
  }
});

/**
 * POST /admin/generate-key
 * Generate a new API key with specified permissions
 * Requires: Firebase Admin Authentication
 */
app.post('/admin/generate-key', checkAdminAuth, async (req, res) => {
  try {
    const { 
      name, 
      accessType = 'read_only', 
      customPermissions = [], 
      expiresInDays = null,
      description = ''
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'API key name is required'
      });
    }

    // Validate access type
    const validAccessTypes = ['read_only', 'full_access', 'custom'];
    if (!validAccessTypes.includes(accessType)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Invalid access type. Must be one of: ${validAccessTypes.join(', ')}`
      });
    }

    // Get permissions based on access type
    let permissions;
    if (accessType === 'custom') {
      // Validate custom permissions
      const validation = validatePermissions(customPermissions);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: validation.message,
          availablePermissions: PERMISSION_PRESETS.available_permissions
        });
      }
      permissions = customPermissions;
    } else {
      permissions = getPermissionsByAccessType(accessType);
    }

    // Generate unique API key
    const apiKey = `mc_${uuidv4().replace(/-/g, '')}`;

    // Calculate expiration date if specified
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Create API key document
    const keyData = {
      key: apiKey,
      name,
      description,
      accessType,
      permissions,
      isActive: true,
      createdBy: req.user.uid,
      createdByEmail: req.user.email,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      lastUsedAt: null,
      usageCount: 0
    };

    const docRef = await db.collection('api_keys').add(keyData);

    res.status(201).json({
      success: true,
      message: 'API key generated successfully',
      data: {
        id: docRef.id,
        key: apiKey,
        name,
        accessType,
        permissions,
        expiresAt: expiresAt ? expiresAt.toISOString() : 'Never'
      }
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to generate API key'
    });
  }
});

/**
 * GET /admin/api-keys
 * List all API keys
 * Requires: Firebase Admin Authentication
 */
app.get('/admin/api-keys', checkAdminAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('api_keys')
      .orderBy('createdAt', 'desc')
      .get();
    
    const keys = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        accessType: data.accessType,
        permissions: data.permissions,
        isActive: data.isActive,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        lastUsedAt: data.lastUsedAt,
        usageCount: data.usageCount,
        // Mask the key for security (show only last 8 chars)
        keyPreview: `mc_****${data.key.slice(-8)}`
      };
    });

    res.json({
      success: true,
      count: keys.length,
      data: keys
    });
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to list API keys'
    });
  }
});

/**
 * DELETE /admin/api-keys/:id
 * Revoke/delete an API key
 * Requires: Firebase Admin Authentication
 */
app.delete('/admin/api-keys/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { hardDelete = false } = req.query;

    const docRef = db.collection('api_keys').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'API key not found'
      });
    }

    if (hardDelete === 'true') {
      await docRef.delete();
    } else {
      // Soft delete - just deactivate
      await docRef.update({
        isActive: false,
        deactivatedAt: new Date().toISOString(),
        deactivatedBy: req.user.uid
      });
    }

    res.json({
      success: true,
      message: hardDelete === 'true' ? 'API key deleted permanently' : 'API key deactivated'
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete API key'
    });
  }
});

/**
 * POST /admin/media
 * Upload new media content
 * Requires: Firebase Admin Authentication
 * 
 * New fields for multi-language support:
 * - language: Language code (e.g., "en", "hi", "te") - defaults to "en"
 * - contentGroupId: Groups different language versions of same content
 */
app.post('/admin/media', checkAdminAuth, upload.single('file'), async (req, res) => {
  try {
    const { title, subtitle, language = 'en', contentGroupId } = req.body;
    const file = req.file;
    
    // Get type from body, query, or use detected type from multer, or infer from file
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

    // Generate contentGroupId if not provided (for grouping language variants)
    const finalContentGroupId = contentGroupId || `cg_${Date.now()}_${uuidv4().substring(0, 8)}`;

    // Construct the file path for storage
    const relativePath = `/public/uploads/${type}/${file.filename}`;
    const fileUrl = `${req.protocol}://${req.get('host')}${relativePath}`;

    // Save metadata to Firestore
    const mediaData = {
      title,
      subtitle: subtitle || '',
      type,
      language,                          // NEW: Language code
      contentGroupId: finalContentGroupId, // NEW: Content group for language variants
      filename: file.filename,
      originalName: file.originalname,
      filePath: relativePath,
      fileUrl,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: req.user.uid,
      uploadedByEmail: req.user.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('media_content').add(mediaData);

    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      data: {
        id: docRef.id,
        ...mediaData
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
 * PUT /admin/media/:id
 * Update media metadata (including artist and album assignments)
 * Requires: Firebase Admin Authentication
 */
app.put('/admin/media/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, artistId, albumId } = req.body;

    const docRef = db.collection('media_content').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media content not found'
      });
    }

    const updateData = {
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    };

    if (title !== undefined) updateData.title = title;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (artistId !== undefined) updateData.artistId = artistId;
    if (albumId !== undefined) updateData.albumId = albumId;

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();

    res.json({
      success: true,
      message: 'Media updated successfully',
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
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
 * Delete media content (file and metadata)
 * Requires: Firebase Admin Authentication
 */
app.delete('/admin/media/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteFile = true } = req.query;

    const docRef = db.collection('media_content').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media content not found'
      });
    }

    const mediaData = doc.data();

    // Delete the physical file if requested
    if (deleteFile !== 'false' && mediaData.filePath) {
      const filePath = path.resolve('.' + mediaData.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted file: ${filePath}`);
      }
    }

    // Delete the Firestore document
    await docRef.delete();

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

/**
 * PUT /admin/settings
 * Update app settings
 * Requires: Firebase Admin Authentication
 */
app.put('/admin/settings', checkAdminAuth, async (req, res) => {
  try {
    const settings = req.body;

    if (!settings || Object.keys(settings).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'No settings provided'
      });
    }

    const docRef = db.collection('app_settings').doc('general');
    
    await docRef.set({
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    }, { merge: true });

    const updatedDoc = await docRef.get();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedDoc.data()
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update settings'
    });
  }
});

/**
 * GET /admin/permissions
 * Get available permissions list
 * Requires: Firebase Admin Authentication
 */
app.get('/admin/permissions', checkAdminAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      presets: {
        read_only: PERMISSION_PRESETS.read_only,
        full_access: PERMISSION_PRESETS.full_access
      },
      available: PERMISSION_PRESETS.available_permissions
    }
  });
});

// =============================================================================
// ARTISTS ROUTES
// =============================================================================

/**
 * GET /api/artists
 * Get all artists
 * Requires: API Key with 'read:media' permission
 */
app.get('/api/artists', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { limit = 50, orderBy = 'createdAt', order = 'desc' } = req.query;
    
    let query = db.collection('artists');
    query = query.orderBy(orderBy, order);
    query = query.limit(parseInt(limit));
    
    const snapshot = await query.get();
    
    const artists = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      count: artists.length,
      data: artists
    });
  } catch (error) {
    console.error('Error fetching artists:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch artists'
    });
  }
});

/**
 * GET /api/artists/:id
 * Get single artist by ID
 * Requires: API Key with 'read:media' permission
 */
app.get('/api/artists/:id', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('artists').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Artist not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data()
      }
    });
  } catch (error) {
    console.error('Error fetching artist:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch artist'
    });
  }
});

/**
 * GET /api/artists/:id/albums
 * Get all albums for an artist
 * Requires: API Key with 'read:media' permission
 */
app.get('/api/artists/:id/albums', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    const { orderBy = 'releaseDate', order = 'desc' } = req.query;
    
    // Verify artist exists
    const artistDoc = await db.collection('artists').doc(id).get();
    if (!artistDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Artist not found'
      });
    }
    
    const snapshot = await db.collection('albums')
      .where('artistId', '==', id)
      .orderBy(orderBy, order)
      .get();
    
    const albums = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      count: albums.length,
      data: albums
    });
  } catch (error) {
    console.error('Error fetching artist albums:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch artist albums'
    });
  }
});

/**
 * GET /api/artists/:id/media
 * Get all media for an artist (across all albums + singles)
 * Requires: API Key with 'read:media' permission
 */
app.get('/api/artists/:id/media', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    const { type, orderBy = 'createdAt', order = 'desc' } = req.query;
    
    // Verify artist exists
    const artistDoc = await db.collection('artists').doc(id).get();
    if (!artistDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Artist not found'
      });
    }
    
    let query = db.collection('media_content').where('artistId', '==', id);
    
    if (type && ['video', 'audio'].includes(type)) {
      query = query.where('type', '==', type);
    }
    
    query = query.orderBy(orderBy, order);
    
    const snapshot = await query.get();
    
    const media = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      count: media.length,
      data: media
    });
  } catch (error) {
    console.error('Error fetching artist media:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch artist media'
    });
  }
});

/**
 * POST /admin/artists
 * Create new artist
 * Requires: Firebase Admin Authentication
 */
app.post('/admin/artists', checkAdminAuth, async (req, res) => {
  try {
    const { name, bio, image } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Artist name is required'
      });
    }

    const artistData = {
      name,
      bio: bio || '',
      image: image || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.uid
    };

    const docRef = await db.collection('artists').add(artistData);

    res.status(201).json({
      success: true,
      message: 'Artist created successfully',
      data: {
        id: docRef.id,
        ...artistData
      }
    });
  } catch (error) {
    console.error('Error creating artist:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create artist'
    });
  }
});

/**
 * PUT /admin/artists/:id
 * Update artist
 * Requires: Firebase Admin Authentication
 */
app.put('/admin/artists/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, bio, image } = req.body;

    const docRef = db.collection('artists').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Artist not found'
      });
    }

    const updateData = {
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    };

    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (image !== undefined) updateData.image = image;

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();

    res.json({
      success: true,
      message: 'Artist updated successfully',
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error('Error updating artist:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update artist'
    });
  }
});

/**
 * DELETE /admin/artists/:id
 * Delete artist
 * Requires: Firebase Admin Authentication
 */
app.delete('/admin/artists/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { cascade = false } = req.query;

    const docRef = db.collection('artists').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Artist not found'
      });
    }

    // Check for associated albums
    const albumsSnapshot = await db.collection('albums')
      .where('artistId', '==', id)
      .get();

    // Check for associated media
    const mediaSnapshot = await db.collection('media_content')
      .where('artistId', '==', id)
      .get();

    if (!cascade && (albumsSnapshot.size > 0 || mediaSnapshot.size > 0)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Cannot delete artist with ${albumsSnapshot.size} albums and ${mediaSnapshot.size} media items. Use ?cascade=true to delete all associated content.`
      });
    }

    // If cascade delete, remove artist references from albums and media
    if (cascade === 'true') {
      const batch = db.batch();
      
      // Update albums to remove artistId
      albumsSnapshot.docs.forEach(albumDoc => {
        batch.update(albumDoc.ref, { artistId: null, updatedAt: new Date().toISOString() });
      });
      
      // Update media to remove artistId
      mediaSnapshot.docs.forEach(mediaDoc => {
        batch.update(mediaDoc.ref, { artistId: null, updatedAt: new Date().toISOString() });
      });
      
      await batch.commit();
    }

    await docRef.delete();

    res.json({
      success: true,
      message: 'Artist deleted successfully',
      cascade: cascade === 'true',
      affectedAlbums: albumsSnapshot.size,
      affectedMedia: mediaSnapshot.size
    });
  } catch (error) {
    console.error('Error deleting artist:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete artist'
    });
  }
});

// =============================================================================
// ALBUMS ROUTES
// =============================================================================

/**
 * GET /api/albums
 * Get all albums
 * Requires: API Key with 'read:media' permission
 */
app.get('/api/albums', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { artistId, limit = 50, orderBy = 'releaseDate', order = 'desc' } = req.query;
    
    let query = db.collection('albums');
    
    if (artistId) {
      query = query.where('artistId', '==', artistId);
    }
    
    query = query.orderBy(orderBy, order);
    query = query.limit(parseInt(limit));
    
    const snapshot = await query.get();
    
    const albums = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      count: albums.length,
      data: albums
    });
  } catch (error) {
    console.error('Error fetching albums:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch albums'
    });
  }
});

/**
 * GET /api/albums/:id
 * Get single album by ID
 * Requires: API Key with 'read:media' permission
 */
app.get('/api/albums/:id', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('albums').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Album not found'
      });
    }

    const albumData = {
      id: doc.id,
      ...doc.data()
    };

    // Optionally include artist info
    if (albumData.artistId) {
      const artistDoc = await db.collection('artists').doc(albumData.artistId).get();
      if (artistDoc.exists) {
        albumData.artist = {
          id: artistDoc.id,
          ...artistDoc.data()
        };
      }
    }

    res.json({
      success: true,
      data: albumData
    });
  } catch (error) {
    console.error('Error fetching album:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch album'
    });
  }
});

/**
 * GET /api/albums/:id/media
 * Get all media in an album (ordered by trackNumber)
 * Requires: API Key with 'read:media' permission
 */
app.get('/api/albums/:id/media', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify album exists
    const albumDoc = await db.collection('albums').doc(id).get();
    if (!albumDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Album not found'
      });
    }

    // Get media-album relationships ordered by track number
    const relationshipsSnapshot = await db.collection('album_media')
      .where('albumId', '==', id)
      .orderBy('trackNumber', 'asc')
      .get();

    if (relationshipsSnapshot.empty) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Get all media IDs
    const mediaIds = relationshipsSnapshot.docs.map(doc => doc.data().mediaId);
    const trackNumbers = {};
    relationshipsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      trackNumbers[data.mediaId] = data.trackNumber;
    });

    // Fetch media items (Firestore 'in' query limited to 10 items, so batch if needed)
    const mediaItems = [];
    const batchSize = 10;
    
    for (let i = 0; i < mediaIds.length; i += batchSize) {
      const batchIds = mediaIds.slice(i, i + batchSize);
      const mediaSnapshot = await db.collection('media_content')
        .where('__name__', 'in', batchIds)
        .get();
      
      mediaSnapshot.docs.forEach(doc => {
        mediaItems.push({
          id: doc.id,
          trackNumber: trackNumbers[doc.id],
          ...doc.data()
        });
      });
    }

    // Sort by track number
    mediaItems.sort((a, b) => a.trackNumber - b.trackNumber);

    res.json({
      success: true,
      count: mediaItems.length,
      data: mediaItems
    });
  } catch (error) {
    console.error('Error fetching album media:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch album media'
    });
  }
});

/**
 * POST /admin/albums
 * Create new album
 * Requires: Firebase Admin Authentication
 */
app.post('/admin/albums', checkAdminAuth, async (req, res) => {
  try {
    const { title, description, coverImage, artistId, releaseDate, genre } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Album title is required'
      });
    }

    // Verify artist exists if provided
    if (artistId) {
      const artistDoc = await db.collection('artists').doc(artistId).get();
      if (!artistDoc.exists) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Artist not found'
        });
      }
    }

    const albumData = {
      title,
      description: description || '',
      coverImage: coverImage || '',
      artistId: artistId || null,
      releaseDate: releaseDate || new Date().toISOString(),
      genre: genre || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.uid,
      trackCount: 0
    };

    const docRef = await db.collection('albums').add(albumData);

    res.status(201).json({
      success: true,
      message: 'Album created successfully',
      data: {
        id: docRef.id,
        ...albumData
      }
    });
  } catch (error) {
    console.error('Error creating album:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create album'
    });
  }
});

/**
 * PUT /admin/albums/:id
 * Update album
 * Requires: Firebase Admin Authentication
 */
app.put('/admin/albums/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, coverImage, artistId, releaseDate, genre } = req.body;

    const docRef = db.collection('albums').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Album not found'
      });
    }

    // Verify artist exists if being updated
    if (artistId !== undefined && artistId !== null) {
      const artistDoc = await db.collection('artists').doc(artistId).get();
      if (!artistDoc.exists) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Artist not found'
        });
      }
    }

    const updateData = {
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (artistId !== undefined) updateData.artistId = artistId;
    if (releaseDate !== undefined) updateData.releaseDate = releaseDate;
    if (genre !== undefined) updateData.genre = genre;

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();

    res.json({
      success: true,
      message: 'Album updated successfully',
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error('Error updating album:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update album'
    });
  }
});

/**
 * DELETE /admin/albums/:id
 * Delete album
 * Requires: Firebase Admin Authentication
 */
app.delete('/admin/albums/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const docRef = db.collection('albums').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Album not found'
      });
    }

    // Delete all album-media relationships
    const relationshipsSnapshot = await db.collection('album_media')
      .where('albumId', '==', id)
      .get();

    const batch = db.batch();
    relationshipsSnapshot.docs.forEach(relDoc => {
      batch.delete(relDoc.ref);
    });

    // Delete the album
    batch.delete(docRef);
    
    await batch.commit();

    res.json({
      success: true,
      message: 'Album deleted successfully',
      removedTracks: relationshipsSnapshot.size
    });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete album'
    });
  }
});

// =============================================================================
// ALBUM-MEDIA RELATIONSHIP ROUTES
// =============================================================================

/**
 * POST /admin/albums/:albumId/media
 * Add media to album with track number
 * Requires: Firebase Admin Authentication
 */
app.post('/admin/albums/:albumId/media', checkAdminAuth, async (req, res) => {
  try {
    const { albumId } = req.params;
    const { mediaId, trackNumber } = req.body;

    if (!mediaId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'mediaId is required'
      });
    }

    // Verify album exists
    const albumDoc = await db.collection('albums').doc(albumId).get();
    if (!albumDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Album not found'
      });
    }

    // Verify media exists
    const mediaDoc = await db.collection('media_content').doc(mediaId).get();
    if (!mediaDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media not found'
      });
    }

    // Check if relationship already exists
    const existingRelationship = await db.collection('album_media')
      .where('albumId', '==', albumId)
      .where('mediaId', '==', mediaId)
      .get();

    if (!existingRelationship.empty) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'Media is already in this album'
      });
    }

    // Get current track count to auto-assign track number if not provided
    const currentTracks = await db.collection('album_media')
      .where('albumId', '==', albumId)
      .get();

    const assignedTrackNumber = trackNumber || (currentTracks.size + 1);

    // Create the relationship
    const relationshipData = {
      albumId,
      mediaId,
      trackNumber: assignedTrackNumber,
      addedAt: new Date().toISOString(),
      addedBy: req.user.uid
    };

    const docRef = await db.collection('album_media').add(relationshipData);

    // Update album track count
    await db.collection('albums').doc(albumId).update({
      trackCount: currentTracks.size + 1,
      updatedAt: new Date().toISOString()
    });

    // Also update the media item with albumId reference
    await db.collection('media_content').doc(mediaId).update({
      albumId,
      updatedAt: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Media added to album successfully',
      data: {
        id: docRef.id,
        ...relationshipData
      }
    });
  } catch (error) {
    console.error('Error adding media to album:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to add media to album'
    });
  }
});

/**
 * DELETE /admin/albums/:albumId/media/:mediaId
 * Remove media from album
 * Requires: Firebase Admin Authentication
 */
app.delete('/admin/albums/:albumId/media/:mediaId', checkAdminAuth, async (req, res) => {
  try {
    const { albumId, mediaId } = req.params;

    // Find the relationship
    const relationshipSnapshot = await db.collection('album_media')
      .where('albumId', '==', albumId)
      .where('mediaId', '==', mediaId)
      .get();

    if (relationshipSnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media not found in this album'
      });
    }

    // Delete the relationship
    const batch = db.batch();
    relationshipSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Get remaining track count
    const remainingTracks = await db.collection('album_media')
      .where('albumId', '==', albumId)
      .get();

    // Update album track count
    const albumRef = db.collection('albums').doc(albumId);
    batch.update(albumRef, {
      trackCount: Math.max(0, remainingTracks.size - 1),
      updatedAt: new Date().toISOString()
    });

    // Remove albumId from media item
    const mediaRef = db.collection('media_content').doc(mediaId);
    batch.update(mediaRef, {
      albumId: null,
      updatedAt: new Date().toISOString()
    });

    await batch.commit();

    res.json({
      success: true,
      message: 'Media removed from album successfully'
    });
  } catch (error) {
    console.error('Error removing media from album:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to remove media from album'
    });
  }
});

/**
 * PUT /admin/albums/:albumId/media/reorder
 * Reorder tracks in album
 * Requires: Firebase Admin Authentication
 * Body: { tracks: [{ mediaId: "id", trackNumber: 1 }, ...] }
 */
app.put('/admin/albums/:albumId/media/reorder', checkAdminAuth, async (req, res) => {
  try {
    const { albumId } = req.params;
    const { tracks } = req.body;

    if (!tracks || !Array.isArray(tracks)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'tracks array is required with format [{ mediaId, trackNumber }, ...]'
      });
    }

    // Verify album exists
    const albumDoc = await db.collection('albums').doc(albumId).get();
    if (!albumDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Album not found'
      });
    }

    const batch = db.batch();
    const errors = [];

    for (const track of tracks) {
      const { mediaId, trackNumber } = track;
      
      if (!mediaId || trackNumber === undefined) {
        errors.push(`Invalid track entry: ${JSON.stringify(track)}`);
        continue;
      }

      // Find the relationship
      const relationshipSnapshot = await db.collection('album_media')
        .where('albumId', '==', albumId)
        .where('mediaId', '==', mediaId)
        .get();

      if (relationshipSnapshot.empty) {
        errors.push(`Media ${mediaId} not found in album`);
        continue;
      }

      // Update track number
      relationshipSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { 
          trackNumber,
          updatedAt: new Date().toISOString()
        });
      });
    }

    // Update album timestamp
    batch.update(db.collection('albums').doc(albumId), {
      updatedAt: new Date().toISOString()
    });

    await batch.commit();

    res.json({
      success: true,
      message: 'Tracks reordered successfully',
      updatedTracks: tracks.length - errors.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error reordering tracks:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to reorder tracks'
    });
  }
});

// =============================================================================
// USER MANAGEMENT ROUTES (Require Firebase Admin Authentication)
// =============================================================================

/**
 * GET /admin/users
 * List all users with pagination
 * Requires: Firebase Admin Authentication
 */
app.get('/admin/users', checkAdminAuth, async (req, res) => {
  try {
    const { limit = 100, pageToken } = req.query;
    const maxResults = Math.min(parseInt(limit), 1000); // Firebase max is 1000

    // List users from Firebase Auth
    const listUsersResult = await auth.listUsers(maxResults, pageToken || undefined);

    // Get user roles from Firestore
    const userRoles = {};
    const rolesSnapshot = await db.collection('user_roles').get();
    rolesSnapshot.docs.forEach(doc => {
      userRoles[doc.id] = doc.data();
    });

    // Map users with their roles and subscription tiers
    const users = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      phoneNumber: user.phoneNumber || null,
      disabled: user.disabled,
      emailVerified: user.emailVerified,
      creationTime: user.metadata.creationTime,
      lastSignInTime: user.metadata.lastSignInTime,
      role: userRoles[user.uid]?.role || 'user',
      subscriptionTier: user.customClaims?.subscriptionTier || 'free',
      customClaims: user.customClaims || {}
    }));

    res.json({
      success: true,
      count: users.length,
      pageToken: listUsersResult.pageToken || null,
      data: users
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to list users'
    });
  }
});

/**
 * GET /admin/users/:uid
 * Get single user by UID
 * Requires: Firebase Admin Authentication
 */
app.get('/admin/users/:uid', checkAdminAuth, async (req, res) => {
  try {
    const { uid } = req.params;

    // Get user from Firebase Auth
    const userRecord = await auth.getUser(uid);

    // Get user role from Firestore
    const roleDoc = await db.collection('user_roles').doc(uid).get();
    const roleData = roleDoc.exists ? roleDoc.data() : { role: 'user' };

    // Get user's activity/additional data from Firestore (if exists)
    const userDataDoc = await db.collection('users').doc(uid).get();
    const userData = userDataDoc.exists ? userDataDoc.data() : {};

    res.json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || null,
        photoURL: userRecord.photoURL || null,
        phoneNumber: userRecord.phoneNumber || null,
        disabled: userRecord.disabled,
        emailVerified: userRecord.emailVerified,
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
        role: roleData.role || 'user',
        subscriptionTier: userRecord.customClaims?.subscriptionTier || 'free',
        customClaims: userRecord.customClaims || {},
        providerData: userRecord.providerData,
        ...userData
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch user'
    });
  }
});

/**
 * PUT /admin/users/:uid/role
 * Update user role
 * Requires: Firebase Admin Authentication
 * Body: { role: "admin" | "moderator" | "user" }
 */
app.put('/admin/users/:uid/role', checkAdminAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['admin', 'moderator', 'user'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Verify user exists
    const userRecord = await auth.getUser(uid);

    // Prevent self-demotion from admin (optional safety check)
    if (uid === req.user.uid && role !== 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Cannot demote yourself from admin role'
      });
    }

    // Set custom claims for the user
    await auth.setCustomUserClaims(uid, { 
      role,
      isAdmin: role === 'admin'
    });

    // Store role in Firestore for easy querying
    await db.collection('user_roles').doc(uid).set({
      role,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    }, { merge: true });

    res.json({
      success: true,
      message: `User role updated to '${role}' successfully`,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        role,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update user role'
    });
  }
});

/**
 * PUT /admin/users/:uid/status
 * Enable or disable a user account
 * Requires: Firebase Admin Authentication
 * Body: { disabled: true | false }
 */
app.put('/admin/users/:uid/status', checkAdminAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const { disabled } = req.body;

    // Validate disabled parameter
    if (typeof disabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'disabled must be a boolean (true or false)'
      });
    }

    // Prevent self-disabling
    if (uid === req.user.uid && disabled === true) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Cannot disable your own account'
      });
    }

    // Update user status in Firebase Auth
    const userRecord = await auth.updateUser(uid, { disabled });

    // Log the status change in Firestore
    await db.collection('user_status_logs').add({
      uid,
      action: disabled ? 'disabled' : 'enabled',
      performedBy: req.user.uid,
      performedByEmail: req.user.email,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `User account ${disabled ? 'disabled' : 'enabled'} successfully`,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        disabled: userRecord.disabled,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update user status'
    });
  }
});

/**
 * PUT /admin/users/:uid/subscription
 * Update user subscription tier
 * Requires: Firebase Admin Authentication
 * Body: { subscriptionTier: "free" | "premium" | "premium_plus" | "enterprise" }
 */
app.put('/admin/users/:uid/subscription', checkAdminAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const { subscriptionTier } = req.body;

    // Validate subscription tier
    const validTiers = ['free', 'premium', 'premium_plus', 'enterprise'];
    if (!subscriptionTier || !validTiers.includes(subscriptionTier)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Invalid subscription tier. Must be one of: ${validTiers.join(', ')}`
      });
    }

    // Verify user exists
    const userRecord = await auth.getUser(uid);

    // Get current claims and merge with new subscription tier
    const currentClaims = userRecord.customClaims || {};
    await auth.setCustomUserClaims(uid, {
      ...currentClaims,
      subscriptionTier: subscriptionTier
    });

    // Store subscription info in Firestore for easier querying
    await db.collection('user_subscriptions').doc(uid).set({
      subscriptionTier,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid,
      updatedByEmail: req.user.email
    }, { merge: true });

    // Log the subscription change
    await db.collection('subscription_logs').add({
      uid,
      userEmail: userRecord.email,
      previousTier: currentClaims.subscriptionTier || 'free',
      newTier: subscriptionTier,
      changedBy: req.user.uid,
      changedByEmail: req.user.email,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Subscription updated to '${subscriptionTier}' successfully`,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        subscriptionTier,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update subscription'
    });
  }
});

/**
 * DELETE /admin/users/:uid
 * Delete a user account
 * Requires: Firebase Admin Authentication
 */
app.delete('/admin/users/:uid', checkAdminAuth, async (req, res) => {
  try {
    const { uid } = req.params;

    // Prevent self-deletion
    if (uid === req.user.uid) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Cannot delete your own account'
      });
    }

    // Get user info before deletion for logging
    const userRecord = await auth.getUser(uid);
    const userEmail = userRecord.email;

    // Delete user from Firebase Auth
    await auth.deleteUser(uid);

    // Delete user role from Firestore
    await db.collection('user_roles').doc(uid).delete();

    // Delete user data from Firestore (if exists)
    const userDataDoc = await db.collection('users').doc(uid).get();
    if (userDataDoc.exists) {
      await db.collection('users').doc(uid).delete();
    }

    // Log the deletion
    await db.collection('user_deletion_logs').add({
      deletedUid: uid,
      deletedEmail: userEmail,
      deletedBy: req.user.uid,
      deletedByEmail: req.user.email,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: {
        deletedUid: uid,
        deletedEmail: userEmail
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete user'
    });
  }
});

/**
 * POST /admin/users
 * Create a new user (optional endpoint)
 * Requires: Firebase Admin Authentication
 * Body: { email, password, displayName?, role? }
 */
app.post('/admin/users', checkAdminAuth, async (req, res) => {
  try {
    const { email, password, displayName, role = 'user', phoneNumber } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Email and password are required'
      });
    }

    // Validate role
    const validRoles = ['admin', 'moderator', 'user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || null,
      phoneNumber: phoneNumber || undefined,
      emailVerified: false,
      disabled: false
    });

    // Set custom claims for role
    await auth.setCustomUserClaims(userRecord.uid, {
      role,
      isAdmin: role === 'admin'
    });

    // Store role in Firestore
    await db.collection('user_roles').doc(userRecord.uid).set({
      role,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'Email already exists'
      });
    }
    
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid email format'
      });
    }
    
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Password is too weak'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create user'
    });
  }
});

// =============================================================================
// ANALYTICS ROUTES (Require Firebase Admin Authentication)
// Query the requestLogs collection for analytics data
// =============================================================================

/**
 * GET /admin/analytics/summary
 * Get analytics summary for the specified period
 * Requires: Firebase Admin Authentication
 * 
 * Query params: ?days=30 (default 30 days)
 * 
 * Response format:
 * {
 *   success: true,
 *   data: {
 *     totalRequests: 1234,
 *     successfulRequests: 1200,
 *     failedRequests: 34,
 *     avgResponseTime: 45.5,
 *     statusCodeBreakdown: { "200": 1100, "201": 100, "404": 20, "500": 14 }
 *   }
 * }
 */
app.get('/admin/analytics/summary', checkAdminAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Query requestLogs for the specified period
    const snapshot = await db.collection('requestLogs')
      .where('timestamp', '>=', startDate)
      .orderBy('timestamp', 'desc')
      .get();

    const logs = snapshot.docs.map(doc => doc.data());

    // Calculate statistics
    let totalRequests = logs.length;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;
    const statusCodeBreakdown = {};

    logs.forEach(log => {
      // Count successful vs failed
      if (log.statusCode < 400) {
        successfulRequests++;
      } else {
        failedRequests++;
      }

      // Sum response times
      totalResponseTime += log.responseTime || 0;

      // Count status codes
      const code = String(log.statusCode || 'unknown');
      statusCodeBreakdown[code] = (statusCodeBreakdown[code] || 0) + 1;
    });

    const avgResponseTime = totalRequests > 0 
      ? Math.round((totalResponseTime / totalRequests) * 10) / 10 
      : 0;

    res.json({
      success: true,
      data: {
        totalRequests,
        successfulRequests,
        failedRequests,
        avgResponseTime,
        statusCodeBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch analytics summary'
    });
  }
});

/**
 * GET /admin/analytics/realtime
 * Get real-time analytics (last 24 hours)
 * Requires: Firebase Admin Authentication
 * 
 * Response format:
 * {
 *   success: true,
 *   data: {
 *     requestsLast24h: 456,
 *     avgResponseTime: 42.3,
 *     successRate: 99.1,
 *     uniqueVisitors: 23
 *   }
 * }
 */
app.get('/admin/analytics/realtime', checkAdminAuth, async (req, res) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Query requestLogs for last 24 hours
    const snapshot = await db.collection('requestLogs')
      .where('timestamp', '>=', last24h)
      .orderBy('timestamp', 'desc')
      .get();

    const logs = snapshot.docs.map(doc => doc.data());

    // Calculate statistics
    let requestsLast24h = logs.length;
    let successfulRequests = 0;
    let totalResponseTime = 0;
    const uniqueIPs = new Set();

    logs.forEach(log => {
      if (log.statusCode < 400) {
        successfulRequests++;
      }
      totalResponseTime += log.responseTime || 0;
      if (log.ipAddress && log.ipAddress !== 'unknown') {
        uniqueIPs.add(log.ipAddress);
      }
    });

    const avgResponseTime = requestsLast24h > 0 
      ? Math.round((totalResponseTime / requestsLast24h) * 10) / 10 
      : 0;

    const successRate = requestsLast24h > 0 
      ? Math.round((successfulRequests / requestsLast24h) * 1000) / 10 
      : 0;

    res.json({
      success: true,
      data: {
        requestsLast24h,
        avgResponseTime,
        successRate,
        uniqueVisitors: uniqueIPs.size
      }
    });
  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch real-time analytics'
    });
  }
});

/**
 * GET /admin/analytics/api-keys
 * Get API key usage statistics
 * Requires: Firebase Admin Authentication
 */
app.get('/admin/analytics/api-keys', checkAdminAuth, async (req, res) => {
  try {
    const { keyId } = req.query;
    const stats = await getApiKeyStats(keyId);
    
    res.json({
      success: true,
      count: stats.length,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching API key stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch API key statistics'
    });
  }
});

/**
 * GET /admin/analytics/dashboard
 * Get comprehensive dashboard data in a single request
 * Requires: Firebase Admin Authentication
 * 
 * Response format expected by frontend:
 * {
 *   success: true,
 *   data: {
 *     overview: { totalRequests, successRate },
 *     charts: { dailyRequests, topEndpoints, methodDistribution },
 *     recentRequests: [{ endpoint, method, statusCode, responseTime, ipAddress, timestamp }]
 *   }
 * }
 */
app.get('/admin/analytics/dashboard', checkAdminAuth, async (req, res) => {
  try {
    // Get last 30 days of data for charts
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Query requestLogs for last 30 days
    const snapshot = await db.collection('requestLogs')
      .where('timestamp', '>=', thirtyDaysAgo)
      .orderBy('timestamp', 'desc')
      .get();

    const logs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        // Convert Firestore timestamp to Date if needed
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
      };
    });

    // Calculate overview stats
    let totalRequests = logs.length;
    let successfulRequests = 0;
    let totalResponseTime = 0;

    // For charts
    const dailyRequestsMap = {};
    const endpointCounts = {};
    const methodCounts = { GET: 0, POST: 0, PUT: 0, DELETE: 0 };

    logs.forEach(log => {
      // Success count
      if (log.statusCode < 400) {
        successfulRequests++;
      }

      // Response time
      totalResponseTime += log.responseTime || 0;

      // Daily requests (last 30 days)
      const dateStr = log.timestamp.toISOString().split('T')[0];
      dailyRequestsMap[dateStr] = (dailyRequestsMap[dateStr] || 0) + 1;

      // Top endpoints
      const endpoint = log.endpoint || 'unknown';
      endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;

      // Method distribution
      const method = log.method || 'GET';
      if (methodCounts.hasOwnProperty(method)) {
        methodCounts[method]++;
      }
    });

    // Convert daily requests to array sorted by date
    const dailyRequests = Object.entries(dailyRequestsMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top 10 endpoints
    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate success rate
    const successRate = totalRequests > 0 
      ? Math.round((successfulRequests / totalRequests) * 1000) / 10 
      : 0;

    // Get last 10 recent requests
    const recentRequests = logs.slice(0, 10).map(log => ({
      endpoint: log.endpoint,
      method: log.method,
      statusCode: log.statusCode,
      responseTime: log.responseTime,
      ipAddress: log.ipAddress,
      timestamp: log.timestamp.toISOString()
    }));

    const dashboard = {
      overview: {
        totalRequests,
        successRate
      },
      charts: {
        dailyRequests,
        topEndpoints,
        methodDistribution: methodCounts
      },
      recentRequests
    };

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch dashboard data'
    });
  }
});

/**
 * POST /admin/analytics/flush
 * Manually flush analytics buffer to Firestore
 * Requires: Firebase Admin Authentication
 */
app.post('/admin/analytics/flush', checkAdminAuth, async (req, res) => {
  try {
    await flushAnalyticsBuffer();
    res.json({
      success: true,
      message: 'Analytics buffer flushed successfully'
    });
  } catch (error) {
    console.error('Error flushing analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to flush analytics buffer'
    });
  }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Multer error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File Too Large',
        message: `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }
    return res.status(400).json({
      success: false,
      error: 'Upload Error',
      message: error.message
    });
  }
  
  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(415).json({
      success: false,
      error: 'Unsupported Media Type',
      message: error.message
    });
  }

  next(error);
});

// Generic error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// =============================================================================
// START SERVER (only when run directly, not when imported by app.js)
// =============================================================================

// Only start listening if run directly (node server.js)
// When imported by app.js, app.js handles the listening
if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🎬 MediaCore API Server');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  🚀 Server running on port ${PORT}`);
    console.log(`  📁 Upload directory: ${uploadPath}`);
    console.log(`  📊 Max file size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    console.log(`  🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('═══════════════════════════════════════════════════════');
  });
} else {
  console.log('📦 MediaCore API module loaded');
  console.log(`  📁 Upload directory: ${uploadPath}`);
  console.log(`  🌐 Environment: ${process.env.NODE_ENV || 'production'}`);
}

// Export the Express app
module.exports = app;
