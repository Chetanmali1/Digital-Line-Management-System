/**
 * Redis Configuration for Queue Caching & Performance
 * Uses ioredis with graceful fallback if Redis unavailable
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

async function connectRedis() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn('Redis unavailable - running without cache');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on('connect', () => logger.info('✅ Redis connected'));
    redisClient.on('error', err => logger.warn(`Redis error: ${err.message}`));

    await redisClient.connect();
  } catch (err) {
    logger.warn(`Redis connection failed: ${err.message}. App will run without caching.`);
    redisClient = null;
  }
}

/**
 * Get value from Redis cache
 * @param {string} key - Cache key
 * @returns {any|null} Parsed value or null
 */
async function getCache(key) {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.warn(`Cache GET error: ${err.message}`);
    return null;
  }
}

/**
 * Set value in Redis cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 60s)
 */
async function setCache(key, value, ttl = 60) {
  if (!redisClient) return;
  try {
    await redisClient.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    logger.warn(`Cache SET error: ${err.message}`);
  }
}

/**
 * Delete a key from cache
 */
async function delCache(key) {
  if (!redisClient) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    logger.warn(`Cache DEL error: ${err.message}`);
  }
}

/**
 * Invalidate all keys matching a pattern
 */
async function invalidatePattern(pattern) {
  if (!redisClient) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length) await redisClient.del(...keys);
  } catch (err) {
    logger.warn(`Cache pattern invalidation error: ${err.message}`);
  }
}

module.exports = connectRedis;
module.exports.getCache = getCache;
module.exports.setCache = setCache;
module.exports.delCache = delCache;
module.exports.invalidatePattern = invalidatePattern;
module.exports.getClient = () => redisClient;
