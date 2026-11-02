const mongoose = require('mongoose');

/**
 * Controller to report the health and operational status of NIYAM backend.
 * Checks the real-time Mongoose connection state and returns an accurate HTTP status.
 */
const getHealthStatus = (req, res) => {
  // Map mongoose connection readyState numbers to clear status strings
  const connectionStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbState = mongoose.connection.readyState;
  const isDbConnected = dbState === 1;
  const databaseStatus = connectionStates[dbState] || 'unknown';

  const statusCode = isDbConnected ? 200 : 503;

  return res.status(statusCode).json({
    success: isDbConnected,
    message: isDbConnected
      ? 'NIYAM API is running'
      : 'NIYAM API is running with degraded service: database not connected',
    database: databaseStatus,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  getHealthStatus,
};
