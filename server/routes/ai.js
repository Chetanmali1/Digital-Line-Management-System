/**
 * AI Routes - OpenAI-powered queue intelligence
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { analyzeQueueWithAI, detectPeakHours, suggestLoadBalancing } = require('../utils/aiEngine');
const { getCache, setCache } = require('../config/redis');
const Queue = require('../models/Queue');
const ServiceCounter = require('../models/ServiceCounter');
const QueueHistory = require('../models/QueueHistory');

const router = express.Router();

/**
 * @swagger
 * /api/ai/wait-time/{counterId}:
 *   get:
 *     summary: Get AI-predicted wait time for a counter
 *     tags: [AI]
 */
router.get('/wait-time/:counterId', authenticate, async (req, res) => {
  try {
    const cacheKey = `ai:wait:${req.params.counterId}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const counter = await ServiceCounter.findById(req.params.counterId);
    if (!counter) return res.status(404).json({ error: 'Counter not found' });

    const waitingCount = await Queue.countDocuments({
      counterId: req.params.counterId,
      status: 'waiting',
    });

    const { estimatedWait, aiPredictedWait, confidence, factors } = await analyzeQueueWithAI(
      counter,
      waitingCount
    );

    const result = {
      counterId: req.params.counterId,
      counterName: counter.counterName,
      waitingPeople: waitingCount,
      basicEstimate: estimatedWait,
      aiEstimate: aiPredictedWait,
      confidence,
      factors,
      timestamp: new Date().toISOString(),
    };

    await setCache(cacheKey, result, 30);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'AI prediction failed', fallback: 'Using basic estimation' });
  }
});

/**
 * @swagger
 * /api/ai/peak-hours:
 *   get:
 *     summary: AI-detected peak hours with recommendations
 *     tags: [AI]
 */
router.get('/peak-hours', authenticate, async (req, res) => {
  try {
    const cached = await getCache('ai:peak-hours');
    if (cached) return res.json(cached);

    // Get 30 days of history for AI analysis
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const history = await QueueHistory.find({ date: { $gte: thirtyDaysAgo } }).sort({ date: 1 });
    const result = await detectPeakHours(history);

    await setCache('ai:peak-hours', result, 3600); // 1 hour cache
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Peak hour analysis failed' });
  }
});

/**
 * @swagger
 * /api/ai/load-balancing:
 *   get:
 *     summary: AI counter load balancing suggestions
 *     tags: [AI]
 */
router.get('/load-balancing', authenticate, async (req, res) => {
  try {
    const counters = await ServiceCounter.find({ isActive: true });

    const countersWithLoad = await Promise.all(
      counters.map(async (c) => {
        const waiting = await Queue.countDocuments({ counterId: c._id, status: 'waiting' });
        return { ...c.toJSON(), waitingCount: waiting };
      })
    );

    const suggestions = await suggestLoadBalancing(countersWithLoad);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: 'Load balancing analysis failed' });
  }
});

/**
 * POST /api/ai/analyze-trends - Full AI trend analysis via OpenAI
 */
router.post('/analyze-trends', authenticate, async (req, res) => {
  try {
    const cached = await getCache('ai:trends-analysis');
    if (cached) return res.json(cached);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [hourly, dailyHistory] = await Promise.all([
      Queue.aggregate([
        { $match: { joinedAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { hour: { $hour: '$joinedAt' }, day: { $dayOfWeek: '$joinedAt' } }, count: { $sum: 1 } } },
      ]),
      QueueHistory.find({ date: { $gte: sevenDaysAgo } }).sort({ date: 1 }),
    ]);

    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `You are an expert queue management analyst. Analyze this queue data and provide actionable insights:

Daily Queue Data (last 7 days):
${JSON.stringify(dailyHistory.map(d => ({
  date: d.date,
  totalUsers: d.totalUsers,
  avgWaitTime: d.avgWaitTime,
  peakHour: d.peakHour,
})), null, 2)}

Hourly Breakdown:
${JSON.stringify(hourly, null, 2)}

Please provide:
1. Key trends identified
2. Predicted busy periods for next 7 days
3. Staff optimization recommendations
4. Counter allocation suggestions
5. Overall service efficiency score (0-100)

Respond in JSON format with keys: trends, predictions, staffRecommendations, counterSuggestions, efficiencyScore, summary`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    analysis.generatedAt = new Date().toISOString();
    analysis.dataPoints = hourly.length;

    await setCache('ai:trends-analysis', analysis, 3600);
    res.json(analysis);
  } catch (err) {
    // Graceful fallback if OpenAI unavailable
    res.status(200).json({
      error: 'AI analysis temporarily unavailable',
      fallback: true,
      summary: 'Using rule-based analysis. Configure OPENAI_API_KEY for full AI insights.',
      efficiencyScore: 75,
      trends: ['Analysis requires valid OpenAI API key'],
      predictions: ['Configure AI to get predictions'],
      staffRecommendations: ['Ensure adequate staffing during peak hours (10am-12pm, 2pm-4pm)'],
      counterSuggestions: ['Balance load across active counters'],
    });
  }
});

module.exports = router;
