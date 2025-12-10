import axios from 'axios';
import { refreshToken as refreshAuthToken } from './auth';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';
const API_KEY = process.env.REACT_APP_PUBLIC_API_KEY || '';

console.log('[API] Base URL:', API_BASE_URL);

// ============================================
// DATA NORMALIZATION HELPERS
// ============================================

/**
 * Normalize media item from API response
 * Converts snake_case to camelCase and ensures fileUrl is set
 */
const normalizeMediaItem = (item) => {
  if (!item) return item;
  return {
    ...item,
    // Convert snake_case to camelCase
    fileUrl: item.fileUrl ?? item.file_path ?? item.filePath ?? '',
    filePath: item.filePath ?? item.file_path ?? '',
    fileSize: item.fileSize ?? item.file_size ?? 0,
    thumbnailUrl: item.thumbnailUrl ?? item.thumbnail_url ?? item.thumbnail_path ?? '',
    artistId: item.artistId ?? item.artist_id,
    albumId: item.albumId ?? item.album_id,
    contentGroupId: item.contentGroupId ?? item.content_group_id,
    createdAt: item.createdAt ?? item.created_at,
    updatedAt: item.updatedAt ?? item.updated_at,
    uploadedAt: item.uploadedAt ?? item.uploaded_at,
    // HLS support
    isHls: item.isHls ?? item.is_hls ?? false,
    hlsPlaylistUrl: item.hlsPlaylistUrl ?? item.hls_playlist_url ?? null,
  };
};

/**
 * Normalize media response (handles both single item and arrays)
 */
