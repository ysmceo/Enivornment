const cloudinary = require('cloudinary').v2;

/**
 * Configures the Cloudinary SDK with credentials from environment variables.
 * Must be called before any Cloudinary operations.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Always use HTTPS URLs
});

module.exports = cloudinary;
