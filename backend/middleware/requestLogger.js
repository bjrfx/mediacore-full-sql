/**
 * Request Logger Middleware
 * 
 * Logs every API request to the request_logs table in MySQL.
 * This provides data for the analytics dashboard.
 */

const { query } = require('../config/db');

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
        timestamp: new Date(),
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTime,
        ipAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        apiKeyId: req.apiKey?.id || null,
        userId: req.user?.id || null,
        success: res.statusCode >= 200 && res.statusCode < 400
      };

      // Log to MySQL request_logs table (fire and forget, don't block response)
      await query(
        `INSERT INTO request_logs 
        (timestamp, endpoint, path, method, status_code, response_time, ip_address, user_agent, api_key_id, user_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logData.timestamp,
          logData.endpoint,
          logData.endpoint,
          logData.method,
          logData.statusCode,
          logData.responseTime,
          logData.ipAddress,
          logData.userAgent,
          logData.apiKeyId,
          logData.userId
        ]
      );
    } catch (err) {
      console.error('Failed to log request:', err);
    }
  });

  next();
};

module.exports = requestLogger;
