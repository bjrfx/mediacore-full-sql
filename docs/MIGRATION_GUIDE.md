# MediaCore: Firebase to MySQL Migration Guide

## 🎯 Overview

This guide provides complete step-by-step instructions to migrate your MediaCore application from Firebase (Firestore + Firebase Auth) to MySQL with custom JWT authentication.

**Current Status:** ✅ Foundation Complete
- ✅ MySQL database configuration created
- ✅ Complete database schema defined  
- ✅ JWT authentication module implemented
- ✅ Auth middleware updated (checkAuth, checkAdminAuth)
- 🔄 **Remaining:** Update analytics, requestLogger, all server routes, frontend, and deployment

---

## 📋 Prerequisites

### Database Setup
Your MySQL database credentials:
- **Host:** sv63.ifastnet12.org
- **User:** masakali_kiran
- **Password:** K143iran
- **Database:** masakali_mediacore
- **Port:** 3306

### Required Packages
**Backend (Add to package.json):**
```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "mysql2": "^3.15.3",
    "cors": "^2.8.5",
    "dotenv": "^16.6.1",
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "uuid": "^9.0.1"
  }
}
```

**Frontend (Remove from package.json):**
```bash
npm uninstall firebase
```

---

## 🗄️ Phase 1: Database Setup (COMPLETED ✅)

### Step 1.1: Run MySQL Schema
Execute the SQL file to create all tables:

```bash
mysql -h sv63.ifastnet12.org -u masakali_kiran -p masakali_mediacore < backend/scripts/setup-mysql-schema.sql
```

Or via phpMyAdmin/cPanel:
1. Log into your cPanel
2. Open phpMyAdmin
3. Select `masakali_mediacore` database
4. Go to "Import" tab
5. Upload `/backend/scripts/setup-mysql-schema.sql`
6. Click "Go"

**Tables Created:**
- `users` - User accounts (replaces Firebase Auth)
- `user_roles` - User roles (admin/moderator/user)
- `user_subscriptions` - Subscription tiers
- `artists` - Artist profiles
- `albums` - Album collections
- `media` - Media content (video/audio)
- `api_keys` - API access keys
- `analytics_data` - Analytics tracking
- `request_logs` - Request logging
- `user_history` - Playback history
- `user_favorites` - Liked songs
- `playlists` & `playlist_items` - User playlists
- `email_verification_tokens` - Email verification
- `password_reset_tokens` - Password resets
- `refresh_tokens` - JWT refresh tokens

### Step 1.2: Verify Database Connection
The database connection is configured in `/backend/config/db.js` which automatically connects on server start.

---

## 🔐 Phase 2: Authentication Migration (COMPLETED ✅)

### Step 2.1: Authentication Module Created
**Files Created:**
- ✅ `/backend/auth/jwt.js` - JWT token management
- ✅ `/backend/auth/password.js` - Password hashing with bcrypt
- ✅ `/backend/auth/controllers.js` - Auth endpoints

### Step 2.2: Middleware Updated
**Files Updated:**
- ✅ `/backend/middleware/checkAuth.js` - Now uses JWT instead of Firebase
- ✅ `/backend/middleware/checkAdminAuth.js` - Checks MySQL user_roles table

---

## 🔄 Phase 3: Backend Migration (IN PROGRESS)

### Step 3.1: Update Analytics Tracker

**File:** `/backend/middleware/analyticsTracker.js`

Replace Firebase Firestore writes with MySQL:

