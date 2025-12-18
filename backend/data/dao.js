/**
 * MySQL Data Access Layer
 * Helper functions to replace Firebase Firestore operations
 */

const db = require('../config/db');

/**
 * MEDIA Operations
 */
const mediaDAO = {
  // Get all media with filters
  async getAll(filters = {}) {
    const { type, language, limit = 50, orderBy = 'created_at', order = 'DESC' } = filters;
    
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
    
    query += ` ORDER BY ${orderBy} ${order} LIMIT ?`;
    params.push(parseInt(limit));
    
    return await db.query(query, params);
  },

  // Get media by ID
  async getById(id) {
    return await db.queryOne('SELECT * FROM media WHERE id = ?', [id]);
  },

  // Get language variants
  async getLanguageVariants(contentGroupId) {
    return await db.query(
      'SELECT * FROM media WHERE content_group_id = ?',
      [contentGroupId]
    );
  },

  // Create media
  async create(mediaData) {
    const result = await db.query(
      `INSERT INTO media (id, title, artist_id, album_id, type, file_path, thumbnail_path, 
       duration, file_size, language, content_group_id, is_hls, hls_playlist_url, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        mediaData.id || require('uuid').v4(),
        mediaData.title,
        mediaData.artist_id || null,
        mediaData.album_id || null,
        mediaData.type,
        mediaData.url || mediaData.file_path || null, // Support both url and file_path
        mediaData.thumbnail_url || mediaData.thumbnail_path || null, // Support both naming conventions
        mediaData.duration || null,
        mediaData.file_size || null,
        mediaData.language || 'en',
        mediaData.content_group_id || null,
        mediaData.is_hls || false,
        mediaData.hls_playlist_url || null
      ]
    );
    return result.insertId;
  },

  // Update media
  async update(id, updates) {
    const allowedFields = {
      title: 'title',
      subtitle: 'subtitle',
      description: 'description',
      artistId: 'artist_id',
      albumId: 'album_id',
      type: 'type',
      language: 'language',
      duration: 'duration',
    };
    
    const setClauses = [];
    const params = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && allowedFields.hasOwnProperty(key)) {
        const dbColumn = allowedFields[key];
        setClauses.push(`${dbColumn} = ?`);
        params.push(value);
      }
    }
    
    if (setClauses.length === 0) return false;
    
    params.push(id);
    const query = `UPDATE media SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = ?`;
    
    console.log('[DAO UPDATE] Executing query:', query);
    console.log('[DAO UPDATE] With params:', params);
    
    const result = await db.query(query, params);
    console.log('[DAO UPDATE] Result:', result);
    return true;
  },

  // Delete media
  async delete(id) {
    await db.query('DELETE FROM media WHERE id = ?', [id]);
    return true;
  },

  // Get media count by type
  async countByType() {
    return await db.query(
      `SELECT type, COUNT(*) as count FROM media GROUP BY type`
    );
  }
};

/**
 * ARTISTS Operations
 */
const artistsDAO = {
  async getAll(orderBy = 'created_at', order = 'DESC', limit = 50) {
    // Validate orderBy to prevent SQL injection
    const validOrderFields = ['created_at', 'name', 'id'];
    const orderField = validOrderFields.includes(orderBy) ? orderBy : 'created_at';
    const orderDirection = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    return await db.query(
      `SELECT * FROM artists ORDER BY ${orderField} ${orderDirection} LIMIT ?`,
      [parseInt(limit)]
    );
  },

  async getById(id) {
    return await db.queryOne('SELECT * FROM artists WHERE id = ?', [id]);
  },

  async getMediaByArtist(artistId, type = null) {
    let query = 'SELECT * FROM media WHERE artist_id = ?';
    const params = [artistId];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC';
    return await db.query(query, params);
  },

  async create(artistData) {
    const id = artistData.id || require('uuid').v4();
    await db.query(
      `INSERT INTO artists (id, name, description, image_url, created_at, updated_at) 
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [id, artistData.name, artistData.description || artistData.bio || null, artistData.image_url || artistData.image || null]
    );
    return { id, ...artistData };
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    
    // Map camelCase/frontend field names to snake_case database column names
    const fieldMap = {
      'name': 'name',
      'bio': 'description',
      'description': 'description',
      'image': 'image_url',
      'imageUrl': 'image_url',
      'image_url': 'image_url'
    };
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && fieldMap[key]) {
        fields.push(`${fieldMap[key]} = ?`);
        values.push(updates[key]);
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    await db.query(
      `UPDATE artists SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
    return true;
  },

  async delete(id, cascade = false) {
    if (cascade) {
      await db.query('DELETE FROM media WHERE artist_id = ?', [id]);
    }
    await db.query('DELETE FROM artists WHERE id = ?', [id]);
    return true;
  }
};

/**
 * ALBUMS Operations
 */
const albumsDAO = {
  async getAll(artistId = null, limit = 50) {
    let query = 'SELECT * FROM albums WHERE 1=1';
    const params = [];
    
    if (artistId) {
      query += ' AND artist_id = ?';
      params.push(artistId);
    }
    
    query += ' ORDER BY release_date DESC LIMIT ?';
    params.push(parseInt(limit));
    
    return await db.query(query, params);
  },

  async getById(id) {
    return await db.queryOne('SELECT * FROM albums WHERE id = ?', [id]);
  },

  async getMediaByAlbum(albumId) {
    return await db.query(
      'SELECT * FROM media WHERE album_id = ? ORDER BY created_at',
      [albumId]
    );
  },

  async create(albumData) {
    const id = albumData.id || require('uuid').v4();
    await db.query(
      `INSERT INTO albums (id, title, artist_id, cover_url, release_date, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, albumData.title, albumData.artist_id, albumData.cover_url || null, albumData.release_date || null]
    );
    return id;
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    await db.query(
      `UPDATE albums SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
    return true;
  },

  async delete(id) {
    await db.query('DELETE FROM albums WHERE id = ?', [id]);
    return true;
  }
};

/**
 * API KEYS Operations
 */
const apiKeysDAO = {
  async getAll(includeInactive = false) {
    let query = 'SELECT * FROM api_keys';
    if (!includeInactive) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY created_at DESC';
    return await db.query(query);
  },

  async getByKey(key) {
    return await db.queryOne('SELECT * FROM api_keys WHERE api_key = ? AND is_active = 1', [key]);
  },

  async create(keyData) {
    const result = await db.query(
      `INSERT INTO api_keys (api_key, name, access_type, permissions, created_by_email, expires_at, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        keyData.key,
        keyData.name,
        keyData.accessType,
        JSON.stringify(keyData.permissions),
        keyData.createdBy,
        keyData.expiresAt || null
      ]
    );
    return result.insertId;
  },

  async delete(id) {
    await db.query('UPDATE api_keys SET is_active = 0 WHERE id = ?', [id]);
    return true;
  },

  async hardDelete(id) {
    await db.query('DELETE FROM api_keys WHERE id = ?', [id]);
    return true;
  }
};

