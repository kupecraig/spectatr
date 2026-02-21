/**
 * Spectatr Backend API Server
 * 
 * Entry point for the backend API server using tRPC for type-safe endpoints.
 * Provides player data, squad information, rounds, and gameweek state
 * with checksum-based polling for efficient change detection.
 */

import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { env } from './config/env.js';
import { createContext, loadTenantCache } from './trpc/context.js';
import { appRouter } from './trpc/routers/_app.js';
import { logger } from './utils/logger.js';
import { startBackgroundJobs, stopBackgroundJobs } from './jobs/scheduler.js';
import { apiRateLimiter, closeRateLimiter } from './middleware/rateLimiter.js';
import { checksumRouter } from './routes/checksum.js';
import { healthRouter } from './routes/health.js';

const app = express();

// CORS configuration
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// Clerk authentication middleware (verifies JWT, populates req.auth)
app.use(
  clerkMiddleware({
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
    secretKey: env.CLERK_SECRET_KEY,
  })
);

// Routes
app.use('/checksum.json', checksumRouter);
app.use('/health', healthRouter);

// tRPC endpoint with rate limiting
app.use(
  '/trpc',
  apiRateLimiter,
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server with top-level await
try {
  // Load tenant cache at startup
  await loadTenantCache();

  const PORT = Number.parseInt(env.PORT, 10);
  app.listen(PORT, () => {
    logger.info(`🚀 Server running at http://localhost:${PORT}`);
    logger.info(`📡 tRPC endpoint: http://localhost:${PORT}/trpc`);
    logger.info(`📊 Checksum endpoint: http://localhost:${PORT}/checksum.json`);
    logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
    logger.info(`🌍 Environment: ${env.NODE_ENV}`);
    logger.info(`🔗 CORS enabled for: ${env.FRONTEND_URL}`);
    logger.info(`🛡️  Rate limiting enabled (Redis-backed)`);
    
    // Start background jobs after server is running
    startBackgroundJobs();
  });
} catch (error) {
  logger.error('Failed to start server', { error });
  process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await stopBackgroundJobs();
  await closeRateLimiter();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await stopBackgroundJobs();
  await closeRateLimiter();
  process.exit(0);
});
