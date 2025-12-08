/**
 * Admin Authentication Middleware
 * 
 * Verifies JWT tokens to authenticate admin users.
 * Only authenticated admins can access protected routes like
 * uploading files or generating API keys.
 */

const { verifyToken, extractTokenFromHeader } = require('../auth/jwt');
const { queryOne } = require('../config/db');

/**
 * Middleware to verify JWT Token and check admin privileges
 * 
 * Expects the Authorization header in format: "Bearer <token>"
 * Verifies the token and checks if user has admin role in database.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const checkAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Expected format: Bearer <token>'
      });
    }

    // Extract the token
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No token provided in Authorization header'
      });
    }

    // Verify the JWT token
    let decodedToken;
    try {
      decodedToken = verifyToken(token);
    } catch (error) {
      if (error.code === 'TOKEN_EXPIRED') {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Token has expired. Please refresh your token.'
        });
      }
      if (error.code === 'INVALID_TOKEN') {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid token format'
        });
      }
      throw error;
    }

    // Get user from database
    const user = await queryOne(
      'SELECT uid, email, display_name, email_verified, disabled FROM users WHERE uid = ?',
      [decodedToken.uid]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    if (user.disabled) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Account has been disabled'
      });
    }

    // Check user role from database
    const userRole = await queryOne(
      'SELECT role FROM user_roles WHERE uid = ?',
      [user.uid]
    );

    const isAdmin = userRole?.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'User does not have admin privileges'
      });
    }

    // Attach user info to request for use in route handlers
    req.user = {
      uid: user.uid,
      email: user.email,
      emailVerified: user.email_verified || false,
      name: user.display_name || null,
      isAdmin: true,
      role: userRole.role
    };

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to authenticate admin'
    });
  }
};

module.exports = checkAdminAuth;

