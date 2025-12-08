# Complete Server Migration Guide

Due to the large size of server.js (3700+ lines), I'm creating a new MySQL-only version.

## What We're Doing:

1. **Removing**: All Firebase Firestore queries (db.collection())
2. **Replacing with**: MySQL queries using the db helper
3. **Keeping**: All API endpoint logic, just changing the data source

## Major Changes Needed:

### 1. Media Routes (Lines ~300-600)
- GET /api/feed → Query `media` table
- GET /api/media/:id → Query `media` table
- GET /api/media/languages/:id → Query `media` table with language filters

### 2. Artists Routes (Lines ~600-750)
- GET /api/artists → Query `artists` table
- GET /api/artists/:id → Query `artists` table with JOIN to media

### 3. Albums Routes (Lines ~750-800)
- GET /api/albums → Query `albums` table
- GET /api/albums/:id → Query `albums` table with JOIN

### 4. User Subscription Routes (Lines ~800-900)
- GET /api/user/subscription → Query `user_subscriptions` table
- Use MySQL instead of Firebase Auth custom claims

### 5. User Stats Routes (Lines ~900-1200)
- GET /api/user/stats → Query `user_stats`, `user_daily_activity`, `user_plays` tables
- POST /api/user/stats/play → INSERT into user_plays, UPDATE user_stats
- DELETE /api/user/stats → DELETE from user_plays, user_daily_activity, user_stats

### 6. User Presence (Lines ~1240-1350)
- POST /api/user/heartbeat → INSERT/UPDATE `user_presence` table
- GET /admin/users/online → Query `user_presence` table

### 7. Admin Routes (Lines ~1350-end)
- Admin media upload → Keep file upload, save metadata to `media` table
- Admin user management → Query `users`, `user_roles` tables
- Admin API keys → Query `api_keys` table
- Admin analytics → Query `analytics_data`, `request_logs` tables

## Strategy:

Since server.js is too large to edit in one go, I'll:
1. Create a backup of current server.js
2. Create a new MySQL-only server.js with the most critical routes
3. Test each section as we go
4. Gradually add more routes

Should I proceed with creating the new server.js?
