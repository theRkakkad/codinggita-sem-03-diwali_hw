const mongoose = require('mongoose');

// Controller to report the health and operational status of NIYAM backend.
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

  res.status(isDbConnected ? 200 : 503).json({
    application: 'NIYAM',
    status: 'online',
    database: connectionStates[dbState] || 'unknown',
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  getHealthStatus,
};
