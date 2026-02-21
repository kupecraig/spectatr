import { baseProcedure } from '../procedures.js';
import { router } from '../index.js';
import { logger } from '../../utils/logger.js';

/**
 * Gameweek router - manages gameweek/round state for each tenant
 * Each tenant has independent gameweek state (e.g., trc-2025 round 5, hsbc-svns round 3)
 */
export const gameweekRouter = router({
  /**
   * Get current gameweek state for the tenant
   * Cached aggressively as gameweek state changes infrequently
   */
  current: baseProcedure.query(async ({ ctx }) => {
    const { prisma, tenant } = ctx;

    if (!tenant) {
      throw new Error('Tenant not found in context');
    }

    logger.info(`Fetching current gameweek state for tenant: ${tenant.id}`);

    // Fetch gameweek state (unique per tenant) - camelCase table name
    const gameweekState = await prisma.gameweekState.findUnique({
      where: {
        tenantId: tenant.id,
      },
    });

    if (!gameweekState) {
      logger.warn(`No gameweek state found for tenant: ${tenant.id}`);
      // Return default state if not found
      return {
        currentRound: 1,
        status: 'pre_round' as const,
        deadline: null,
        nextRoundStarts: null,
      };
    }

    logger.info(
      `Gameweek state retrieved for tenant: ${tenant.id}, round: ${gameweekState.currentRound}, status: ${gameweekState.status}`
    );

    return {
      currentRound: gameweekState.currentRound,
      status: gameweekState.status as 'pre_round' | 'active' | 'locked' | 'processing' | 'complete',
      deadline: gameweekState.deadline,
      nextRoundStarts: gameweekState.nextRoundStarts,
    };
  }),
});
