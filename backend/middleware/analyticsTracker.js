/**
 * Analytics Tracker Middleware
 * 
 * Tracks all API requests and stores analytics data in MySQL.
 * Provides comprehensive stats including request counts, response times,
 * endpoint usage, API key usage, and more.
 */

const { query } = require('../config/db');

// In-memory cache for batching writes
let requestBuffer = [];
const BUFFER_FLUSH_INTERVAL = 10000; // Flush every 10 seconds
const BUFFER_MAX_SIZE = 50;

/**
 * Flush the request buffer to MySQL
 */
const flushBuffer = async () => {
  if (requestBuffer.length === 0) return;

  const requests = [...requestBuffer];
  requestBuffer = [];

  try {
    // Insert analytics data to MySQL (fire and forget)
    for (const request of requests) {
      await query(
        `INSERT INTO analytics_data 
        (timestamp, endpoint, method, statusCode, responseTime, ipAddress, userAgent, apiKeyId, userId, success) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          request.timestamp,
          request.endpoint,
          request.method,
          request.statusCode,
          request.responseTime || 0,
          request.ipAddress,
          request.userAgent,
          request.apiKeyId || null,
          request.userId || null,
          request.statusCode >= 200 && request.statusCode < 400
        ]
      ).catch(err => console.error('Failed to insert analytics:', err));
    }

  } catch (err) {
    console.error('Error flushing analytics buffer:', err);
  }
};

// Set up auto-flush interval
setInterval(flushBuffer, BUFFER_FLUSH_INTERVAL);

/**
 * Analytics tracking middleware
 */
const analyticsTracker = (req, res, next) => {
  const startTime = Date.now();

  // Skip certain paths
  const skipPaths = ['/health', '/favicon.ico'];
  const isStaticFile = req.path.startsWith('/public/');
  
  if (skipPaths.includes(req.path) || isStaticFile) {
    return next();
  }

  // Capture when response finishes
  res.on('finish', () => {
    try {
      const responseTime = Date.now() - startTime;
      
      // Get IP address (handle proxies)
      let ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
      const forwardedFor = req.headers['x-forwarded-for'];
      if (forwardedFor) {
        ipAddress = forwardedFor.split(',')[0].trim();
      }

      const analyticsData = {
        timestamp: new Date(),
        endpoint: getEndpointCategory(req.path),
        method: req.method,
        statusCode: res.statusCode,
        responseTime,
        ipAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        apiKeyId: req.apiKey?.id || null,
        userId: req.user?.id || null,
        success: res.statusCode >= 200 && res.statusCode < 400
      };

      // Add to buffer
      requestBuffer.push(analyticsData);

      // Flush if buffer is full
      if (requestBuffer.length >= BUFFER_MAX_SIZE) {
        flushBuffer();
      }

    } catch (err) {
      console.error('Error capturing analytics:', err);
    }
  });

  next();
};

/**
 * Get endpoint category from request path
 */
function getEndpointCategory(path) {
  if (path.startsWith('/auth')) return 'auth';
  if (path.startsWith('/api/media')) return 'media';
  if (path.startsWith('/api/artists')) return 'artists';
  if (path.startsWith('/api/albums')) return 'albums';
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/api')) return 'api';
  return 'other';
}

/**
 * Get analytics summary
 */
const getAnalyticsSummary = async (days = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  try {
    const [totalRequests] = await query(
      'SELECT COUNT(*) as count FROM analytics_data WHERE timestamp >= ?',
      [cutoffDate]
    );

    const [successRequests] = await query(
      'SELECT COUNT(*) as count FROM analytics_data WHERE timestamp >= ? AND success = 1',
      [cutoffDate]
    );

    const [avgResponseTime] = await query(
      'SELECT AVG(responseTime) as avg FROM analytics_data WHERE timestamp >= ?',
      [cutoffDate]
    );

    return {
      totalRequests: totalRequests[0]?.count || 0,
      successfulRequests: successRequests[0]?.count || 0,
      avgResponseTime: Math.round(avgResponseTime[0]?.avg || 0)
    };
  } catch (err) {
    console.error('Error getting analytics summary:', err);
    return { totalRequests: 0, successfulRequests: 0, avgResponseTime: 0 };
  }
};

/**
 * Get real-time stats
 */
const getRealTimeStats = async () => {
  const last24h = new Date();
  last24h.setHours(last24h.getHours() - 24);

  try {
    const [stats] = await query(
      `SELECT 
        COUNT(*) as requestsLast24h,
        AVG(responseTime) as avgResponseTime
      FROM analytics_data WHERE timestamp >= ?`,
      [last24h]
    );

    return stats[0] || { requestsLast24h: 0, avgResponseTime: 0 };
  } catch (err) {
    console.error('Error getting realtime stats:', err);
    return { requestsLast24h: 0, avgResponseTime: 0 };
  }
};

module.exports = analyticsTracker;
module.exports.getAnalyticsSummary = getAnalyticsSummary;
module.exports.getRealTimeStats = getRealTimeStats;
module.exports.flushBuffer = flushBuffer;
