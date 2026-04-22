/**
 * QueueHistory Model
 * Daily aggregated statistics for analytics and AI training
 */

const mongoose = require('mongoose');

const queueHistorySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true, // One record per day
    },
    // Aggregated daily stats
    totalUsers: { type: Number, default: 0 },
    totalServed: { type: Number, default: 0 },
    totalCancelled: { type: Number, default: 0 },
    avgWaitTime: { type: Number, default: 0 }, // minutes
    maxWaitTime: { type: Number, default: 0 },
    minWaitTime: { type: Number, default: 0 },

    // Peak hour detection: array of { hour: 0-23, count: N }
    hourlyBreakdown: [
      {
        hour: { type: Number, min: 0, max: 23 },
        count: { type: Number, default: 0 },
        avgWait: { type: Number, default: 0 },
      },
    ],
    peakHour: { type: Number, min: 0, max: 23 }, // Hour with most traffic
    peakCount: { type: Number }, // Users in peak hour

    // Per-counter stats
    counterStats: [
      {
        counterId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCounter' },
        counterName: String,
        served: { type: Number, default: 0 },
        avgServiceTime: { type: Number, default: 0 },
      },
    ],

    // AI analysis snapshot
    aiInsights: {
      predictedPeakHours: [Number],
      anomalyDetected: { type: Boolean, default: false },
      anomalyDescription: String,
      recommendedCounters: Number,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────
queueHistorySchema.index({ date: -1 });

/**
 * Static: Get or create today's history record
 */
queueHistorySchema.statics.getTodayRecord = async function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return this.findOneAndUpdate(
    { date: today },
    { $setOnInsert: { date: today } },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('QueueHistory', queueHistorySchema);
