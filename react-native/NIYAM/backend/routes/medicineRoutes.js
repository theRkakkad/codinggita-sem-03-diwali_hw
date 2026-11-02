const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createMedicine,
  getMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
} = require('../controllers/medicineController');

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

module.exports = router;
