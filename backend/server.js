/**
 * MediaCore API Server - MySQL Edition
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const db = require('./config/db');
const { createStreamingRoutes } = require('./middleware/mediaStreamer');

const app = express();

// Ensure required upload directories exist

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

const mediaRoutes = require('./routes/media');
app.use(mediaRoutes);

const artistsRoutes = require('./routes/artists');
app.use(artistsRoutes);

const albumsRoutes = require('./routes/albums');
app.use(albumsRoutes);

// Stubs
const { checkAuth, checkAdminAuth } = require('./middleware');

app.get('/api/albums', async (req, res) => {
  try {
    const [albums] = await db.query('SELECT * FROM albums ORDER BY releaseDate DESC LIMIT 50');
    res.json({ success: true, count: albums.length, data: albums });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching albums' });
  }
});

app.get('/api/albums/:id', async (req, res) => {
  try {
    const [albums] = await db.query('SELECT * FROM albums WHERE id = ?', [req.params.id]);
    if (albums.length === 0) return res.status(404).json({ success: false, message: 'Album not found' });
    res.json({ success: true, data: albums[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching album' });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.query('SELECT setting_key, setting_value FROM app_settings WHERE is_public = TRUE');
      subscriptionTier: user.subscription_tier || 'free',
      disabled: false, // Add a disabled column to users table if needed
    console.error('Error generating API key:', error);
    res.status(500).json({ success: false, message: 'Error generating key' });
  }
});

app.get('/admin/analytics/dashboard', checkAdminAuth, async (req, res) => {
  try {
    // Basic counts
    const totalUsers = await db.queryOne('SELECT COUNT(*) as count FROM users');
    const totalMedia = await db.queryOne('SELECT COUNT(*) as count FROM media');
    const totalVideos = await db.queryOne('SELECT COUNT(*) as count FROM media WHERE type = "video"');
    const totalAudio = await db.queryOne('SELECT COUNT(*) as count FROM media WHERE type = "audio"');
    const activeApiKeys = await db.queryOne('SELECT COUNT(*) as count FROM api_keys WHERE is_active = 1');
    
    // Get total requests from API keys usage_count
    const totalRequestsResult = await db.queryOne('SELECT COALESCE(SUM(usage_count), 0) as count FROM api_keys');
    const totalRequests = totalRequestsResult?.count || 0;
    
    // Get request logs for charts (last 7 days)
    const dailyRequests = await db.query(`
        SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END) as successful,
        AVG(response_time) as avgResponseTime
      FROM request_logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [days]);
    
    // Get daily breakdown
    const dailyRequests = await db.query(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as requests,
        SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END) as successful
      FROM request_logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `, [days]);
    
    // Get top endpoints
    const topEndpoints = await db.query(`
      SELECT 
        endpoint,
        COUNT(*) as requests
      FROM request_logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY endpoint
      ORDER BY requests DESC
      LIMIT 10
    `, [days]);
    
    const totalRequests = stats?.totalRequests || 0;
    const successRate = totalRequests > 0 
      ? ((stats.successful / totalRequests) * 100).toFixed(1)
      : 100;
    
    res.json({ 
      success: true, 
      data: { 
        totalRequests,
        successRate: parseFloat(successRate),
        avgResponseTime: Math.round(stats?.avgResponseTime || 0),
        charts: {
          dailyRequests: dailyRequests.map(row => ({
            date: row.date,
            requests: row.requests,
            successful: row.successful
          })),
          topEndpoints: topEndpoints.map(row => ({
            endpoint: row.endpoint,
            requests: row.requests
          }))
        }
      } 
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({ success: false, message: 'Error fetching analytics' });
  }
});

app.get('/admin/analytics/realtime', checkAdminAuth, async (req, res) => {
  try {
    const onlineUsers = await db.queryOne('SELECT COUNT(*) as count FROM user_presence WHERE lastSeen >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)');
    const recentRequests = await db.queryOne('SELECT COUNT(*) as count FROM request_logs WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)');
    
    res.json({ 
      success: true, 
      data: { 
        onlineUsers: onlineUsers?.count || 0,
        recentRequests: recentRequests?.count || 0
      } 
    });
  } catch (error) {
    console.error('Error fetching realtime stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching realtime stats' });
  }
});

// Click Stream - Real-time request log
app.get('/admin/analytics/click-stream', checkAdminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const logs = await db.query(`
      SELECT 
        rl.id,
        rl.timestamp,
        rl.endpoint,
        rl.path,
        rl.method,
        rl.status_code as statusCode,
        rl.response_time as responseTime,
        rl.ip_address as ipAddress,
        rl.country,
        rl.city,
        rl.browser,
        rl.browser_version as browserVersion,
        rl.os,
        rl.device_type as deviceType,
        rl.referer,
        ak.name as apiKeyName
      FROM request_logs rl
      LEFT JOIN api_keys ak ON rl.api_key_id = ak.id
      ORDER BY rl.timestamp DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    
    const totalCount = await db.queryOne('SELECT COUNT(*) as count FROM request_logs');
    
    res.json({ 
      success: true, 
      data: logs,
      total: totalCount?.count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching click stream:', error);
    res.status(500).json({ success: false, message: 'Error fetching click stream' });
  }
});

// Geographic analytics
app.get('/admin/analytics/geographic', checkAdminAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    // Top countries
    const topCountries = await db.query(`
      SELECT 
        COALESCE(country, 'Unknown') as country,
        COUNT(*) as requests
      FROM request_logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY country
      ORDER BY requests DESC
      LIMIT 10
    `, [days]);
    
    // Top cities
    const topCities = await db.query(`
      SELECT 
        COALESCE(city, 'Unknown') as city,
        COALESCE(country, 'Unknown') as country,
        COUNT(*) as requests
      FROM request_logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY city, country
      ORDER BY requests DESC
      LIMIT 10
    `, [days]);
    
    res.json({ 
      success: true, 
      data: { 
        topCountries: topCountries.map(r => ({ country: r.country, requests: r.requests })),
        topCities: topCities.map(r => ({ city: r.city, country: r.country, requests: r.requests }))
      } 
    });
  } catch (error) {
    console.error('Error fetching geographic data:', error);
    res.status(500).json({ success: false, message: 'Error fetching geographic data' });
  }
});

// Browser & OS analytics
app.get('/admin/analytics/devices', checkAdminAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    // Top browsers
    const topBrowsers = await db.query(`
      SELECT 
        COALESCE(browser, 'Unknown') as browser,
        COUNT(*) as requests
      FROM request_logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY browser
      ORDER BY requests DESC
      LIMIT 10
    `, [days]);
    
    // Top OS
    const topOS = await db.query(`
      SELECT 
        COALESCE(os, 'Unknown') as os,
        COUNT(*) as requests
      FROM request_logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY os
      ORDER BY requests DESC
      LIMIT 10
    `, [days]);
    
    // Device types
    const deviceTypes = await db.query(`
      SELECT 
        COALESCE(device_type, 'Unknown') as deviceType,
        COUNT(*) as requests
      FROM request_logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY device_type
      ORDER BY requests DESC
    `, [days]);
    
    res.json({ 
      success: true, 
      data: { 
        topBrowsers: topBrowsers.map(r => ({ browser: r.browser, requests: r.requests })),
        topOS: topOS.map(r => ({ os: r.os, requests: r.requests })),
        deviceTypes: deviceTypes.map(r => ({ deviceType: r.deviceType, requests: r.requests }))
      } 
    });
  } catch (error) {
    console.error('Error fetching device data:', error);
    res.status(500).json({ success: false, message: 'Error fetching device data' });
  }
});

// Top referrers analytics
app.get('/admin/analytics/referrers', checkAdminAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    const topReferrers = await db.query(`
      SELECT 
        CASE 
          WHEN referer IS NULL OR referer = '' THEN 'Direct'
          ELSE SUBSTRING_INDEX(SUBSTRING_INDEX(referer, '://', -1), '/', 1)
        END as referrer,
        COUNT(*) as requests
      FROM request_logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY referrer
      ORDER BY requests DESC
      LIMIT 10
    `, [days]);
    
    res.json({ 
      success: true, 
      data: topReferrers.map(r => ({ referrer: r.referrer, requests: r.requests }))
    });
  } catch (error) {
    console.error('Error fetching referrer data:', error);
    res.status(500).json({ success: false, message: 'Error fetching referrer data' });
  }
});

// Hourly breakdown for today
app.get('/admin/analytics/hourly', checkAdminAuth, async (req, res) => {
  try {
    const hourlyData = await db.query(`
      SELECT 
        HOUR(timestamp) as hour,
        COUNT(*) as requests,
        SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END) as successful
      FROM request_logs
      WHERE DATE(timestamp) = CURDATE()
      GROUP BY HOUR(timestamp)
      ORDER BY hour ASC
    `);
    
    // Fill in missing hours
    const fullHourlyData = [];
    for (let i = 0; i < 24; i++) {
      const found = hourlyData.find(h => h.hour === i);
      fullHourlyData.push({
        hour: i,
        label: `${i.toString().padStart(2, '0')}:00`,
        requests: found?.requests || 0,
        successful: found?.successful || 0
      });
    }
    
    res.json({ success: true, data: fullHourlyData });
  } catch (error) {
    console.error('Error fetching hourly data:', error);
    res.status(500).json({ success: false, message: 'Error fetching hourly data' });
  }
});

// Additional admin endpoints
app.get('/admin/users/:uid', checkAdminAuth, async (req, res) => {
  try {
    const user = await db.queryOne('SELECT uid, email, display_name, created_at, disabled FROM users WHERE uid = ?', [req.params.uid]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const role = await db.queryOne('SELECT role FROM user_roles WHERE uid = ?', [req.params.uid]);
    const subscription = await db.queryOne('SELECT subscription_tier FROM user_subscriptions WHERE uid = ?', [req.params.uid]);
    
    res.json({ success: true, data: { ...user, role: role?.role, subscriptionTier: subscription?.subscription_tier } });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Error fetching user' });
  }
});

app.put('/admin/users/:uid/role', checkAdminAuth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user', 'moderator'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    
    const roleExists = await db.queryOne('SELECT role FROM user_roles WHERE uid = ?', [req.params.uid]);
    if (roleExists) {
      await db.query('UPDATE user_roles SET role = ? WHERE uid = ?', [role, req.params.uid]);
    } else {
      await db.query('INSERT INTO user_roles (uid, role) VALUES (?, ?)', [req.params.uid, role]);
    }
    
    res.json({ success: true, message: 'User role updated' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ success: false, message: 'Error updating role' });
  }
});

app.put('/admin/users/:uid/status', checkAdminAuth, async (req, res) => {
  try {
    const { disabled } = req.body;
    await db.query('UPDATE users SET disabled = ? WHERE uid = ?', [disabled ? 1 : 0, req.params.uid]);
    res.json({ success: true, message: `User ${disabled ? 'disabled' : 'enabled'}` });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ success: false, message: 'Error updating status' });
  }
});

app.delete('/admin/users/:uid', checkAdminAuth, async (req, res) => {
  try {
    // Don't delete, just disable
    await db.query('UPDATE users SET disabled = 1 WHERE uid = ?', [req.params.uid]);
    res.json({ success: true, message: 'User disabled' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
});

app.put('/admin/users/:uid/subscription', checkAdminAuth, async (req, res) => {
  try {
    const { subscriptionTier } = req.body;
    const uid = req.params.uid;
    
    // First, check if user exists
    const user = await db.query('SELECT uid FROM users WHERE uid = ?', [uid]);
    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Insert or update subscription
    await db.query(
      `INSERT INTO user_subscriptions (uid, subscription_tier, updated_at) 
       VALUES (?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE 
         subscription_tier = VALUES(subscription_tier), 
         updated_at = NOW()`,
      [uid, subscriptionTier]
    );
    
    res.json({ 
      success: true, 
      message: 'Subscription updated successfully',
      data: { uid, subscriptionTier }
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ success: false, message: 'Error updating subscription' });
  }
});

app.delete('/admin/api-keys/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { hardDelete } = req.query;
    
    if (hardDelete === 'true') {
      // Permanently delete the key
      await db.query('DELETE FROM api_keys WHERE id = ?', [id]);
      res.json({ success: true, message: 'API key permanently deleted' });
    } else {
      // Soft delete - just deactivate
      await db.query('UPDATE api_keys SET is_active = 0 WHERE id = ?', [id]);
      res.json({ success: true, message: 'API key deactivated' });
    }
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ success: false, message: 'Error deleting key' });
  }
});

app.get('/admin/analytics/subscriptions', checkAdminAuth, async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT subscription_tier, COUNT(*) as count 
      FROM user_subscriptions 
      GROUP BY subscription_tier
    `);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
});

const { PERMISSION_PRESETS } = require('./middleware/checkApiKeyPermissions');
app.get('/admin/permissions', checkAdminAuth, (req, res) => {
  res.json({ success: true, data: PERMISSION_PRESETS });
});

// Admin system settings
app.get('/admin/system/settings', checkAdminAuth, (req, res) => {
  const settings = {
    productionMode: process.env.NODE_ENV === 'production' || process.env.PRODUCTION === 'true',
    nodeEnv: process.env.NODE_ENV || 'development',
    uploadDir: process.env.UPLOAD_DIR || './public/uploads',
    productionBasePath: '/home/masakali/mediacoreapi-sql.masakalirestrobar.ca/backend/public',
  };
  res.json({ success: true, data: settings });
});

app.post('/admin/system/settings', checkAdminAuth, (req, res) => {
  const { productionMode } = req.body;
  
  // Update environment variable (this will only affect current process)
  if (productionMode !== undefined) {
    process.env.PRODUCTION = productionMode ? 'true' : 'false';
    
    // If switching to production, update NODE_ENV as well
    if (productionMode) {
      process.env.NODE_ENV = 'production';
    }
  }
  
  res.json({ 
    success: true, 
    message: 'Settings updated. Note: Restart server for full effect.',
    data: {
      productionMode: process.env.NODE_ENV === 'production' || process.env.PRODUCTION === 'true',
      nodeEnv: process.env.NODE_ENV || 'development',
    }
  });
});

// ========================================
// PUBLIC OG ENDPOINT FOR SOCIAL SHARING
// ========================================
// Serves dynamic Open Graph tags for /listen/:id and /watch/:id
// This endpoint is accessible at /og/:mediaId and accessed via redirects in ShareMenu
app.get('/og/:mediaId', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const userAgent = req.headers['user-agent'] || '';
    
    console.log(`🔍 OG Request for media: ${mediaId}`);
    console.log(`📱 User-Agent: ${userAgent.substring(0, 100)}`);

    // Fetch media from database
    const [media] = await db.query(
      'SELECT id, title, description, type, file_path, thumbnail_path, artist, duration FROM media WHERE id = ?',
      [mediaId]
    );

    if (!media || (typeof media === 'object' && Object.keys(media).length === 0)) {
      console.log(`❌ Media not found`);
      return res.send(generateGenericOGHTML());
    }

    const mediaData = media;
    const isVideo = mediaData.type === 'video';
    const shareType = isVideo ? 'watch' : 'listen';
    const appDomain = process.env.APP_DOMAIN || process.env.REACT_APP_DOMAIN || 'https://app.mediacore.in';
    
    const pageUrl = `${appDomain}/${shareType}/${mediaData.id}`;
    const title = `${mediaData.title}`;
    const description = mediaData.description || 
      `${isVideo ? 'Watch' : 'Listen to'} "${mediaData.title}"${mediaData.artist ? ` by ${mediaData.artist}` : ''} on MediaCore`;
    
    // Ensure thumbnail is absolute URL
    let image = `${appDomain}/logo512.png`;
    if (mediaData.thumbnail_path) {
      if (mediaData.thumbnail_path.startsWith('http')) {
        image = mediaData.thumbnail_path;
      } else if (mediaData.thumbnail_path.startsWith('/')) {
        image = `${appDomain}${mediaData.thumbnail_path}`;
      } else {
        image = `${appDomain}/${mediaData.thumbnail_path}`;
      }
    }

    console.log(`✅ Serving OG for: "${title}"`);
    console.log(`   Image: ${image}`);

    // Generate HTML with comprehensive OG tags
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow">
  
  <!-- Essential Open Graph Meta Tags -->
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="${isVideo ? 'video.other' : 'music.song'}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta property="og:site_name" content="MediaCore" />
  <meta property="og:locale" content="en_US" />
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${pageUrl}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(title)}" />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${pageUrl}" />
  
  <!-- Redirect to actual app -->
  <script>
    if (navigator.userAgent.toLowerCase().match(/(facebookexternalhit|whatsapp|twitterbot|telegrambot|linkedinbot|slackbot|pinterest|discordbot|skypeuripreview)/)) {
      // This is a crawler - serve the meta tags
    } else {
      // Regular user - redirect to app
      window.location.href = '${pageUrl}';
    }
  </script>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <p>Redirecting to MediaCore...</p>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(html);
  } catch (error) {
    console.error('Error generating OG tags:', error);
    res.send(generateGenericOGHTML());
  }
});

// Helper functions for OG tag generation
function generateGenericOGHTML() {
  const appDomain = process.env.REACT_APP_DOMAIN || 'https://app.mediacore.in';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="MediaCore - Premium Audio & Video Streaming" />
  <meta property="og:description" content="Discover and stream premium audio and video content" />
  <meta property="og:image" content="${appDomain}/logo512.png" />
  <meta property="og:type" content="website" />
  <title>MediaCore</title>
  <script>window.location.href = '${appDomain}';</script>
</head>
<body></body>
</html>`;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return (text || '').replace(/[&<>"']/g, m => map[m]);
}

// Error handling
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// Database check
db.query('SELECT 1').then(() => console.log('✅ MySQL connected')).catch(err => console.error('❌ MySQL failed:', err.message));

console.log('📦 MediaCore API loaded');

module.exports = app;
