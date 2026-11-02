const mongoose = require('mongoose');

/**
 * Mask sensitive database credentials in URIs and error strings for safe logging.
 */
function maskCredentials(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/\/\/[^:]+:[^@]+@/g, '//***:***@');
}

/**
 * Connect to MongoDB using Mongoose.
 * Supports both MONGODB_URI and legacy MONGO_URI environment variables.
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri || !mongoUri.trim()) {
    throw new Error(
      'MONGODB_URI is not defined in environment variables. Please configure MONGODB_URI in backend/.env'
    );
  }

  // Register post-startup connection lifecycle listeners
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB connection lost. Awaiting automatic reconnection...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected successfully.');
  });

  mongoose.connection.on('error', (err) => {
    const safeError = err && err.message ? maskCredentials(err.message) : 'Unknown database error';
    console.error(`MongoDB runtime error: ${safeError}`);
  });

  try {
    const conn = await mongoose.connect(mongoUri.trim(), {
      serverSelectionTimeoutMS: 5000, // Fail fast (5s) if MongoDB host is unreachable
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    const safeError = error && error.message ? maskCredentials(error.message) : 'Connection failed';
    console.error(`MongoDB Connection Error: ${safeError}`);
    throw error;
  }
};

module.exports = connectDB;
