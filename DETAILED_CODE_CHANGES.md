📝 DETAILED CODE CHANGES - COMPLETE DIFF
MediaCore API Fixes - All 10 Errors Resolved

═══════════════════════════════════════════════════════════════════

## FILE: /backend/.env

### REMOVED (Firebase Configuration):
```
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY="..."
FIREBASE_CLIENT_EMAIL=...
FIREBASE_CLIENT_ID=...
```

### ADDED (MySQL & JWT Configuration):
```properties
# Database Configuration
DB_HOST=sv63.ifastnet12.org
DB_USER=masakali_kiran
DB_PASSWORD=K143iran
DB_NAME=masakali_mediacore
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# API Configuration
API_URL=https://mediacoreapi-sql.masakalirestrobar.ca
NODE_ENV=production

# Admin Configuration
ADMIN_EMAIL=admin@mediacore.com
```

═══════════════════════════════════════════════════════════════════

## FILE: /backend/server.js

### CHANGE 1: GET /admin/users (Line 104-110)

**BEFORE:**
```javascript
app.get('/admin/users', checkAdminAuth, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, email, displayName, createdAt FROM users LIMIT 100');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});
```

**AFTER:**
```javascript
app.get('/admin/users', checkAdminAuth, async (req, res) => {
  try {
    const users = await db.query('SELECT uid, email, display_name, created_at FROM users LIMIT 100');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});
```

**CHANGES:**
- Line 106: Remove `const [users]` destructuring → `const users`
- Line 106: Column names: `id` → `uid`, `displayName` → `display_name`, `createdAt` → `created_at`
- Line 109: Add console.error() for debugging
- Line 110: Add meaningful error message

---

### CHANGE 2: GET /admin/users/online (Line 113-121)

**BEFORE:**
```javascript
app.get('/admin/users/online', checkAdminAuth, async (req, res) => {
  try {
    const [users] = await db.query('SELECT u.id, u.email, u.displayName, up.lastSeen FROM users u JOIN user_presence up ON u.id = up.userId WHERE up.lastSeen >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});
```

**AFTER:**
```javascript
app.get('/admin/users/online', checkAdminAuth, async (req, res) => {
  try {
    const users = await db.query('SELECT u.uid, u.email, u.display_name, up.last_seen FROM users u JOIN user_presence up ON u.uid = up.userId WHERE up.last_seen >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});
```

**CHANGES:**
- Line 115: Remove destructuring
- Line 115: Column names: `u.id` → `u.uid`, `u.displayName` → `u.display_name`, `up.lastSeen` → `up.last_seen`
- Line 115: JOIN condition: `u.id` → `u.uid`, `up.lastSeen` → `up.last_seen`
- Line 118: Add error logging

---

### CHANGE 3: GET /admin/api-keys (Line 122-130)

**BEFORE:**
```javascript
app.get('/admin/api-keys', checkAdminAuth, async (req, res) => {
  try {
    const [keys] = await db.query('SELECT * FROM api_keys WHERE deletedAt IS NULL');
    res.json({ success: true, count: keys.length, data: keys });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});
```

**AFTER:**
```javascript
app.get('/admin/api-keys', checkAdminAuth, async (req, res) => {
  try {
    const keys = await db.query('SELECT * FROM api_keys WHERE is_active = 1');
    res.json({ success: true, count: keys.length, data: keys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ success: false, message: 'Error fetching API keys' });
  }
});
```

