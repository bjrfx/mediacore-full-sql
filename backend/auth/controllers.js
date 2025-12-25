/**
 * Authentication Controllers
 * 
 * Handles all authentication-related endpoints including:
 * - User registration
 * - Email/password login
 * - Google OAuth login
 * - Token refresh
 * - Logout
 * - Password reset
 * - Email verification
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { query, queryOne, transaction } = require('../config/db');
const { hashPassword, comparePassword, validatePassword } = require('./password');
const { generateTokenPair, verifyToken, JWT_REFRESH_EXPIRY } = require('./jwt');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * POST /auth/register
 * Register a new user with email and password
 */
const register = async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid email format'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Check if user already exists
    const existingUser = await queryOne(
      'SELECT uid FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'Email already exists'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const uid = uuidv4();
    await query(
      `INSERT INTO users (uid, email, password_hash, display_name, email_verified)
       VALUES (?, ?, ?, ?, FALSE)`,
      [uid, email, passwordHash, displayName || null]
    );

    // Create default user role
    await query(
      'INSERT INTO user_roles (uid, role) VALUES (?, ?)',
      [uid, 'user']
    );

    // Create default subscription
    await query(
      'INSERT INTO user_subscriptions (uid, subscription_tier) VALUES (?, ?)',
      [uid, 'free']
    );

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await query(
      'INSERT INTO email_verification_tokens (token, uid, expires_at) VALUES (?, ?, ?)',
      [verificationToken, uid, expiresAt]
    );

    // TODO: Send verification email (implement email service)
    console.log(`Verification token for ${email}: ${verificationToken}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      data: {
        uid,
        email,
        displayName: displayName || null,
        emailVerified: false
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to register user'
    });
  }
};

/**
 * POST /auth/login
 * Login with email and password
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await queryOne(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Check if user is disabled
    if (user.disabled) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Account has been disabled'
      });
    }

    // Verify password
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Update last sign in time
    await query(
      'UPDATE users SET last_sign_in_at = NOW() WHERE uid = ?',
      [user.uid]
    );

    // Get user role
    const roleRecord = await queryOne(
      'SELECT role FROM user_roles WHERE uid = ?',
      [user.uid]
    );
    const userRole = roleRecord ? roleRecord.role : 'user';

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await query(
      'INSERT INTO refresh_tokens (token, uid, expires_at) VALUES (?, ?, ?)',
      [tokens.refreshToken, user.uid, expiresAt]
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.display_name,
          photoURL: user.photo_url,
          emailVerified: user.email_verified,
          role: userRole
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to login'
    });
  }
};

/**
 * POST /auth/google
 * Login/Register with Google OAuth
 */
const googleAuth = async (req, res) => {
  try {
    const { googleToken } = req.body;

    if (!googleToken) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Google token is required'
      });
    }

    // Verify Google token
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
    } catch (error) {
      console.error('Google token verification failed:', error);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid Google token'
      });
    }

    const payload = ticket.getPayload();
    const {
      sub: googleId,
      email,
      name: displayName,
      picture: photoURL,
      email_verified: googleEmailVerified
    } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Email not provided by Google'
      });
    }

    // Check if user exists by google_id or email
    let user = await queryOne(
      'SELECT * FROM users WHERE google_id = ? OR email = ?',
      [googleId, email]
    );

    let isNewUser = false;
    let needsPassword = false;

    if (!user) {
      // Create new user with Google account
      const uid = uuidv4();
      
      // Use empty string for password_hash (Google users don't have password initially)
      await query(
        `INSERT INTO users (uid, email, google_id, display_name, photo_url, email_verified, password_hash)
         VALUES (?, ?, ?, ?, ?, ?, '')`,
        [uid, email, googleId, displayName || null, photoURL || null, googleEmailVerified || false]
      );

      // Create default user role
      await query(
        'INSERT INTO user_roles (uid, role) VALUES (?, ?)',
        [uid, 'user']
      );

      // Create default subscription
      await query(
        'INSERT INTO user_subscriptions (uid, subscription_tier) VALUES (?, ?)',
        [uid, 'free']
      );

      // Fetch the newly created user
      user = await queryOne('SELECT * FROM users WHERE uid = ?', [uid]);
      isNewUser = true;
      needsPassword = true;
    } else if (!user.google_id) {
      // Existing email/password user signing in with Google - link accounts
      await query(
        'UPDATE users SET google_id = ?, photo_url = COALESCE(photo_url, ?), email_verified = TRUE WHERE uid = ?',
        [googleId, photoURL || null, user.uid]
      );
      
      // Refresh user data
      user = await queryOne('SELECT * FROM users WHERE uid = ?', [user.uid]);
      needsPassword = false; // Already has password
    } else {
      // Existing Google user
      // Update photo URL if changed
      await query(
        'UPDATE users SET photo_url = COALESCE(?, photo_url) WHERE uid = ?',
        [photoURL || null, user.uid]
      );
      
      // Check if user has set a password (password_hash is not empty)
      needsPassword = !user.password_hash || user.password_hash === '';
    }

    // Check if user is disabled
    if (user.disabled) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Account has been disabled'
      });
    }

    // Update last sign in time
    await query(
      'UPDATE users SET last_sign_in_at = NOW() WHERE uid = ?',
      [user.uid]
    );

    // Get user role
    const roleRecord = await queryOne(
      'SELECT role FROM user_roles WHERE uid = ?',
      [user.uid]
    );
    const userRole = roleRecord ? roleRecord.role : 'user';

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await query(
      'INSERT INTO refresh_tokens (token, uid, expires_at) VALUES (?, ?, ?)',
      [tokens.refreshToken, user.uid, expiresAt]
    );

    res.json({
      success: true,
      message: isNewUser ? 'Account created successfully with Google' : 'Login successful',
      data: {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.display_name,
          photoURL: user.photo_url,
          emailVerified: user.email_verified,
          role: userRole,
          hasPassword: !needsPassword,
          isNewUser
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        needsPassword // Flag to show password setup modal
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to authenticate with Google'
    });
  }
};

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: error.message
      });
    }

    // Check if refresh token exists in database
    const storedToken = await queryOne(
      'SELECT * FROM refresh_tokens WHERE token = ? AND uid = ?',
      [refreshToken, decoded.uid]
    );

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid refresh token'
      });
    }

    // Check if token is expired
    if (new Date(storedToken.expires_at) < new Date()) {
      await query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Refresh token has expired'
      });
    }

    // Get user details
    const user = await queryOne('SELECT * FROM users WHERE uid = ?', [decoded.uid]);

    if (!user || user.disabled) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not found or disabled'
      });
    }

    // Generate new token pair
    const tokens = generateTokenPair(user);

    // Delete old refresh token and store new one
    await query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
    
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (token, uid, expires_at) VALUES (?, ?, ?)',
      [tokens.refreshToken, user.uid, expiresAt]
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to refresh token'
    });
  }
};

/**
 * POST /auth/logout
 * Logout and invalidate refresh token
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to logout'
    });
  }
};

/**
 * GET /auth/me
 * Get current user info from access token
 */
const getCurrentUser = async (req, res) => {
  try {
    // User info already attached by checkAuth middleware
    const user = await queryOne(
      'SELECT u.*, ur.role, us.subscription_tier FROM users u ' +
      'LEFT JOIN user_roles ur ON u.uid = ur.uid ' +
      'LEFT JOIN user_subscriptions us ON u.uid = us.uid ' +
      'WHERE u.uid = ?',
      [req.user.uid]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        uid: user.uid,
        email: user.email,
        displayName: user.display_name,
        photoURL: user.photo_url,
        emailVerified: user.email_verified,
        role: user.role || 'user',
        subscriptionTier: user.subscription_tier || 'free',
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get user info'
    });
  }
};

/**
 * POST /auth/forgot-password
 * Request password reset email
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Email is required'
      });
    }

    const user = await queryOne('SELECT uid FROM users WHERE email = ?', [email]);

    // Don't reveal if email exists (security best practice)
    if (!user) {
      return res.json({
        success: true,
        message: 'If that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      'INSERT INTO password_reset_tokens (token, uid, expires_at) VALUES (?, ?, ?)',
      [resetToken, user.uid, expiresAt]
    );

    // TODO: Send password reset email
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({
      success: true,
      message: 'If that email exists, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to process password reset request'
    });
  }
};

/**
 * POST /auth/reset-password
 * Reset password with token
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Token and new password are required'
      });
    }

    // Validate password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Find and validate reset token
    const resetToken = await queryOne(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE',
      [token]
    );

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid or expired reset token'
      });
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Reset token has expired'
      });
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and mark token as used
    await query('UPDATE users SET password_hash = ? WHERE uid = ?', [passwordHash, resetToken.uid]);
    await query('UPDATE password_reset_tokens SET used = TRUE WHERE token = ?', [token]);

    // Invalidate all refresh tokens for this user (force re-login)
    await query('DELETE FROM refresh_tokens WHERE uid = ?', [resetToken.uid]);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to reset password'
    });
  }
};

/**
 * POST /auth/verify-email
 * Verify email with token
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Verification token is required'
      });
    }

    const verificationToken = await queryOne(
      'SELECT * FROM email_verification_tokens WHERE token = ?',
      [token]
    );

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid verification token'
      });
    }

    if (new Date(verificationToken.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Verification token has expired'
      });
    }

    // Verify email
    await query('UPDATE users SET email_verified = TRUE WHERE uid = ?', [verificationToken.uid]);
    await query('DELETE FROM email_verification_tokens WHERE token = ?', [token]);

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to verify email'
    });
  }
};

/**
 * POST /auth/set-password
 * Set password for Google OAuth users (requires authentication)
 */
const setPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const uid = req.user.uid; // From checkAuth middleware

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'New password is required'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Get user to verify they exist and check current password status
    const user = await queryOne('SELECT uid, password_hash, google_id FROM users WHERE uid = ?', [uid]);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Optional: Allow only Google users without password to use this endpoint initially
    // Remove this check if you want all users to be able to change password via this endpoint
    if (user.password_hash && user.password_hash !== '') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Password already set. Use forgot password to reset it.'
      });
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await query('UPDATE users SET password_hash = ? WHERE uid = ?', [passwordHash, uid]);

    res.json({
      success: true,
      message: 'Password set successfully. You can now sign in with email and password.'
    });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to set password'
    });
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  refreshAccessToken,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
  setPassword
};
