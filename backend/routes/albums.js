/**
 * Albums Routes - MySQL Only
 * 
 * Handles all album-related API endpoints using MySQL database.
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Import MySQL and middleware
const db = require('../config/db');
const { checkAdminAuth, checkApiKeyPermissions } = require('../middleware');

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

/**
 * GET /api/albums
 * Get all albums with track counts
 */
router.get('/api/albums', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { limit = 50, artistId } = req.query;
    
    let query = `
      SELECT 
        a.*,
        (SELECT COUNT(*) FROM media WHERE album_id = a.id) as track_count
      FROM albums a
      WHERE 1=1
    `;
    const params = [];
    
    if (artistId) {
      query += ' AND a.artist_id = ?';
      params.push(artistId);
    }
    
    query += ' ORDER BY a.created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const albums = await db.query(query, params);
    
    // Transform to camelCase for frontend
    const transformedAlbums = albums.map(album => ({
      id: album.id,
      name: album.name,
      title: album.name,
      artistId: album.artist_id,
      artistName: album.artist_name,
      coverImage: album.cover_image_url,
      coverImageUrl: album.cover_image_url,
      year: album.year,
      genre: album.genre,
      description: album.description,
      trackCount: album.track_count || 0,
      createdAt: album.created_at,
      updatedAt: album.updated_at
    }));
    
    res.json({
      success: true,
      count: transformedAlbums.length,
      data: transformedAlbums
    });
  } catch (error) {
    console.error('Error fetching albums:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch albums'
    });
  }
});

/**
 * GET /api/albums/:id
 * Get single album by ID with track count and artist info
 */
router.get('/api/albums/:id', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get album with artist info joined
    const albums = await db.query(`
      SELECT 
        a.*,
        ar.id as artist_id_ref,
        ar.name as artist_name_ref,
        ar.description as artist_bio,
        ar.image_url as artist_image,
        (SELECT COUNT(*) FROM media WHERE album_id = a.id) as track_count
      FROM albums a
      LEFT JOIN artists ar ON a.artist_id = ar.id
      WHERE a.id = ?
    `, [id]);
    
    if (!albums || albums.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Album not found'
      });
    }
    
    const album = albums[0];
    
    // Build artist object if artist exists
    const artist = album.artist_id ? {
      id: album.artist_id,
      name: album.artist_name_ref || album.artist_name,
      bio: album.artist_bio,
      image: album.artist_image,
      imageUrl: album.artist_image
    } : null;
    
    // Transform to camelCase
    const transformedAlbum = {
      id: album.id,
      name: album.name,
      title: album.name,
      artistId: album.artist_id,
      artistName: album.artist_name_ref || album.artist_name,
      artist: artist,
      coverImage: album.cover_image_url,
      coverImageUrl: album.cover_image_url,
      year: album.year,
      genre: album.genre,
      description: album.description,
      trackCount: album.track_count || 0,
      createdAt: album.created_at,
      updatedAt: album.updated_at
    };
    
    res.json({
      success: true,
      data: transformedAlbum
    });
  } catch (error) {
    console.error('Error fetching album:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch album'
    });
  }
});

/**
 * GET /api/albums/:id/media
 * Get all media for an album
 */
router.get('/api/albums/:id/media', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify album exists and get artist info
    const album = await db.queryOne(`
      SELECT a.*, ar.name as artist_name 
      FROM albums a 
      LEFT JOIN artists ar ON a.artist_id = ar.id 
      WHERE a.id = ?
    `, [id]);
    if (!album) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Album not found'
      });
    }
    
    // Get media for this album with track number ordering
    const media = await db.query(
      'SELECT * FROM media WHERE album_id = ? ORDER BY track_number ASC, created_at DESC',
      [id]
    );
    
    // Transform to camelCase for frontend
    const transformedMedia = media.map(item => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      type: item.type,
      fileUrl: item.file_path,
      filePath: item.file_path,
      fileSize: item.file_size,
      thumbnail: item.thumbnail,
      thumbnailUrl: item.thumbnail,
      duration: item.duration,
      artistId: item.artist_id,
      artistName: album.artist_name || '',
      albumId: item.album_id,
      albumTitle: album.name,
      language: item.language,
      contentGroupId: item.content_group_id,
      trackNumber: item.track_number,
      isHls: item.is_hls || false,
      hlsPlaylistUrl: item.hls_playlist_url,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
    
    res.json({
      success: true,
      album: {
        id: album.id,
        name: album.name,
        title: album.name,
        artistId: album.artist_id,
        artistName: album.artist_name,
        coverImage: album.cover_image_url,
        coverImageUrl: album.cover_image_url
      },
      count: transformedMedia.length,
      data: transformedMedia
    });
  } catch (error) {
    console.error('Error fetching album media:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch album media'
    });
  }
});

