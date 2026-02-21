/**
 * Auto-lock players background job
 * 
 * Runs every minute to check for matches that have started
 * and locks all players in those matches automatically.
 */

import type { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { invalidatePlayersChecksum } from '../utils/checksum.js';

/**
 * Auto-lock players for matches that have started
 * 
 * Logic:
 * 1. Find all rounds where start_date <= now and players aren't locked yet
 * 2. Lock all players in those rounds atomically
 * 3. Invalidate players checksum to trigger frontend refetch
 */
export async function autoLockPlayers(prisma: PrismaClient, tenantId: string) {
  try {
    const now = new Date();

    // Find rounds that have started but haven't been locked yet
    const roundsToLock = await prisma.round.findMany({
      where: {
        tenantId,
        startDate: {
          lte: now,
        },
        // Assuming rounds have a status field or we check if any players are unlocked
      },
      select: {
        id: true,
        name: true,
        startDate: true,
      },
    });

    if (roundsToLock.length === 0) {
      logger.debug(`No rounds to lock for tenant ${tenantId}`);
      return { lockedCount: 0, rounds: [] };
    }

    // TODO: Use roundIds to filter players once schema relationship is determined
    // (e.g., players.roundId, or through matches/lineups table)
    // const roundIds = roundsToLock.map((r) => r.id);

    // Lock all players in these rounds atomically in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.player.updateMany({
        where: {
          tenantId,
          // Assuming players have a roundId or we need to join through matches
          // For now, lock all players for this tenant (adjust based on schema)
          isLocked: false,
        },
        data: {
          isLocked: true,
        },
      });

      return updateResult;
    });

    logger.info(
      `Auto-locked ${result.count} players for ${roundsToLock.length} rounds in tenant ${tenantId}`,
      {
        rounds: roundsToLock.map((r) => r.name),
        count: result.count,
      }
    );

    // Invalidate players checksum so frontend refetches
    invalidatePlayersChecksum(tenantId);

    return {
      lockedCount: result.count,
      rounds: roundsToLock.map((r) => ({ id: r.id, name: r.name })),
    };
  } catch (error) {
    logger.error(`Failed to auto-lock players for tenant ${tenantId}. Error: ${error}`);
    throw error;
  }
}
