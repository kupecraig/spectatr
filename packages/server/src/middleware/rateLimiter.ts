/**
 * Rate Limiting Middleware
 * 
 * Redis-backed sliding window rate limiter
 * Protects endpoints from abuse and ensures fair resource allocation
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Create Redis client for rate limiting using ioredis
const redisClient = new Redis({
  host: env.REDIS_HOST,
  port: Number.parseInt(env.REDIS_PORT, 10),
  maxRetriesPerRequest: null,
});

redisClient.on('error', (err: Error) => {
  logger.error(`Redis rate limiter error: ${err}`);
});

redisClient.on('connect', () => {
  logger.info('Rate limiter Redis connected');
});

/**
 * Checksum endpoint rate limiter
 * High limit - this is called frequently by all users
 */
export const checksumRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute per IP (1 every 500ms)
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  store: new RedisStore({
    // @ts-expect-error - ioredis types don't perfectly match rate-limit-redis expectations
    sendCommand: (...args: [string, ...string[]]) => redisClient.call(...args),
    prefix: 'rl:checksum:',
  }),
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for checksum endpoint`, {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please slow down. Try again in a minute.',
      retryAfter: 60,
    });
  },
});

/**
 * API endpoints rate limiter
 * Moderate limit for tRPC queries
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error - ioredis types don't perfectly match rate-limit-redis expectations
    sendCommand: (...args: [string, ...string[]]) => redisClient.call(...args),
    prefix: 'rl:api:',
  }),
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for API endpoint`, {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again in a minute.',
      retryAfter: 60,
    });
  },
});

/**
 * Graceful shutdown - close Redis connection
 */
export async function closeRateLimiter() {
  await redisClient.quit();
  logger.info('Rate limiter Redis connection closed');
}
