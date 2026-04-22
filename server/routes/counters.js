/**
 * Service Counter Routes
 * CRUD operations for service counters (Admin protected)
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const ServiceCounter = require('../models/ServiceCounter');
const Queue = require('../models/Queue');
const { authenticate, authorize } = require('../middleware/auth');
const { getCache, setCache, invalidatePattern } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

const counterValidation = [
  body('counterName').trim().notEmpty().withMessage('Counter name required'),
  body('serviceType').isIn(['billing', 'registration', 'consultation', 'support', 'general', 'express', 'premium'])
    .withMessage('Invalid service type'),
  body('avgServiceTime').isInt({ min: 1, max: 120 }).withMessage('Avg service time must be 1-120 minutes'),
  body('maxCapacity').optional().isInt({ min: 1 }).withMessage('Max capacity must be positive'),
];

/**
 * @swagger
 * /api/counters:
 *   get:
 *     summary: List all service counters
 *     tags: [Counters]
 *     responses:
 *       200:
 *         description: Array of counters with current queue status
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const cached = await getCache('counters:all');
    if (cached) return res.json(cached);

    const counters = await ServiceCounter.find().sort({ counterNumber: 1 });

    // Attach live queue counts
    const withCounts = await Promise.all(
      counters.map(async (c) => {
        const count = await Queue.countDocuments({ counterId: c._id, status: { $in: ['waiting', 'serving'] } });
        return { ...c.toJSON(), currentCount: count };
      })
    );

    await setCache('counters:all', withCounts, 15); // 15s cache
    res.json(withCounts);
  } catch (err) {
    logger.error(`Get counters error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch counters' });
  }
});

/**
 * @swagger
 * /api/counters/{id}:
 *   get:
 *     summary: Get a single counter by ID
 *     tags: [Counters]
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const counter = await ServiceCounter.findById(req.params.id);
    if (!counter) return res.status(404).json({ error: 'Counter not found' });

    const queueItems = await Queue.find({ counterId: counter._id, status: { $in: ['waiting', 'serving'] } })
      .populate('userId', 'name email')
      .sort({ joinedAt: 1 });

    res.json({ counter, queue: queueItems });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch counter' });
  }
});

/**
 * @swagger
 * /api/counters:
 *   post:
 *     summary: Create a new service counter (Admin only)
 *     tags: [Counters]
 *     security:
 *       - BearerAuth: []
 */
router.post('/', authenticate, authorize('admin'), counterValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array().map(e => e.msg) });
  }

  try {
    const { counterName, serviceType, avgServiceTime, maxCapacity, staffName, description } = req.body;

    // Auto-assign next counter number
    const lastCounter = await ServiceCounter.findOne().sort({ counterNumber: -1 });
    const counterNumber = (lastCounter?.counterNumber || 0) + 1;

    const counter = new ServiceCounter({
      counterName, serviceType, avgServiceTime, maxCapacity, staffName, description, counterNumber,
    });
    await counter.save();

    await invalidatePattern('counters:*');

    req.io?.emit('counter:created', counter);
    logger.info(`Counter created: ${counterName}`);

    res.status(201).json({ message: 'Counter created successfully', counter });
  } catch (err) {
    logger.error(`Create counter error: ${err.message}`);
    res.status(500).json({ error: 'Failed to create counter' });
  }
});

/**
 * @swagger
 * /api/counters/{id}:
 *   put:
 *     summary: Update a counter (Admin only)
 *     tags: [Counters]
 */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const counter = await ServiceCounter.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!counter) return res.status(404).json({ error: 'Counter not found' });

    await invalidatePattern('counters:*');
    req.io?.emit('counter:updated', counter);

    res.json({ message: 'Counter updated', counter });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update counter' });
  }
});

/**
 * @swagger
 * /api/counters/{id}:
 *   delete:
 *     summary: Delete a counter (Admin only)
 *     tags: [Counters]
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const activeQueue = await Queue.countDocuments({ counterId: req.params.id, status: 'waiting' });
    if (activeQueue > 0) {
      return res.status(400).json({
        error: `Cannot delete counter with ${activeQueue} active queue entries. Cancel them first.`,
      });
    }

    const counter = await ServiceCounter.findByIdAndDelete(req.params.id);
    if (!counter) return res.status(404).json({ error: 'Counter not found' });

    await invalidatePattern('counters:*');
    req.io?.emit('counter:deleted', { id: req.params.id });

    res.json({ message: 'Counter deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete counter' });
  }
});

/**
 * POST /api/counters/:id/serve-next - Admin calls next person in queue
 */
router.post('/:id/serve-next', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Find current "serving" entry and mark as served
    const currentlyServing = await Queue.findOne({ counterId: req.params.id, status: 'serving' });
    if (currentlyServing) {
      currentlyServing.status = 'served';
      currentlyServing.servedAt = new Date();
      await currentlyServing.save();

      // Update counter's service time history
      const counter = await ServiceCounter.findById(req.params.id);
      if (counter && currentlyServing.actualServiceTime) {
        counter.serviceTimeHistory.push({ duration: currentlyServing.actualServiceTime });
        counter.totalServed += 1;
        counter.recalcAvgServiceTime();
        await counter.save();
      }

      req.io?.emit('queue:served', { queueId: currentlyServing._id, counterId: req.params.id });
    }

    // Get next in waiting queue
    const next = await Queue.findOne({ counterId: req.params.id, status: 'waiting' })
      .sort({ joinedAt: 1 })
      .populate('userId', 'name email');

    if (!next) {
      return res.json({ message: 'Queue is empty', served: currentlyServing || null, next: null });
    }

    next.status = 'serving';
    next.calledAt = new Date();
    await next.save();

    req.io?.emit('queue:calling', { token: next.tokenNumber, counterId: req.params.id, user: next.userId });
    req.io?.emit(`user:${next.userId._id}:called`, { token: next.tokenNumber });

    res.json({ message: 'Next customer called', served: currentlyServing || null, next });
  } catch (err) {
    logger.error(`Serve next error: ${err.message}`);
    res.status(500).json({ error: 'Failed to serve next customer' });
  }
});

module.exports = router;