```javascript
/**
 * Analytics Tracker Middleware
 * Tracks all API requests and stores analytics data in MySQL.
 */

const { query } = require('../config/db');
const crypto = require('crypto');

// In-memory cache for batching writes
let requestBuffer = [];
const BUFFER_FLUSH_INTERVAL = 10000; // 10 seconds
const BUFFER_MAX_SIZE = 50;

/**
 * Flush the request buffer to MySQL
 */
const flushBuffer = async () => {
  if (requestBuffer.length === 0) return;

  const requests = [...requestBuffer];
  requestBuffer = [];

  try {
    // Batch insert to analytics_data table
    for (const request of requests) {
      await query(
        `INSERT INTO analytics_data 
        (endpoint, method, status_code, response_time, api_key_id, api_key_name, 
         user_agent, ip_hash, success, timestamp) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          request.endpoint,
          request.method,
          request.statusCode,
          request.responseTime,
          request.apiKeyId,
          request.apiKeyName,
          request.userAgent,
          request.ipHash,
          request.success,
          request.timestamp
        ]
      );
    }
  } catch (err) {
    console.error('Failed to flush analytics buffer:', err);
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
  if (skipPaths.includes(req.path) || req.path.startsWith('/public/')) {
    return next();
  }

  res.on('finish', () => {
    try {
      const responseTime = Date.now() - startTime;
      
      // Hash IP for privacy
      let ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
      const forwardedFor = req.headers['x-forwarded-for'];
      if (forwardedFor) {
        ipAddress = forwardedFor.split(',')[0].trim();
      }
      const ipHash = crypto.createHash('sha256').update(ipAddress).digest('hex');

      const analyticsData = {
        timestamp: new Date(),
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTime,
        apiKeyId: req.apiKey?.id || null,
        apiKeyName: req.apiKey?.name || null,
        userAgent: req.headers['user-agent'] || 'unknown',
        ipHash,
        success: res.statusCode < 400
      };

      requestBuffer.push(analyticsData);

      // Flush if buffer is full
      if (requestBuffer.length >= BUFFER_MAX_SIZE) {
        flushBuffer();
      }
    } catch (err) {
      console.error('Analytics tracking error:', err);
    }
  });

  next();
};

/**
 * Get analytics summary
 */
const getAnalyticsSummary = async (days = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const [totalRequests] = await query(
    'SELECT COUNT(*) as count FROM analytics_data WHERE timestamp >= ?',
    [cutoffDate]
  );

  const [successRequests] = await query(
    'SELECT COUNT(*) as count FROM analytics_data WHERE timestamp >= ? AND success = TRUE',
    [cutoffDate]
  );

  const [avgResponseTime] = await query(
    'SELECT AVG(response_time) as avg FROM analytics_data WHERE timestamp >= ?',
    [cutoffDate]
  );

  const endpointStats = await query(
    'SELECT endpoint, COUNT(*) as count FROM analytics_data WHERE timestamp >= ? GROUP BY endpoint ORDER BY count DESC LIMIT 10',
    [cutoffDate]
  );

  return {
    totalRequests: totalRequests[0]?.count || 0,
    successfulRequests: successRequests[0]?.count || 0,
    failedRequests: (totalRequests[0]?.count || 0) - (successRequests[0]?.count || 0),
    avgResponseTime: Math.round(avgResponseTime[0]?.avg || 0),
    topEndpoints: endpointStats
  };
};

/**
 * Get real-time stats
 */
const getRealTimeStats = async () => {
  const last24h = new Date();
  last24h.setHours(last24h.getHours() - 24);

  const [stats] = await query(
    `SELECT 
      COUNT(*) as requestsLast24h,
      AVG(response_time) as avgResponseTime,
      SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as successRate
    FROM analytics_data WHERE timestamp >= ?`,
    [last24h]
  );

  return stats[0] || { requestsLast24h: 0, avgResponseTime: 0, successRate: 100 };
};

/**
 * Get API key usage stats
 */
const getApiKeyStats = async () => {
  return await query(
    `SELECT 
      api_key_id, 
      api_key_name, 
      COUNT(*) as requestCount,
      AVG(response_time) as avgResponseTime
    FROM analytics_data 
    WHERE api_key_id IS NOT NULL 
    GROUP BY api_key_id, api_key_name
    ORDER BY requestCount DESC`
  );
};

