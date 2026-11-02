const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadSinglePrescription } = require('../middleware/uploadMiddleware');
const {
  createMedicine,
  getMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
} = require('../controllers/medicineController');
const {
  uploadPrescription,
  getPrescription,
  deletePrescription,
} = require('../controllers/prescriptionController');

const router = express.Router();

// Enforce authentication across all medicine endpoints
router.use(authMiddleware);

/**
 * @route   POST /api/medicines
 * @desc    Create a new medication record for authenticated user
 * @access  Private
 */
router.post('/', createMedicine);

/**
 * @route   GET /api/medicines
 * @desc    Get all medications for authenticated user (supports status filter & search)
 * @access  Private
 */
router.get('/', getMedicines);

/**
 * @route   GET /api/medicines/:id
 * @desc    Get single medication by ID (strictly isolated to owner)
 * @access  Private
 */
router.get('/:id', getMedicineById);

/**
 * @route   PUT /api/medicines/:id
 * @desc    Update an existing medication (strictly isolated to owner)
 * @access  Private
 */
router.put('/:id', updateMedicine);

/**
 * @route   DELETE /api/medicines/:id
 * @desc    Delete medication by ID (strictly isolated to owner)
 * @access  Private
 */
router.delete('/:id', deleteMedicine);

/**
 * Prescription Attachment Routes (Phase 17)
 */

/**
 * @route   POST /api/medicines/:id/prescription
 * @desc    Upload or replace prescription document (JPG, PNG, PDF <= 5MB)
 * @access  Private
 */
router.post('/:id/prescription', uploadSinglePrescription, uploadPrescription);

/**
 * @route   GET /api/medicines/:id/prescription
 * @desc    View or download prescription document (strictly isolated to owner)
 * @access  Private
 */
router.get('/:id/prescription', getPrescription);

/**
 * @route   DELETE /api/medicines/:id/prescription
 * @desc    Delete prescription document and clear metadata (strictly isolated to owner)
 * @access  Private
 */
router.delete('/:id/prescription', deletePrescription);

module.exports = router;