const normalizeMediaResponse = (response) => {
  if (!response) return response;
  
  if (response.data) {
    if (Array.isArray(response.data)) {
      return {
        ...response,
        data: response.data.map(normalizeMediaItem),
      };
    } else {
      return {
        ...response,
        data: normalizeMediaItem(response.data),
      };
    }
  }
  return response;
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging and adding auth token
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    
    // Add JWT token to requests if available
    const token = localStorage.getItem('accessToken');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    console.log('[API] Response:', response.status);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.error('[API Error]', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
    });
    
    // If 401 and we haven't tried refreshing yet, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const newAccessToken = await refreshAuthToken();
        if (newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('[API] Token refresh failed:', refreshError);
        // Clear tokens and redirect to login if needed
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper to create auth headers
const getAuthHeaders = async () => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// ============================================
// PUBLIC API (uses API Key)
// ============================================

export const publicApi = {
  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // ---- Media ----

  // Get all media
  getMedia: async (options = {}) => {
    const { type, limit = 50, orderBy = 'createdAt', order = 'desc' } = options;
    const params = new URLSearchParams({ limit: String(limit), orderBy, order });
    if (type) params.append('type', type);

    const response = await api.get(`/api/feed?${params}`, {
      headers: { 'x-api-key': API_KEY },
    });
    return normalizeMediaResponse(response.data);
  },

  // Get single media by ID
  getMediaById: async (id) => {
    const response = await api.get(`/api/media/${id}`, {
      headers: { 'x-api-key': API_KEY },
    });
    return normalizeMediaResponse(response.data);
  },

  // Get language variants for a content group
  getLanguageVariants: async (contentGroupId) => {
    const response = await api.get(`/api/media/languages/${contentGroupId}`, {
      headers: { 'x-api-key': API_KEY },
    });
    return normalizeMediaResponse(response.data);
  },

  // Get media by language
  getMediaByLanguage: async (language, options = {}) => {
    const { type, limit = 50, orderBy = 'createdAt', order = 'desc' } = options;
    const params = new URLSearchParams({ limit: String(limit), orderBy, order, language });
    if (type) params.append('type', type);

    const response = await api.get(`/api/feed?${params}`, {
      headers: { 'x-api-key': API_KEY },
    });
    return normalizeMediaResponse(response.data);
  },

  // Get available languages
  getAvailableLanguages: async () => {
    const response = await api.get('/api/languages', {
      headers: { 'x-api-key': API_KEY },
    });
    return response.data;
  },

  // Get app settings
  getSettings: async () => {
    const response = await api.get('/api/settings', {
      headers: { 'x-api-key': API_KEY },
    });
    return response.data;
  },

  // ---- Artists ----

  // Get all artists
  getArtists: async (options = {}) => {
    const { limit = 50, orderBy = 'createdAt', order = 'desc' } = options;
    const params = new URLSearchParams({ limit: String(limit), orderBy, order });

    const response = await api.get(`/api/artists?${params}`, {
      headers: { 'x-api-key': API_KEY },
    });
    return response.data;
  },

  // Get single artist by ID
  getArtistById: async (id) => {
    const response = await api.get(`/api/artists/${id}`, {
      headers: { 'x-api-key': API_KEY },
    });
    return response.data;
  },

  // Get all albums for an artist
  getArtistAlbums: async (artistId, options = {}) => {
    const { orderBy = 'releaseDate', order = 'desc' } = options;
    const params = new URLSearchParams({ orderBy, order });

    const response = await api.get(`/api/artists/${artistId}/albums?${params}`, {
      headers: { 'x-api-key': API_KEY },
    });
    return response.data;
  },

  // Get all media for an artist (across all albums + singles)
  getArtistMedia: async (artistId, options = {}) => {
    const { type, orderBy = 'createdAt', order = 'desc' } = options;
    const params = new URLSearchParams({ orderBy, order });
    if (type) params.append('type', type);

    const response = await api.get(`/api/artists/${artistId}/media?${params}`, {
      headers: { 'x-api-key': API_KEY },
    });
    return response.data;
  },

  // ---- Albums ----

  // Get all albums
  getAlbums: async (options = {}) => {
    const { artistId, limit = 50, orderBy = 'releaseDate', order = 'desc' } = options;
    const params = new URLSearchParams({ limit: String(limit), orderBy, order });
    if (artistId) params.append('artistId', artistId);

    const response = await api.get(`/api/albums?${params}`, {
      headers: { 'x-api-key': API_KEY },
    });
    return response.data;
  },

  // Get single album by ID (includes artist info)
  getAlbumById: async (id) => {
    const response = await api.get(`/api/albums/${id}`, {
      headers: { 'x-api-key': API_KEY },
    });
    return response.data;
  },

  // Get all media/tracks in an album (ordered by track number)
  getAlbumMedia: async (albumId) => {
    const response = await api.get(`/api/albums/${albumId}/media`, {
      headers: { 'x-api-key': API_KEY },
    });
    return response.data;
  },

  // ---- Subtitles/Lyrics ----

  // Get all subtitles for a media item
  getSubtitles: async (mediaId) => {
    const response = await api.get(`/api/media/${mediaId}/subtitles`, {
      headers: { 'x-api-key': API_KEY },
    });
    return response.data;
  },

  // Get subtitle content/info by ID
  getSubtitleContent: async (subtitleId) => {
    const response = await api.get(`/api/subtitles/${subtitleId}/content`, {
      headers: { 'x-api-key': API_KEY },
    });
    return response.data;
  },

  // Fetch subtitle file content directly (for parsing)
  fetchSubtitleFile: async (fileUrl) => {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch subtitle file');
    }
    return response.text();
  },
};

// ============================================
// ADMIN API (uses JWT Auth)
// ============================================

