# MediaCore API Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Public API Endpoints](#public-api-endpoints)
5. [Admin API Endpoints](#admin-api-endpoints)
6. [Artists API Endpoints](#artists-api-endpoints)
7. [Albums API Endpoints](#albums-api-endpoints)
8. [Album-Media Relationship Endpoints](#album-media-relationship-endpoints)
9. [User Management Endpoints](#user-management-endpoints)
10. [Analytics Endpoints](#analytics-endpoints)
11. [Journal API Endpoints](#journal-api-endpoints)
12. [Error Handling](#error-handling)
13. [Frontend Integration Guide](#frontend-integration-guide)
14. [Code Examples](#code-examples)

---

## Overview

MediaCore API is a RESTful backend service for managing media content (video/audio files). It provides:

- **Public API** - For mobile/web apps to fetch media content (requires API Key)
- **Admin API** - For admin dashboard to manage content (requires Firebase Auth)
- **Analytics** - Track API usage and visitor statistics

---

## Base URL

| Environment | URL |
|-------------|-----|
| **Production** | `https://test.mediacoreapi.masakalirestrobar.ca` |
| **Local Development** | `http://localhost:3000` |

---

## Authentication

### 1. API Key Authentication (For Public Endpoints)

Used by mobile apps and web clients to access media content.

**Header:**
```
x-api-key: mc_your_api_key_here
```

**How to get an API Key:**
1. Login to admin dashboard
2. Go to API Keys section
3. Generate a new key with appropriate permissions

### 2. Firebase Admin Authentication (For Admin Endpoints)

Used by admin dashboard for content management.

**Header:**
```
Authorization: Bearer <firebase_id_token>
```

**How to get a Firebase ID Token:**
```javascript
// In your frontend app with Firebase Auth
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const idToken = await auth.currentUser.getIdToken();
```

---

## Public API Endpoints

These endpoints require an **API Key** with appropriate permissions.

### GET /api/feed

Fetch all media content.

**Headers:**
```
x-api-key: mc_your_api_key_here
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | - | Filter by type: `video` or `audio` |
| `language` | string | - | Filter by language code: `en`, `hi`, `te`, etc. |
| `limit` | number | 50 | Maximum items to return |
| `orderBy` | string | `createdAt` | Field to sort by |
| `order` | string | `desc` | Sort order: `asc` or `desc` |

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "abc123",
      "title": "Sample Video",
      "subtitle": "Description here",
      "type": "video",
      "language": "en",
      "contentGroupId": "cg_1701234567890_abc12345",
      "fileUrl": "https://test.mediacoreapi.masakalirestrobar.ca/public/uploads/video/uuid.mp4",
      "fileSize": 15728640,
      "mimeType": "video/mp4",
      "createdAt": "2025-11-28T10:30:00.000Z"
    }
  ]
}
```

---

### GET /api/media/:id

Fetch a single media item by ID.

**Headers:**
```
x-api-key: mc_your_api_key_here
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "title": "Sample Video",
    "subtitle": "Description here",
    "type": "video",
    "language": "en",
    "contentGroupId": "cg_1701234567890_abc12345",
    "availableLanguages": ["en", "hi", "te"],
    "fileUrl": "https://test.mediacoreapi.masakalirestrobar.ca/public/uploads/video/uuid.mp4",
    "fileSize": 15728640,
    "mimeType": "video/mp4",
    "createdAt": "2025-11-28T10:30:00.000Z"
  }
}
```

---

### GET /api/languages

Get list of available languages with content counts.

**Headers:**
```
x-api-key: mc_your_api_key_here
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    { "code": "en", "name": "English", "nativeName": "English", "count": 45 },
    { "code": "hi", "name": "Hindi", "nativeName": "हिन्दी", "count": 32 },
    { "code": "te", "name": "Telugu", "nativeName": "తెలుగు", "count": 18 }
  ]
}
```

---

### GET /api/media/languages/:contentGroupId

Get all language variants for a specific content group. Used by the player for language switching.

**Headers:**
```
x-api-key: mc_your_api_key_here
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "media123",
      "title": "Sample Video",
      "language": "en",
      "fileUrl": "https://...",
      "type": "video"
    },
    {
      "id": "media124",
      "title": "Sample Video",
      "language": "hi",
      "fileUrl": "https://...",
      "type": "video"
    },
    {
      "id": "media125",
      "title": "Sample Video",
      "language": "te",
      "fileUrl": "https://...",
      "type": "video"
    }
  ]
}
```

---

### GET /api/settings

Fetch app settings.

**Headers:**
```
x-api-key: mc_your_api_key_here
```

**Response:**
```json
{
  "success": true,
  "data": {
    "appName": "MediaCore",
    "version": "1.0.0",
    "theme": "dark"
  }
}
```

---

## Admin API Endpoints

These endpoints require **Firebase Admin Authentication**.

### POST /admin/generate-key

Generate a new API key.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Mobile App Production",
  "accessType": "read_only",
  "description": "API key for mobile app",
  "expiresInDays": 365
}
```

**Access Types:**
| Type | Permissions |
|------|-------------|
| `read_only` | `read:media`, `read:settings` |
| `full_access` | All permissions |
| `custom` | Specify custom permissions array |

**Response:**
```json
{
  "success": true,
  "message": "API key generated successfully",
  "data": {
    "id": "key_doc_id",
    "key": "mc_abc123def456...",
    "name": "Mobile App Production",
    "accessType": "read_only",
    "permissions": ["read:media", "read:settings"],
    "expiresAt": "2026-11-28T10:30:00.000Z"
  }
}
```

---

### GET /admin/api-keys

List all API keys.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "key_id",
      "name": "Mobile App",
      "accessType": "read_only",
      "permissions": ["read:media", "read:settings"],
      "isActive": true,
      "keyPreview": "mc_****abc123",
      "usageCount": 1250,
      "lastUsedAt": "2025-11-28T10:30:00.000Z"
    }
  ]
}
```

---

### DELETE /admin/api-keys/:id

Delete or deactivate an API key.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `hardDelete` | boolean | false | Permanently delete if true |

---

### POST /admin/media

Upload new media content.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | The media file (.mp4 or .mp3) |
| `title` | string | Yes | Title of the media |
| `subtitle` | string | No | Description/subtitle |
| `type` | string | No | `video` (default) or `audio` |
| `language` | string | No | Language code: `en` (default), `hi`, `te`, etc. |
| `contentGroupId` | string | No | Group ID to link language variants together |

**Response:**
```json
{
  "success": true,
  "message": "Media uploaded successfully",
  "data": {
    "id": "media_id",
    "title": "My Video",
    "language": "en",
    "contentGroupId": "cg_1701234567890_abc12345",
    "fileUrl": "https://test.mediacoreapi.masakalirestrobar.ca/public/uploads/video/uuid.mp4",
    "fileSize": 15728640,
    "createdAt": "2025-11-28T10:30:00.000Z"
  }
}
```

**Uploading Multi-Language Content:**

To upload the same content in multiple languages:

1. **First upload** - Don't provide `contentGroupId`, it will be auto-generated:
   ```
   POST /admin/media
   FormData: { file, title: "My Video", language: "en" }
   ```
   Response will include: `contentGroupId: "cg_1701234567890_abc12345"`

2. **Subsequent uploads** - Use the same `contentGroupId`:
   ```
   POST /admin/media
   FormData: { file, title: "My Video", language: "hi", contentGroupId: "cg_1701234567890_abc12345" }
   ```
   ```
   POST /admin/media
   FormData: { file, title: "My Video", language: "te", contentGroupId: "cg_1701234567890_abc12345" }
   ```

Now all three uploads are linked and can be switched in the player.

---

### PUT /admin/media/:id

Update media metadata.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Updated Title",
  "subtitle": "Updated description"
}
```

---

### DELETE /admin/media/:id

Delete media content.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `deleteFile` | boolean | true | Also delete the physical file |

---

### PUT /admin/settings

Update app settings.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Body:**
```json
{
  "appName": "My App",
  "theme": "dark",
  "customSetting": "value"
}
```

---

## Artists API Endpoints

### Public Endpoints (Require API Key)

### GET /api/artists

Get all artists.

**Headers:**
```
x-api-key: mc_your_api_key_here
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Maximum items to return |
| `orderBy` | string | `createdAt` | Field to sort by |
| `order` | string | `desc` | Sort order: `asc` or `desc` |

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "artist123",
      "name": "Eckhart Tolle",
      "bio": "Spiritual teacher and author",
      "image": "https://example.com/image.jpg",
      "createdAt": "2025-11-28T10:30:00.000Z"
    }
  ]
}
```

---

### GET /api/artists/:id

Get a single artist by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "artist123",
    "name": "Eckhart Tolle",
    "bio": "Spiritual teacher and author",
    "image": "https://example.com/image.jpg",
    "createdAt": "2025-11-28T10:30:00.000Z"
  }
}
```

---

### GET /api/artists/:id/albums

Get all albums for an artist.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `orderBy` | string | `releaseDate` | Field to sort by |
| `order` | string | `desc` | Sort order |

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "album123",
      "title": "The Power of Now",
      "description": "Teachings on presence",
      "coverImage": "https://example.com/cover.jpg",
      "artistId": "artist123",
      "releaseDate": "2025-01-15T00:00:00.000Z",
      "trackCount": 12
    }
  ]
}
```

---

### GET /api/artists/:id/media

Get all media for an artist (across all albums + singles).

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | - | Filter by `video` or `audio` |
| `orderBy` | string | `createdAt` | Field to sort by |
| `order` | string | `desc` | Sort order |

---

### Admin Endpoints (Require Firebase Auth)

### POST /admin/artists

Create a new artist.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Artist Name",
  "bio": "Artist biography",
  "image": "https://example.com/image.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Artist created successfully",
  "data": {
    "id": "new_artist_id",
    "name": "Artist Name",
    "bio": "Artist biography",
    "image": "https://example.com/image.jpg",
    "createdAt": "2025-11-28T10:30:00.000Z"
  }
}
```

---

### PUT /admin/artists/:id

Update an artist.

**Body:**
```json
{
  "name": "Updated Name",
  "bio": "Updated biography",
  "image": "https://example.com/new-image.jpg"
}
```

---

### DELETE /admin/artists/:id

Delete an artist.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `cascade` | boolean | false | Remove artist references from albums/media if true |

**Response (without cascade):**
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "Cannot delete artist with 3 albums and 15 media items. Use ?cascade=true to delete all associated content."
}
```

**Response (with cascade=true):**
```json
{
  "success": true,
  "message": "Artist deleted successfully",
  "cascade": true,
  "affectedAlbums": 3,
  "affectedMedia": 15
}
```

---

## Albums API Endpoints

### Public Endpoints (Require API Key)

### GET /api/albums

Get all albums.

**Headers:**
```
x-api-key: mc_your_api_key_here
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `artistId` | string | - | Filter by artist ID |
| `limit` | number | 50 | Maximum items to return |
| `orderBy` | string | `releaseDate` | Field to sort by |
| `order` | string | `desc` | Sort order |

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "album123",
      "title": "Album Title",
      "description": "Album description",
      "coverImage": "https://example.com/cover.jpg",
      "artistId": "artist123",
      "releaseDate": "2025-01-15T00:00:00.000Z",
      "trackCount": 12,
      "createdAt": "2025-11-28T10:30:00.000Z"
    }
  ]
}
```

---

### GET /api/albums/:id

Get a single album by ID (includes artist info).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "album123",
    "title": "Album Title",
    "description": "Album description",
    "coverImage": "https://example.com/cover.jpg",
    "artistId": "artist123",
    "releaseDate": "2025-01-15T00:00:00.000Z",
    "trackCount": 12,
    "artist": {
      "id": "artist123",
      "name": "Artist Name",
      "bio": "Artist bio",
      "image": "https://example.com/artist.jpg"
    }
  }
}
```

