# MediaCore MySQL Migration - Quick Start

## ✅ What's Been Done

I've completed the foundation for migrating your MediaCore app from Firebase to MySQL:

### 1. **Database Layer** ✅
- **Created:** `/backend/config/db.js` - MySQL connection pool
- **Created:** `/backend/scripts/setup-mysql-schema.sql` - Complete database schema
  - 18 tables including users, media, artists, albums, api_keys, analytics, etc.
  - All foreign keys and indexes properly configured
  - Default admin user included (email: admin@mediacore.com, password: admin123)

### 2. **Authentication System** ✅
- **Created:** `/backend/auth/jwt.js` - JWT token generation and verification
- **Created:** `/backend/auth/password.js` - Bcrypt password hashing
- **Created:** `/backend/auth/controllers.js` - Complete auth endpoints:
  - POST /auth/register
  - POST /auth/login
  - POST /auth/refresh
  - POST /auth/logout
  - POST /auth/forgot-password
  - POST /auth/reset-password
  - POST /auth/verify-email
  - GET /auth/me

### 3. **Middleware Updates** ✅
- **Updated:** `/backend/middleware/checkAuth.js` - Now uses JWT instead of Firebase
- **Updated:** `/backend/middleware/checkAdminAuth.js` - Checks MySQL user_roles table

### 4. **Documentation** ✅
- **Created:** `/MIGRATION_GUIDE.md` - Comprehensive step-by-step migration guide

---

## 🚀 Next Steps (What You Need to Do)

### Step 1: Set Up MySQL Database

Run the SQL schema file on your MySQL database:

**Option A: Command Line**
```bash
mysql -h sv63.ifastnet12.org -u masakali_kiran -p masakali_mediacore < backend/scripts/setup-mysql-schema.sql
# Enter password: K143iran
```

**Option B: cPanel phpMyAdmin**
1. Log into cPanel
2. Open phpMyAdmin
3. Select `masakali_mediacore` database
4. Go to "Import" tab
5. Upload `backend/scripts/setup-mysql-schema.sql`
6. Click "Go"

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install bcrypt jsonwebtoken mysql2
npm uninstall firebase-admin
```

### Step 3: Update Backend Environment Variables

Edit `backend/.env`:

```env
# Add these new variables:
DB_HOST=sv63.ifastnet12.org
DB_USER=masakali_kiran
DB_PASSWORD=K143iran
DB_NAME=masakali_mediacore
DB_PORT=3306

JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Remove Firebase variables:
# FIREBASE_PROJECT_ID=...
# FIREBASE_PRIVATE_KEY_ID=...
# etc.
```

### Step 4: Update server.js

1. **Replace Firebase imports** (line ~17):
```javascript
// OLD:
const { db, auth, admin } = require('./config/firebase');

// NEW:
const { query, queryOne, transaction } = require('./config/db');
```

2. **Add auth routes** (around line 280, before existing routes):
```javascript
const authControllers = require('./auth/controllers');

app.post('/auth/register', authControllers.register);
app.post('/auth/login', authControllers.login);
app.post('/auth/google', authControllers.googleAuth);
app.post('/auth/refresh', authControllers.refreshAccessToken);
app.post('/auth/logout', authControllers.logout);
app.post('/auth/forgot-password', authControllers.forgotPassword);
app.post('/auth/reset-password', authControllers.resetPassword);
app.post('/auth/verify-email', authControllers.verifyEmail);
app.get('/auth/me', checkAuth, authControllers.getCurrentUser);
```

3. **Update all Firestore queries** - Replace throughout server.js:
   - `db.collection('media_content')` → MySQL queries
   - `db.collection('artists')` → MySQL queries
   - `db.collection('albums')` → MySQL queries
   - `db.collection('api_keys')` → MySQL queries
   - See MIGRATION_GUIDE.md for detailed instructions

### Step 5: Test Backend

```bash
cd backend
node server.js
```

Test with curl:
```bash
# Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!@#","displayName":"Test"}'

# Login (use default admin)
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mediacore.com","password":"admin123"}'
```

### Step 6: Update Frontend

Follow the detailed instructions in `MIGRATION_GUIDE.md` Phase 4:
1. Create `/frontend/src/services/auth.js`
2. Update `/frontend/src/store/authStore.js`
3. Update `/frontend/src/App.jsx`
4. Update `/frontend/src/components/auth/LoginModal.jsx`
5. Update `/frontend/src/services/api.js`
6. Remove Firebase files and dependencies

```bash
cd frontend
npm uninstall firebase
npm start
```

---

## 📋 File Summary

### New Files Created:
```
backend/
  ├── config/
  │   └── db.js                    ✅ MySQL connection
  ├── auth/
  │   ├── jwt.js                   ✅ JWT token management
  │   ├── password.js              ✅ Password hashing
  │   └── controllers.js           ✅ Auth endpoints
  └── scripts/
      └── setup-mysql-schema.sql   ✅ Database schema
      
MIGRATION_GUIDE.md                 ✅ Complete guide
README.md                          ✅ This file
```

### Modified Files:
```
backend/middleware/
  ├── checkAuth.js                 ✅ Updated for JWT
  └── checkAdminAuth.js            ✅ Updated for MySQL
```

### Files That Still Need Updates:
```
backend/
  ├── server.js                    🔄 Replace all Firestore queries
  ├── middleware/
  │   ├── analyticsTracker.js      🔄 Update to MySQL
  │   └── requestLogger.js         🔄 Update to MySQL
  └── package.json                 🔄 Update dependencies

frontend/
  ├── src/
  │   ├── services/
  │   │   ├── auth.js              🔄 Create new file
  │   │   └── api.js               🔄 Update token handling
  │   ├── store/
  │   │   └── authStore.js         🔄 Replace Firebase
  │   ├── components/auth/
  │   │   └── LoginModal.jsx       🔄 Custom auth
  │   └── App.jsx                  🔄 Remove Firebase
  └── package.json                 🔄 Remove firebase
```

---

## 🎯 Default Admin Credentials

After running the SQL schema, you'll have a default admin user:

- **Email:** admin@mediacore.com
- **Password:** admin123

⚠️ **IMPORTANT:** Change this password after first login in production!

---

## 📖 Full Documentation

See `MIGRATION_GUIDE.md` for:
- Detailed code examples for every file
- Complete frontend migration steps
- Troubleshooting guide
- Deployment instructions
- Best practices and security notes

---

## 🆘 Need Help?

1. **Database connection issues?**
   - Check credentials in .env
   - Test connection: `mysql -h sv63.ifastnet12.org -u masakali_kiran -p`

2. **JWT errors?**
   - Ensure JWT_SECRET is set in .env
   - Check token format: `Bearer <token>`

3. **Missing dependencies?**
   - Run `npm install` in both backend and frontend
   - Check package.json for correct versions

---

## ✅ Checklist

- [ ] Run SQL schema on MySQL database
- [ ] Install new backend dependencies (bcrypt, jsonwebtoken, mysql2)
- [ ] Update backend .env with MySQL and JWT config
- [ ] Add auth routes to server.js
- [ ] Replace Firestore queries in server.js
- [ ] Update middleware (analytics, requestLogger)
- [ ] Create frontend auth service
- [ ] Update frontend auth store
- [ ] Update frontend components
- [ ] Remove Firebase from frontend
- [ ] Test complete authentication flow
- [ ] Deploy to production

---

**Migration Foundation:** ✅ Complete  
**Ready for Implementation:** Yes  
**Estimated Completion Time:** 4-6 hours for remaining tasks