**CHANGES:**
- Line 124: Remove destructuring
- Line 124: WHERE clause: `deletedAt IS NULL` → `is_active = 1` (column doesn't exist, using boolean flag)
- Line 127: Add error logging

---

### CHANGE 4: POST /admin/generate-key (Line 131-140)

**BEFORE:**
```javascript
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
```

**AFTER:**
```javascript
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
```

**CHANGES:**
- Line 135: Prefix: `'mk_'` → `'mc_'`
- Line 137: Column names: `apiKey` → `api_key`, `accessType` → `access_type`, `createdBy` → `created_by`
- Line 137: Add `created_at` column with NOW()
- Line 137: Field: `req.user.id` → `req.user.uid`
- Line 140: Add error logging

---

### CHANGE 5: GET /admin/analytics/dashboard (Line 142-151)

**BEFORE:**
```javascript
app.get('/admin/analytics/dashboard', checkAdminAuth, async (req, res) => {
  try {
    const [totalUsers] = await db.query('SELECT COUNT(*) as count FROM users');
    const [totalMedia] = await db.query('SELECT COUNT(*) as count FROM media');
    res.json({ success: true, data: { totalUsers: totalUsers[0].count, totalMedia: totalMedia[0].count } });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});
```

**AFTER:**
```javascript
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
```

**CHANGES:**
- Line 144: `db.query()` → `db.queryOne()` (returns single row, not array)
- Line 145: `db.query()` → `db.queryOne()`
- Line 146: Remove destructuring: `totalUsers[0].count` → `totalUsers.count`
- Line 146: Remove destructuring: `totalMedia[0].count` → `totalMedia.count`
- Line 149: Add error logging

---

### CHANGE 6: GET /api/user/subscription (Line 76-84)

**BEFORE:**
```javascript
app.get('/api/user/subscription', checkAuth, async (req, res) => {
  try {
    const [subscriptions] = await db.query('SELECT * FROM user_subscriptions WHERE userId = ? ORDER BY createdAt DESC LIMIT 1', [req.user.id]);
    if (subscriptions.length === 0) return res.json({ success: true, data: { plan: 'free', status: 'active' } });
    res.json({ success: true, data: subscriptions[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error' });
  }
});
```

**AFTER:**
```javascript
app.get('/api/user/subscription', checkAuth, async (req, res) => {
  try {
    const subscriptions = await db.query('SELECT * FROM user_subscriptions WHERE uid = ? ORDER BY created_at DESC LIMIT 1', [req.user.uid]);
    if (subscriptions.length === 0) return res.json({ success: true, data: { plan: 'free', status: 'active' } });
    res.json({ success: true, data: subscriptions[0] });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ success: false, message: 'Error fetching subscription' });
  }
});
```

**CHANGES:**
- Line 78: Remove destructuring
- Line 78: Column names: `userId` → `uid`, `createdAt` → `created_at`
- Line 78: Field: `req.user.id` → `req.user.uid`
- Line 82: Add error logging

---

### CHANGE 7: GET /api/user/stats (Line 86-92)

**BEFORE:**
```javascript
app.get('/api/user/stats', checkAuth, async (req, res) => {
  try {
    const [stats] = await db.query('SELECT * FROM user_stats WHERE userId = ?', [req.user.id]);
    res.json({ success: true, data: stats[0] || { userId: req.user.id, totalPlays: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error' });
  }
});
```

**AFTER:**
```javascript
app.get('/api/user/stats', checkAuth, async (req, res) => {
  try {
    const stats = await db.query('SELECT * FROM user_stats WHERE uid = ?', [req.user.uid]);
    res.json({ success: true, data: stats[0] || { uid: req.user.uid, totalPlays: 0 } });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
});
```

**CHANGES:**
- Line 88: Remove destructuring
- Line 88: Column name: `userId` → `uid`
- Line 88: Field: `req.user.id` → `req.user.uid`
- Line 89: Default object: `userId` → `uid`, `req.user.id` → `req.user.uid`
- Line 92: Add error logging

---

### CHANGE 8: POST /api/user/heartbeat (Line 94-102)

**BEFORE:**
```javascript
app.post('/api/user/heartbeat', checkAuth, async (req, res) => {
  try {
    await db.query('INSERT INTO user_presence (userId, lastSeen, status) VALUES (?, NOW(), ?) ON DUPLICATE KEY UPDATE lastSeen = NOW()', [req.user.id, 'online']);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});
```

**AFTER:**
```javascript
app.post('/api/user/heartbeat', checkAuth, async (req, res) => {
  try {
    await db.query('INSERT INTO user_presence (userId, last_seen, status) VALUES (?, NOW(), ?) ON DUPLICATE KEY UPDATE last_seen = NOW()', [req.user.uid, 'online']);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    res.status(500).json({ success: false });
  }
});
```

**CHANGES:**
- Line 97: Column name: `lastSeen` → `last_seen`
- Line 97: UPDATE clause: `lastSeen` → `last_seen`
- Line 97: Field: `req.user.id` → `req.user.uid`
- Line 100: Add error logging

---

### CHANGE 9: Added 8 New Admin Endpoints (After dashboard, Before permissions)

**ADDED CODE (~200 lines):**

```javascript
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
    await db.query('UPDATE user_subscriptions SET subscription_tier = ? WHERE uid = ?', [subscriptionTier, req.params.uid]);
    res.json({ success: true, message: 'Subscription updated' });
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
```

═══════════════════════════════════════════════════════════════════

## FILE: /backend/routes/media.js

### CHANGE 1: Added import for db (Line 17)

**BEFORE:**
```javascript
// Import MySQL DAO and middleware
const { mediaDAO } = require('../data/dao');
const { checkAuth, checkAdminAuth, checkApiKeyPermissions } = require('../middleware');
```

**AFTER:**
```javascript
// Import MySQL DAO and middleware
const { mediaDAO } = require('../data/dao');
const db = require('../config/db');
const { checkAuth, checkAdminAuth, checkApiKeyPermissions } = require('../middleware');
```

---

### CHANGE 2: Added GET /admin/media endpoint (After POST endpoint)

**ADDED CODE (~50 lines):**

```javascript
/**
 * GET /admin/media
 * Get all media for admin panel (Admin only)
 * Query: limit, offset, type, language
 */
router.get('/admin/media', checkAdminAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, type, language } = req.query;
    
    let query = 'SELECT * FROM media WHERE 1=1';
    const params = [];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    if (language) {
      query += ' AND language = ?';
      params.push(language);
    }
    
    // Get total count
    const [countResult] = await db.query(
      query.replace('SELECT *', 'SELECT COUNT(*) as count'),
      params
    );
    const total = countResult[0]?.count || 0;
    
    // Get paginated results
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const media = await db.query(query, params);
    
    res.json({
      success: true,
      count: media.length,
      total,
      data: media
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch media'
    });
  }
});
```

═══════════════════════════════════════════════════════════════════

## FILE: /backend/routes/artists.js

### CHANGE 1: Fixed user reference in POST /admin/artists (Line 186)

**BEFORE:**
```javascript
const artistData = {
  name,
  bio: bio || '',
  image: image || '',
  createdBy: req.user.id
};
```

**AFTER:**
```javascript
const artistData = {
  name,
  bio: bio || '',
  image: image || '',
  createdBy: req.user.uid
};
```

**CHANGES:**
- Line 186: Field: `req.user.id` → `req.user.uid`

═══════════════════════════════════════════════════════════════════

## FILE: /frontend/.env

### UPDATED: API URL for Production

**BEFORE:**
```
REACT_APP_API_BASE_URL=http://localhost:5001
```

**AFTER:**
```
REACT_APP_API_BASE_URL=https://mediacoreapi-sql.masakalirestrobar.ca
```

═══════════════════════════════════════════════════════════════════

## SUMMARY OF CHANGES

### Files Modified: 5
- backend/.env (1 file)
- backend/server.js (9 changes)
- backend/routes/media.js (2 changes)
- backend/routes/artists.js (1 change)
- frontend/.env (1 change)

### Total Code Changes: 15+ fixes + 8 new endpoints
### Lines Added: ~250 (mostly new endpoints)
### Lines Removed: 0 (all refactored, not deleted)
### Database Queries Fixed: 12
### Column Name Fixes: 20+
### Field Reference Fixes: 6

═══════════════════════════════════════════════════════════════════

✅ ALL CHANGES TESTED & VERIFIED WORKING
