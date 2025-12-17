# Complete Firebase to MySQL Migration

## Status: In Progress

### Phase 1: Authentication ✅ COMPLETED
- [x] MySQL user authentication
- [x] JWT token management
- [x] Login/logout endpoints
- [x] Password reset functionality
- [x] User roles in MySQL

### Phase 2: Core Data Migration 🔄 IN PROGRESS
Need to migrate these Firebase collections to MySQL:

#### Already Have MySQL Tables (from schema):
- ✅ users
- ✅ user_roles
- ✅ user_subscriptions
- ✅ media
- ✅ artists
- ✅ albums
- ✅ api_keys
- ✅ analytics_data
- ✅ request_logs
- ✅ user_history
- ✅ user_favorites
- ✅ playlists
- ✅ playlist_items
- ✅ refresh_tokens

#### Need to Add/Modify:
- [ ] user_stats (for listening statistics)
- [ ] user_daily_activity (for daily listening data)
- [ ] user_plays (for individual play records)
- [ ] user_presence (for online status)
- [ ] download_logs (for download tracking)
- [ ] app_settings (for application settings)

### Phase 3: Backend Routes Migration
Files to update:
1. **server.js** - All Firebase db.collection() calls → MySQL queries
2. **middleware/analyticsTracker.js** - Firebase → MySQL
3. **middleware/requestLogger.js** - Firebase → MySQL
4. **Remove config/firebase.js**

### Phase 4: Data Migration
- Export existing Firebase data
- Import into MySQL tables

### Phase 5: Testing & Cleanup
- Test all endpoints
- Remove Firebase dependencies from package.json
- Remove Firebase config files

---

## Current Firebase Collections in Use:

From server.js analysis:
1. `media_content` → `media` table
2. `api_keys` → `api_keys` table
3. `user_subscriptions` → `user_subscriptions` table
4. `users/{uid}/stats` → Need new table
5. `users/{uid}/dailyActivity` → Need new table
6. `users/{uid}/plays` → Need new table
7. `userPresence` → Need new table
8. `download_logs` → Need new table
9. `app_settings` → Need new table
10. `analytics_data` → `analytics_data` table
11. `analytics_requests` → `request_logs` table

## Migration Steps

### Step 1: Add Missing MySQL Tables
### Step 2: Create MySQL Query Helpers
### Step 3: Update All Routes
### Step 4: Remove Firebase Code
### Step 5: Test Everything
