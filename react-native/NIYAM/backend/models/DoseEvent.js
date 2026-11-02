const mongoose = require('mongoose');

// Supported dose statuses per NIYAM specification
const DOSE_STATUSES = [
  'pending',
  'taken',
  'skipped',
  'missed',
  'unconfirmed',
  'Pending',
  'Taken',
  'Skipped',
  'Missed',
  'Unconfirmed',
];

/**
 * DoseEvent Schema (Phase 14)
 * Represents an individual scheduled medication dose instance.
 *
 * Clinical & Business Rules:
 * 1. "Missed" strictly represents a user-confirmed missed dose.
 * 2. Never automatically mark an unanswered dose as missed.
 * 3. "Unconfirmed" indicates no user confirmation was recorded.
 * 4. "Pending" indicates a future or current active dose awaiting action.
 * 5. "Taken" can optionally record the actual intake timestamp via `takenAt`.
 * 6. `missedReason` provides voluntary clinical explanation for confirmed missed doses.
 * 7. Medicine status (Active/Paused/Completed) and dose status are completely decoupled.
 */
const doseEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: [true, 'Medicine ID is required'],
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled time is required'],
    },
    status: {
      type: String,
      required: [true, 'Dose status is required'],
      default: 'Pending',
      enum: {
        values: DOSE_STATUSES,
        message: '{VALUE} is not a valid dose status',
      },
    },
    takenAt: {
      type: Date,
    },
    missedReason: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Required indexes:
// 1. Efficient timeline lookups by user and date
doseEventSchema.index({ userId: 1, scheduledAt: 1 });

// 2. Efficient adherence lookups by specific medication and date
doseEventSchema.index({ medicineId: 1, scheduledAt: 1 });

// 3. Compound unique index: prevents duplicate dose events for the same user, medicine, and scheduled time
doseEventSchema.index(
  { userId: 1, medicineId: 1, scheduledAt: 1 },
  { unique: true }
);

const DoseEvent = mongoose.model('DoseEvent', doseEventSchema);

module.exports = DoseEvent;
