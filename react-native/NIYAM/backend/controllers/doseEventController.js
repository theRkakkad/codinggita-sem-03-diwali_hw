const mongoose = require('mongoose');
const DoseEvent = require('../models/DoseEvent');
const Medicine = require('../models/Medicine');

/**
 * Validate MongoDB ObjectId format
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Validate business status transitions
 * Rules:
 * 1. An already taken dose cannot be altered to missed, skipped, or unconfirmed.
 * 2. A confirmed missed dose cannot be altered arbitrarily.
 * 3. An intentionally skipped dose cannot be reverted to unconfirmed or missed.
 * 4. An unconfirmed dose cannot revert back to pending.
 * 5. Re-applying the exact same status returns a duplicate transition error.
 */
const validateStatusTransition = (currentStatus, targetStatus) => {
  const current = (currentStatus || '').toLowerCase();
  const target = (targetStatus || '').toLowerCase();

  if (current === target) {
    return {
      valid: false,
      message: `Dose is already marked as ${target}.`,
    };
  }

  if (current === 'taken') {
    return {
      valid: false,
      message: `Invalid status transition: a dose already marked as taken cannot be changed to ${target}.`,
    };
  }

  if (current === 'missed') {
    return {
      valid: false,
      message: `Invalid status transition: a confirmed missed dose cannot be changed to ${target}.`,
    };
  }

  if (current === 'skipped' && target !== 'taken') {
    return {
      valid: false,
      message: `Invalid status transition: an intentionally skipped dose cannot be changed to ${target}.`,
    };
  }

  if (current === 'unconfirmed' && target === 'pending') {
    return {
      valid: false,
      message: 'Cannot revert an unconfirmed dose back to pending.',
    };
  }

  return { valid: true };
};

/**
 * Create a single scheduled dose event
 * POST /api/dose-events
 * Protected route
 */
const createDoseEvent = async (req, res) => {
  try {
    const { medicineId, scheduledAt, notes } = req.body;

    // 1. Validate medicineId format
    if (!medicineId || !isValidObjectId(medicineId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid medicine ID is required.',
      });
    }

    // 2. Validate scheduledAt
    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date and time (scheduledAt) is required.',
      });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheduledAt timestamp format.',
      });
    }

    // 3. Confirm medicine exists and belongs strictly to authenticated user
    const medicine = await Medicine.findOne({
      _id: medicineId,
      userId: req.user.id,
    });

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.',
      });
    }

    // 4. Confirm medicine is active
    if (medicine.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: `Cannot schedule dose events for an inactive medicine. Current status: ${medicine.status}.`,
      });
    }

    // 5. Prevent duplicate events for the same medicine and scheduled time
    const existingEvent = await DoseEvent.findOne({
      userId: req.user.id,
      medicineId,
      scheduledAt: scheduledDate,
    });

    if (existingEvent) {
      return res.status(409).json({
        success: false,
        message: 'A dose event already exists for this medicine at the specified scheduled time.',
      });
    }

    // 6. Create dose event with initial status 'pending'
    const doseEvent = new DoseEvent({
      userId: req.user.id,
      medicineId,
      scheduledAt: scheduledDate,
      status: 'pending',
      notes: notes ? notes.trim() : null,
    });

    await doseEvent.save();

    return res.status(201).json({
      success: true,
      message: 'Dose event created successfully.',
      doseEvent,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A dose event already exists for this medicine at the specified scheduled time.',
      });
    }

    console.error('Create dose event error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while creating dose event.',
    });
  }
};

/**
 * Get all dose events for authenticated user with optional filtering
 * GET /api/dose-events
 * Protected route
 * Query options: ?date=2026-11-02, ?startDate=...&endDate=..., ?status=pending, ?medicineId=...
 */
const getDoseEvents = async (req, res) => {
  try {
    // Isolate queries to authenticated user only
    const query = { userId: req.user.id };

    // 1. Filter by specific medicine
    if (req.query.medicineId) {
      if (!isValidObjectId(req.query.medicineId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid medicineId filter format.',
        });
      }
      query.medicineId = req.query.medicineId;
    }

    // 2. Filter by status (case-insensitive)
    if (req.query.status) {
      query.status = { $regex: new RegExp(`^${req.query.status.trim()}$`, 'i') };
    }

    // 3. Filter by date or date range
    if (req.query.date) {
      const parsedDate = new Date(req.query.date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date filter format. Use YYYY-MM-DD.',
        });
      }
      const startOfDay = new Date(req.query.date);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(req.query.date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      query.scheduledAt = { $gte: startOfDay, $lte: endOfDay };
    } else if (req.query.startDate || req.query.endDate) {
      const dateRange = {};
      if (req.query.startDate) {
        const start = new Date(req.query.startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid startDate format.',
          });
        }
        dateRange.$gte = start;
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid endDate format.',
          });
        }
        dateRange.$lte = end;
      }
      query.scheduledAt = dateRange;
    }

    // Fetch and populate basic medicine details
    const doseEvents = await DoseEvent.find(query)
      .populate('medicineId', 'name dosage type instructions frequency')
      .sort({ scheduledAt: 1 });

    return res.status(200).json({
      success: true,
      count: doseEvents.length,
      doseEvents,
    });
  } catch (error) {
    console.error('Get dose events error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while retrieving dose events.',
    });
  }
};

