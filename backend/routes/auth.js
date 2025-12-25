/**
 * Authentication Routes
 * Handles user registration, login, token refresh, and password management
 */

const express = require('express');
const router = express.Router();
const authControllers = require('../auth/controllers');
const { checkAuth } = require('../middleware');

// Public routes (no authentication required)
router.post('/register', authControllers.register);
router.post('/login', authControllers.login);
router.post('/google', authControllers.googleAuth);
router.post('/refresh', authControllers.refreshAccessToken);
router.post('/logout', authControllers.logout);
router.post('/forgot-password', authControllers.forgotPassword);
router.post('/reset-password', authControllers.resetPassword);
router.get('/verify-email/:token', authControllers.verifyEmail);

// Protected routes (require authentication)
router.get('/me', checkAuth, authControllers.getCurrentUser);
router.post('/set-password', checkAuth, authControllers.setPassword);

module.exports = router;
