# MediaCore API Documentation for React Native

This document provides complete API documentation for integrating MediaCore backend with your React Native mobile application.

---

## 📌 Base Configuration

### Production Server
```
https://mediacoreapi-sql.masakalirestrobar.ca
```

### Local Development
```
http://localhost:5001
```

### API Key (Required for Public Endpoints)
```
mc_3f177f8a673446ba8ee152728d877b00
```

---

## 🔐 Authentication Overview

MediaCore uses **JWT (JSON Web Tokens)** for authentication:

| Token Type | Expiry | Purpose |
|------------|--------|---------|
| Access Token | 15 minutes | Short-lived, used for API requests |
| Refresh Token | 7 days | Long-lived, used to get new access tokens |

### Token Storage Recommendations for React Native

```javascript
// Use react-native-encrypted-storage for secure token storage
import EncryptedStorage from 'react-native-encrypted-storage';

// Store tokens after login
await EncryptedStorage.setItem('accessToken', tokens.accessToken);
await EncryptedStorage.setItem('refreshToken', tokens.refreshToken);

// Retrieve tokens
const accessToken = await EncryptedStorage.getItem('accessToken');
const refreshToken = await EncryptedStorage.getItem('refreshToken');
```

---

## 📋 API Response Format

All API responses follow this standard format:

### Success Response
```json
{
  "success": true,
  "message": "Optional success message",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

### Common HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/expired token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 🔑 Authentication APIs

### 1. Register New User

Creates a new user account.

**Endpoint:** `POST /auth/register`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "displayName": "John Doe"
}
```

**Validation Rules:**
- Email: Must be valid email format
- Password: Minimum 6 characters
- displayName: Optional

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "uid": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "John Doe",
    "emailVerified": false
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "Email already registered"
}
```

**React Native Example:**
```javascript
const register = async (email, password, displayName) => {
  try {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, displayName }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};
```

---

### 2. Login

Authenticates user and returns JWT tokens.

**Endpoint:** `POST /auth/login`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "uid": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "displayName": "John Doe",
      "photoURL": null,
      "emailVerified": true,
      "role": "user"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid email or password"
}
```

**React Native Example:**
```javascript
import EncryptedStorage from 'react-native-encrypted-storage';

const login = async (email, password) => {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    // Store tokens securely
    await EncryptedStorage.setItem('accessToken', data.data.accessToken);
    await EncryptedStorage.setItem('refreshToken', data.data.refreshToken);
    await EncryptedStorage.setItem('user', JSON.stringify(data.data.user));
    
    return data.data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};
```

---

### 3. Refresh Access Token

Get new tokens using refresh token when access token expires.

**Endpoint:** `POST /auth/refresh`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Refresh token has expired"
}
```

**React Native Auto-Refresh Example:**
```javascript
// Create an API client with automatic token refresh
const apiClient = async (endpoint, options = {}) => {
  let accessToken = await EncryptedStorage.getItem('accessToken');
  
  const makeRequest = async (token) => {
    return fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  };
  
  let response = await makeRequest(accessToken);
  
  // If token expired, try to refresh
  if (response.status === 401) {
    const data = await response.json();
    
    if (data.message?.includes('expired')) {
      const refreshToken = await EncryptedStorage.getItem('refreshToken');
      
      const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      
      const refreshData = await refreshResponse.json();
      
      if (refreshData.success) {
        // Store new tokens
        await EncryptedStorage.setItem('accessToken', refreshData.data.accessToken);
        await EncryptedStorage.setItem('refreshToken', refreshData.data.refreshToken);
        
        // Retry original request with new token
        response = await makeRequest(refreshData.data.accessToken);
      } else {
        // Refresh failed, user needs to login again
        throw new Error('SESSION_EXPIRED');
      }
    }
  }
  
  return response.json();
};
```

---

### 4. Logout

Invalidates the refresh token.

**Endpoint:** `POST /auth/logout`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**React Native Example:**
```javascript
const logout = async () => {
  try {
    const refreshToken = await EncryptedStorage.getItem('refreshToken');
    
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    // Clear stored tokens
    await EncryptedStorage.removeItem('accessToken');
    await EncryptedStorage.removeItem('refreshToken');
    await EncryptedStorage.removeItem('user');
    
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear local storage even if server request fails
    await EncryptedStorage.clear();
  }
};
```

---

### 5. Get Current User

Returns the authenticated user's profile.

**Endpoint:** `GET /auth/me`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "uid": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "John Doe",
    "photoURL": "https://example.com/photo.jpg",
    "emailVerified": true,
    "role": "user",
    "subscriptionTier": "premium",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "lastSignInAt": "2024-01-20T14:45:00.000Z"
  }
}
```

