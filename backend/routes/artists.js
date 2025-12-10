/**
 * Artists Routes - MySQL Only
 * 
 * Handles all artist-related API endpoints using MySQL database.
 * Includes public artist listing, artist details, and admin CRUD operations.
 */

const express = require('express');
const router = express.Router();

// Import MySQL DAO and middleware
const { artistsDAO, mediaDAO } = require('../data/dao');
const db = require('../config/db');
const { checkAdminAuth, checkApiKeyPermissions } = require('../middleware');

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

/**
 * GET /api/artists
 * Get all artists with pagination, sorting, and album/track counts
 * Query params: limit, orderBy, order
 */
router.get('/api/artists', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { limit = 50, orderBy = 'createdAt', order = 'desc' } = req.query;
    
    // Map camelCase orderBy to snake_case
    const orderByMap = {
      'createdAt': 'a.created_at',
      'name': 'a.name',
      'id': 'a.id'
    };
    const dbOrderBy = orderByMap[orderBy] || 'a.created_at';
    const dbOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Query with album and track counts
    const artists = await db.query(`
      SELECT 
        a.*,
        (SELECT COUNT(*) FROM albums WHERE artist_id = a.id) as album_count,
        (SELECT COUNT(*) FROM media WHERE artist_id = a.id) as track_count
      FROM artists a
      ORDER BY ${dbOrderBy} ${dbOrder}
      LIMIT ?
    `, [parseInt(limit)]);
    
    // Transform to camelCase for frontend
    const transformedArtists = artists.map(artist => ({
      id: artist.id,
      name: artist.name,
      description: artist.description,
      bio: artist.description,
      imageUrl: artist.image_url,
      image: artist.image_url,
      albumCount: artist.album_count || 0,
      trackCount: artist.track_count || 0,
      createdAt: artist.created_at,
      updatedAt: artist.updated_at
    }));
    
    res.json({
      success: true,
      count: transformedArtists.length,
      data: transformedArtists
    });
  } catch (error) {
    console.error('Error fetching artists:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch artists'
    });
  }
});

/**
 * GET /api/artists/:id
 * Get single artist by ID with album/track counts
 */
router.get('/api/artists/:id', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get artist with counts
    const artists = await db.query(`
      SELECT 
        a.*,
        (SELECT COUNT(*) FROM albums WHERE artist_id = a.id) as album_count,
        (SELECT COUNT(*) FROM media WHERE artist_id = a.id) as track_count
      FROM artists a
      WHERE a.id = ?
    `, [id]);
    
    if (!artists || artists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Artist not found'
      });
    }
    
    const artist = artists[0];
    
    // Transform to camelCase
    const transformedArtist = {
      id: artist.id,
      name: artist.name,
      description: artist.description,
      bio: artist.description,
      imageUrl: artist.image_url,
      image: artist.image_url,
      albumCount: artist.album_count || 0,
      trackCount: artist.track_count || 0,
      createdAt: artist.created_at,
      updatedAt: artist.updated_at
    };
    
    res.json({
      success: true,
      data: transformedArtist
    });
  } catch (error) {
    console.error('Error fetching artist:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch artist'
    });
  }
});

/**
 * GET /api/artists/:id/albums
 * Get all albums for an artist
 * Query params: orderBy, order
 */
router.get('/api/artists/:id/albums', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    const { orderBy = 'created_at', order = 'desc' } = req.query;
    
    // Verify artist exists
    const artist = await artistsDAO.getById(id);
    if (!artist) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Artist not found'
      });
    }
    
    // Map camelCase orderBy to snake_case
    const orderByMap = {
      'releaseDate': 'a.created_at',
      'createdAt': 'a.created_at',
      'name': 'a.name',
      'title': 'a.name'
    };
    const dbOrderBy = orderByMap[orderBy] || 'a.created_at';
    const dbOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Get albums for this artist with track counts
    const albums = await db.query(`
      SELECT 
        a.*,
        (SELECT COUNT(*) FROM media WHERE album_id = a.id) as track_count
      FROM albums a
      WHERE a.artist_id = ?
      ORDER BY ${dbOrderBy} ${dbOrder}
    `, [id]);
    
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
    console.error('Error fetching artist albums:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch artist albums'
    });
  }
});

