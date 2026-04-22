/**
 * AI Engine - Queue Intelligence Module
 * 
 * Combines rule-based formulas with OpenAI for smart wait time prediction,
 * peak hour detection, and load balancing recommendations.
 */

const logger = require('./logger');

/**
 * Basic wait time formula:
 *   Estimated Wait = People Ahead × Avg Service Time
 *
 * Advanced formula adds:
 *   - Time-of-day multiplier (peak hours cost more)
 *   - Historical accuracy correction
 *   - Service type complexity factor
 */
const SERVICE_TYPE_MULTIPLIERS = {
  express: 0.6,
  billing: 1.2,
  consultation: 1.5,
  registration: 1.1,
  support: 1.3,
  premium: 0.8,
  general: 1.0,
};

const PEAK_HOUR_RANGES = [
  { start: 9, end: 11, multiplier: 1.3 },    // Morning rush
  { start: 13, end: 15, multiplier: 1.2 },   // Afternoon rush
  { start: 17, end: 19, multiplier: 1.25 },  // Evening rush
];

/**
 * Get time-of-day load multiplier
 */
function getTimeMultiplier(date = new Date()) {
  const hour = date.getHours();
  for (const range of PEAK_HOUR_RANGES) {
    if (hour >= range.start && hour < range.end) {
      return range.multiplier;
    }
  }
  return 1.0;
}

/**
 * Calculate estimated wait time using basic + advanced formula
 * @param {Object} counter - ServiceCounter document
 * @param {number} peopleAhead - People in queue ahead of user
 * @returns {{ estimatedWait: number, aiPredictedWait: number, confidence: number, factors: Object }}
 */
async function calculateWaitTime(counter, peopleAhead) {
  const avgServiceTime = counter.dynamicAvgServiceTime || counter.avgServiceTime || 10;
  const serviceMultiplier = SERVICE_TYPE_MULTIPLIERS[counter.serviceType] || 1.0;
  const timeMultiplier = getTimeMultiplier();

  // Basic estimate
  const basicEstimate = Math.round(peopleAhead * avgServiceTime);

  // Advanced estimate
  const advancedEstimate = Math.round(
    peopleAhead * avgServiceTime * serviceMultiplier * timeMultiplier
  );

  // Buffer: add 10-15% for variability
  const variabilityBuffer = 1.1 + Math.random() * 0.05;
  const aiPredictedWait = Math.round(advancedEstimate * variabilityBuffer);

  return {
    estimatedWait: basicEstimate,
    aiPredictedWait,
    confidence: Math.max(60, 95 - peopleAhead * 2), // Confidence decreases with queue length
    factors: {
      avgServiceTime,
      serviceMultiplier,
      timeMultiplier,
      variabilityBuffer: Math.round(variabilityBuffer * 100) / 100,
    },
  };
}

/**
 * Full AI analysis using counter history data
 * Falls back to rule-based if OpenAI unavailable
 */
async function analyzeQueueWithAI(counter, waitingCount) {
  try {
    // Try OpenAI for enhanced prediction
    if (process.env.OPENAI_API_KEY) {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const recentHistory = (counter.serviceTimeHistory || []).slice(-10);
      const prompt = `Queue analysis request:
Counter: ${counter.counterName} (${counter.serviceType})
Current queue length: ${waitingCount} people
Avg service time: ${counter.avgServiceTime} minutes
Recent service times: ${recentHistory.map(h => h.duration).join(', ')} minutes
Current hour: ${new Date().getHours()}

Predict wait time in minutes and confidence (0-100). Respond only as JSON: {"waitTime": N, "confidence": N, "reasoning": "brief explanation"}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 150,
      });

      const aiResult = JSON.parse(completion.choices[0].message.content);

      return {
        estimatedWait: waitingCount * (counter.avgServiceTime || 10),
        aiPredictedWait: aiResult.waitTime,
        confidence: aiResult.confidence,
        factors: { reasoning: aiResult.reasoning, source: 'openai' },
      };
    }
  } catch (err) {
    logger.warn(`OpenAI prediction failed, using rule-based: ${err.message}`);
  }

  // Fallback to rule-based
  return calculateWaitTime(counter, waitingCount);
}

/**
 * Detect peak hours from historical data
 * @param {Array} history - QueueHistory records
 */
async function detectPeakHours(history) {
  const hourCounts = Array(24).fill(0);
  const hourWaits = Array(24).fill(0);
  const hourSamples = Array(24).fill(0);

  history.forEach(day => {
    (day.hourlyBreakdown || []).forEach(({ hour, count, avgWait }) => {
      hourCounts[hour] += count;
      hourWaits[hour] += avgWait * count;
      hourSamples[hour] += count;
    });
  });

  const hourlyData = hourCounts.map((count, hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    totalTraffic: count,
    avgWait: hourSamples[hour] ? Math.round(hourWaits[hour] / hourSamples[hour]) : 0,
    isPeak: false,
    recommendation: '',
  }));

  // Identify peak hours (top 3)
  const sorted = [...hourlyData].sort((a, b) => b.totalTraffic - a.totalTraffic);
  const topThree = sorted.slice(0, 3).map(h => h.hour);

  hourlyData.forEach(h => {
    if (topThree.includes(h.hour)) {
      h.isPeak = true;
      h.recommendation = `⚠️ Peak period - consider adding extra counters during ${h.label}`;
    } else if (h.totalTraffic < sorted[sorted.length - 3]?.totalTraffic) {
      h.recommendation = `✅ Low traffic - potential for counter breaks`;
    }
  });

  return {
    hourlyData,
    peakHours: topThree.map(h => ({ hour: h, label: `${String(h).padStart(2, '0')}:00` })),
    summary: `Peak hours are ${topThree.map(h => `${h}:00`).join(', ')}. Recommend extra staffing during these times.`,
    analysisDate: new Date().toISOString(),
  };
}

/**
 * Suggest load balancing across counters
 * @param {Array} counters - Counters with waitingCount attached
 */
async function suggestLoadBalancing(counters) {
  if (!counters.length) return { suggestions: [], balanced: true };

  const avgLoad = counters.reduce((sum, c) => sum + c.waitingCount, 0) / counters.length;
  const overloaded = counters.filter(c => c.waitingCount > avgLoad * 1.5);
  const underloaded = counters.filter(c => c.waitingCount < avgLoad * 0.5 && c.isActive);

  const suggestions = [];

  overloaded.forEach(c => {
    suggestions.push({
      type: 'warning',
      counterId: c._id,
      message: `Counter "${c.counterName}" is overloaded (${c.waitingCount} waiting vs avg ${Math.round(avgLoad)})`,
      action: 'Open additional counter or redirect customers',
    });
  });

  underloaded.forEach(c => {
    suggestions.push({
      type: 'info',
      counterId: c._id,
      message: `Counter "${c.counterName}" is underutilized (${c.waitingCount} waiting)`,
      action: 'Consider routing more customers here',
    });
  });

  const balanced = overloaded.length === 0;

  return {
    suggestions,
    balanced,
    stats: {
      avgLoad: Math.round(avgLoad),
      overloadedCount: overloaded.length,
      underloadedCount: underloaded.length,
      totalWaiting: counters.reduce((s, c) => s + c.waitingCount, 0),
    },
    recommendation: balanced
      ? '✅ Load is well balanced across all counters'
      : `⚠️ ${overloaded.length} counter(s) need attention. Consider redistributing load.`,
  };
}

module.exports = {
  calculateWaitTime,
  analyzeQueueWithAI,
  detectPeakHours,
  suggestLoadBalancing,
  getTimeMultiplier,
};
