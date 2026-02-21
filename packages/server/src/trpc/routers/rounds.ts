import { router } from '../index.js';
import { protectedProcedure } from '../procedures.js';

export const roundsRouter = router({
  /**
   * List all rounds with their tournaments/matches
   * Includes current round indicator, match status, scores
   * Cache for 60s (moderate volatility)
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const { prisma, tenantId } = ctx;

    // Get gameweek state to identify current round
    // Note: gameweekState has unique constraint on tenantId, so findUnique needs explicit tenantId
    const gameweekState = await prisma.gameweekState.findUnique({
      where: { tenantId },
    });

    // Fetch all rounds - tenantId automatically injected
    const rounds = await prisma.round.findMany({
      orderBy: { roundNumber: 'asc' },
    });

    // Add isCurrent flag based on gameweek state
    const roundsWithCurrent = rounds.map((round) => ({
      ...round,
      isCurrent: gameweekState?.currentRound === round.roundNumber,
    }));

    // Set cache headers for 60 seconds
    ctx.res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');

    return {
      rounds: roundsWithCurrent,
      currentRound: gameweekState?.currentRound || 1,
      gameweekStatus: gameweekState?.status || 'pre_round',
    };
  }),
});
