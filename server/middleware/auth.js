/**
 * JWT Authentication & Role-Based Authorization Middleware
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Verifies JWT token and attaches user to req.user
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired, please log in again' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error(`Auth middleware error: ${err.message}`);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Restricts route to specified roles
 * Usage: authorize('admin') or authorize('admin', 'user')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
}

/**
 * Optional auth - attaches user if token present, continues regardless
 */
async function optionalAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId).select('-password');
    }
  } catch {
    // Ignore auth errors for optional auth
  }
  next();
}

module.exports = { authenticate, authorize, optionalAuth };