// =============================================================================
// ADMIN ROUTES - ALBUM CRUD
// =============================================================================

/**
 * POST /admin/albums
 * Create new album (Admin only)
 */
router.post('/admin/albums', checkAdminAuth, async (req, res) => {
  try {
    // Accept both 'name' and 'title' for album name (frontend sends 'title')
    const { name, title, artistId, artistName, coverImageUrl, year, genre, description } = req.body;
    const albumName = name || title;
    
    if (!albumName) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Album name is required'
      });
    }
    
    const albumId = uuidv4();
    
    await db.query(
      `INSERT INTO albums (id, name, artist_id, artist_name, cover_image_url, year, genre, description, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        albumId,
        albumName,
        artistId || null,
        artistName || null,
        coverImageUrl || null,
        year ? parseInt(year) : null,
        genre || null,
        description || null
      ]
    );
    
    const album = await db.queryOne('SELECT * FROM albums WHERE id = ?', [albumId]);
    
    res.status(201).json({
      success: true,
      message: 'Album created successfully',
      data: album
    });
  } catch (error) {
    console.error('Error creating album:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create album'
    });
  }
});

/**
 * PUT /admin/albums/:id
 * Update album (Admin only)
 */
router.put('/admin/albums/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, artistId, artistName, coverImageUrl, year, genre, description } = req.body;
    
    const album = await db.queryOne('SELECT * FROM albums WHERE id = ?', [id]);
    
    if (!album) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Album not found'
      });
    }
    
    await db.query(
      `UPDATE albums 
       SET name = ?, artist_id = ?, artist_name = ?, cover_image_url = ?, 
           year = ?, genre = ?, description = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        name || album.name,
        artistId !== undefined ? artistId : album.artist_id,
        artistName !== undefined ? artistName : album.artist_name,
        coverImageUrl !== undefined ? coverImageUrl : album.cover_image_url,
        year !== undefined ? (year ? parseInt(year) : null) : album.year,
        genre !== undefined ? genre : album.genre,
        description !== undefined ? description : album.description,
        id
      ]
    );
    
    const updatedAlbum = await db.queryOne('SELECT * FROM albums WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Album updated successfully',
      data: updatedAlbum
    });
  } catch (error) {
    console.error('Error updating album:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update album'
    });
  }
});

/**
 * DELETE /admin/albums/:id
 * Delete album (Admin only)
 */
