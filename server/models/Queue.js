/**
 * Queue Model
 * Represents a single queue entry / token
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const queueSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    counterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCounter',
      required: true,
    },
    tokenNumber: {
      type: String,
      unique: true,
    },
    qrCode: {
      type: String, // base64 data URL
    },
    position: {
      type: Number,
      min: 1,
    },
    status: {
      type: String,
      enum: ['waiting', 'serving', 'served', 'cancelled', 'no-show'],
      default: 'waiting',
    },
    estimatedWaitTime: {
      type: Number, // minutes
      default: 0,
    },
    actualWaitTime: {
      type: Number, // minutes - filled when served
    },
    actualServiceTime: {
      type: Number, // minutes - time spent at counter
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    calledAt: {
      type: Date, // When "serving" status was set
    },
    servedAt: {
      type: Date, // When "served" status was set
    },
    cancelledAt: {
      type: Date,
    },
    notes: { type: String, maxlength: 500 },
    notificationSent: { type: Boolean, default: false },
    // For AI prediction reference
    aiPredictedWait: { type: Number },
    predictionAccuracy: { type: Number }, // % accuracy after serving
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ─── Virtual: Time in queue so far ───────────────────────────────────────
queueSchema.virtual('waitedMinutes').get(function () {
  if (this.status === 'waiting' || this.status === 'serving') {
    return Math.round((Date.now() - this.joinedAt) / 60000);
  }
  return this.actualWaitTime || 0;
});

// ─── Indexes ──────────────────────────────────────────────────────────────
queueSchema.index({ status: 1 });
queueSchema.index({ counterId: 1, status: 1 });
queueSchema.index({ userId: 1, status: 1 });
queueSchema.index({ joinedAt: -1 });
queueSchema.index({ tokenNumber: 1 }, { unique: true });

// ─── Pre-save: Generate token number ─────────────────────────────────────
queueSchema.pre('save', async function (next) {
  if (this.isNew && !this.tokenNumber) {
    const date = new Date();
    const dateStr = `${date.getFullYear().toString().slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const shortId = uuidv4().replace(/-/g, '').slice(0, 4).toUpperCase();
    this.tokenNumber = `Q${dateStr}-${shortId}`;
  }
  next();
});

// ─── Post-save: Compute actual wait time when served ─────────────────────
queueSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'serving') this.calledAt = new Date();
    if (this.status === 'served' && this.joinedAt) {
      this.actualWaitTime = Math.round((this.calledAt - this.joinedAt) / 60000);
      if (this.calledAt) {
        this.actualServiceTime = Math.round((Date.now() - this.calledAt) / 60000);
      }
      // Calculate prediction accuracy
      if (this.aiPredictedWait && this.actualWaitTime) {
        const diff = Math.abs(this.aiPredictedWait - this.actualWaitTime);
        this.predictionAccuracy = Math.max(0, 100 - (diff / this.actualWaitTime) * 100);
      }
    }
    if (this.status === 'cancelled') this.cancelledAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Queue', queueSchema);
