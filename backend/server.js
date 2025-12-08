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

// Request logger
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
    res.json({ success: true, count: keys.length, data: keys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ success: false, message: 'Error fetching API keys' });
  }
});

app.post('/admin/generate-key', checkAdminAuth, async (req, res) => {
  try {
    const crypto = require('crypto');
    const apiKey = 'mc_' + crypto.randomBytes(32).toString('hex');
    const { name, accessType = 'read_only' } = req.body;
    await db.query('INSERT INTO api_keys (api_key, name, access_type, created_by, created_at) VALUES (?, ?, ?, ?, NOW())', [apiKey, name || 'New Key', accessType, req.user.uid]);
    res.status(201).json({ success: true, data: { apiKey, name } });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({ success: false, message: 'Error generating key' });
  }
});

app.get('/admin/analytics/dashboard', checkAdminAuth, async (req, res) => {
  try {
    const totalUsers = await db.queryOne('SELECT COUNT(*) as count FROM users');
    const totalMedia = await db.queryOne('SELECT COUNT(*) as count FROM media');
    res.json({ success: true, data: { totalUsers: totalUsers.count, totalMedia: totalMedia.count } });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard' });
  }
});

app.get('/admin/analytics/summary', checkAdminAuth, async (req, res) => {
  res.json({ success: true, data: { totalRequests: 0 } });
});

app.get('/admin/analytics/realtime', checkAdminAuth, async (req, res) => {
  try {
    const [onlineUsers] = await db.query('SELECT COUNT(*) as count FROM user_presence WHERE lastSeen >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)');
    res.json({ success: true, data: { onlineUsers: onlineUsers[0].count } });
  } catch (error) {
    res.status(500).json({ success: false });
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
    await db.query('UPDATE api_keys SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'API key deleted' });
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