router.delete('/admin/albums/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const album = await db.queryOne('SELECT * FROM albums WHERE id = ?', [id]);
    
    if (!album) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Album not found'
      });
    }
    
    // Check if album has media
    const mediaCount = await db.queryOne(
      'SELECT COUNT(*) as count FROM media WHERE album_id = ?',
      [id]
    );
    
    if (mediaCount.count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Cannot delete album with ${mediaCount.count} media items. Remove media first.`
      });
    }
    
    await db.query('DELETE FROM albums WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Album deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete album'
    });
  }
});

/**
 * GET /admin/albums/:artistId/for-artist
 * Get all albums for a specific artist (Admin only)
 */
router.get('/admin/albums/:artistId/for-artist', checkAdminAuth, async (req, res) => {
  try {
    const { artistId } = req.params;
    
    const albums = await db.query(
      'SELECT * FROM albums WHERE artist_id = ? ORDER BY year DESC, name ASC',
      [artistId]
    );
    
    res.json({
      success: true,
      count: albums.length,
      data: albums
    });
  } catch (error) {
    console.error('Error fetching artist albums:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch albums'
    });
  }
});

// =============================================================================
// ADMIN ROUTES - ALBUM-MEDIA RELATIONSHIPS
// =============================================================================

/**
 * POST /admin/albums/:id/media
 * Add media to an album (Admin only)
 */
router.post('/admin/albums/:id/media', checkAdminAuth, async (req, res) => {
  try {
    const { id: albumId } = req.params;
    const { mediaId, trackNumber } = req.body;
    
    if (!mediaId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'mediaId is required'
      });
    }
    
    // Verify album exists
    const album = await db.queryOne('SELECT * FROM albums WHERE id = ?', [albumId]);
    if (!album) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Album not found'
      });
    }
    
    // Verify media exists
    const media = await db.queryOne('SELECT * FROM media WHERE id = ?', [mediaId]);
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media not found'
      });
    }
    
    // Update the media to assign it to this album
    await db.query(
      `UPDATE media SET album_id = ?, track_number = ?, updated_at = NOW() WHERE id = ?`,
      [albumId, trackNumber || null, mediaId]
    );
    
    // Fetch updated media
    const updatedMedia = await db.queryOne('SELECT * FROM media WHERE id = ?', [mediaId]);
    
    console.log(`✅ Added media ${mediaId} to album ${albumId} as track ${trackNumber}`);
    
    res.json({
      success: true,
      message: 'Media added to album successfully',
      data: updatedMedia
    });
  } catch (error) {
    console.error('Error adding media to album:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to add media to album'
    });
  }
});

/**
 * DELETE /admin/albums/:id/media/:mediaId
 * Remove media from an album (Admin only)
 */
router.delete('/admin/albums/:id/media/:mediaId', checkAdminAuth, async (req, res) => {
  try {
    const { id: albumId, mediaId } = req.params;
    
    // Verify album exists
    const album = await db.queryOne('SELECT * FROM albums WHERE id = ?', [albumId]);
    if (!album) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Album not found'
      });
    }
    
    // Verify media exists and is in this album
    const media = await db.queryOne('SELECT * FROM media WHERE id = ? AND album_id = ?', [mediaId, albumId]);
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media not found in this album'
      });
    }
    
    // Remove the media from the album (set album_id to NULL)
    await db.query(
      `UPDATE media SET album_id = NULL, track_number = NULL, updated_at = NOW() WHERE id = ?`,
      [mediaId]
    );
    
    console.log(`✅ Removed media ${mediaId} from album ${albumId}`);
    
    res.json({
      success: true,
      message: 'Media removed from album successfully'
    });
  } catch (error) {
    console.error('Error removing media from album:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to remove media from album'
    });
  }
});

/**
 * PUT /admin/albums/:id/media/reorder
 * Reorder tracks in an album (Admin only)
 */
router.put('/admin/albums/:id/media/reorder', checkAdminAuth, async (req, res) => {
  try {
    const { id: albumId } = req.params;
    const { tracks } = req.body;
    
    if (!tracks || !Array.isArray(tracks)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'tracks array is required'
      });
    }
    
    // Verify album exists
    const album = await db.queryOne('SELECT * FROM albums WHERE id = ?', [albumId]);
    if (!album) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Album not found'
      });
    }
    
    // Update track numbers for each media item
    for (const track of tracks) {
      const { mediaId, trackNumber } = track;
      await db.query(
        `UPDATE media SET track_number = ?, updated_at = NOW() WHERE id = ? AND album_id = ?`,
        [trackNumber, mediaId, albumId]
      );
    }
    
    console.log(`✅ Reordered ${tracks.length} tracks in album ${albumId}`);
    
    res.json({
      success: true,
      message: 'Tracks reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering tracks:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to reorder tracks'
    });
  }
});

module.exports = router;