module.exports = analyticsTracker;
module.exports.getAnalyticsSummary = getAnalyticsSummary;
module.exports.getRealTimeStats = getRealTimeStats;
module.exports.getApiKeyStats = getApiKeyStats;
module.exports.flushBuffer = flushBuffer;
```

### Step 3.2: Update Request Logger

**File:** `/backend/middleware/requestLogger.js`

Replace Firebase Firestore writes with MySQL:

```javascript
/**
 * Request Logger Middleware
 * Logs every API request to the request_logs table in MySQL.
 */

const { query } = require('../config/db');

/**
 * Request logging middleware
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
      
      // Get IP address
      let ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
      const forwardedFor = req.headers['x-forwarded-for'];
      if (forwardedFor) {
        ipAddress = forwardedFor.split(',')[0].trim();
      }

      const logData = {
        timestamp: new Date(),
        method: req.method,
        endpoint: req.path,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        apiKeyId: req.apiKey?.id || null,
        userId: req.user?.uid || null,
        userAgent: req.headers['user-agent'] || 'unknown',
        ipAddress,
        errorMessage: res.statusCode >= 400 ? res.statusMessage || null : null
      };

      // Log to MySQL (fire and forget)
      await query(
        `INSERT INTO request_logs 
        (timestamp, method, endpoint, path, status_code, response_time, 
         api_key_id, user_id, user_agent, ip_address, error_message) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logData.timestamp,
          logData.method,
          logData.endpoint,
          logData.path,
          logData.statusCode,
          logData.responseTime,
          logData.apiKeyId,
          logData.userId,
          logData.userAgent,
          logData.ipAddress,
          logData.errorMessage
        ]
      ).catch(err => console.error('Failed to log request:', err));
    } catch (err) {
      console.error('Request logging error:', err);
    }
  });

  next();
};

module.exports = requestLogger;
```

### Step 3.3: Add Auth Routes to server.js

**File:** `/backend/server.js`

Add these routes BEFORE the existing routes (around line 280):

```javascript
// =============================================================================
// AUTHENTICATION ROUTES (Public)
// =============================================================================

const authControllers = require('./auth/controllers');

// Auth routes
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

### Step 3.4: Update server.js Imports

**At the top of `/backend/server.js`, replace:**

```javascript
// OLD (remove these lines)
const { db, auth, admin } = require('./config/firebase');

// NEW (add these lines)
const { query, queryOne, transaction } = require('./config/db');
```

### Step 3.5: Install New Dependencies

Run in the backend directory:

```bash
cd backend
npm install bcrypt jsonwebtoken mysql2
npm uninstall firebase-admin
```

### Step 3.6: Update Environment Variables

**File:** `/backend/.env`

```env
# Database Configuration
DB_HOST=sv63.ifastnet12.org
DB_USER=masakali_kiran
DB_PASSWORD=K143iran
DB_NAME=masakali_mediacore
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Server Configuration
PORT=3001
UPLOAD_DIR=./public/uploads

# CORS (Frontend URL)
FRONTEND_URL=http://localhost:3000

# Optional: Google OAuth (implement later)
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email Configuration (for password reset - implement later)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password

# REMOVE THESE FIREBASE VARIABLES:
# FIREBASE_PROJECT_ID=...
# FIREBASE_PRIVATE_KEY_ID=...
# FIREBASE_PRIVATE_KEY=...
# FIREBASE_CLIENT_EMAIL=...
# FIREBASE_CLIENT_ID=...
```

---

## 🎨 Phase 4: Frontend Migration

### Step 4.1: Create Frontend Auth Service

**File:** `/frontend/src/services/auth.js` (NEW FILE)

```javascript
/**
 * Authentication Service
 * Handles all authentication API calls
 */

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const authService = {
  /**
   * Register new user
   */
  register: async (email, password, displayName) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    
    return data;
  },

  /**
   * Login with email/password
   */
  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    // Store tokens
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    
    return data.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Refresh token invalid, clear storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      throw new Error('Session expired. Please login again.');
    }
    
    // Update tokens
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    
    return data.data.accessToken;
  },

  /**
   * Logout
   */
  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  /**
   * Get current user
   */
  getCurrentUser: async () => {
    const accessToken = localStorage.getItem('accessToken');
    
    if (!accessToken) {
      throw new Error('No access token');
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Try refreshing token
      if (response.status === 401) {
        try {
          await authService.refreshToken();
          // Retry with new token
          return await authService.getCurrentUser();
        } catch (error) {
          throw new Error('Session expired');
        }
      }
      throw new Error(data.message || 'Failed to get user info');
    }
    
    return data.data;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken');
  },

  /**
   * Get access token
   */
  getAccessToken: () => {
    return localStorage.getItem('accessToken');
  }
};
```

### Step 4.2: Update Frontend Environment Variables

**File:** `/frontend/.env`

```env
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:3001
REACT_APP_PUBLIC_API_KEY=mc_your_public_api_key

