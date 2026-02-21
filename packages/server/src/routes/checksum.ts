/**
 * Checksum Route
 * 
 * Returns MD5 checksums for tenant data (players, rounds)
 * Supports ETag-based 304 Not Modified responses for bandwidth efficiency
 */

import { Router } from 'express';
import { extractTenantId } from '../trpc/context.js';
import { getChecksumsFromCache, generateChecksums, storeChecksumsInCache } from '../utils/checksum.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';
import { checksumRateLimiter } from '../middleware/rateLimiter.js';

export const checksumRouter = Router();

checksumRouter.get('/', checksumRateLimiter, async (req, res) => {
  try {
    const tenantId = extractTenantId(req);
    
    // Check cache first
    const cached = getChecksumsFromCache(tenantId);
    if (cached) {
      // Return 304 Not Modified if client has ETag
      const etag = `"${cached.checksums.players}-${cached.checksums.rounds}"`;
      if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return;
      }
      
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, max-age=10'); // 10s cache
      res.json(cached.checksums);
      return;
    }
    
    // Generate fresh checksums
    const [players, rounds] = await Promise.all([
      prisma.player.findMany({ 
        where: { tenantId }, 
        select: { id: true, isLocked: true, stats: true } 
      }),
      prisma.round.findMany({ 
        where: { tenantId }, 
        select: { id: true, startDate: true, status: true } 
      }),
    ]);
    
    const checksums = generateChecksums({ players, rounds });
    storeChecksumsInCache(tenantId, checksums);
    
    const etag = `"${checksums.players}-${checksums.rounds}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=10');
    res.json(checksums);
  } catch (error) {
    logger.error(`Checksum endpoint error: ${error}`);
    res.status(500).json({ error: 'Failed to generate checksums' });
  }
});