---

### GET /api/albums/:id/media

Get all media in an album (ordered by track number).

**Response:**
```json
{
  "success": true,
  "count": 12,
  "data": [
    {
      "id": "media123",
      "trackNumber": 1,
      "title": "Track 1 Title",
      "type": "audio",
      "fileUrl": "https://example.com/track1.mp3",
      "fileSize": 5242880
    },
    {
      "id": "media456",
      "trackNumber": 2,
      "title": "Track 2 Title",
      "type": "audio",
      "fileUrl": "https://example.com/track2.mp3",
      "fileSize": 6291456
    }
  ]
}
```

---

### Admin Endpoints (Require Firebase Auth)

### POST /admin/albums

Create a new album.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Album Title",
  "description": "Album description",
  "coverImage": "https://example.com/cover.jpg",
  "artistId": "artist123",
  "releaseDate": "2025-01-15T00:00:00.000Z"
}
```

---

### PUT /admin/albums/:id

Update an album.

**Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "coverImage": "https://example.com/new-cover.jpg",
  "artistId": "artist456",
  "releaseDate": "2025-02-01T00:00:00.000Z"
}
```

---

### DELETE /admin/albums/:id

Delete an album (also removes all album-media relationships).

**Response:**
```json
{
  "success": true,
  "message": "Album deleted successfully",
  "removedTracks": 12
}
```

