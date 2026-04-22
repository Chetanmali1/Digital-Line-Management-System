/**
 * ServiceCounter Model
 * Represents a physical or virtual service counter
 */

const mongoose = require('mongoose');

const serviceCounterSchema = new mongoose.Schema(
  {
    counterName: {
      type: String,
      required: [true, 'Counter name is required'],
      trim: true,
      maxlength: [100, 'Counter name cannot exceed 100 characters'],
    },
    serviceType: {
      type: String,
      required: [true, 'Service type is required'],
      enum: ['billing', 'registration', 'consultation', 'support', 'general', 'express', 'premium'],
      default: 'general',
    },
    counterNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avgServiceTime: {
      type: Number, // minutes
      required: true,
      min: [1, 'Avg service time must be at least 1 minute'],
      max: [120, 'Avg service time cannot exceed 120 minutes'],
      default: 10,
    },
    maxCapacity: {
      type: Number,
      default: 50,
      min: [1, 'Max capacity must be at least 1'],
    },
    currentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    staffName: {
      type: String,
      trim: true,
    },
    // Tracks service times for dynamic avg calculation
    serviceTimeHistory: [
      {
        duration: Number, // actual minutes taken
        timestamp: { type: Date, default: Date.now },
      },
    ],
    // Cache: recalculated periodically
    dynamicAvgServiceTime: {
      type: Number,
      default: null,
    },
    totalServed: {
      type: Number,
      default: 0,
    },
    description: { type: String, maxlength: 500 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ─── Virtual: Current load percentage ────────────────────────────────────
serviceCounterSchema.virtual('loadPercentage').get(function () {
  return Math.round((this.currentCount / this.maxCapacity) * 100);
});

// ─── Virtual: Effective avg service time ─────────────────────────────────
serviceCounterSchema.virtual('effectiveAvgTime').get(function () {
  return this.dynamicAvgServiceTime || this.avgServiceTime;
});

// ─── Indexes ──────────────────────────────────────────────────────────────
serviceCounterSchema.index({ isActive: 1 });
serviceCounterSchema.index({ serviceType: 1 });
serviceCounterSchema.index({ counterNumber: 1 });

/**
 * Recalculate dynamic average service time from recent history (last 20 records)
 */
serviceCounterSchema.methods.recalcAvgServiceTime = function () {
  const recent = this.serviceTimeHistory.slice(-20);
  if (!recent.length) return;
  const avg = recent.reduce((sum, r) => sum + r.duration, 0) / recent.length;
  this.dynamicAvgServiceTime = Math.round(avg * 10) / 10;
};

module.exports = mongoose.model('ServiceCounter', serviceCounterSchema);
