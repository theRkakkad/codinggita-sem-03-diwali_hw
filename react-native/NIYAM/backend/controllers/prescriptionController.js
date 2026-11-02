const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const { getUploadDirectory } = require('../middleware/uploadMiddleware');

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Resolve absolute storage path safely preventing path traversal
 */
const resolveSafeStoragePath = (storageKey) => {
  const uploadDir = getUploadDirectory();
  // Strip any directory paths to enforce flat storage reference
  const safeFilename = path.basename(storageKey);
  const resolvedPath = path.resolve(uploadDir, safeFilename);

  // Security barrier: must reside within configured uploadDir
  if (!resolvedPath.startsWith(uploadDir)) {
    throw new Error('Path traversal attempt detected.');
  }

  return resolvedPath;
};

/**
 * Verify genuine file signatures (magic bytes)
 * - JPEG/JPG: FF D8 FF
 * - PNG: 89 50 4E 47 0D 0A 1A 0A
 * - PDF: 25 50 44 46 (%PDF)
 */
const verifyFileSignature = async (filePath) => {
  try {
    const fd = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(8);
    await fd.read(buffer, 0, 8, 0);
    await fd.close();

    // JPEG / JPG
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { valid: true, mimeType: 'image/jpeg', fileType: 'image' };
    }

    // PNG
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { valid: true, mimeType: 'image/png', fileType: 'image' };
    }

    // PDF (%PDF)
    if (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return { valid: true, mimeType: 'application/pdf', fileType: 'pdf' };
    }

    return { valid: false };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

/**
 * Safely remove a file from disk if it exists
 */
const deleteFileQuietly = async (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.warn(`Failed to unlink file ${filePath}: ${err.message}`);
  }
};

/**
 * Upload Prescription Document or Image
 * POST /api/medicines/:id/prescription
 * Protected route
 */
const uploadPrescription = async (req, res) => {
  const uploadedTempPath = req.file ? req.file.path : null;

  try {
    const { id } = req.params;

    // 1. Validate medicine ID
    if (!isValidObjectId(id)) {
      await deleteFileQuietly(uploadedTempPath);
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID format.',
      });
    }

    // 2. Confirm medicine exists and belongs strictly to authenticated user
    const medicine = await Medicine.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!medicine) {
      await deleteFileQuietly(uploadedTempPath);
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.',
      });
    }

    // 3. Confirm file presence
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Prescription file is required.',
      });
    }

    // 4. Verify file signature / magic bytes to prevent masquerading files
    const signature = await verifyFileSignature(req.file.path);
    if (!signature.valid) {
      await deleteFileQuietly(uploadedTempPath);
      return res.status(400).json({
        success: false,
        message:
          'File signature validation failed. Only genuine JPG, PNG, and PDF files are accepted.',
      });
    }

    // 5. Retain old storage key for cleanup after successful update
    const oldStorageKey =
      medicine.prescription && medicine.prescription.storageKey
        ? medicine.prescription.storageKey
        : null;

    // 6. Construct new prescription metadata
    const originalName = path.basename(req.file.originalname);
    const newStorageKey = req.file.filename;

    medicine.prescription = {
      fileName: originalName,
      mimeType: signature.mimeType,
      fileType: signature.fileType,
      fileSize: req.file.size,
      storageKey: newStorageKey,
      fileUrl: `/api/medicines/${medicine._id}/prescription`,
      uploadedAt: new Date(),
    };

    // 7. Persist to MongoDB
    await medicine.save();

    // 8. Safely cleanup previous attachment on disk after successful save
    if (oldStorageKey && oldStorageKey !== newStorageKey) {
      try {
        const oldFilePath = resolveSafeStoragePath(oldStorageKey);
        await deleteFileQuietly(oldFilePath);
      } catch (cleanupErr) {
        console.warn('Could not remove replaced file:', cleanupErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Prescription uploaded successfully.',
      prescription: medicine.prescription,
      medicine,
    });
  } catch (error) {
    // If saving fails, remove newly uploaded file to avoid orphaned storage
    await deleteFileQuietly(uploadedTempPath);

    console.error('Prescription upload error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred during prescription upload.',
    });
  }
};

/**
 * View or Download Prescription Document/Image
 * GET /api/medicines/:id/prescription
 * Protected route
 */
const getPrescription = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID format.',
      });
    }

    // Enforce ownership: query matches both _id and authenticated userId
    const medicine = await Medicine.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.',
      });
    }

    if (!medicine.prescription || !medicine.prescription.storageKey) {
      return res.status(404).json({
        success: false,
        message: 'No prescription attachment found for this medicine.',
      });
    }

    // Resolve safe path to prevent directory traversal
    const filePath = resolveSafeStoragePath(medicine.prescription.storageKey);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Prescription file not found on storage.',
      });
    }

    // Set safe response headers
    res.setHeader(
      'Content-Type',
      medicine.prescription.mimeType || 'application/octet-stream'
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");

    const isDownload =
      req.query.download === 'true' || req.query.download === '1';
    const dispositionType = isDownload ? 'attachment' : 'inline';
    const safeFilename = encodeURIComponent(
      medicine.prescription.fileName || 'prescription'
    );
    res.setHeader(
      'Content-Disposition',
      `${dispositionType}; filename="${safeFilename}"`
    );

    return res.sendFile(filePath);
  } catch (error) {
    console.error('Get prescription error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while retrieving prescription.',
    });
  }
};

/**
 * Delete Prescription Attachment
 * DELETE /api/medicines/:id/prescription
 * Protected route
 */
const deletePrescription = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID format.',
      });
    }

    // Find medicine belonging strictly to authenticated user
    const medicine = await Medicine.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.',
      });
    }

    if (!medicine.prescription || !medicine.prescription.storageKey) {
      return res.status(404).json({
        success: false,
        message: 'No prescription attachment found to delete.',
      });
    }

    // Remove stored physical file if present (handles missing files gracefully)
    try {
      const filePath = resolveSafeStoragePath(medicine.prescription.storageKey);
      await deleteFileQuietly(filePath);
    } catch (fsErr) {
      console.warn('Physical file deletion warning:', fsErr.message);
    }

    // Clear prescription metadata from MongoDB
    medicine.prescription = undefined;
    await medicine.save();

    return res.status(200).json({
      success: true,
      message: 'Prescription deleted successfully.',
    });
  } catch (error) {
    console.error('Delete prescription error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while deleting prescription.',
    });
  }
};

module.exports = {
  uploadPrescription,
  getPrescription,
  deletePrescription,
  verifyFileSignature,
  resolveSafeStoragePath,
};
