const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createDoseEvent,
  getDoseEvents,
  getDoseEventById,
  markDoseAsTaken,
  markDoseAsSkipped,
  confirmDoseAsMissed,
  markDoseAsUnconfirmed,
  deleteDoseEvent,
} = require('../controllers/doseEventController');

const router = express.Router();

// Enforce JWT authentication on all dose event routes
router.use(authMiddleware);

/**
 * @route   POST /api/dose-events
 * @desc    Create a new scheduled dose event
 * @access  Private
 */
router.post('/', createDoseEvent);

/**
 * @route   GET /api/dose-events
 * @desc    Get all dose events with optional filters (date, range, status, medicineId)
 * @access  Private
 */
router.get('/', getDoseEvents);

/**
 * @route   GET /api/dose-events/:id
 * @desc    Get single dose event by ID
 * @access  Private
 */
router.get('/:id', getDoseEventById);

/**
 * @route   PATCH /api/dose-events/:id/taken
 * @desc    Mark dose as taken (records intake timestamp)
 * @access  Private
 */
router.patch('/:id/taken', markDoseAsTaken);

/**
 * @route   PATCH /api/dose-events/:id/skipped
 * @desc    Mark dose as skipped (preserves scheduled time, records optional reason)
 * @access  Private
 */
router.patch('/:id/skipped', markDoseAsSkipped);

/**
 * @route   PATCH /api/dose-events/:id/missed
 * @desc    Explicitly confirm dose as missed (records optional missedReason)
 * @access  Private
 */
router.patch('/:id/missed', confirmDoseAsMissed);

/**
 * @route   PATCH /api/dose-events/:id/unconfirmed
 * @desc    Mark dose as unconfirmed
 * @access  Private
 */
router.patch('/:id/unconfirmed', markDoseAsUnconfirmed);

/**
 * @route   DELETE /api/dose-events/:id
 * @desc    Delete dose event
 * @access  Private
 */
router.delete('/:id', deleteDoseEvent);

module.exports = router;
