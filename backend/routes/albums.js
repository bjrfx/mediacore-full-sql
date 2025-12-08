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
 * Get all albums
 */
router.get('/api/albums', checkApiKeyPermissions(), async (req, res) => {
  try {
    const { limit = 50, artistId } = req.query;
    
    let query = 'SELECT * FROM albums WHERE 1=1';
    const params = [];
    
    if (artistId) {
      query += ' AND artist_id = ?';
      params.push(artistId);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const albums = await db.query(query, params);
    
    res.json({
      success: true,
      count: albums.length,
      data: albums
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
 * Get single album by ID
 */
router.get('/api/albums/:id', checkApiKeyPermissions(), async (req, res) => {
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
    
    res.json({
      success: true,
      data: album
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
    
    // Verify album exists
    const album = await db.queryOne('SELECT * FROM albums WHERE id = ?', [id]);
    if (!album) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Album not found'
      });
    }
    
    // Get media for this album
    const media = await db.query(
      'SELECT * FROM media WHERE album_id = ? ORDER BY created_at DESC',
      [id]
    );
    
    res.json({
      success: true,
      album,
      count: media.length,
      data: media
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

module.exports = router;
