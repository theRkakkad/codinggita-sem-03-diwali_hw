const mongoose = require('mongoose');

// Supported constants per NIYAM specification
const MEDICINE_TYPES = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Drops',
  'Injection',
  'Other',
];

const FREQUENCIES = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'As needed',
];

const MEDICINE_STATUSES = ['Active', 'Paused', 'Completed', 'Archived'];

/**
 * Medicine Schema (Phase 14)
 * Represents a prescribed medication or supplement linked to a user.
 * Strictly decouples medicine routine configuration from individual daily dose intake logs.
 */
const medicineSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
      minlength: [1, 'Medicine name cannot be empty'],
    },
    dosage: {
      type: String,
      required: [true, 'Dosage is required'],
      trim: true,
      minlength: [1, 'Dosage cannot be empty'],
    },
    type: {
      type: String,
      required: [true, 'Medicine type is required'],
      enum: {
        values: MEDICINE_TYPES,
        message: '{VALUE} is not a supported medicine type',
      },
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required'],
      enum: {
        values: FREQUENCIES,
        message: '{VALUE} is not a supported frequency',
      },
    },
    reminderTimes: {
      type: [String],
      default: [],
      validate: {
        validator: function (times) {
          if (!this.frequency) return true;

          // As-needed medicines do not require or allow scheduled reminder times
          if (this.frequency === 'As needed') {
            return !times || times.length === 0;
          }

          const expectedCount =
            this.frequency === 'Once daily'
              ? 1
              : this.frequency === 'Twice daily'
              ? 2
              : this.frequency === 'Three times daily'
              ? 3
              : -1;

          if (expectedCount === -1) return true; // Handled by frequency enum validation

          return (
            Array.isArray(times) &&
            times.length === expectedCount &&
            times.every((t) => typeof t === 'string' && t.trim().length > 0)
          );
        },
        message: function () {
          if (this.frequency === 'As needed') {
            return 'As-needed medicines do not require scheduled reminder times';
          }
          const expectedCount =
            this.frequency === 'Once daily'
              ? 1
              : this.frequency === 'Twice daily'
              ? 2
              : this.frequency === 'Three times daily'
              ? 3
              : 0;
          return `Frequency "${this.frequency}" requires exactly ${expectedCount} reminder time(s)`;
        },
      },
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (val) {
          if (!val || !this.startDate) return true;
          return new Date(val).getTime() >= new Date(this.startDate).getTime();
        },
        message: 'End date cannot be earlier than start date',
      },
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      default: 'Active',
      enum: {
        values: MEDICINE_STATUSES,
        message: '{VALUE} is not a valid medicine status',
      },
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    // Optional prescription attachment metadata (never store binary file data in document)
    prescription: {
      fileName: { type: String, trim: true },
      mimeType: { type: String, trim: true },
      fileType: { type: String, trim: true },
      fileSize: { type: Number },
      fileUrl: { type: String, trim: true },
      storageKey: { type: String, trim: true },
      uploadedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly fetch user medicines filtered by active/paused/completed status
medicineSchema.index({ userId: 1, status: 1 });

const Medicine = mongoose.model('Medicine', medicineSchema);

module.exports = Medicine;
