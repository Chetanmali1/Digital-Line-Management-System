/**
 * Analytics Routes - Dashboard data for admin panel
 */

const express = require('express');
const Queue = require('../models/Queue');
const QueueHistory = require('../models/QueueHistory');
const ServiceCounter = require('../models/ServiceCounter');
const { authenticate, authorize } = require('../middleware/auth');
const { getCache, setCache } = require('../config/redis');

const router = express.Router();

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get admin dashboard metrics
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 */
router.get('/dashboard', authenticate, authorize('admin'), async (req, res) => {
  try {
    const cached = await getCache('analytics:dashboard');
    if (cached) return res.json(cached);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [
      totalToday,
      servedToday,
      cancelledToday,
      waitingNow,
      avgWaitResult,
      counterStats,
    ] = await Promise.all([
      Queue.countDocuments({ joinedAt: { $gte: today } }),
      Queue.countDocuments({ joinedAt: { $gte: today }, status: 'served' }),
      Queue.countDocuments({ joinedAt: { $gte: today }, status: 'cancelled' }),
      Queue.countDocuments({ status: 'waiting' }),
      Queue.aggregate([
        { $match: { status: 'served', joinedAt: { $gte: today }, actualWaitTime: { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$actualWaitTime' } } },
      ]),
      ServiceCounter.find({ isActive: true }).select('counterName currentCount maxCapacity'),
    ]);

    const data = {
      today: {
        totalJoined: totalToday,
        served: servedToday,
        cancelled: cancelledToday,
        waitingNow,
        avgWaitTime: Math.round(avgWaitResult[0]?.avg || 0),
        servedRate: totalToday ? Math.round((servedToday / totalToday) * 100) : 0,
      },
      counters: counterStats.map(c => ({
        name: c.counterName,
        current: c.currentCount,
        capacity: c.maxCapacity,
        load: Math.round((c.currentCount / c.maxCapacity) * 100),
      })),
      timestamp: new Date().toISOString(),
    };

    await setCache('analytics:dashboard', data, 30);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * GET /api/analytics/trends?range=7|30|90 - Time series data for charts
 */
router.get('/trends', authenticate, authorize('admin'), async (req, res) => {
  try {
    const days = parseInt(req.query.range) || 7;
    const cacheKey = `analytics:trends:${days}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const history = await QueueHistory.find({ date: { $gte: startDate } }).sort({ date: 1 });

    // Fill missing days with zeros
    const dateMap = {};
    history.forEach(h => {
      dateMap[h.date.toISOString().split('T')[0]] = h;
    });

    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      result.push({
        date: key,
        totalUsers: dateMap[key]?.totalUsers || 0,
        avgWaitTime: dateMap[key]?.avgWaitTime || 0,
        peakHour: dateMap[key]?.peakHour || null,
        totalServed: dateMap[key]?.totalServed || 0,
      });
    }

    await setCache(cacheKey, result, 300); // 5 min cache
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

/**
 * GET /api/analytics/peak-hours - Hourly traffic breakdown
 */
router.get('/peak-hours', authenticate, async (req, res) => {
  try {
    const cached = await getCache('analytics:peak-hours');
    if (cached) return res.json(cached);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Aggregate by hour
    const hourly = await Queue.aggregate([
      { $match: { joinedAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $hour: '$joinedAt' },
          count: { $sum: 1 },
          avgWait: { $avg: '$actualWaitTime' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill all 24 hours
    const allHours = Array.from({ length: 24 }, (_, h) => {
      const found = hourly.find(r => r._id === h);
      return {
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        count: found?.count || 0,
        avgWait: Math.round(found?.avgWait || 0),
        isPeak: false,
      };
    });

    // Mark top 3 hours as peak
    const sorted = [...allHours].sort((a, b) => b.count - a.count);
    const peakHours = sorted.slice(0, 3).map(h => h.hour);
    allHours.forEach(h => { h.isPeak = peakHours.includes(h.hour); });

    await setCache('analytics:peak-hours', allHours, 600); // 10 min
    res.json(allHours);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch peak hours' });
  }
});

/**
 * POST /api/analytics/aggregate-daily - Triggered by cron to snapshot daily data
 */
router.post('/aggregate-daily', authenticate, authorize('admin'), async (req, res) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const dayEnd = new Date(yesterday);
    dayEnd.setHours(23, 59, 59, 999);

    const [total, served, cancelled, waitStats, hourlyData] = await Promise.all([
      Queue.countDocuments({ joinedAt: { $gte: yesterday, $lte: dayEnd } }),
      Queue.countDocuments({ joinedAt: { $gte: yesterday, $lte: dayEnd }, status: 'served' }),
      Queue.countDocuments({ joinedAt: { $gte: yesterday, $lte: dayEnd }, status: 'cancelled' }),
      Queue.aggregate([
        { $match: { joinedAt: { $gte: yesterday, $lte: dayEnd }, status: 'served' } },
        { $group: { _id: null, avg: { $avg: '$actualWaitTime' }, max: { $max: '$actualWaitTime' }, min: { $min: '$actualWaitTime' } } },
      ]),
      Queue.aggregate([
        { $match: { joinedAt: { $gte: yesterday, $lte: dayEnd } } },
        { $group: { _id: { $hour: '$joinedAt' }, count: { $sum: 1 }, avgWait: { $avg: '$actualWaitTime' } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const peakHourData = hourlyData[0] || {};
    const hourlyBreakdown = hourlyData.map(h => ({
      hour: h._id,
      count: h.count,
      avgWait: Math.round(h.avgWait || 0),
    }));

    const record = await QueueHistory.findOneAndUpdate(
      { date: yesterday },
      {
        totalUsers: total,
        totalServed: served,
        totalCancelled: cancelled,
        avgWaitTime: Math.round(waitStats[0]?.avg || 0),
        maxWaitTime: waitStats[0]?.max || 0,
        minWaitTime: waitStats[0]?.min || 0,
        hourlyBreakdown,
        peakHour: peakHourData._id || null,
        peakCount: peakHourData.count || 0,
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Daily aggregation complete', record });
  } catch (err) {
    res.status(500).json({ error: 'Aggregation failed' });
  }
});

module.exports = router;
