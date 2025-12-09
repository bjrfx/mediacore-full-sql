/**
 * Middleware Index
 * Export all middleware functions for easy importing
 */

const checkAdminAuth = require('./checkAdminAuth');
const checkAuth = require('./checkAuth');
const checkApiKeyPermissions = require('./checkApiKeyPermissions');
const analyticsTracker = require('./analyticsTracker');
const requestLogger = require('./requestLogger');
const { streamMedia, mediaStreamMiddleware, createStreamingRoutes } = require('./mediaStreamer');

module.exports = {
  checkAdminAuth,
  checkAuth,
  checkApiKeyPermissions,
  analyticsTracker,
  requestLogger,
  streamMedia,
  mediaStreamMiddleware,
  createStreamingRoutes
};
