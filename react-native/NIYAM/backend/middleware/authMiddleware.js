const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware (Phase 15)
 * Protects private endpoints by verifying JSON Web Tokens (JWT) in Authorization headers.
 * Standard format: "Authorization: Bearer <token>"
 */
const authMiddleware = (req, res, next) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('CRITICAL: JWT_SECRET environment variable is missing.');
    return res.status(500).json({
      success: false,
      message: 'Internal server configuration error.',
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token.trim().length === 0) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid token format.',
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    // Attach user ID extracted from token payload to request
    req.user = { id: decoded.id };
    req.userId = decoded.id;
    next();
  } catch (err) {
    // Return standard 401 without exposing internal JWT errors
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

module.exports = authMiddleware;
