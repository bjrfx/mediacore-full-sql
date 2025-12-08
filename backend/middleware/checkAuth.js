/**
 * User Authentication Middleware
 * 
 * Verifies JWT tokens to authenticate any logged-in user.
 * Unlike checkAdminAuth, this does NOT require admin privileges.
 * Use this for routes that any authenticated user can access.
 */

const { verifyToken, extractTokenFromHeader } = require('../auth/jwt');
const { queryOne } = require('../config/db');

/**
 * Middleware to verify JWT Token (no admin check)
 * 
 * Expects the Authorization header in format: "Bearer <token>"
 * Verifies the token and checks user status in database.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const checkAuth = async (req, res, next) => {
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

    // Get user from database to check if still exists and not disabled
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

    // Get user's subscription tier
    const subscription = await queryOne(
      'SELECT subscription_tier FROM user_subscriptions WHERE uid = ?',
      [user.uid]
    );

    // Attach user info to request for use in route handlers
    req.user = {
      uid: user.uid,
      email: user.email,
      emailVerified: user.email_verified || false,
      name: user.display_name || null,
      subscriptionTier: subscription?.subscription_tier || 'free'
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to authenticate user'
    });
  }
};

module.exports = checkAuth;
