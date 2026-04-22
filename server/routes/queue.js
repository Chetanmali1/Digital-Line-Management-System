/**
 * Queue Management Routes
 * Join queue, view position, cancel, etc.
 */

const express = require('express');
const QRCode = require('qrcode');
const Queue = require('../models/Queue');
const ServiceCounter = require('../models/ServiceCounter');
const QueueHistory = require('../models/QueueHistory');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateWaitTime } = require('../utils/aiEngine');
const { getCache, setCache, delCache } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/queue/join:
 *   post:
 *     summary: Join a service queue
 *     tags: [Queue]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [counterId]
 *             properties:
 *               counterId: { type: string }
 *     responses:
 *       201:
 *         description: Successfully joined queue with token and QR code
 */
router.post('/join', authenticate, async (req, res) => {
  try {
    const { counterId } = req.body;
    if (!counterId) return res.status(400).json({ error: 'Counter ID is required' });

    const counter = await ServiceCounter.findById(counterId);
    if (!counter) return res.status(404).json({ error: 'Counter not found' });
    if (!counter.isActive) return res.status(400).json({ error: 'This counter is currently inactive' });

    // Check if user is already in queue for this counter
    const existingEntry = await Queue.findOne({
      userId: req.user._id,
      counterId,
      status: { $in: ['waiting', 'serving'] },
    });
    if (existingEntry) {
      return res.status(409).json({
        error: 'You are already in this queue',
        token: existingEntry.tokenNumber,
        position: existingEntry.position,
      });
    }

    // Check capacity
    const currentCount = await Queue.countDocuments({ counterId, status: { $in: ['waiting', 'serving'] } });
    if (currentCount >= counter.maxCapacity) {
      return res.status(400).json({
        error: `Queue is at full capacity (${counter.maxCapacity}). Please try later.`,
      });
    }

    // Calculate position and estimated wait
    const position = currentCount + 1;
    const peopleAhead = currentCount;
    const { estimatedWait, aiPredictedWait } = await calculateWaitTime(counter, peopleAhead);

    // Create queue entry
    const queueEntry = new Queue({
      userId: req.user._id,
      counterId,
      position,
      estimatedWaitTime: estimatedWait,
      aiPredictedWait,
    });
    await queueEntry.save();

    // Generate QR code with token info
    const qrData = JSON.stringify({
      token: queueEntry.tokenNumber,
      counter: counter.counterName,
      position,
      joinedAt: queueEntry.joinedAt,
    });
    const qrCode = await QRCode.toDataURL(qrData, { width: 200, margin: 2 });
    queueEntry.qrCode = qrCode;
    await queueEntry.save();

    // Update today's history count
    await QueueHistory.findOneAndUpdate(
      { date: new Date().setHours(0, 0, 0, 0) },
      { $inc: { totalUsers: 1 } },
      { upsert: true }
    );

    // Invalidate counter cache
    await delCache('counters:all');

    // Emit real-time update
    req.io?.emit('queue:joined', {
      counterId,
      counterName: counter.counterName,
      position,
      totalInQueue: position,
    });
    req.io?.emit(`counter:${counterId}:update`, { totalInQueue: position });

    logger.info(`User ${req.user.email} joined queue for ${counter.counterName}, token: ${queueEntry.tokenNumber}`);

    res.status(201).json({
      message: 'Successfully joined the queue',
      token: queueEntry.tokenNumber,
      qrCode,
      position,
      estimatedWaitMinutes: estimatedWait,
      counter: { name: counter.counterName, serviceType: counter.serviceType },
      joinedAt: queueEntry.joinedAt,
    });
  } catch (err) {
    logger.error(`Join queue error: ${err.message}`);
    res.status(500).json({ error: 'Failed to join queue' });
  }
});

/**
 * @swagger
 * /api/queue/my-status:
 *   get:
 *     summary: Get current user's queue status
 *     tags: [Queue]
 */
