const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect
 * Verifies the JWT from the Authorization header or cookie.
 * Attaches the full user document (minus password) to req.user.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Try Bearer token from Authorization header (preferred for API clients)
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2. Fall back to httpOnly cookie set by /auth/login
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
    }

    // Verify token — throws on expiry or tamper
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user to catch deactivated accounts
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated.' });
    }

    if (user.isLocked()) {
      return res.status(403).json({ success: false, message: 'Account is temporarily locked.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

/**
 * requireAdmin
 * Must be used AFTER protect.
 * Blocks non-admin users from admin-only routes.
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
  }
  next();
};

const requireAdmin = authorize('admin');

/**
 * requireVerified
 * Ensures the user has a verified government ID before accessing protected resources
 * (e.g., submitting a report).
 */
const requireVerified = (req, res, next) => {
  if (req.user?.idVerificationStatus !== 'verified') {
    return res.status(403).json({
      success: false,
      message: 'Identity verification required. Please upload a valid government ID.',
    });
  }
  next();
};

module.exports = { protect, authorize, requireAdmin, requireVerified };