/**
 * Get single dose event by ID
 * GET /api/dose-events/:id
 * Protected route
 */
const getDoseEventById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dose event ID format.',
      });
    }

    const doseEvent = await DoseEvent.findOne({
      _id: id,
      userId: req.user.id,
    }).populate('medicineId', 'name dosage type instructions frequency');

    if (!doseEvent) {
      return res.status(404).json({
        success: false,
        message: 'Dose event not found.',
      });
    }

    return res.status(200).json({
      success: true,
      doseEvent,
    });
  } catch (error) {
    console.error('Get dose event by ID error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while retrieving dose event.',
    });
  }
};

/**
 * Mark dose as taken
 * PATCH /api/dose-events/:id/taken
 * Protected route
 */
const markDoseAsTaken = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dose event ID format.',
      });
    }

    const doseEvent = await DoseEvent.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!doseEvent) {
      return res.status(404).json({
        success: false,
        message: 'Dose event not found.',
      });
    }

    // Validate transition
    const transition = validateStatusTransition(doseEvent.status, 'taken');
    if (!transition.valid) {
      return res.status(400).json({
        success: false,
        message: transition.message,
      });
    }

    // Update status and record intake timestamp
    doseEvent.status = 'taken';
    doseEvent.takenAt = new Date();
    if (req.body && req.body.notes) {
      doseEvent.notes = req.body.notes.trim();
    }

    await doseEvent.save();
    await doseEvent.populate('medicineId', 'name dosage type instructions frequency');

    return res.status(200).json({
      success: true,
      message: 'Dose marked as taken.',
      doseEvent,
    });
  } catch (error) {
    console.error('Mark dose as taken error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while updating dose event.',
    });
  }
};

/**
 * Mark dose as skipped
 * PATCH /api/dose-events/:id/skipped
 * Protected route
 */
const markDoseAsSkipped = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dose event ID format.',
      });
    }

    const doseEvent = await DoseEvent.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!doseEvent) {
      return res.status(404).json({
        success: false,
        message: 'Dose event not found.',
      });
    }

    const transition = validateStatusTransition(doseEvent.status, 'skipped');
    if (!transition.valid) {
      return res.status(400).json({
        success: false,
        message: transition.message,
      });
    }

    doseEvent.status = 'skipped';
    if (req.body && (req.body.reason || req.body.notes)) {
      doseEvent.notes = (req.body.reason || req.body.notes).trim();
    }

    await doseEvent.save();
    await doseEvent.populate('medicineId', 'name dosage type instructions frequency');

    return res.status(200).json({
      success: true,
      message: 'Dose marked as skipped.',
      doseEvent,
    });
  } catch (error) {
    console.error('Mark dose as skipped error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while updating dose event.',
    });
  }
};

/**
 * Confirm dose as missed
 * PATCH /api/dose-events/:id/missed
 * Protected route
 * Requires explicit user confirmation
 */
const confirmDoseAsMissed = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dose event ID format.',
      });
    }

    const doseEvent = await DoseEvent.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!doseEvent) {
      return res.status(404).json({
        success: false,
        message: 'Dose event not found.',
      });
    }

    const transition = validateStatusTransition(doseEvent.status, 'missed');
    if (!transition.valid) {
      return res.status(400).json({
        success: false,
        message: transition.message,
      });
    }

    doseEvent.status = 'missed';
    if (req.body && (req.body.missedReason || req.body.reason)) {
      doseEvent.missedReason = (req.body.missedReason || req.body.reason).trim();
    }

    await doseEvent.save();
    await doseEvent.populate('medicineId', 'name dosage type instructions frequency');

    return res.status(200).json({
      success: true,
      message: 'Dose confirmed as missed.',
      doseEvent,
    });
  } catch (error) {
    console.error('Confirm dose as missed error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while updating dose event.',
    });
  }
};

/**
 * Mark dose as unconfirmed
 * PATCH /api/dose-events/:id/unconfirmed
 * Protected route
 */
const markDoseAsUnconfirmed = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dose event ID format.',
      });
    }

    const doseEvent = await DoseEvent.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!doseEvent) {
      return res.status(404).json({
        success: false,
        message: 'Dose event not found.',
      });
    }

    const transition = validateStatusTransition(doseEvent.status, 'unconfirmed');
    if (!transition.valid) {
      return res.status(400).json({
        success: false,
        message: transition.message,
      });
    }

    doseEvent.status = 'unconfirmed';
    if (req.body && req.body.notes) {
      doseEvent.notes = req.body.notes.trim();
    }

    await doseEvent.save();
    await doseEvent.populate('medicineId', 'name dosage type instructions frequency');

    return res.status(200).json({
      success: true,
      message: 'Dose marked as unconfirmed.',
      doseEvent,
    });
  } catch (error) {
    console.error('Mark dose as unconfirmed error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while updating dose event.',
    });
  }
};

