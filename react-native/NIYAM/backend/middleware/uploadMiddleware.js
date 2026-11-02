const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Resolve absolute upload directory path from environment or default
 */
const getUploadDirectory = () => {
  const configuredDir = process.env.UPLOAD_DIR || 'uploads/prescriptions';
  const resolvedDir = path.resolve(__dirname, '..', configuredDir);

  // Ensure directory exists synchronously before accepting uploads
  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }

  return resolvedDir;
};

// Allowed extensions and MIME types
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Configure Multer disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadDir = getUploadDirectory();
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique random storage filename to prevent collisions and path traversal
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueId = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `prescription-${uniqueId}${ext}`);
  },
});

// File filter inspecting extension and client-reported MIME type
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error('Only JPG, JPEG, PNG, and PDF files are allowed.'),
      false
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
});

/**
 * Express wrapper for Multer single file upload with graceful error translation
 */
const uploadSinglePrescription = (req, res, next) => {
  const uploader = upload.single('prescription');

  uploader(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds the 5 MB limit.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed.',
      });
    }

    next();
  });
};

module.exports = {
  uploadSinglePrescription,
  getUploadDirectory,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
};
