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
    const [settings] = await db.query('SELECT * FROM app_settings');
    const settingsObj = {};
    settings.forEach(s => { settingsObj[s.key] = s.value; });
    res.json({ success: true, data: settingsObj });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching settings' });
  }
});

app.get('/api/user/subscription', checkAuth, async (req, res) => {
  try {
    const [subscriptions] = await db.query('SELECT * FROM user_subscriptions WHERE userId = ? ORDER BY createdAt DESC LIMIT 1', [req.user.id]);
    if (subscriptions.length === 0) return res.json({ success: true, data: { plan: 'free', status: 'active' } });
    res.json({ success: true, data: subscriptions[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error' });
  }
});

app.get('/api/user/stats', checkAuth, async (req, res) => {
  try {
    const [stats] = await db.query('SELECT * FROM user_stats WHERE userId = ?', [req.user.id]);
    res.json({ success: true, data: stats[0] || { userId: req.user.id, totalPlays: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error' });
  }
});

app.post('/api/user/heartbeat', checkAuth, async (req, res) => {
  try {
    await db.query('INSERT INTO user_presence (userId, lastSeen, status) VALUES (?, NOW(), ?) ON DUPLICATE KEY UPDATE lastSeen = NOW()', [req.user.id, 'online']);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.get('/admin/users', checkAdminAuth, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, email, displayName, createdAt FROM users LIMIT 100');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.get('/admin/users/online', checkAdminAuth, async (req, res) => {
  try {
    const [users] = await db.query('SELECT u.id, u.email, u.displayName, up.lastSeen FROM users u JOIN user_presence up ON u.id = up.userId WHERE up.lastSeen >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.get('/admin/api-keys', checkAdminAuth, async (req, res) => {
  try {
    const [keys] = await db.query('SELECT * FROM api_keys WHERE deletedAt IS NULL');
    res.json({ success: true, count: keys.length, data: keys });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.post('/admin/generate-key', checkAdminAuth, async (req, res) => {
  try {
    const crypto = require('crypto');
    const apiKey = 'mk_' + crypto.randomBytes(32).toString('hex');
    const { name, accessType = 'read_only' } = req.body;
    await db.query('INSERT INTO api_keys (apiKey, name, accessType, createdBy) VALUES (?, ?, ?, ?)', [apiKey, name || 'New Key', accessType, req.user.id]);
    res.status(201).json({ success: true, data: { apiKey, name } });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.get('/admin/analytics/dashboard', checkAdminAuth, async (req, res) => {
  try {
    const [totalUsers] = await db.query('SELECT COUNT(*) as count FROM users');
    const [totalMedia] = await db.query('SELECT COUNT(*) as count FROM media');
    res.json({ success: true, data: { totalUsers: totalUsers[0].count, totalMedia: totalMedia[0].count } });
  } catch (error) {
    res.status(500).json({ success: false });
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

console.log('📦 MediaCore API loaded - ZERO Firebase');

module.exports = app;
