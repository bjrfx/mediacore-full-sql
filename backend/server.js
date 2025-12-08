/**
 * MediaCore API Server - MySQL Edition
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Request logger - logs to MySQL for analytics
const requestLogger = require('./middleware/requestLogger');
app.use(requestLogger);

// Console logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health
app.get('/', (req, res) => {
  res.json({ success: true, message: 'MediaCore API - MySQL Edition', version: '2.0.0', timestamp: new Date().toISOString() });
});

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
    const settingsObj = {};
    settings.forEach(s => { settingsObj[s.setting_key] = s.setting_value; });
    res.json({ success: true, data: settingsObj });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Error fetching settings' });
  }
});

app.get('/api/user/subscription', checkAuth, async (req, res) => {
  try {
    const subscriptions = await db.query('SELECT * FROM user_subscriptions WHERE uid = ?', [req.user.uid]);
    if (subscriptions.length === 0) {
      return res.json({ 
        success: true, 
        data: { 
          subscriptionTier: 'free', 
          status: 'active' 
        } 
      });
    }
    
    // Transform snake_case to camelCase for frontend
    const subscription = subscriptions[0];
    res.json({ 
      success: true, 
      data: {
        uid: subscription.uid,
        subscriptionTier: subscription.subscription_tier,
        status: subscription.status || 'active',
        updatedAt: subscription.updated_at,
        expiresAt: subscription.expires_at
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ success: false, message: 'Error fetching subscription' });
  }
});

app.get('/api/user/stats', checkAuth, async (req, res) => {
  try {
    const stats = await db.query('SELECT * FROM user_stats WHERE uid = ?', [req.user.uid]);
    res.json({ success: true, data: stats[0] || { uid: req.user.uid, totalPlays: 0 } });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
});

app.post('/api/user/heartbeat', checkAuth, async (req, res) => {
  try {
    const deviceType = req.headers['x-device-type'] || null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || null;

    await db.query(
      `INSERT INTO user_presence (uid, is_online, last_active, device_type, ip_address, user_agent) 
       VALUES (?, TRUE, NOW(), ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         is_online = TRUE, 
         last_active = NOW(), 
         device_type = VALUES(device_type),
         ip_address = VALUES(ip_address),
         user_agent = VALUES(user_agent)`,
      [req.user.uid, deviceType, ipAddress, userAgent]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    res.status(500).json({ success: false });
  }
});

app.get('/admin/users', checkAdminAuth, async (req, res) => {
  try {
    const users = await db.query(`
      SELECT 
        u.uid, 
        u.email, 
        u.display_name, 
        u.email_verified, 
        u.created_at,
        ur.role,
        us.subscription_tier
      FROM users u
      LEFT JOIN user_roles ur ON u.uid = ur.uid
      LEFT JOIN user_subscriptions us ON u.uid = us.uid
      LIMIT 100
    `);
    // Transform snake_case to camelCase for frontend
    const transformedUsers = users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.display_name,
      emailVerified: user.email_verified === 1 || user.email_verified === true,
      createdAt: user.created_at,
      role: user.role || 'user',
      subscriptionTier: user.subscription_tier || 'free',
      disabled: false, // Add a disabled column to users table if needed
      metadata: {
        creationTime: user.created_at,
        lastSignInTime: user.created_at // You can add a last_login column if needed
      }
    }));
    res.json({ success: true, count: transformedUsers.length, data: { count: transformedUsers.length, users: transformedUsers } });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

app.get('/admin/users/online', checkAdminAuth, async (req, res) => {
  try {
    const users = await db.query(
      'SELECT u.uid, u.email, u.display_name, up.last_active, up.device_type, up.ip_address, up.user_agent FROM users u JOIN user_presence up ON u.uid = up.uid WHERE up.is_online = TRUE AND up.last_active >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)'
    );
    // Transform snake_case to camelCase for frontend
    const transformedUsers = users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.display_name,
      lastActive: user.last_active,
      deviceType: user.device_type,
      ipAddress: user.ip_address,
      userAgent: user.user_agent
    }));
    res.json({ success: true, count: transformedUsers.length, data: { count: transformedUsers.length, users: transformedUsers } });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

app.get('/admin/api-keys', checkAdminAuth, async (req, res) => {
  try {
    const keys = await db.query('SELECT * FROM api_keys WHERE is_active = 1');
    // Transform to camelCase and parse JSON fields
    const transformedKeys = keys.map(key => ({
      id: key.id,
      name: key.name,
      apiKey: key.api_key,
      keyPreview: key.api_key ? `${key.api_key.substring(0, 10)}...${key.api_key.slice(-4)}` : '',
      accessType: key.access_type,
      permissions: key.permissions ? (typeof key.permissions === 'string' ? JSON.parse(key.permissions) : key.permissions) : [],
      isActive: key.is_active === 1,
      createdAt: key.created_at,
      createdBy: key.created_by,
      createdByEmail: key.created_by_email,
      lastUsedAt: key.last_used_at,
      usageCount: key.usage_count || 0,
      expiresAt: key.expires_at,
    }));
    res.json({ success: true, count: transformedKeys.length, data: transformedKeys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ success: false, message: 'Error fetching API keys' });
  }
});

app.post('/admin/generate-key', checkAdminAuth, async (req, res) => {
  try {
    const crypto = require('crypto');
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    const apiKey = 'mc_' + crypto.randomBytes(32).toString('hex');
    const { name, accessType = 'read_only', expiresInDays } = req.body;
    
    // Calculate expiry date if provided
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + parseInt(expiresInDays));
      expiresAt = expiry.toISOString().slice(0, 19).replace('T', ' ');
    }
    
    // Set permissions based on access type
    const permissions = accessType === 'full_access' 
      ? JSON.stringify(['read:media', 'write:media', 'read:artists', 'write:artists', 'read:albums', 'write:albums', 'admin'])
      : JSON.stringify(['read:media', 'read:artists', 'read:albums']);
    
    await db.query(
      'INSERT INTO api_keys (id, api_key, name, access_type, permissions, created_by, created_by_email, created_at, expires_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, 1)',
      [id, apiKey, name || 'New Key', accessType, permissions, req.user.uid, req.user.email, expiresAt]
    );
    
    res.status(201).json({ 
      success: true, 
      data: { 
        id,
        apiKey, 
        name,
        accessType,
        permissions: JSON.parse(permissions),
        expiresAt
      } 
    });
  } catch (error) {
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
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as requests,
        SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END) as successful
      FROM request_logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `);
    
    // Get top endpoints
    const topEndpoints = await db.query(`
      SELECT 
        endpoint,
        COUNT(*) as requests
      FROM request_logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY endpoint
      ORDER BY requests DESC
      LIMIT 10
    `);
    
    // Get recent activity
    const recentActivity = await db.query(`
      SELECT 
        rl.id,
        rl.timestamp,
        rl.endpoint,
        rl.method,
        rl.status_code as statusCode,
        ak.name as apiKeyName
      FROM request_logs rl
      LEFT JOIN api_keys ak ON rl.api_key_id = ak.id
      ORDER BY rl.timestamp DESC
      LIMIT 10
    `);
    
    // Calculate success rate
    const successRateResult = await db.queryOne(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END) as successful
      FROM request_logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    const successRate = successRateResult?.total > 0 
      ? ((successRateResult.successful / successRateResult.total) * 100).toFixed(1)
      : 100;
    
    res.json({ 
      success: true, 
      data: { 
        totalUsers: totalUsers?.count || 0, 
        totalMedia: totalMedia?.count || 0,
        overview: {
          totalUsers: totalUsers?.count || 0,
          totalMedia: totalMedia?.count || 0,
          totalVideos: totalVideos?.count || 0,
          totalAudio: totalAudio?.count || 0,
          activeApiKeys: activeApiKeys?.count || 0,
          totalRequests,
          successRate: parseFloat(successRate)
        },
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
        },
        recentActivity: recentActivity.map(row => ({
          id: row.id,
          timestamp: row.timestamp,
          endpoint: row.endpoint,
          method: row.method,
          statusCode: row.statusCode,
          apiKeyName: row.apiKeyName
        }))
      } 
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard' });
  }
});

app.get('/admin/analytics/summary', checkAdminAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    // Get request stats for the period
    const stats = await db.queryOne(`
      SELECT 
        COUNT(*) as totalRequests,
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
