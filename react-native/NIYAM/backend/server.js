const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const healthRoutes = require('./routes/healthRoutes');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing so our mobile app can communicate with the API
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Mount API routes
app.use('/api/health', healthRoutes);

// Root route for quick verification in a web browser
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
    // Connect to database
    await connectDB();

    // Start Express listening for requests
    app.listen(PORT, () => {
      console.log(`NIYAM Backend server running on port ${PORT}`);
      console.log(`Health endpoint: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