---

## Album-Media Relationship Endpoints

These endpoints manage the relationship between albums and media tracks.

### POST /admin/albums/:albumId/media

Add media to an album with a track number.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Body:**
```json
{
  "mediaId": "media123",
  "trackNumber": 1
}
```

> Note: If `trackNumber` is not provided, it will be auto-assigned as the next track.

**Response:**
```json
{
  "success": true,
  "message": "Media added to album successfully",
  "data": {
    "id": "relationship_id",
    "albumId": "album123",
    "mediaId": "media123",
    "trackNumber": 1,
    "addedAt": "2025-11-28T10:30:00.000Z"
  }
}
```

---

### DELETE /admin/albums/:albumId/media/:mediaId

Remove media from an album.

**Response:**
```json
{
  "success": true,
  "message": "Media removed from album successfully"
}
```

---

### PUT /admin/albums/:albumId/media/reorder

Reorder tracks in an album.

**Body:**
```json
{
  "tracks": [
    { "mediaId": "media456", "trackNumber": 1 },
    { "mediaId": "media123", "trackNumber": 2 },
    { "mediaId": "media789", "trackNumber": 3 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tracks reordered successfully",
  "updatedTracks": 3
}
```

---

### PUT /admin/media/:id (Extended)

Update media metadata including artist and album assignments.

**Body:**
```json
{
  "title": "Updated Title",
  "subtitle": "Updated description",
  "artistId": "artist123",
  "albumId": "album123"
}
```

---

## User Management Endpoints

All user management endpoints require **Firebase Admin Authentication**.

### GET /admin/users

List all users with pagination.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 100 | Maximum users to return (max 1000) |
| `pageToken` | string | - | Token for pagination (from previous response) |

**Response:**
```json
{
  "success": true,
  "count": 50,
  "pageToken": "next_page_token_here",
  "data": [
    {
      "uid": "user123abc",
      "email": "user@example.com",
      "displayName": "John Doe",
      "photoURL": "https://example.com/photo.jpg",
      "phoneNumber": "+1234567890",
      "disabled": false,
      "emailVerified": true,
      "creationTime": "2025-01-15T10:30:00.000Z",
      "lastSignInTime": "2025-11-28T15:45:00.000Z",
      "role": "user",
      "customClaims": {}
    }
  ]
}
```

---

### GET /admin/users/:uid

Get a single user by UID.

**Response:**
```json
{
  "success": true,
  "data": {
    "uid": "user123abc",
    "email": "user@example.com",
    "displayName": "John Doe",
    "photoURL": "https://example.com/photo.jpg",
    "phoneNumber": "+1234567890",
    "disabled": false,
    "emailVerified": true,
    "creationTime": "2025-01-15T10:30:00.000Z",
    "lastSignInTime": "2025-11-28T15:45:00.000Z",
    "role": "admin",
    "customClaims": { "role": "admin", "isAdmin": true },
    "providerData": [...]
  }
}
```

---

### POST /admin/users

Create a new user.

**Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "displayName": "New User",
  "role": "user",
  "phoneNumber": "+1234567890"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email address |
