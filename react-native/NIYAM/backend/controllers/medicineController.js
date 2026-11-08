const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');

/**
 * Validate MongoDB ObjectId format
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Create a new medicine
 * POST /api/medicines
 * Protected route
 */
const createMedicine = async (req, res) => {
  try {
    const {
      name,
      dosage,
      type,
      instructions,
      frequency,
      reminderTimes,
      startDate,
      endDate,
      status,
      prescription,
    } = req.body;

    // 1. Initial field validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Medicine name is required.',
      });
    }

    if (!dosage || typeof dosage !== 'string' || dosage.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dosage is required.',
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Medicine type is required.',
      });
    }

    if (!frequency) {
      return res.status(400).json({
        success: false,
        message: 'Frequency is required.',
      });
    }

    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date is required.',
      });
    }

    // 2. Instantiate medicine with server-assigned userId from authenticated JWT
    // Client-supplied userId is strictly ignored to enforce data ownership
    const medicine = new Medicine({
      userId: req.user.id,
      name: name.trim(),
      dosage: dosage.trim(),
      type,
      instructions: instructions ? instructions.trim() : '',
      frequency,
      reminderTimes: Array.isArray(reminderTimes) ? reminderTimes : [],
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      status: status || 'Active',
      prescription: prescription || undefined,
    });

    // 3. Save to MongoDB (triggers Mongoose schema validators)
    await medicine.save();

    return res.status(201).json({
      success: true,
      message: 'Medicine created successfully.',
      medicine,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
        errors: messages,
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: `Invalid value for ${error.path}: ${error.value}`,
      });
    }

    console.error('Create medicine error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while creating medicine.',
    });
  }
};

/**
 * Get all medicines for authenticated user
 * GET /api/medicines
 * Protected route
 * Query params: ?status=Active&search=vitamin
 */
const getMedicines = async (req, res) => {
  try {
    // Strictly isolate query to authenticated user's records
    const query = { userId: req.user.id };

    if (req.query.archived === 'true' || req.query.status === 'Archived') {
      query.isArchived = true;
    } else {
      query.isArchived = { $ne: true };

      // Status filtering: Active, Paused, Completed
      if (req.query.status) {
        const validStatuses = ['Active', 'Paused', 'Completed'];
        if (!validStatuses.includes(req.query.status)) {
          return res.status(400).json({
            success: false,
            message: `Invalid status filter. Supported values: ${validStatuses.join(', ')}`,
          });
        }
        query.status = req.query.status;
      }
    }

    // Name search with regex escaping to prevent ReDoS
    if (req.query.search && typeof req.query.search === 'string') {
      const searchTerm = req.query.search.trim();
      if (searchTerm.length > 0) {
        const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.name = { $regex: escapedSearch, $options: 'i' };
      }
    }

    // Sort newest first
    const medicines = await Medicine.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: medicines.length,
      medicines,
    });
  } catch (error) {
    console.error('Get medicines error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while retrieving medicines.',
    });
  }
};

/**
 * Get medicine by ID
 * GET /api/medicines/:id
 * Protected route
 */
const getMedicineById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID format.',
      });
    }

    // Enforce ownership: query must match both _id and authenticated userId
    const query = {
      _id: id,
      userId: req.user.id,
    };
    if (req.query.includeArchived !== 'true') {
      query.isArchived = { $ne: true };
    }

    const medicine = await Medicine.findOne(query);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.',
      });
    }

    return res.status(200).json({
      success: true,
      medicine,
    });
  } catch (error) {
    console.error('Get medicine by ID error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while retrieving medicine.',
    });
  }
};

/**
 * Update medicine by ID
 * PUT /api/medicines/:id
 * Protected route
 */
const updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID format.',
      });
    }

    // Find medicine belonging strictly to the authenticated user
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

    // Whitelist allowed fields to prevent overwriting ownership or identity
    const updatableFields = [
      'name',
      'dosage',
      'type',
      'instructions',
      'frequency',
      'reminderTimes',
      'startDate',
      'endDate',
      'status',
      'prescription',
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'startDate' && req.body.startDate) {
          medicine.startDate = new Date(req.body.startDate);
        } else if (field === 'endDate') {
          medicine.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
        } else if (typeof req.body[field] === 'string') {
          medicine[field] = req.body[field].trim();
        } else {
          medicine[field] = req.body[field];
        }
      }
    });

    // Save triggers Mongoose schema validations in the context of the updated document
    await medicine.save();

    return res.status(200).json({
      success: true,
      message: 'Medicine updated successfully.',
      medicine,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
        errors: messages,
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: `Invalid value for ${error.path}: ${error.value}`,
      });
    }

    console.error('Update medicine error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while updating medicine.',
    });
  }
};

/**
 * Delete / Archive medicine by ID
 * DELETE /api/medicines/:id
 * Protected route
 * By default: safely archives the medicine and purges future pending doses from dashboard,
 * preserving all past intake logs (taken, skipped, missed, unconfirmed) in History.
 * If ?permanent=true: permanently deletes medicine and associated events.
 */
const deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const isPermanent = req.query.permanent === 'true';

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID format.',
      });
    }

    if (isPermanent) {
      const medicine = await Medicine.findOneAndDelete({
        _id: id,
        userId: req.user.id,
      });

      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found.',
        });
      }

      // Cleanup all associated dose events if permanently deleted
      await DoseEvent.deleteMany({
        userId: req.user.id,
        medicineId: id,
      });

      return res.status(200).json({
        success: true,
        message: 'Medicine permanently deleted.',
      });
    }

    // Default: Safe Archival (Move to History)
    // 1. Mark medicine as archived
    const medicine = await Medicine.findOneAndUpdate(
      {
        _id: id,
        userId: req.user.id,
      },
      {
        $set: {
          isArchived: true,
          status: 'Archived',
          archivedAt: new Date(),
        },
      },
      { new: true, returnDocument: 'after' }
    );

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.',
      });
    }

    // 2. Remove any pending/future dose events for this medicine so it is removed from the dashboard
    await DoseEvent.deleteMany({
      userId: req.user.id,
      medicineId: id,
      status: 'pending',
    });

    // Note: Past doses (taken, skipped, missed, unconfirmed) are preserved intact for History and Adherence

    return res.status(200).json({
      success: true,
      message: 'Medicine removed from active list and moved to History.',
      medicine,
    });
  } catch (error) {
    console.error('Delete medicine error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while deleting medicine.',
    });
  }
};

/**
 * Restore archived medicine back to active routine
 * POST /api/medicines/:id/restore
 * Protected route
 */
const restoreMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine ID format.',
      });
    }

    const medicine = await Medicine.findOneAndUpdate(
      {
        _id: id,
        userId: req.user.id,
      },
      {
        $set: {
          isArchived: false,
          status: 'Active',
          archivedAt: null,
        },
      },
      { new: true, returnDocument: 'after' }
    );

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Medicine restored to active routine.',
      medicine,
    });
  } catch (error) {
    console.error('Restore medicine error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while restoring medicine.',
    });
  }
};

module.exports = {
  createMedicine,
  getMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
  restoreMedicine,
};