**React Native Example:**
```javascript
const getCurrentUser = async () => {
  const accessToken = await EncryptedStorage.getItem('accessToken');
  
  const response = await fetch(`${BASE_URL}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data.data;
};
```

---

### 6. Forgot Password

Sends password reset email.

**Endpoint:** `POST /auth/forgot-password`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "If that email exists, a password reset link has been sent"
}
```

> **Note:** For security, the same response is returned whether or not the email exists.

---

### 7. Reset Password

Resets password using the token from email.

**Endpoint:** `POST /auth/reset-password`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## 📱 Public APIs (Require API Key)

These endpoints require the `x-api-key` header but NOT user authentication.

### Header Required:
```
x-api-key: mc_3f177f8a673446ba8ee152728d877b00
```

---

### 1. Get Media Feed

Returns list of media content with optional filters.

**Endpoint:** `GET /api/feed`

**Headers:**
```
x-api-key: mc_3f177f8a673446ba8ee152728d877b00
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| type | string | - | Filter by "audio" or "video" |
| language | string | - | Filter by language code (en, es, hi, etc.) |
| limit | number | 50 | Number of items to return |
| orderBy | string | createdAt | Sort by: createdAt, updatedAt, title, duration |
| order | string | desc | Sort order: asc or desc |

**Success Response (200):**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "media-uuid-1",
      "title": "Song Title",
      "subtitle": "Featuring Artist",
      "artistName": "Main Artist",
      "artistId": "artist-uuid",
      "albumId": "album-uuid",
      "description": "Song description",
      "type": "audio",
      "language": "en",
      "duration": 245,
      "fileUrl": "/uploads/audio/song.mp3",
      "filePath": "/uploads/audio/song.mp3",
      "fileSize": 5242880,
      "thumbnailUrl": "/uploads/thumbnails/song.jpg",
      "contentGroupId": "group-uuid",
      "subscriptionTier": "free",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**React Native Example:**
```javascript
const getMediaFeed = async (options = {}) => {
  const { type, language, limit = 50, orderBy = 'createdAt', order = 'desc' } = options;
  
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (language) params.append('language', language);
  params.append('limit', limit.toString());
  params.append('orderBy', orderBy);
  params.append('order', order);
  
  const response = await fetch(`${BASE_URL}/api/feed?${params.toString()}`, {
    headers: {
      'x-api-key': API_KEY,
    },
  });
  
  const data = await response.json();
  return data.data;
};

// Usage examples
const allMedia = await getMediaFeed();
const audioOnly = await getMediaFeed({ type: 'audio' });
const hindiSongs = await getMediaFeed({ type: 'audio', language: 'hi' });
const latest10 = await getMediaFeed({ limit: 10, orderBy: 'createdAt', order: 'desc' });
```

---

### 2. Get Single Media Item

Returns detailed information about a specific media item.

**Endpoint:** `GET /api/media/:id`

**Headers:**
```
x-api-key: mc_3f177f8a673446ba8ee152728d877b00
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "media-uuid-1",
    "title": "Song Title",
    "subtitle": "Featuring Artist",
    "artistName": "Main Artist",
    "artistId": "artist-uuid",
    "albumId": "album-uuid",
    "description": "Song description",
    "type": "audio",
    "language": "en",
    "duration": 245,
    "fileUrl": "/uploads/audio/song.mp3",
    "filePath": "/uploads/audio/song.mp3",
    "fileSize": 5242880,
    "thumbnailUrl": "/uploads/thumbnails/song.jpg",
    "contentGroupId": "group-uuid",
    "subscriptionTier": "free",
    "availableLanguages": ["en", "es", "hi"],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**React Native Example:**
```javascript
const getMediaById = async (mediaId) => {
  const response = await fetch(`${BASE_URL}/api/media/${mediaId}`, {
    headers: {
      'x-api-key': API_KEY,
    },
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data.data;
};
```

---

### 3. Get All Artists

Returns list of all artists with album and track counts.

**Endpoint:** `GET /api/artists`