| `password` | string | Yes | User's password |
| `displayName` | string | No | User's display name |
| `role` | string | No | Role: `admin`, `moderator`, or `user` (default: `user`) |
| `phoneNumber` | string | No | Phone number in E.164 format |

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "uid": "newuser123",
    "email": "newuser@example.com",
    "displayName": "New User",
    "role": "user",
    "createdAt": "2025-11-29T10:30:00.000Z"
  }
}
```

---

### PUT /admin/users/:uid/role

Update a user's role.

**Body:**
```json
{
  "role": "admin"
}
```

| Role | Description |
|------|-------------|
| `admin` | Full administrative access |
| `moderator` | Limited administrative access |
| `user` | Standard user (default) |

**Response:**
```json
{
  "success": true,
  "message": "User role updated to 'admin' successfully",
  "data": {
    "uid": "user123abc",
    "email": "user@example.com",
    "role": "admin",
    "updatedAt": "2025-11-29T10:30:00.000Z"
  }
}
```

> **Note:** Admins cannot demote themselves.

---

### PUT /admin/users/:uid/status

Enable or disable a user account.

**Body:**
```json
{
  "disabled": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `disabled` | boolean | Yes | `true` to disable, `false` to enable |

**Response:**
```json
{
  "success": true,
  "message": "User account disabled successfully",
  "data": {
    "uid": "user123abc",
    "email": "user@example.com",
    "disabled": true,
    "updatedAt": "2025-11-29T10:30:00.000Z"
  }
}
```

> **Note:** Admins cannot disable their own account.

---

### DELETE /admin/users/:uid

Delete a user account permanently.

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "deletedUid": "user123abc",
    "deletedEmail": "user@example.com"
  }
}
```

> **Warning:** This action is irreversible. The user's Firebase Auth record, role data, and user data will be permanently deleted.

> **Note:** Admins cannot delete their own account.

---

## Analytics Endpoints

All analytics endpoints require **Firebase Admin Authentication**.

### GET /admin/analytics/summary

Get analytics summary for a period.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | number | 30 | Number of days to analyze |

---

### GET /admin/analytics/realtime

Get real-time statistics (last 24 hours).

---

### GET /admin/analytics/dashboard

Get comprehensive dashboard data in a single request.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalMediaItems": 45,
      "activeApiKeys": 3,
      "totalRequests": 15420,
      "requestsToday": 1250,
      "successRate": 98.5,
      "avgResponseTime": 125
    },
    "charts": {
      "dailyRequests": [...],
      "topEndpoints": [...],
      "methodDistribution": {...}
    },
    "recentRequests": [...]
  }
}
```

---

### GET /admin/analytics/api-keys

Get API key usage statistics.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `keyId` | string | Filter by specific key ID |

---

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message"
}
```

**Common Error Codes:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 413 | File Too Large | Upload exceeds 500MB limit |
| 415 | Unsupported Media Type | Invalid file type |
| 500 | Internal Server Error | Server-side error |

---

## Frontend Integration Guide

### Step 1: Install Dependencies

```bash
npm install axios firebase
```

### Step 2: Create API Service

Create a file `src/services/api.js`:

```javascript
import axios from 'axios';
import { getAuth } from 'firebase/auth';

// API Configuration
const API_BASE_URL = 'https://test.mediacoreapi.masakalirestrobar.ca';
// For local development: 'http://localhost:3000'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ============================================
// PUBLIC API (uses API Key)
// ============================================

const API_KEY = 'mc_your_api_key_here'; // Get this from admin dashboard

export const publicApi = {
  // Get all media
  getMedia: async (options = {}) => {
    const { type, limit = 50, orderBy = 'createdAt', order = 'desc' } = options;
    const params = new URLSearchParams({ limit, orderBy, order });
    if (type) params.append('type', type);
    
    const response = await api.get(`/api/feed?${params}`, {
      headers: { 'x-api-key': API_KEY }
    });
    return response.data;
  },

  // Get single media by ID
  getMediaById: async (id) => {
    const response = await api.get(`/api/media/${id}`, {
      headers: { 'x-api-key': API_KEY }
    });
    return response.data;
  },

  // Get app settings
  getSettings: async () => {
    const response = await api.get('/api/settings', {
      headers: { 'x-api-key': API_KEY }
    });
    return response.data;
  },

  // ---- Artists ----
  
  getArtists: async (options = {}) => {
    const { limit = 50, orderBy = 'createdAt', order = 'desc' } = options;
    const params = new URLSearchParams({ limit, orderBy, order });
    
    const response = await api.get(`/api/artists?${params}`, {
      headers: { 'x-api-key': API_KEY }
    });
    return response.data;
  },

  getArtistById: async (id) => {
    const response = await api.get(`/api/artists/${id}`, {
      headers: { 'x-api-key': API_KEY }
    });
    return response.data;
  },

  getArtistAlbums: async (artistId, options = {}) => {
    const { orderBy = 'releaseDate', order = 'desc' } = options;
    const params = new URLSearchParams({ orderBy, order });
    
    const response = await api.get(`/api/artists/${artistId}/albums?${params}`, {
      headers: { 'x-api-key': API_KEY }
    });
    return response.data;
  },

  getArtistMedia: async (artistId, options = {}) => {
    const { type, orderBy = 'createdAt', order = 'desc' } = options;
    const params = new URLSearchParams({ orderBy, order });
    if (type) params.append('type', type);
    
    const response = await api.get(`/api/artists/${artistId}/media?${params}`, {
      headers: { 'x-api-key': API_KEY }
    });
    return response.data;
  },

  // ---- Albums ----
  
  getAlbums: async (options = {}) => {
    const { artistId, limit = 50, orderBy = 'releaseDate', order = 'desc' } = options;
    const params = new URLSearchParams({ limit, orderBy, order });
    if (artistId) params.append('artistId', artistId);
    
    const response = await api.get(`/api/albums?${params}`, {
      headers: { 'x-api-key': API_KEY }
    });
    return response.data;
  },

  getAlbumById: async (id) => {
    const response = await api.get(`/api/albums/${id}`, {
      headers: { 'x-api-key': API_KEY }
    });
    return response.data;
  },

  getAlbumMedia: async (albumId) => {
    const response = await api.get(`/api/albums/${albumId}/media`, {
      headers: { 'x-api-key': API_KEY }
    });
    return response.data;
  }
};

// ============================================
// ADMIN API (uses Firebase Auth)
// ============================================

// Helper to get auth token
const getAuthToken = async () => {
  const auth = getAuth();
  if (!auth.currentUser) {
    throw new Error('Not authenticated');
  }
  return await auth.currentUser.getIdToken();
};

