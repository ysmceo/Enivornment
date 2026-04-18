const rateLimit = require('express-rate-limit');

/**
 * Generic rate limiter factory.
 * windowMs in milliseconds, max = maximum requests per window.
 */
const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message:            { success: false, message },
    standardHeaders:    true,  // Include RateLimit-* headers
    legacyHeaders:      false,
    skipSuccessfulRequests: false,
  });

// ─── Public / general routes ──────────────────────────────────────────────
const generalLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  100,
  'Too many requests. Please try again in 15 minutes.'
);

// ─── Authentication endpoints (stricter to prevent brute-force) ───────────
const authLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  10,
  'Too many authentication attempts. Please try again in 15 minutes.'
);

// ─── File upload endpoints ─────────────────────────────────────────────────
const uploadLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  20,
  'Upload limit reached. Please try again in 1 hour.'
);

// ─── Admin endpoints ───────────────────────────────────────────────────────
const adminLimiter = createLimiter(
  15 * 60 * 1000,
  200,
  'Too many admin requests. Please try again later.'
);

// ─── News feed endpoints (frequent polling + category switching) ───────────
const newsLimiter = createLimiter(
  60 * 1000, // 1 minute
  45,
  'Too many news requests. Please slow down and try again shortly.'
);

module.exports = { generalLimiter, authLimiter, uploadLimiter, adminLimiter, newsLimiter };