**Headers:**
```
x-api-key: mc_3f177f8a673446ba8ee152728d877b00
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Number of items to return |
| orderBy | string | createdAt | Sort by: createdAt, name, id |
| order | string | desc | Sort order: asc or desc |

**Success Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "artist-uuid-1",
      "name": "Artist Name",
      "description": "Artist bio and description",
      "bio": "Artist bio and description",
      "imageUrl": "/uploads/artists/artist.jpg",
      "image": "/uploads/artists/artist.jpg",
      "albumCount": 3,
      "trackCount": 25,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**React Native Example:**
```javascript
const getArtists = async (options = {}) => {
  const { limit = 50, orderBy = 'name', order = 'asc' } = options;
  
  const params = new URLSearchParams({
    limit: limit.toString(),
    orderBy,
    order,
  });
  
  const response = await fetch(`${BASE_URL}/api/artists?${params.toString()}`, {
    headers: {
      'x-api-key': API_KEY,
    },
  });
  
  const data = await response.json();
  return data.data;
};
```

---

### 4. Get Single Artist

Returns detailed information about a specific artist.

**Endpoint:** `GET /api/artists/:id`

**Headers:**
```
x-api-key: mc_3f177f8a673446ba8ee152728d877b00
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "artist-uuid-1",
    "name": "Artist Name",
    "description": "Artist bio and description",
    "bio": "Artist bio and description",
    "imageUrl": "/uploads/artists/artist.jpg",
    "image": "/uploads/artists/artist.jpg",
    "albumCount": 3,
    "trackCount": 25,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 5. Get Artist's Albums

Returns all albums for a specific artist.

**Endpoint:** `GET /api/artists/:id/albums`

**Headers:**
```
x-api-key: mc_3f177f8a673446ba8ee152728d877b00
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| orderBy | string | createdAt | Sort by: createdAt, name, releaseDate |
| order | string | desc | Sort order: asc or desc |

**Success Response (200):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "album-uuid-1",
      "name": "Album Title",
      "title": "Album Title",
      "artistId": "artist-uuid-1",
      "artistName": "Artist Name",
      "coverImage": "/uploads/albums/cover.jpg",
      "coverImageUrl": "/uploads/albums/cover.jpg",
      "year": 2024,
      "genre": "Pop",
      "description": "Album description",
      "trackCount": 12,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 6. Get All Albums

Returns list of all albums with track counts.

**Endpoint:** `GET /api/albums`

**Headers:**
```
x-api-key: mc_3f177f8a673446ba8ee152728d877b00
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Number of items to return |
| artistId | string | - | Filter by artist ID |

**Success Response (200):**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "album-uuid-1",
      "name": "Album Title",
      "title": "Album Title",
      "artistId": "artist-uuid-1",
      "artistName": "Artist Name",
      "coverImage": "/uploads/albums/cover.jpg",
      "coverImageUrl": "/uploads/albums/cover.jpg",
      "year": 2024,
      "genre": "Pop",
      "description": "Album description",
      "trackCount": 12,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 7. Get Single Album

Returns detailed information about a specific album.

**Endpoint:** `GET /api/albums/:id`

**Headers:**
```
x-api-key: mc_3f177f8a673446ba8ee152728d877b00
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "album-uuid-1",
    "name": "Album Title",
    "title": "Album Title",
    "artistId": "artist-uuid-1",
    "artistName": "Artist Name",
    "coverImage": "/uploads/albums/cover.jpg",
    "coverImageUrl": "/uploads/albums/cover.jpg",
    "year": 2024,
    "genre": "Pop",
    "description": "Album description",
    "trackCount": 12,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 8. Get Album's Media (Tracks)

Returns all media items for a specific album.

**Endpoint:** `GET /api/albums/:id/media`

**Headers:**
```
x-api-key: mc_3f177f8a673446ba8ee152728d877b00
```

**Success Response (200):**
```json
{
  "success": true,
  "album": { /* album object */ },
  "count": 12,
  "data": [
    {
      "id": "media-uuid-1",
      "title": "Track 1",
      "type": "audio",
      "duration": 245,
      "fileUrl": "/uploads/audio/track1.mp3"
      // ... other media fields
    }
  ]
}
```

---

### 9. Get Available Languages

Returns list of available content languages with counts.

**Endpoint:** `GET /api/languages`

**Headers:**
```
x-api-key: mc_3f177f8a673446ba8ee152728d877b00
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "code": "en",
      "name": "English",
      "nativeName": "English",
      "count": 150
    },
    {
      "code": "hi",
      "name": "Hindi",
      "nativeName": "हिन्दी",
      "count": 75
    },
    {
      "code": "es",
      "name": "Spanish",
      "nativeName": "Español",
      "count": 45
    }
  ]
}
```

---

## 👤 User APIs (Require Authentication)

These endpoints require the `Authorization: Bearer <accessToken>` header.

---

### 1. Get User Subscription

Returns the authenticated user's subscription details.

**Endpoint:** `GET /api/user/subscription`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "uid": "user-uuid",
    "subscription_tier": "premium",
    "expires_at": "2025-01-15T00:00:00.000Z",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 2. Get User Stats

Returns statistics about the user's activity.

**Endpoint:** `GET /api/user/stats`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "likedSongs": 25,
    "playlists": 5,
    "listenHistory": 150
  }
}
```