// Helper to create auth headers
const getAuthHeaders = async () => {
  const token = await getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const adminApi = {
  // ---- Media Management ----
  
  uploadMedia: async (file, title, subtitle = '', type = 'video') => {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('subtitle', subtitle);
    formData.append('type', type);
    
    const response = await api.post('/admin/media', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  updateMedia: async (id, data) => {
    const headers = await getAuthHeaders();
    const response = await api.put(`/admin/media/${id}`, data, { headers });
    return response.data;
  },

  deleteMedia: async (id, deleteFile = true) => {
    const headers = await getAuthHeaders();
    const response = await api.delete(`/admin/media/${id}?deleteFile=${deleteFile}`, { headers });
    return response.data;
  },

  // ---- Artists Management ----
  
  createArtist: async (data) => {
    const headers = await getAuthHeaders();
    const response = await api.post('/admin/artists', data, { headers });
    return response.data;
  },

  updateArtist: async (id, data) => {
    const headers = await getAuthHeaders();
    const response = await api.put(`/admin/artists/${id}`, data, { headers });
    return response.data;
  },

  deleteArtist: async (id, cascade = false) => {
    const headers = await getAuthHeaders();
    const response = await api.delete(`/admin/artists/${id}?cascade=${cascade}`, { headers });
    return response.data;
  },

  // ---- Albums Management ----
  
  createAlbum: async (data) => {
    const headers = await getAuthHeaders();
    const response = await api.post('/admin/albums', data, { headers });
    return response.data;
  },

  updateAlbum: async (id, data) => {
    const headers = await getAuthHeaders();
    const response = await api.put(`/admin/albums/${id}`, data, { headers });
    return response.data;
  },

  deleteAlbum: async (id) => {
    const headers = await getAuthHeaders();
    const response = await api.delete(`/admin/albums/${id}`, { headers });
    return response.data;
  },

  // ---- Album-Media Management ----
  
  addMediaToAlbum: async (albumId, mediaId, trackNumber) => {
    const headers = await getAuthHeaders();
    const response = await api.post(`/admin/albums/${albumId}/media`, { mediaId, trackNumber }, { headers });
    return response.data;
  },

  removeMediaFromAlbum: async (albumId, mediaId) => {
    const headers = await getAuthHeaders();
    const response = await api.delete(`/admin/albums/${albumId}/media/${mediaId}`, { headers });
    return response.data;
  },

  reorderAlbumTracks: async (albumId, tracks) => {
    const headers = await getAuthHeaders();
    const response = await api.put(`/admin/albums/${albumId}/media/reorder`, { tracks }, { headers });
    return response.data;
  },

  // ---- API Key Management ----
  
  generateApiKey: async (name, accessType = 'read_only', options = {}) => {
    const headers = await getAuthHeaders();
    const response = await api.post('/admin/generate-key', {
      name,
      accessType,
      ...options
    }, { headers });
    return response.data;
  },

  getApiKeys: async () => {
    const headers = await getAuthHeaders();
    const response = await api.get('/admin/api-keys', { headers });
    return response.data;
  },

  deleteApiKey: async (id, hardDelete = false) => {
    const headers = await getAuthHeaders();
    const response = await api.delete(`/admin/api-keys/${id}?hardDelete=${hardDelete}`, { headers });
    return response.data;
  },

  // ---- Settings ----
  
  updateSettings: async (settings) => {
    const headers = await getAuthHeaders();
    const response = await api.put('/admin/settings', settings, { headers });
    return response.data;
  },

  // ---- Analytics ----
  
  getDashboard: async () => {
    const headers = await getAuthHeaders();
    const response = await api.get('/admin/analytics/dashboard', { headers });
    return response.data;
  },

  getAnalyticsSummary: async (days = 30) => {
    const headers = await getAuthHeaders();
    const response = await api.get(`/admin/analytics/summary?days=${days}`, { headers });
    return response.data;
  },

  getRealTimeStats: async () => {
    const headers = await getAuthHeaders();
    const response = await api.get('/admin/analytics/realtime', { headers });
    return response.data;
  }
};

export default { publicApi, adminApi };
```

### Step 3: Firebase Setup

Create `src/config/firebase.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB4EEnbp67-U-GkImFsx7IR5Au7t3yEaDA",
  authDomain: "eckhart-tolle-7a33f.firebaseapp.com",
  projectId: "eckhart-tolle-7a33f",
  storageBucket: "eckhart-tolle-7a33f.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
```

### Step 4: Usage Examples

#### React Example - Fetch Media Feed:

```jsx
import React, { useEffect, useState } from 'react';
import { publicApi } from '../services/api';

function MediaFeed() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const response = await publicApi.getMedia({ type: 'video', limit: 20 });
        if (response.success) {
          setMedia(response.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="media-feed">
      {media.map(item => (
        <div key={item.id} className="media-card">
          <h3>{item.title}</h3>
          <p>{item.subtitle}</p>
          <video src={item.fileUrl} controls />
        </div>
      ))}
    </div>
  );
}

export default MediaFeed;
```

#### React + Zustand Store Integration:

Create a Zustand store for Artists and Albums (`src/stores/mediaStore.js`):

```javascript
import { create } from 'zustand';
import { publicApi, adminApi } from '../services/api';

export const useArtistStore = create((set, get) => ({
  artists: [],
  selectedArtist: null,
  loading: false,
  error: null,

  // Fetch all artists
  fetchArtists: async () => {
    set({ loading: true, error: null });
    try {
      const response = await publicApi.getArtists();
      if (response.success) {
        set({ artists: response.data, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Get artist by ID
  fetchArtistById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await publicApi.getArtistById(id);
      if (response.success) {
        set({ selectedArtist: response.data, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Create artist (admin)
  createArtist: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await adminApi.createArtist(data);
      if (response.success) {
        set(state => ({
          artists: [...state.artists, response.data],
          loading: false
        }));
        return response.data;
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Update artist (admin)
  updateArtist: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await adminApi.updateArtist(id, data);
      if (response.success) {
        set(state => ({
          artists: state.artists.map(a => a.id === id ? response.data : a),
          selectedArtist: state.selectedArtist?.id === id ? response.data : state.selectedArtist,
          loading: false
        }));
        return response.data;
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Delete artist (admin)
  deleteArtist: async (id, cascade = false) => {
    set({ loading: true, error: null });
    try {
      const response = await adminApi.deleteArtist(id, cascade);
      if (response.success) {
        set(state => ({
          artists: state.artists.filter(a => a.id !== id),
          selectedArtist: state.selectedArtist?.id === id ? null : state.selectedArtist,
          loading: false
        }));
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  }
}));

export const useAlbumStore = create((set, get) => ({
  albums: [],
  selectedAlbum: null,
  albumTracks: [],
  loading: false,
  error: null,

  // Fetch all albums
  fetchAlbums: async (artistId = null) => {
    set({ loading: true, error: null });
    try {
      const response = await publicApi.getAlbums({ artistId });
      if (response.success) {
        set({ albums: response.data, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Get album by ID (includes artist info)
  fetchAlbumById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await publicApi.getAlbumById(id);
      if (response.success) {
        set({ selectedAlbum: response.data, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Get album tracks
  fetchAlbumTracks: async (albumId) => {
    set({ loading: true, error: null });
    try {
      const response = await publicApi.getAlbumMedia(albumId);
      if (response.success) {
        set({ albumTracks: response.data, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Create album (admin)
  createAlbum: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await adminApi.createAlbum(data);
      if (response.success) {
        set(state => ({
          albums: [...state.albums, response.data],
          loading: false
        }));
        return response.data;
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Add track to album (admin)
  addTrackToAlbum: async (albumId, mediaId, trackNumber) => {
    set({ loading: true, error: null });
    try {
      const response = await adminApi.addMediaToAlbum(albumId, mediaId, trackNumber);
      if (response.success) {
        // Refresh album tracks
        await get().fetchAlbumTracks(albumId);
        set({ loading: false });
        return response.data;
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Remove track from album (admin)
  removeTrackFromAlbum: async (albumId, mediaId) => {
    set({ loading: true, error: null });
    try {
      const response = await adminApi.removeMediaFromAlbum(albumId, mediaId);
      if (response.success) {
        set(state => ({
          albumTracks: state.albumTracks.filter(t => t.id !== mediaId),
          loading: false
        }));
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Reorder album tracks (admin)
  reorderTracks: async (albumId, tracks) => {
    set({ loading: true, error: null });
    try {
      const response = await adminApi.reorderAlbumTracks(albumId, tracks);
      if (response.success) {
        // Refresh album tracks to get updated order
        await get().fetchAlbumTracks(albumId);
        set({ loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  }
}));
```

#### Using the Zustand Stores in Components:

```jsx
import React, { useEffect } from 'react';
import { useArtistStore, useAlbumStore } from '../stores/mediaStore';

function ArtistsPage() {
  const { artists, loading, error, fetchArtists } = useArtistStore();
  const { fetchAlbums, albums } = useAlbumStore();

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  const handleArtistClick = async (artistId) => {
    await fetchAlbums(artistId);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Artists</h1>
      <div className="artists-grid">
        {artists.map(artist => (
          <div key={artist.id} onClick={() => handleArtistClick(artist.id)}>
            <img src={artist.image} alt={artist.name} />
            <h3>{artist.name}</h3>
            <p>{artist.bio}</p>
          </div>
        ))}
      </div>
      
      {albums.length > 0 && (
        <div className="albums-section">
          <h2>Albums</h2>
          {albums.map(album => (
            <div key={album.id}>
              <img src={album.coverImage} alt={album.title} />
              <h4>{album.title}</h4>
              <span>{album.trackCount} tracks</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ArtistsPage;
```

#### React Example - Admin Upload:

```jsx
import React, { useState } from 'react';
import { adminApi } from '../services/api';

function UploadMedia() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title) return;

    setUploading(true);
    try {
      const response = await adminApi.uploadMedia(file, title, '', 'video');
      if (response.success) {
        alert('Upload successful!');
        setFile(null);
        setTitle('');
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleUpload}>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        type="file"
        accept="video/mp4,audio/mp3"
        onChange={(e) => setFile(e.target.files[0])}
        required
      />
      <button type="submit" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  );
}

export default UploadMedia;
```

#### Flutter/Dart Example:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class MediaCoreApi {
  static const String baseUrl = 'https://test.mediacoreapi.masakalirestrobar.ca';
  static const String apiKey = 'mc_your_api_key_here';

  // Fetch media feed
  static Future<List<dynamic>> getMediaFeed({String? type, int limit = 50}) async {
    final params = {'limit': limit.toString()};
    if (type != null) params['type'] = type;
    
    final uri = Uri.parse('$baseUrl/api/feed').replace(queryParameters: params);
    
    final response = await http.get(
      uri,
      headers: {'x-api-key': apiKey},
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['data'];
    } else {
      throw Exception('Failed to load media');
    }
  }

  // Fetch single media
  static Future<Map<String, dynamic>> getMediaById(String id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/media/$id'),
      headers: {'x-api-key': apiKey},
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['data'];
    } else {
      throw Exception('Media not found');
    }
  }
}

// Usage:
void main() async {
  final media = await MediaCoreApi.getMediaFeed(type: 'video');
  print(media);
}
```

---

## Journal API Endpoints

The Journal feature uses MySQL database and Firebase Authentication (not API keys). All endpoints require a valid Firebase ID token.

### Database Setup

Run the SQL script at `scripts/journal_tables.sql` on your MySQL database to create the required tables.

### Authentication

All Journal endpoints require Firebase Authentication:

```
Authorization: Bearer <firebase-id-token>
```

### Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/journal/entries` | Create a journal entry |
| GET | `/api/journal/entries` | List entries (with filters) |
| GET | `/api/journal/entries/:id` | Get single entry |
| PUT | `/api/journal/entries/:id` | Update entry |
| DELETE | `/api/journal/entries/:id` | Delete entry |
| POST | `/api/journal/entries/:id/media` | Upload media to entry |
| DELETE | `/api/journal/entries/:id/media/:mediaId` | Delete media from entry |
| POST | `/api/journal/sync` | Bulk sync for local-first storage |
| GET | `/api/journal/stats` | Get user's journal statistics |

---

### POST /api/journal/entries

Create a new journal entry.

**Request Body:**
```json
{
  "title": "A Great Day",
  "content": "<p>Today was wonderful...</p>",
  "plainText": "Today was wonderful...",
  "mood": {
    "value": 85,
    "emotions": ["Happy", "Grateful"]
  },
  "location": {
    "name": "San Francisco, CA",
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "tags": ["personal", "gratitude"],
  "clientId": "uuid-from-frontend",
  "isFavorite": false
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Journal entry created successfully",
  "entry": {
    "id": 123,
    "clientId": "uuid-from-frontend",
    "userId": "firebase-uid",
    "title": "A Great Day",
    "content": "<p>Today was wonderful...</p>",
    "plainText": "Today was wonderful...",
    "mood": { "value": 85, "emotions": ["Happy", "Grateful"] },
    "location": { "name": "San Francisco, CA", "latitude": 37.7749, "longitude": -122.4194 },
    "media": [],
    "tags": ["personal", "gratitude"],
    "isFavorite": false,
    "isDeleted": false,
    "createdAt": "2025-11-30T10:30:00Z",
    "updatedAt": "2025-11-30T10:30:00Z"
  }
}
```

---

### GET /api/journal/entries

List journal entries with filtering and pagination.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Full-text search on title and plainText |
| `mood` | string | Filter by mood: `positive`, `neutral`, `negative` |
| `startDate` | ISO date | Entries created after this date |
| `endDate` | ISO date | Entries created before this date |
| `tags` | string | Comma-separated tags to filter by |
| `favorite` | boolean | Only favorite entries |
| `limit` | number | Max entries to return (default: 50, max: 100) |
| `offset` | number | Pagination offset (default: 0) |
| `sort` | string | `newest` or `oldest` (default: newest) |
| `since` | ISO date | Entries modified after this date (for sync) |
| `includeDeleted` | boolean | Include soft-deleted entries |

**Example Request:**
```
GET /api/journal/entries?search=grateful&mood=positive&limit=20&sort=newest
```

**Response (200):**
```json
{
  "success": true,
  "entries": [
    {
      "id": 123,
      "clientId": "uuid",
      "title": "A Great Day",
      "content": "<p>...</p>",
      "plainText": "...",
      "mood": { "value": 85, "emotions": ["Happy"] },
      "media": [],
      "tags": ["personal"],
      "isFavorite": false,
      "createdAt": "2025-11-30T10:30:00Z",
      "updatedAt": "2025-11-30T10:30:00Z"
    }
  ],
  "total": 150,
  "hasMore": true,
  "limit": 20,
  "offset": 0
}
```

---

### GET /api/journal/entries/:id

Get a single journal entry by ID.

**Response (200):**
```json
{
  "success": true,
  "entry": {
    "id": 123,
    "clientId": "uuid",
    "title": "A Great Day",
    "content": "<p>Today was wonderful...</p>",
    "plainText": "Today was wonderful...",
    "mood": { "value": 85, "emotions": ["Happy", "Grateful"] },
    "location": { "name": "San Francisco, CA", "latitude": 37.7749, "longitude": -122.4194 },
    "media": [
      {
        "id": "media-uuid",
        "type": "image",
        "url": "/public/uploads/journal/images/photo.jpg",
        "filename": "photo.jpg",
        "size": 245000,
        "mimeType": "image/jpeg"
      }
    ],
    "tags": ["personal", "gratitude"],
    "isFavorite": true,
    "isDeleted": false,
    "createdAt": "2025-11-30T10:30:00Z",
    "updatedAt": "2025-11-30T10:30:00Z"
  }
}
```

---

### PUT /api/journal/entries/:id

Update a journal entry. Only include fields you want to update.

**Request Body:**
```json
{
  "title": "Updated Title",
  "mood": { "value": 90, "emotions": ["Joyful"] },
  "isFavorite": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Journal entry updated successfully",
  "entry": { ... }
}
```

---

### DELETE /api/journal/entries/:id

Delete a journal entry. Soft delete by default (for sync).

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `hard` | boolean | If `true`, permanently delete |

**Response (200):**
```json
{
  "success": true,
  "message": "Journal entry deleted"
}
```

---

### POST /api/journal/entries/:id/media

Upload media (image or audio) to a journal entry.

**Request:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | Image (jpeg, png, gif, webp) or Audio (mp3, wav, m4a) |
| `duration` | number | Duration in seconds (for audio, optional) |

**Response (201):**
```json
{
  "success": true,
  "message": "Media uploaded successfully",
  "media": {
    "id": "uuid",
    "type": "image",
    "url": "/public/uploads/journal/images/uuid.jpg",
    "filename": "photo.jpg",
    "size": 245000,
    "mimeType": "image/jpeg"
  }
}
```

---

### DELETE /api/journal/entries/:id/media/:mediaId

Delete media from a journal entry.

**Response (200):**
```json
{
  "success": true,
  "message": "Media deleted successfully"
}
```

---

### POST /api/journal/sync

Bulk sync endpoint for local-first storage. Sends local changes and receives server changes.

**Request Body:**
```json
{
  "entries": [
    {
      "clientId": "local-uuid-1",
      "title": "Entry from offline",
      "content": "...",
      "plainText": "...",
      "mood": { "value": 75, "emotions": [] },
      "tags": [],
      "isFavorite": false,
      "isDeleted": false,
      "createdAt": "2025-11-29T08:00:00Z",
      "updatedAt": "2025-11-29T08:00:00Z"
    }
  ],
  "lastSyncedAt": "2025-11-29T00:00:00Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "syncedAt": "2025-11-30T12:00:00Z",
  "created": [{ "id": 124, "clientId": "local-uuid-1", ... }],
  "updated": [],
  "conflicts": [
    {
      "clientEntry": { ... },
      "serverEntry": { ... },
      "reason": "Server has newer version"
    }
  ],
  "serverChanges": [
    { "id": 125, "clientId": "...", "title": "Entry modified on server", ... }
  ]
}
```

---

### GET /api/journal/stats

Get journal statistics for the authenticated user.

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "totalEntries": 150,
    "favoriteCount": 12,
    "mood": {
      "average": 72,
      "min": 15,
      "max": 98
    },
    "topTags": [
      { "tag": "personal", "count": 45 },
      { "tag": "work", "count": 30 },
      { "tag": "gratitude", "count": 25 }
    ],
    "currentStreak": 7
  }
}
```

---

## Code Examples

### cURL Examples

```bash
# Health Check
curl https://test.mediacoreapi.masakalirestrobar.ca/health

# Get Media Feed (with API Key)
curl -H "x-api-key: mc_your_key_here" \
  https://test.mediacoreapi.masakalirestrobar.ca/api/feed

# Get Media Feed (filtered by type)
curl -H "x-api-key: mc_your_key_here" \
  "https://test.mediacoreapi.masakalirestrobar.ca/api/feed?type=video&limit=10"

# Get Single Media
curl -H "x-api-key: mc_your_key_here" \
  https://test.mediacoreapi.masakalirestrobar.ca/api/media/MEDIA_ID

# Admin - Generate API Key (with Firebase Token)
curl -X POST \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My App","accessType":"read_only"}' \
  https://test.mediacoreapi.masakalirestrobar.ca/admin/generate-key

# Admin - Upload Media
curl -X POST \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN" \
  -F "file=@/path/to/video.mp4" \
  -F "title=My Video" \
  -F "type=video" \
  https://test.mediacoreapi.masakalirestrobar.ca/admin/media

# Admin - Get Dashboard
curl -H "Authorization: Bearer FIREBASE_ID_TOKEN" \
  https://test.mediacoreapi.masakalirestrobar.ca/admin/analytics/dashboard
```

---

## Quick Reference

### Endpoint Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | None | API info |
| GET | `/health` | None | Health check |
| **Media** | | | |
| GET | `/api/feed` | API Key | Get all media |
| GET | `/api/media/:id` | API Key | Get single media |
| POST | `/admin/media` | Firebase | Upload media |
| PUT | `/admin/media/:id` | Firebase | Update media |
| DELETE | `/admin/media/:id` | Firebase | Delete media |
| **Artists** | | | |
| GET | `/api/artists` | API Key | Get all artists |
| GET | `/api/artists/:id` | API Key | Get single artist |
| GET | `/api/artists/:id/albums` | API Key | Get artist's albums |
| GET | `/api/artists/:id/media` | API Key | Get artist's media |
| POST | `/admin/artists` | Firebase | Create artist |
| PUT | `/admin/artists/:id` | Firebase | Update artist |
| DELETE | `/admin/artists/:id` | Firebase | Delete artist |
| **Albums** | | | |
| GET | `/api/albums` | API Key | Get all albums |
| GET | `/api/albums/:id` | API Key | Get single album |
| GET | `/api/albums/:id/media` | API Key | Get album tracks |
| POST | `/admin/albums` | Firebase | Create album |
| PUT | `/admin/albums/:id` | Firebase | Update album |
| DELETE | `/admin/albums/:id` | Firebase | Delete album |
| **Album-Media** | | | |
| POST | `/admin/albums/:albumId/media` | Firebase | Add media to album |
| DELETE | `/admin/albums/:albumId/media/:mediaId` | Firebase | Remove media from album |
| PUT | `/admin/albums/:albumId/media/reorder` | Firebase | Reorder tracks |
| **User Management** | | | |
| GET | `/admin/users` | Firebase | List all users |
| GET | `/admin/users/:uid` | Firebase | Get single user |
| POST | `/admin/users` | Firebase | Create user |
| PUT | `/admin/users/:uid/role` | Firebase | Update user role |
| PUT | `/admin/users/:uid/status` | Firebase | Enable/disable user |
| DELETE | `/admin/users/:uid` | Firebase | Delete user |
| **Settings** | | | |
| GET | `/api/settings` | API Key | Get app settings |
| PUT | `/admin/settings` | Firebase | Update settings |
| **API Keys** | | | |
| POST | `/admin/generate-key` | Firebase | Create API key |
| GET | `/admin/api-keys` | Firebase | List API keys |
| DELETE | `/admin/api-keys/:id` | Firebase | Delete API key |
| **Analytics** | | | |
| GET | `/admin/analytics/summary` | Firebase | Analytics summary |
| GET | `/admin/analytics/realtime` | Firebase | Real-time stats |
| GET | `/admin/analytics/dashboard` | Firebase | Full dashboard |
| GET | `/admin/analytics/api-keys` | Firebase | API key stats |

### Available Permissions

| Permission | Description |
|------------|-------------|
| `read:media` | Read media content |
| `write:media` | Create/update media |
| `delete:media` | Delete media |
| `read:settings` | Read app settings |
| `write:settings` | Update app settings |
| `read:analytics` | View analytics |

---

## Support

For issues or questions, check the server logs or contact the development team.