/**
 * USER STATS Operations
 */
const userStatsDAO = {
  async getStats(uid) {
    return await db.queryOne('SELECT * FROM user_stats WHERE uid = ?', [uid]);
  },

  async getDailyActivity(uid, days = 7) {
    return await db.query(
      `SELECT * FROM user_daily_activity 
       WHERE uid = ? AND activity_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY activity_date DESC`,
      [uid, days]
    );
  },

  async getRecentPlays(uid, limit = 50) {
    return await db.query(
      'SELECT * FROM user_plays WHERE uid = ? ORDER BY played_at DESC LIMIT ?',
      [uid, parseInt(limit)]
    );
  },

  async recordPlay(uid, playData) {
    // Insert play record
    await db.query(
      `INSERT INTO user_plays (uid, media_id, media_title, media_type, artist_name, duration_seconds, completion_percentage, played_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [uid, playData.mediaId, playData.title, playData.type, playData.artist, playData.duration, playData.completion || 0]
    );

    // Update daily activity
    const today = new Date().toISOString().split('T')[0];
    await db.query(
      `INSERT INTO user_daily_activity (uid, activity_date, plays, time_seconds, tracks_played) 
       VALUES (?, ?, 1, ?, 1) 
       ON DUPLICATE KEY UPDATE 
       plays = plays + 1, 
       time_seconds = time_seconds + ?, 
       tracks_played = tracks_played + 1`,
      [uid, today, playData.duration || 0, playData.duration || 0]
    );

    // Update overall stats
    await db.query(
      `INSERT INTO user_stats (uid, total_plays, total_time_seconds, unique_tracks) 
       VALUES (?, 1, ?, 1) 
       ON DUPLICATE KEY UPDATE 
       total_plays = total_plays + 1, 
       total_time_seconds = total_time_seconds + ?`,
      [uid, playData.duration || 0, playData.duration || 0]
    );
  },

  async deleteAllStats(uid) {
    await db.query('DELETE FROM user_plays WHERE uid = ?', [uid]);
    await db.query('DELETE FROM user_daily_activity WHERE uid = ?', [uid]);
    await db.query('DELETE FROM user_stats WHERE uid = ?', [uid]);
    return true;
  }
};

/**
 * USER PRESENCE Operations
 */
const userPresenceDAO = {
  async updatePresence(uid, data) {
    await db.query(
      `INSERT INTO user_presence (uid, is_online, device_type, ip_address, user_agent, last_active) 
       VALUES (?, 1, ?, ?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE 
       is_online = 1, 
       device_type = ?, 
       ip_address = ?, 
       user_agent = ?, 
       last_active = NOW()`,
      [uid, data.device, data.ip, data.userAgent, data.device, data.ip, data.userAgent]
    );
  },

  async getOnlineUsers() {
    return await db.query(
      `SELECT u.uid, u.email, u.display_name, up.last_active, up.device_type 
       FROM user_presence up 
       JOIN users u ON up.uid = u.uid 
       WHERE up.is_online = 1 AND up.last_active >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
       ORDER BY up.last_active DESC`
    );
  },

  async setOffline(uid) {
    await db.query('UPDATE user_presence SET is_online = 0 WHERE uid = ?', [uid]);
  }
};

/**
 * APP SETTINGS Operations
 */
const settingsDAO = {
  async get(key) {
    const setting = await db.queryOne('SELECT * FROM app_settings WHERE setting_key = ?', [key]);
    if (!setting) return null;
    
    // Parse value based on type
    if (setting.setting_type === 'number') {
      return parseFloat(setting.setting_value);
    } else if (setting.setting_type === 'boolean') {
      return setting.setting_value === 'true';
    } else if (setting.setting_type === 'json') {
      return JSON.parse(setting.setting_value);
    }
    return setting.setting_value;
  },

  async getAll(publicOnly = false) {
    let query = 'SELECT * FROM app_settings';
    if (publicOnly) {
      query += ' WHERE is_public = 1';
    }
    const settings = await db.query(query);
    
    // Convert to object
    const result = {};
    settings.forEach(s => {
      let value = s.setting_value;
      if (s.setting_type === 'number') value = parseFloat(value);
      else if (s.setting_type === 'boolean') value = value === 'true';
      else if (s.setting_type === 'json') value = JSON.parse(value);
      result[s.setting_key] = value;
    });
    return result;
  },

  async set(key, value, type = 'string') {
    let stringValue = value;
    if (type === 'json') {
      stringValue = JSON.stringify(value);
    } else if (type === 'boolean') {
      stringValue = value ? 'true' : 'false';
    } else if (type === 'number') {
      stringValue = value.toString();
    }
    
    await db.query(
      `INSERT INTO app_settings (setting_key, setting_value, setting_type) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
      [key, stringValue, type, stringValue]
    );
  }
};

module.exports = {
  mediaDAO,
  artistsDAO,
  albumsDAO,
  apiKeysDAO,
  userStatsDAO,
  userPresenceDAO,
  settingsDAO
};
