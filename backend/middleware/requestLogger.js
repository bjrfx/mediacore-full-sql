/**
 * Request Logger Middleware
 * 
 * Logs every API request to the request_logs table in MySQL.
 * Captures browser, OS, device type, geographic info, and referrer.
 */

const { query } = require('../config/db');
const UAParser = require('ua-parser-js');

// Simple IP to country lookup cache
const geoCache = new Map();

const getGeoData = async (ip) => {
  // Skip for local IPs
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: 'Local', city: 'Local' };
  }
  
  // Check cache
  if (geoCache.has(ip)) {
    return geoCache.get(ip);
  }
  
  try {
    // Use free ip-api.com (limit: 45 requests/minute)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=country,city`);
    if (response.ok) {
      const data = await response.json();
      const geoData = {
        country: data.country || 'Unknown',
        city: data.city || 'Unknown'
      };
      geoCache.set(ip, geoData);
      
      // Clear cache entry after 1 hour
      setTimeout(() => geoCache.delete(ip), 3600000);
      
      return geoData;
    }
  } catch (err) {
    // Silently fail geo lookup
  }
  
  return { country: 'Unknown', city: 'Unknown' };
};

/**
 * Parse user agent to extract browser, OS, and device info
 */
const parseUserAgent = (userAgent) => {
  if (!userAgent) {
    return {
      browser: 'Unknown',
      browserVersion: '',
      os: 'Unknown',
      osVersion: '',
      deviceType: 'Unknown'
    };
  }
  
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  // Determine device type
  let deviceType = 'Desktop';
  if (result.device.type === 'mobile') {
    deviceType = 'Mobile';
  } else if (result.device.type === 'tablet') {
    deviceType = 'Tablet';
  } else if (userAgent.includes('bot') || userAgent.includes('Bot') || userAgent.includes('crawler')) {
    deviceType = 'Bot';
  }
  
  return {
    browser: result.browser.name || 'Unknown',
    browserVersion: result.browser.version || '',
    os: result.os.name || 'Unknown',
    osVersion: result.os.version || '',
    deviceType
  };
};

/**
 * Request logging middleware
 * Captures request details and logs to MySQL on response finish
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Skip logging for certain paths
  const skipPaths = ['/health', '/favicon.ico', '/robots.txt'];
  const isStaticFile = req.path.startsWith('/public/') || req.path.startsWith('/uploads/');
  
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
      // Clean IPv6 prefix
      if (ipAddress.startsWith('::ffff:')) {
        ipAddress = ipAddress.substring(7);
      }

      // Parse user agent
      const userAgent = req.headers['user-agent'] || '';
      const uaInfo = parseUserAgent(userAgent);
      
      // Get geo data (async, non-blocking)
      const geoData = await getGeoData(ipAddress);
      
      // Get referer
      const referer = req.headers['referer'] || req.headers['referrer'] || null;

      // Log to MySQL request_logs table
      await query(
        `INSERT INTO request_logs 
        (timestamp, endpoint, path, method, status_code, response_time, ip_address, user_agent, 
         api_key_id, user_id, country, city, browser, browser_version, os, os_version, device_type, referer) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          new Date(),
          req.path,
          req.originalUrl,
          req.method,
          res.statusCode,
          responseTime,
          ipAddress,
          userAgent.substring(0, 500),
          req.apiKey?.id || null,
          req.user?.uid || req.user?.id || null,
          geoData.country,
          geoData.city,
          uaInfo.browser,
          uaInfo.browserVersion,
          uaInfo.os,
          uaInfo.osVersion,
          uaInfo.deviceType,
          referer ? referer.substring(0, 500) : null
        ]
      );
    } catch (err) {
      console.error('Failed to log request:', err.message);
    }
  });

  next();
};

module.exports = requestLogger;