router.get('/my-status', authenticate, async (req, res) => {
  try {
    const entries = await Queue.find({
      userId: req.user._id,
      status: { $in: ['waiting', 'serving'] },
    }).populate('counterId', 'counterName serviceType avgServiceTime');

    if (!entries.length) {
      return res.json({ inQueue: false, entries: [] });
    }

    // Recalculate live positions and wait times
    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const ahead = await Queue.countDocuments({
          counterId: entry.counterId._id,
          status: 'waiting',
          joinedAt: { $lt: entry.joinedAt },
        });

        const { estimatedWait } = await calculateWaitTime(entry.counterId, ahead);

        return {
          ...entry.toJSON(),
          livePosition: ahead + 1,
          liveEstimatedWait: estimatedWait,
        };
      })
    );

    res.json({ inQueue: true, entries: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queue status' });
  }
});

/**
 * @swagger
 * /api/queue/token/{token}:
 *   get:
 *     summary: Look up a queue entry by token number
 *     tags: [Queue]
 */
router.get('/token/:token', async (req, res) => {
  try {
    const entry = await Queue.findOne({ tokenNumber: req.params.token })
      .populate('userId', 'name')
      .populate('counterId', 'counterName serviceType');

    if (!entry) return res.status(404).json({ error: 'Token not found' });

    let livePosition = null;
    if (entry.status === 'waiting') {
      livePosition = await Queue.countDocuments({
        counterId: entry.counterId._id,
        status: 'waiting',
        joinedAt: { $lte: entry.joinedAt },
      });
    }

    res.json({ ...entry.toJSON(), livePosition });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch token' });
  }
});

/**
 * POST /api/queue/:id/cancel - Cancel a queue entry
 */
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const entry = await Queue.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Queue entry not found' });

    // Users can only cancel their own; admins can cancel any
    if (req.user.role !== 'admin' && entry.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to cancel this entry' });
    }

    if (!['waiting', 'serving'].includes(entry.status)) {
      return res.status(400).json({ error: `Cannot cancel entry with status: ${entry.status}` });
    }

    entry.status = 'cancelled';
    await entry.save();

    await delCache('counters:all');
    req.io?.emit(`counter:${entry.counterId}:update`, { event: 'cancelled', tokenNumber: entry.tokenNumber });

    res.json({ message: 'Queue entry cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel entry' });
  }
});

/**
 * GET /api/queue/counter/:counterId - Get full queue for a counter (admin)
 */
router.get('/counter/:counterId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status = 'waiting', page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = { counterId: req.params.counterId };
    if (status !== 'all') query.status = status;

    const [entries, total] = await Promise.all([
      Queue.find(query)
        .populate('userId', 'name email phone')
        .sort({ joinedAt: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Queue.countDocuments(query),
    ]);

    res.json({ entries, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

/**
 * GET /api/queue/live - Live overview of all counters (cached)
 */
router.get('/live', async (req, res) => {
  try {
    const cached = await getCache('queue:live');
    if (cached) return res.json(cached);

    const counters = await ServiceCounter.find({ isActive: true });

    const liveData = await Promise.all(
      counters.map(async (c) => {
        const [waiting, serving] = await Promise.all([
          Queue.countDocuments({ counterId: c._id, status: 'waiting' }),
          Queue.findOne({ counterId: c._id, status: 'serving' }).populate('userId', 'name'),
        ]);
        return {
          counterId: c._id,
          counterName: c.counterName,
          counterNumber: c.counterNumber,
          serviceType: c.serviceType,
          waitingCount: waiting,
          currentlyServing: serving ? serving.tokenNumber : null,
          avgServiceTime: c.effectiveAvgTime,
          estimatedWait: waiting * c.effectiveAvgTime,
          loadPercentage: Math.round((waiting / c.maxCapacity) * 100),
        };
      })
    );

    await setCache('queue:live', liveData, 10); // 10s cache
    res.json(liveData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch live data' });
  }
});

module.exports = router;
