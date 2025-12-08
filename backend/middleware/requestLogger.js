/**
 * Request Logger Middleware
 * 
 * Logs every API request to the requestLogs collection in Firestore.
 * This provides data for the analytics dashboard.
 */

const { db, admin } = require('../config/firebase');

/**
 * Request logging middleware
 * Captures request details and logs to Firestore on response finish
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Skip logging for certain paths
  const skipPaths = ['/health', '/favicon.ico'];
  const isStaticFile = req.path.startsWith('/public/');
  
  if (skipPaths.includes(req.path) || isStaticFile) {
    return next();
  }

  // Capture when response finishes
  res.on('finish', async () => {
    try {
      const responseTime = Date.now() - startTime;
      
      // Get IP address (handle proxies)
      let ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
      const forwardedFor = req.headers['x-forwarded-for'];
      if (forwardedFor) {
        ipAddress = forwardedFor.split(',')[0].trim();
      }

      const logData = {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTime,
        ipAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        apiKeyId: req.apiKey?.id || null,
        userId: req.user?.uid || null
      };

      // Log to Firestore (fire and forget, don't block response)
      await db.collection('requestLogs').add(logData);
    } catch (err) {
      console.error('Failed to log request:', err);
    }
  });

  next();
};

module.exports = requestLogger;
