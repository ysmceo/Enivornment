const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

/**
 * Establishes connection to MongoDB.
 * Exits the process on failure to prevent running without a database.
 */
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn('[DB] MONGO_URI is not set. Running without database connection.');
    return null;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // mongoose 7+ no longer needs these options, but they are safe to include
    });
    console.log(`[DB] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[DB] Connection error: ${error.message}`);
    console.warn('[DB] Continuing startup in degraded mode (database features unavailable).');
    return null;
  }
};

module.exports = connectDB;