/**
 * Delete dose event
 * DELETE /api/dose-events/:id
 * Protected route
 */
const deleteDoseEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dose event ID format.',
      });
    }

    const doseEvent = await DoseEvent.findOneAndDelete({
      _id: id,
      userId: req.user.id,
    });

    if (!doseEvent) {
      return res.status(404).json({
        success: false,
        message: 'Dose event not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Dose event deleted successfully.',
    });
  } catch (error) {
    console.error('Delete dose event error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while deleting dose event.',
    });
  }
};

/**
 * Rollover past-day pending doses to unconfirmed
 * POST /api/dose-events/rollover
 * Protected route
 * Transitions past-due pending doses to unconfirmed status safely and idempotently.
 * Never touches taken, skipped, or missed doses.
 * Preserves original scheduledAt timestamps and enforces user ownership.
 */
const rolloverPastPendingDoses = async (req, res) => {
  try {
    let cutoff = new Date();
    if (req.body && req.body.beforeDate) {
      const parsed = new Date(req.body.beforeDate);
      if (!isNaN(parsed.getTime())) {
        cutoff = parsed;
      }
    } else {
      cutoff.setUTCHours(0, 0, 0, 0);
    }

    const result = await DoseEvent.updateMany(
      {
        userId: req.user.id,
        status: 'pending',
        scheduledAt: { $lt: cutoff },
      },
      {
        $set: { status: 'unconfirmed' },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Past pending doses transitioned to unconfirmed.',
      modifiedCount: result.modifiedCount !== undefined ? result.modifiedCount : result.nModified || 0,
      cutoff: cutoff.toISOString(),
    });
  } catch (error) {
    console.error('Rollover past pending doses error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred during day rollover.',
    });
  }
};

/**
 * Parse time string (e.g. '08:00 AM', '08:00 PM', '14:30') into hour and minute
 */
const parseTimeString = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().toUpperCase().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3];
  if (minute < 0 || minute > 59) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (period === 'AM' && hour === 12) hour = 0;
    else if (period === 'PM' && hour !== 12) hour += 12;
  } else {
    if (hour < 0 || hour > 23) return null;
  }
  return { hour, minute };
};

/**
 * Synchronize/ensure scheduled dose events for a given date from active medicines
 * POST /api/dose-events/sync
 * Protected route
 * Checks active medicines for the user and generates any missing pending dose events.
 * Idempotent, never duplicates, never overwrites taken/skipped/missed doses.
 */
const syncDailyDoseEvents = async (req, res) => {
  try {
    let dateStr = req.body && req.body.date ? req.body.date : null;
    if (!dateStr) {
      const now = new Date();
      dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.',
      });
    }

    // Set day boundaries in UTC
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    // 1. Fetch user's Active medicines valid for this date
    // Exclude inactive, paused, completed, or expired medicines
    const activeMedicines = await Medicine.find({
      userId: req.user.id,
      status: 'Active',
      startDate: { $lte: endOfDay },
      $or: [
        { endDate: null },
        { endDate: { $exists: false } },
        { endDate: { $gte: startOfDay } },
      ],
    });

    let createdCount = 0;

    // 2. For each active medicine with reminder times, ensure a dose event exists
    for (const med of activeMedicines) {
      if (med.frequency === 'As needed' || !Array.isArray(med.reminderTimes) || med.reminderTimes.length === 0) {
        continue;
      }

      for (const timeStr of med.reminderTimes) {
        const parsed = parseTimeString(timeStr);
        if (!parsed) continue;

        const scheduledTime = new Date(Date.UTC(year, month - 1, day, parsed.hour, parsed.minute, 0, 0));

        // Check if event already exists to prevent duplicate insertion
        const existing = await DoseEvent.findOne({
          userId: req.user.id,
          medicineId: med._id,
          scheduledAt: scheduledTime,
        });

        if (!existing) {
          try {
            await DoseEvent.create({
              userId: req.user.id,
              medicineId: med._id,
              scheduledAt: scheduledTime,
              status: 'pending',
            });
            createdCount++;
          } catch (dupErr) {
            // In case of race condition / duplicate compound key, ignore safely
          }
        }
      }
    }

    // 3. Return all dose events for this date, sorted by scheduledAt
    const doseEvents = await DoseEvent.find({
      userId: req.user.id,
      scheduledAt: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('medicineId', 'name dosage type instructions frequency')
      .sort({ scheduledAt: 1 });

    return res.status(200).json({
      success: true,
      date: dateStr,
      createdCount,
      count: doseEvents.length,
      doseEvents,
    });
  } catch (error) {
    console.error('Sync daily dose events error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to synchronize daily dose events.',
    });
  }
};

module.exports = {
  createDoseEvent,
  getDoseEvents,
  getDoseEventById,
  markDoseAsTaken,
  markDoseAsSkipped,
  confirmDoseAsMissed,
  markDoseAsUnconfirmed,
  rolloverPastPendingDoses,
  syncDailyDoseEvents,
  deleteDoseEvent,
  validateStatusTransition,
};