# Admin Configuration
REACT_APP_ADMIN_EMAIL=admin@mediacore.com

# REMOVE ALL FIREBASE VARIABLES:
# REACT_APP_FIREBASE_API_KEY=...
# REACT_APP_FIREBASE_AUTH_DOMAIN=...
# etc.
```

### Step 4.3: Update Auth Store

**File:** `/frontend/src/store/authStore.js`

Replace the entire file with:

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/auth';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isAdminUser: false,
      error: null,

      /**
       * Login with email/password
       */
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authService.login(email, password);
          
          const isAdmin = data.user.role === 'admin' || 
                         data.user.email === process.env.REACT_APP_ADMIN_EMAIL;
          
          set({
            user: data.user,
            isAuthenticated: true,
            isAdminUser: isAdmin,
            isLoading: false
          });
          
          return data;
        } catch (error) {
          set({ 
            error: error.message, 
            isLoading: false,
            isAuthenticated: false 
          });
          throw error;
        }
      },

      /**
       * Logout
       */
      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        }
        
        set({
          user: null,
          isAuthenticated: false,
          isAdminUser: false,
          error: null
        });
      },

      /**
       * Initialize auth state (check token validity)
       */
      initAuth: async () => {
        set({ isLoading: true });
        
        try {
          if (authService.isAuthenticated()) {
            const user = await authService.getCurrentUser();
            
            const isAdmin = user.role === 'admin' || 
                           user.email === process.env.REACT_APP_ADMIN_EMAIL;
            
            set({
              user,
              isAuthenticated: true,
              isAdminUser: isAdmin,
              isLoading: false
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          // Clear invalid tokens
          await get().logout();
          set({ isLoading: false });
        }
      },

      /**
       * Set loading state
       */
      setLoading: (loading) => set({ isLoading: loading }),

      /**
       * Set user manually (for external updates)
       */
      setUser: (user) => {
        if (!user) {
          set({
            user: null,
            isAuthenticated: false,
            isAdminUser: false
          });
          return;
        }

        const isAdmin = user.role === 'admin' || 
                       user.email === process.env.REACT_APP_ADMIN_EMAIL;

        set({
          user,
          isAuthenticated: true,
          isAdminUser: isAdmin
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist these fields (not tokens - those are in localStorage)
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAdminUser: state.isAdminUser,
      }),
    }
  )
);

export default useAuthStore;
```

### Step 4.4: Update App.jsx

**File:** `/frontend/src/App.jsx`

Replace Firebase imports and auth logic:

```javascript
// REMOVE these imports:
// import { onAuthStateChanged } from 'firebase/auth';
// import { auth } from './config/firebase';

// ADD this import:
import { useAuthStore } from './store';

// In the App component, REPLACE the useEffect that uses onAuthStateChanged:

// OLD (remove):
/*
useEffect(() => {
  setLoading(true);
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
      });
    } else {
      setUser(null);
    }
    setLoading(false);
  });
  return () => unsubscribe();
}, [setUser, setLoading]);
*/

// NEW (add):
useEffect(() => {
  initAuth();
}, []);
```

### Step 4.5: Update LoginModal Component

**File:** `/frontend/src/components/auth/LoginModal.jsx`

Replace Firebase authentication with custom auth:

