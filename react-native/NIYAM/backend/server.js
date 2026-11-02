const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const medicineRoutes = require('./routes/medicineRoutes');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing for mobile client communication
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Mount API routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);

// Root verification route
app.get('/', (req, res) => {
  res.json({
    application: 'NIYAM',
    message: 'NIYAM API Server is running.',
    healthCheck: '/api/health',
  });
});

// Start the server only after successfully connecting to MongoDB
const startServer = async () => {
  try {
    // 1. Establish database connection before accepting traffic
    await connectDB();

    // 2. Start Express HTTP listener
    const server = app.listen(PORT, () => {
      console.log(`NIYAM Backend server running on port ${PORT}`);
      console.log(`Health endpoint: http://localhost:${PORT}/api/health`);
    });

    return server;
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Auto-start when executed directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
