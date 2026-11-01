const mongoose = require('mongoose');

// Connect to MongoDB using the connection string from environment variables.
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // Exit with failure code so the server process stops if the database is unreachable
    process.exit(1);
  }
};

module.exports = connectDB;