```javascript
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export default function LoginModal({ open, onOpenChange }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { login } = useAuthStore();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      onOpenChange(false);
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
          <DialogDescription>
            Sign in to access premium features
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          <p>Default admin credentials:</p>
          <p className="font-mono">admin@mediacore.com / admin123</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 4.6: Update API Service

**File:** `/frontend/src/services/api.js`

Replace all instances of Firebase `getIdToken()` with localStorage token:

```javascript
// FIND AND REPLACE throughout the file:

// OLD:
// const token = await auth.currentUser.getIdToken();

// NEW:
const token = localStorage.getItem('accessToken');

// Also add token refresh logic for 401 errors:
// If response status is 401, call authService.refreshToken() and retry
```

### Step 4.7: Remove Firebase Files

Delete these files:
- `/frontend/src/config/firebase.js`
- `/frontend/firebase.js`

### Step 4.8: Update Frontend Package.json

Remove Firebase dependency:

```bash
cd frontend
npm uninstall firebase
```

---

## 🚀 Phase 5: Testing & Deployment

### Step 5.1: Test Backend Authentication

```bash
# Start backend server
cd backend
npm install
node server.js
```

**Test endpoints with curl or Postman:**

```bash
# Register new user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","displayName":"Test User"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mediacore.com","password":"admin123"}'

# Test protected route
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Step 5.2: Test Frontend

```bash
cd frontend
npm install
npm start
```

**Test checklist:**
- ✅ Login with admin@mediacore.com / admin123
- ✅ Token stored in localStorage
- ✅ Protected routes accessible
- ✅ Logout clears tokens
- ✅ Token refresh works on expiry

### Step 5.3: Deploy to cPanel

**Backend Deployment:**

1. Upload backend files to cPanel
2. Create Node.js app in cPanel
3. Set environment variables in cPanel Node.js settings
4. Install dependencies: `npm install --production`
5. Start the app

**Frontend Deployment:**

1. Build: `npm run build`
2. Upload `build/` folder to public_html
3. Update `.env` with production API URL
4. Configure `.htaccess` for SPA routing

---

## 📊 Migration Status Summary

### ✅ Completed:
1. MySQL database configuration
2. Complete database schema with all tables
3. JWT authentication module (jwt.js, password.js)
4. Auth controllers with all endpoints
5. Updated checkAuth and checkAdminAuth middleware
6. Documentation and migration guide

### 🔄 Remaining Tasks:
1. Update analyticsTracker middleware (code provided above)
2. Update requestLogger middleware (code provided above)
3. Update server.js routes to use MySQL queries instead of Firestore
4. Create frontend auth service
5. Update frontend auth store
6. Update frontend components (LoginModal, App.jsx)
7. Update frontend API service
8. Remove Firebase from frontend
9. Test complete flow
10. Deploy to production

---

## 📝 Notes

- **Default Admin:** email: `admin@mediacore.com`, password: `admin123` (created by schema)
- **JWT Secret:** Change `JWT_SECRET` in production to a secure random string
- **Password Requirements:** Minimum 8 characters, uppercase, lowercase, number, special character
- **Token Expiry:** Access tokens expire in 15 minutes, refresh tokens in 7 days
- **Migration Strategy:** Run both systems in parallel during migration, gradually switch users

---

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Test MySQL connection
mysql -h sv63.ifastnet12.org -u masakali_kiran -p
```

### JWT Token Issues
- Ensure `JWT_SECRET` is set in .env
- Check token expiry time
- Verify token format in Authorization header

### CORS Issues
- Update `FRONTEND_URL` in backend .env
- Check CORS configuration in server.js

---

## 🎯 Next Steps

After completing this migration:
1. Implement Google OAuth (optional)
2. Set up email service for password resets
3. Add rate limiting to auth endpoints
4. Implement 2FA (optional)
5. Set up database backups
6. Monitor and optimize MySQL performance

---

**Migration created:** December 8, 2025  
**Database:** masakali_mediacore @ sv63.ifastnet12.org  
**Status:** Foundation complete, ready for implementation