---

### 3. Heartbeat (Keep Session Alive)

Updates the user's last active timestamp.

**Endpoint:** `POST /api/user/heartbeat`

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "deviceId": "device-uuid",
  "platform": "ios"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Heartbeat recorded"
}
```

---

## 🚀 Complete React Native Setup

### 1. Create API Configuration File

```javascript
// src/config/api.js
const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? 'http://localhost:5001' 
    : 'https://mediacoreapi-sql.masakalirestrobar.ca',
  API_KEY: 'mc_3f177f8a673446ba8ee152728d877b00',
};

export default API_CONFIG;
```

### 2. Create API Service

```javascript
// src/services/api.js
import EncryptedStorage from 'react-native-encrypted-storage';
import API_CONFIG from '../config/api';

class ApiService {
  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.apiKey = API_CONFIG.API_KEY;
  }

  // Get stored access token
  async getAccessToken() {
    return await EncryptedStorage.getItem('accessToken');
  }

  // Get stored refresh token
  async getRefreshToken() {
    return await EncryptedStorage.getItem('refreshToken');
  }

  // Store tokens
  async storeTokens(accessToken, refreshToken) {
    await EncryptedStorage.setItem('accessToken', accessToken);
    await EncryptedStorage.setItem('refreshToken', refreshToken);
  }

  // Clear tokens
  async clearTokens() {
    await EncryptedStorage.removeItem('accessToken');
    await EncryptedStorage.removeItem('refreshToken');
    await EncryptedStorage.removeItem('user');
  }

  // Refresh access token
  async refreshTokens() {
    const refreshToken = await this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('NO_REFRESH_TOKEN');
    }

    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (!data.success) {
      await this.clearTokens();
      throw new Error('SESSION_EXPIRED');
    }

    await this.storeTokens(data.data.accessToken, data.data.refreshToken);
    return data.data.accessToken;
  }

  // Make authenticated request
  async authRequest(endpoint, options = {}) {
    let accessToken = await this.getAccessToken();

    const makeRequest = async (token) => {
      return fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    };

    let response = await makeRequest(accessToken);

    // Handle token expiration
    if (response.status === 401) {
      const errorData = await response.json();
      
      if (errorData.message?.includes('expired')) {
        try {
          accessToken = await this.refreshTokens();
          response = await makeRequest(accessToken);
        } catch (refreshError) {
          throw refreshError;
        }
      }
    }

    const data = await response.json();
    
    if (!data.success && response.status >= 400) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  // Make public request (API key only)
  async publicRequest(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!data.success && response.status >= 400) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  // ==================== AUTH METHODS ====================

  async register(email, password, displayName = '') {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    return data;
  }

  async login(email, password) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    // Store tokens and user
    await this.storeTokens(data.data.accessToken, data.data.refreshToken);
    await EncryptedStorage.setItem('user', JSON.stringify(data.data.user));

    return data.data;
  }

  async logout() {
    try {
      const refreshToken = await this.getRefreshToken();
      
      if (refreshToken) {
        await fetch(`${this.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      await this.clearTokens();
    }
  }

  async getCurrentUser() {
    return this.authRequest('/auth/me');
  }

  async forgotPassword(email) {
    const response = await fetch(`${this.baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    return response.json();
  }

  // ==================== MEDIA METHODS ====================

  async getMediaFeed(options = {}) {
    const { type, language, limit = 50, orderBy = 'createdAt', order = 'desc' } = options;
    
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (language) params.append('language', language);
    params.append('limit', limit.toString());
    params.append('orderBy', orderBy);
    params.append('order', order);

    return this.publicRequest(`/api/feed?${params.toString()}`);
  }

  async getMediaById(mediaId) {
    return this.publicRequest(`/api/media/${mediaId}`);
  }

  async getLanguages() {
    return this.publicRequest('/api/languages');
  }

  // ==================== ARTIST METHODS ====================

  async getArtists(options = {}) {
    const { limit = 50, orderBy = 'name', order = 'asc' } = options;
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      orderBy,
      order,
    });

    return this.publicRequest(`/api/artists?${params.toString()}`);
  }

  async getArtistById(artistId) {
    return this.publicRequest(`/api/artists/${artistId}`);
  }

  async getArtistAlbums(artistId, options = {}) {
    const { orderBy = 'createdAt', order = 'desc' } = options;
    
    const params = new URLSearchParams({ orderBy, order });

    return this.publicRequest(`/api/artists/${artistId}/albums?${params.toString()}`);
  }

  // ==================== ALBUM METHODS ====================

  async getAlbums(options = {}) {
    const { limit = 50, artistId } = options;
    
    const params = new URLSearchParams({ limit: limit.toString() });
    if (artistId) params.append('artistId', artistId);

    return this.publicRequest(`/api/albums?${params.toString()}`);
  }

  async getAlbumById(albumId) {
    return this.publicRequest(`/api/albums/${albumId}`);
  }

  async getAlbumMedia(albumId) {
    return this.publicRequest(`/api/albums/${albumId}/media`);
  }

  // ==================== USER METHODS ====================

  async getUserSubscription() {
    return this.authRequest('/api/user/subscription');
  }

  async getUserStats() {
    return this.authRequest('/api/user/stats');
  }

  async sendHeartbeat(deviceId, platform) {
    return this.authRequest('/api/user/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ deviceId, platform }),
    });
  }
}

