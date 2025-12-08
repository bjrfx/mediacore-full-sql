/**
 * JWT Token Management
 * 
 * Handles creation and verification of JSON Web Tokens
 * for authentication and authorization.
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'c2e86adc6fc7a209120ae82e12e2d2c5153bc347a620c565595df0cd8204723a';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';  // 15 minutes
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';  // 7 days

/**
 * Generate access token (short-lived)
 * @param {Object} payload - User data to encode in token
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY,
    issuer: 'mediacore-api',
    audience: 'mediacore-client'
  });
};

/**
 * Generate refresh token (long-lived)
 * @param {Object} payload - User data to encode in token
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY,
    issuer: 'mediacore-api',
    audience: 'mediacore-client'
  });
};

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'mediacore-api',
      audience: 'mediacore-client'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const err = new Error('Token has expired');
      err.code = 'TOKEN_EXPIRED';
      throw err;
    }
    if (error.name === 'JsonWebTokenError') {
      const err = new Error('Invalid token');
      err.code = 'INVALID_TOKEN';
      throw err;
    }
    throw error;
  }
};

/**
 * Decode token without verifying (useful for reading expired tokens)
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded token payload (unverified)
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object from database
 * @returns {Object} Object containing access and refresh tokens
 */
const generateTokenPair = (user) => {
  const payload = {
    uid: user.uid,
    email: user.email,
    emailVerified: user.email_verified || false,
    displayName: user.display_name || null
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split('Bearer ')[1];
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  generateTokenPair,
  extractTokenFromHeader,
  JWT_ACCESS_EXPIRY,
  JWT_REFRESH_EXPIRY
};