export const adminApi = {
  // ---- Media Management ----

  uploadMedia: async (file, title, subtitle = '', type = 'video', onProgress, artistId, albumId, language = 'en', contentGroupId = null) => {
    const token = localStorage.getItem('accessToken');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('subtitle', subtitle);
    formData.append('type', type);
    formData.append('language', language);
    if (artistId) formData.append('artistId', artistId);
    if (albumId) formData.append('albumId', albumId);
    if (contentGroupId) formData.append('contentGroupId', contentGroupId);

    console.log('[API] Upload:', { fileName: file.name, fileType: file.type, title, type, language, artistId, albumId, contentGroupId });

    const response = await api.post('/admin/media', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },

  // Upload HLS media bundle (ZIP file containing .m3u8 and .ts files)
  uploadHLSMedia: async (hlsBundle, title, options = {}) => {
    const { subtitle = '', language = 'en', artistId, albumId, contentGroupId, duration, onProgress } = options;
    const token = localStorage.getItem('accessToken');
    
    const formData = new FormData();
    formData.append('hlsBundle', hlsBundle);
    formData.append('title', title);
    formData.append('subtitle', subtitle);
    formData.append('language', language);
    if (artistId) formData.append('artistId', artistId);
    if (albumId) formData.append('albumId', albumId);
    if (contentGroupId) formData.append('contentGroupId', contentGroupId);
    if (duration) formData.append('duration', duration.toString());

    console.log('[API] HLS Upload:', { fileName: hlsBundle.name, fileSize: hlsBundle.size, title, language });

    const response = await api.post('/admin/media/hls', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      timeout: 600000, // 10 minute timeout for large HLS bundles
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },

  // Upload additional HLS segments to existing media
  uploadHLSSegments: async (mediaId, segmentFiles, onProgress) => {
    const token = localStorage.getItem('accessToken');
    
    const formData = new FormData();
    formData.append('mediaId', mediaId);
    segmentFiles.forEach(file => {
      formData.append('segments', file);
    });

    console.log('[API] HLS Segments Upload:', { mediaId, fileCount: segmentFiles.length });

    const response = await api.post('/admin/media/hls/segments', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      timeout: 600000,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
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

  // ---- Album-Media Relationships ----

  // Add media to an album with track number
  addMediaToAlbum: async (albumId, mediaId, trackNumber) => {
    const headers = await getAuthHeaders();
    const response = await api.post(
      `/admin/albums/${albumId}/media`,
      { mediaId, trackNumber },
      { headers }
    );
    return response.data;
  },

  // Remove media from an album
  removeMediaFromAlbum: async (albumId, mediaId) => {
    const headers = await getAuthHeaders();
    const response = await api.delete(`/admin/albums/${albumId}/media/${mediaId}`, { headers });
    return response.data;
  },

  // Reorder tracks in an album
  reorderAlbumTracks: async (albumId, tracks) => {
    const headers = await getAuthHeaders();
    const response = await api.put(
      `/admin/albums/${albumId}/media/reorder`,
      { tracks },
      { headers }
    );
    return response.data;
  },

  // ---- Subtitle/Lyrics Management ----

  // Upload subtitle file for a media item
  uploadSubtitle: async (mediaId, file, options = {}) => {
    const { language = 'en', label, isDefault = false, onProgress } = options;
    const token = localStorage.getItem('accessToken');
    
    const formData = new FormData();
    formData.append('subtitle', file);
    formData.append('language', language);
    if (label) formData.append('label', label);
    formData.append('isDefault', isDefault.toString());

    const response = await api.post(`/admin/media/${mediaId}/subtitles`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },

  // Update subtitle metadata
  updateSubtitle: async (subtitleId, data) => {
    const headers = await getAuthHeaders();
    const response = await api.put(`/admin/subtitles/${subtitleId}`, data, { headers });
    return response.data;
  },

  // Delete subtitle
  deleteSubtitle: async (subtitleId) => {
    const headers = await getAuthHeaders();
    const response = await api.delete(`/admin/subtitles/${subtitleId}`, { headers });
    return response.data;
  },

  // ---- API Key Management ----

  generateApiKey: async (name, accessType = 'read_only', options = {}) => {
    const headers = await getAuthHeaders();
    const response = await api.post(
      '/admin/generate-key',
      {
        name,
        accessType,
        ...options,
      },
      { headers }
    );
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

  getSettings: async () => {
    const headers = await getAuthHeaders();
    const response = await api.get('/api/settings', { headers });
    return response.data;
  },

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
  },

  getApiKeyStats: async (keyId) => {
    const headers = await getAuthHeaders();
    const url = keyId ? `/admin/analytics/api-keys?keyId=${keyId}` : '/admin/analytics/api-keys';
    const response = await api.get(url, { headers });
    return response.data;
  },

  // Click Stream - Real-time request logs
  getClickStream: async (limit = 50, offset = 0) => {
    const headers = await getAuthHeaders();
    const response = await api.get(`/admin/analytics/click-stream?limit=${limit}&offset=${offset}`, { headers });
    return response.data;
  },

  // Geographic analytics
  getGeographicStats: async (days = 30) => {
    const headers = await getAuthHeaders();
    const response = await api.get(`/admin/analytics/geographic?days=${days}`, { headers });
    return response.data;
  },

  // Device/Browser analytics
  getDeviceStats: async (days = 30) => {
    const headers = await getAuthHeaders();
    const response = await api.get(`/admin/analytics/devices?days=${days}`, { headers });
    return response.data;
  },

  // Referrer analytics
  getReferrerStats: async (days = 30) => {
    const headers = await getAuthHeaders();
    const response = await api.get(`/admin/analytics/referrers?days=${days}`, { headers });
    return response.data;
  },

  // Hourly breakdown
  getHourlyStats: async () => {
    const headers = await getAuthHeaders();
    const response = await api.get('/admin/analytics/hourly', { headers });
    return response.data;
  },

  // ---- User Management ----

  // Get all users
  getUsers: async () => {
    const headers = await getAuthHeaders();
    const response = await api.get('/admin/users', { headers });
    return response.data;
  },

  // Get single user by UID
  getUserById: async (uid) => {
    const headers = await getAuthHeaders();
    const response = await api.get(`/admin/users/${uid}`, { headers });
    return response.data;
  },

  // Update user role (make admin or regular user)
  updateUserRole: async (uid, role) => {
    const headers = await getAuthHeaders();
    const response = await api.put(`/admin/users/${uid}/role`, { role }, { headers });
    return response.data;
  },

  // Disable/Enable user
  updateUserStatus: async (uid, disabled) => {
    const headers = await getAuthHeaders();
    const response = await api.put(`/admin/users/${uid}/status`, { disabled }, { headers });
    return response.data;
  },

  // Delete user
  deleteUser: async (uid) => {
    const headers = await getAuthHeaders();
    const response = await api.delete(`/admin/users/${uid}`, { headers });
    return response.data;
  },

  // ---- Subscription Management ----

  // Update user subscription tier
  updateUserSubscription: async (uid, subscriptionTier) => {
    const headers = await getAuthHeaders();
    const response = await api.put(
      `/admin/users/${uid}/subscription`,
      { subscriptionTier },
      { headers }
    );
    return response.data;
  },

  // Get subscription stats
  getSubscriptionStats: async () => {
    const headers = await getAuthHeaders();
    const response = await api.get('/admin/analytics/subscriptions', { headers });
    return response.data;
  },

  // Get currently online users
  getOnlineUsers: async () => {
    const headers = await getAuthHeaders();
    const response = await api.get('/admin/users/online', { headers });
    return response.data;
  },
};

// ============================================
// USER API (Authenticated user actions)
// ============================================

export const userApi = {
  // Get current user's subscription info
  getMySubscription: async () => {
    const headers = await getAuthHeaders();
    const response = await api.get('/api/user/subscription', { headers });
    return response.data;
  },

  // Get current user's profile
  getMyProfile: async () => {
    const headers = await getAuthHeaders();
    const response = await api.get('/api/user/profile', { headers });
    return response.data;
  },

  // Update playback usage (for server-side tracking)
  updatePlaybackUsage: async (seconds) => {
    const headers = await getAuthHeaders();
    const response = await api.post(
      '/api/user/playback-usage',
      { seconds },
      { headers }
    );
    return response.data;
  },

  // ---- User Stats API ----

  // Get user's complete listening statistics
  getStats: async () => {
    const headers = await getAuthHeaders();
    const response = await api.get('/api/user/stats', { headers });
    return response.data;
  },

  // Record a play event
  recordPlay: async (playData) => {
    const headers = await getAuthHeaders();
    const response = await api.post('/api/user/stats/play', playData, { headers });
    return response.data;
  },

  // Reset all user stats (for testing/privacy)
  resetStats: async () => {
    const headers = await getAuthHeaders();
    const response = await api.delete('/api/user/stats?confirm=true', { headers });
    return response.data;
  },

  // Send heartbeat to indicate user is online
  sendHeartbeat: async () => {
    const headers = await getAuthHeaders();
    const response = await api.post('/api/user/heartbeat', {}, { headers });
    return response.data;
  },
};

const apiService = { publicApi, adminApi, userApi };
export default apiService;

// ============================================