export default new ApiService();
```

### 3. Create Auth Context

```javascript
// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import EncryptedStorage from 'react-native-encrypted-storage';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const storedUser = await EncryptedStorage.getItem('user');
      const accessToken = await EncryptedStorage.getItem('accessToken');

      if (storedUser && accessToken) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        
        // Verify token is still valid
        try {
          const response = await api.getCurrentUser();
          setUser(response.data);
        } catch (error) {
          if (error.message === 'SESSION_EXPIRED') {
            await logout();
          }
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setUser(data.user);
    setIsAuthenticated(true);
    return data.user;
  };

  const register = async (email, password, displayName) => {
    return api.register(email, password, displayName);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser: checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 4. Usage in Components

```javascript
// LoginScreen.js
import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // Navigation will be handled by auth state change
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button 
        title={loading ? "Logging in..." : "Login"} 
        onPress={handleLogin}
        disabled={loading}
      />
    </View>
  );
};

// HomeScreen.js
import React, { useEffect, useState } from 'react';
import { View, FlatList, Text } from 'react-native';
import api from '../services/api';

const HomeScreen = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      const response = await api.getMediaFeed({ type: 'audio', limit: 20 });
      setMedia(response.data);
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FlatList
      data={media}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View>
          <Text>{item.title}</Text>
          <Text>{item.artistName}</Text>
        </View>
      )}
    />
  );
};
```

---

## 🎵 Building Media File URLs & Streaming

Media files are served with **HTTP Range request support** for efficient mobile streaming. This enables:
- Instant playback (no need to wait for full download)
- Seeking to any position in the file
- Efficient buffering and memory usage

### Build Media URLs

```javascript
const getMediaUrl = (filePath) => {
  if (!filePath) return null;
  
  // If already a full URL, return as-is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // Build full URL - use /stream/ for Range request support
  return `${API_CONFIG.BASE_URL}${filePath}`;
};

// Usage
const audioUrl = getMediaUrl(media.fileUrl);
// Result: https://mediacoreapi-sql.masakalirestrobar.ca/uploads/audio/song.mp3

const thumbnailUrl = getMediaUrl(media.thumbnailUrl);
// Result: https://mediacoreapi-sql.masakalirestrobar.ca/uploads/thumbnails/song.jpg
```

### Alternative Streaming Endpoint

For explicit streaming with Range support, you can also use:

```
/stream/audio/<filename>
/stream/video/<filename>
```

Example:
```javascript
const getStreamUrl = (media) => {
  const filename = media.fileUrl.split('/').pop();
  return `${API_CONFIG.BASE_URL}/stream/${media.type}/${filename}`;
};

// Result: https://mediacoreapi-sql.masakalirestrobar.ca/stream/audio/song.mp3
```

### React Native Audio/Video Player

For the best mobile experience, use `react-native-track-player` for audio or `react-native-video` for video:

```javascript
import TrackPlayer from 'react-native-track-player';

// Add track with streaming URL
await TrackPlayer.add({
  id: media.id,
  url: getMediaUrl(media.fileUrl), // Server supports Range requests
  title: media.title,
  artist: media.artistName,
  artwork: getMediaUrl(media.thumbnailUrl),
  duration: media.duration,
});

// Start playback - will stream and buffer automatically
await TrackPlayer.play();
```

---

## ⚠️ Error Handling Best Practices

```javascript
// src/utils/errorHandler.js
export const handleApiError = (error, navigation) => {
  const message = error.message || 'An unexpected error occurred';
  
  switch (message) {
    case 'SESSION_EXPIRED':
    case 'NO_REFRESH_TOKEN':
      // Redirect to login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      Alert.alert('Session Expired', 'Please login again');
      break;
      
    case 'Network request failed':
      Alert.alert('Network Error', 'Please check your internet connection');
      break;
      
    default:
      Alert.alert('Error', message);
  }
};
```

---

## 📦 Required React Native Dependencies

```bash
# Install required packages
npm install react-native-encrypted-storage
# or
yarn add react-native-encrypted-storage

# For iOS
cd ios && pod install && cd ..
```

---

## 🔄 Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      APP LAUNCH                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Check for stored tokens     │
              │   in EncryptedStorage         │
              └───────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
      ┌───────────────┐              ┌───────────────┐
      │  No tokens    │              │ Tokens found  │
      │  Show Login   │              │ Verify token  │
      └───────────────┘              └───────────────┘
              │                               │
              ▼                               ▼
      ┌───────────────┐              ┌───────────────┐
      │ User enters   │              │  GET /auth/me │
      │ credentials   │              │  with token   │
      └───────────────┘              └───────────────┘
              │                               │
              ▼                               │
      ┌───────────────┐              ┌────────┴────────┐
      │ POST /login   │              ▼                 ▼
      │               │      ┌─────────────┐   ┌─────────────┐
      └───────────────┘      │  Valid      │   │  Expired    │
              │              │  → Home     │   │  → Refresh  │
              ▼              └─────────────┘   └─────────────┘
      ┌───────────────┐                               │
      │ Store tokens  │                               ▼
      │ Navigate Home │                      ┌─────────────────┐
      └───────────────┘                      │ POST /refresh   │
                                             └─────────────────┘
                                                      │
                                             ┌────────┴────────┐
                                             ▼                 ▼
                                     ┌─────────────┐   ┌─────────────┐
                                     │  Success    │   │  Failed     │
                                     │  Update     │   │  Clear all  │
                                     │  tokens     │   │  → Login    │
                                     └─────────────┘   └─────────────┘
```

---

## 📝 Quick Reference

| Action | Endpoint | Auth | Method |
|--------|----------|------|--------|
| Register | `/auth/register` | None | POST |
| Login | `/auth/login` | None | POST |
| Refresh Token | `/auth/refresh` | None | POST |
| Logout | `/auth/logout` | None | POST |
| Get Current User | `/auth/me` | Bearer Token | GET |
| Forgot Password | `/auth/forgot-password` | None | POST |
| Reset Password | `/auth/reset-password` | None | POST |
| Get Media Feed | `/api/feed` | API Key | GET |
| Get Single Media | `/api/media/:id` | API Key | GET |
| Get Artists | `/api/artists` | API Key | GET |
| Get Single Artist | `/api/artists/:id` | API Key | GET |
| Get Artist Albums | `/api/artists/:id/albums` | API Key | GET |
| Get Albums | `/api/albums` | API Key | GET |
| Get Single Album | `/api/albums/:id` | API Key | GET |
| Get Album Media | `/api/albums/:id/media` | API Key | GET |
| Get Languages | `/api/languages` | API Key | GET |
| Get Subscription | `/api/user/subscription` | Bearer Token | GET |
| Get User Stats | `/api/user/stats` | Bearer Token | GET |
| Heartbeat | `/api/user/heartbeat` | Bearer Token | POST |

---

**Last Updated:** January 2025
**API Version:** 1.0
**Backend:** MediaCore SQL
