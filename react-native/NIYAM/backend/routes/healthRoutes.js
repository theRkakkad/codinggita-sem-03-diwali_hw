const express = require('express');
const router = express.Router();
const { getHealthStatus } = require('../controllers/healthController');

// Route: GET /api/health
// Description: Check server health and database connection status
router.get('/', getHealthStatus);

module.exports = router;