/**
 * GET /api/artists/:id/media
 * Get all media for an artist (across all albums + singles)
 * Query params: type, orderBy, order
 */
router.get('/api/artists/:id/media', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    const { type, orderBy = 'createdAt', order = 'desc' } = req.query;
    
    // Verify artist exists
    const artist = await artistsDAO.getById(id);
    if (!artist) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Artist not found'
      });
    }
    
    const mediaList = await artistsDAO.getMediaByArtist(id, type);
    
    // Transform to camelCase for frontend
    const transformedMedia = mediaList.map(item => ({
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
      artistName: artist.name,
      albumId: item.album_id,
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
      count: transformedMedia.length,
      data: transformedMedia
    });
  } catch (error) {
    console.error('Error fetching artist media:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch artist media'
    });
  }
});

// =============================================================================
// ADMIN ROUTES - ARTIST CRUD
// =============================================================================

/**
 * POST /admin/artists
 * Create new artist (Admin only)
 * Body: name, bio, image
 */
router.post('/admin/artists', checkAdminAuth, async (req, res) => {
  try {
    const { name, bio, image } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Artist name is required'
      });
    }
    
    const artistData = {
      name,
      bio: bio || '',
      image: image || '',
      createdBy: req.user.uid
    };
    
    const artist = await artistsDAO.create(artistData);
    
    res.status(201).json({
      success: true,
      message: 'Artist created successfully',
      data: artist
    });
  } catch (error) {
    console.error('Error creating artist:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create artist'
    });
  }
});

/**
 * PUT /admin/artists/:id
 * Update artist (Admin only)
 * Body: name, bio, image
 */
router.put('/admin/artists/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, bio, image } = req.body;
    
    const artist = await artistsDAO.getById(id);
    
    if (!artist) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Artist not found'
      });
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (image !== undefined) updateData.image = image;
    
    const updatedArtist = await artistsDAO.update(id, updateData);
    
    res.json({
      success: true,
      message: 'Artist updated successfully',
      data: updatedArtist
    });
  } catch (error) {
    console.error('Error updating artist:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update artist'
    });
  }
});

/**
 * DELETE /admin/artists/:id
 * Delete artist (Admin only)
 * Query param: cascade (true/false) - if true, deletes albums and unassigns media
 */
router.delete('/admin/artists/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { cascade } = req.query;
    const doCascade = cascade === 'true' || cascade === true;
    
    const artist = await artistsDAO.getById(id);
    
    if (!artist) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Artist not found'
      });
    }
    
    // Check for associated albums
    const albums = await db.query('SELECT COUNT(*) as count FROM albums WHERE artist_id = ?', [id]);
    const albumCount = albums[0]?.count || 0;
    
    // Check for associated media
    const media = await db.query('SELECT COUNT(*) as count FROM media WHERE artist_id = ?', [id]);
    const mediaCount = media[0]?.count || 0;
    
    // If cascade delete, unassign media and delete albums
    if (doCascade) {
      // First unassign media from this artist (don't delete media files)
      await db.query('UPDATE media SET artist_id = NULL, updated_at = NOW() WHERE artist_id = ?', [id]);
      // Delete albums associated with this artist
      await db.query('DELETE FROM albums WHERE artist_id = ?', [id]);
    }
    
    // Delete the artist
    await db.query('DELETE FROM artists WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Artist deleted successfully',
      cascade: doCascade,
      affectedAlbums: albumCount,
      affectedMedia: mediaCount
    });
  } catch (error) {
    console.error('Error deleting artist:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete artist'
    });
  }
});

module.exports = router;
