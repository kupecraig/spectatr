/**
 * Background Jobs Scheduler
 * 
 * BullMQ-based scheduler for background tasks
 * Supports distributed workers, retries, and graceful shutdown
 */

import { Queue, Worker } from 'bullmq';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';
import { autoLockPlayers } from './autoLockPlayers.js';
import { env } from '../config/env.js';

const REDIS_CONNECTION = {
  host: env.REDIS_HOST,
  port: Number.parseInt(env.REDIS_PORT, 10),
};

// Auto-lock queue
const autoLockQueue = new Queue('auto-lock-players', {
  connection: REDIS_CONNECTION,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs for debugging
  },
});

let worker: Worker | null = null;

/**
 * Start all background jobs
 */
export async function startBackgroundJobs() {
  logger.info('🕐 Starting background jobs...');

  // Create worker to process auto-lock jobs
    worker = new Worker(
    'auto-lock-players',
    async (job) => {
    // If this is the repeatable scheduler job, queue jobs for each tenant
    if (job.name === 'check-all-tenants') {
        const tenants = await prisma.tenant.findMany({
        where: { isActive: true },
        select: { id: true },
        });

        for (const tenant of tenants) {
        await autoLockQueue.add(
            'lock-tenant-players',
            { tenantId: tenant.id },
            { jobId: `lock-${tenant.id}-${Date.now()}` }
        );
        }

        return { scheduled: tenants.length };
    }

    // Process individual tenant auto-lock
    const { tenantId } = job.data;
    logger.debug(`Processing auto-lock job for tenant: ${tenantId}`);

    const result = await autoLockPlayers(prisma, tenantId);

    if (result.lockedCount > 0) {
        logger.info(
        `Auto-lock completed for tenant ${tenantId}: ${result.lockedCount} players locked`
        );
    }

    return result;
    },
    {
        connection: REDIS_CONNECTION,
        concurrency: 5, // Process up to 5 tenants concurrently
    }
    );

  // Worker event handlers
  worker.on('completed', (job) => {
    if (job.name === 'check-all-tenants') {
      logger.debug(`Job ${job.id} completed (scheduler job)`);
    } else {
      logger.debug(`Job ${job.id} completed for tenant ${job.data.tenantId}`);
    }
  });

  worker.on('failed', (job, err) => {
    if (job?.name === 'check-all-tenants') {
      logger.error(`Job ${job?.id} failed (scheduler job): ${err.message}`);
    } else {
      logger.error(`Job ${job?.id} failed for tenant ${job?.data.tenantId}: ${err.message}`);
    }
  });

  // Add repeatable job - runs every minute for all active tenants
  await autoLockQueue.add(
    'check-all-tenants',
    {},
    {
      repeat: {
        pattern: '*/1 * * * *', // Every minute (cron syntax)
      },
      jobId: 'auto-lock-repeatable', // Prevent duplicates
    }
  );

  // Immediately add jobs for all active tenants
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  for (const tenant of tenants) {
    await autoLockQueue.add(
      'lock-tenant-players',
      { tenantId: tenant.id },
      { jobId: `lock-${tenant.id}-${Date.now()}` }
    );
  }

  logger.info(
    `✅ Background jobs started (auto-lock: every 1 minute, ${tenants.length} tenants, ${worker ? 'worker active' : 'no worker'})`
  );
}

/**
 * Stop all background jobs
 * Graceful shutdown - waits for current jobs to complete
 */
export async function stopBackgroundJobs() {
  logger.info('🛑 Stopping background jobs...');
  
  if (worker) {
    await worker.close();
    logger.info('Worker closed');
  }
  
  await autoLockQueue.close();
  logger.info('Queue closed');
}
