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
 * Get all artists with pagination and sorting
 * Query params: limit, orderBy, order
 */
router.get('/api/artists', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { limit = 50, orderBy = 'createdAt', order = 'desc' } = req.query;
    
    const artists = await artistsDAO.getAll(
      orderBy,
      order,
      parseInt(limit)
    );
    
    res.json({
      success: true,
      count: artists.length,
      data: artists
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
 * Get single artist by ID
 */
router.get('/api/artists/:id', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { id } = req.params;
    const artist = await artistsDAO.getById(id);
    
    if (!artist) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Artist not found'
      });
    }
    
    res.json({
      success: true,
      data: artist
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
    const { orderBy = 'releaseDate', order = 'desc' } = req.query;
    
    // Verify artist exists
    const artist = await artistsDAO.getById(id);
    if (!artist) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Artist not found'
      });
    }
    
    // Get albums for this artist using SQL query
    const [albums] = await db.query(`
      SELECT id, title, releaseDate, coverImage, artistId, createdAt, updatedAt
      FROM albums
      WHERE artistId = ?
      ORDER BY ${orderBy} ${order.toUpperCase()}
    `, [id]);
    
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
    
    const media = await artistsDAO.getMediaByArtist(id, type, orderBy, order);
    
    res.json({
      success: true,
      count: media.length,
      data: media
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
      createdBy: req.user.id
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
 * Query param: cascade (true/false) - if true, nullifies artistId in related content
 */
router.delete('/admin/artists/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { cascade = false } = req.query;
    
    const artist = await artistsDAO.getById(id);
    
    if (!artist) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Artist not found'
      });
    }
    
    // Check for associated albums
    const [albums] = await db.query('SELECT COUNT(*) as count FROM albums WHERE artistId = ?', [id]);
    const albumCount = albums[0].count;
    
    // Check for associated media
    const [media] = await db.query('SELECT COUNT(*) as count FROM media WHERE artistId = ?', [id]);
    const mediaCount = media[0].count;
    
    if (!cascade && (albumCount > 0 || mediaCount > 0)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Cannot delete artist with ${albumCount} albums and ${mediaCount} media items. Use ?cascade=true to delete all associated content.`
      });
    }
    
    // If cascade delete, remove artist references from albums and media
    if (cascade === 'true') {
      await db.query('UPDATE albums SET artistId = NULL, updatedAt = NOW() WHERE artistId = ?', [id]);
      await db.query('UPDATE media SET artistId = NULL, updatedAt = NOW() WHERE artistId = ?', [id]);
    }
    
    await artistsDAO.delete(id);
    
    res.json({
      success: true,
      message: 'Artist deleted successfully',
      cascade: cascade === 'true',
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
