import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { baseProcedure, adminProcedure } from '../procedures.js';
import { router } from '../index.js';
import { logger } from '../../utils/logger.js';
import { calculateRoundPoints } from '../../utils/scoring.js';

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

  /**
   * Finalise a round - marks it complete and calculates points.
   * Admin only.
   */
  finaliseRound: adminProcedure
    .input(z.object({ roundId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { prisma, tenantId } = ctx;

      // Find the round
      const round = await prisma.round.findFirst({
        where: {
          id: input.roundId,
          tenantId,
        },
      });

      if (!round) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Round ${input.roundId} not found in tenant ${tenantId}`,
        });
      }

      if (round.status === 'complete') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Round ${input.roundId} is already complete`,
        });
      }

      // Update round status to complete
      await prisma.round.update({
        where: { id: input.roundId },
        data: { status: 'complete' },
      });

      // Calculate points
      const result = await calculateRoundPoints(prisma, tenantId, input.roundId);

      logger.info(
        `Round ${input.roundId} finalised for tenant ${tenantId}: ${result.teamsUpdated} teams, ${result.playersUpdated} players updated`
      );

      return {
        roundId: input.roundId,
        teamsUpdated: result.teamsUpdated,
        playersUpdated: result.playersUpdated,
      };
    }),

  /**
   * Recalculate points for a round without changing its status.
   * Useful for live score updates during active rounds.
   * Admin only.
   */
  recalculateLive: adminProcedure
    .input(z.object({ roundId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { prisma, tenantId } = ctx;

      // Verify round exists in tenant
      const round = await prisma.round.findFirst({
        where: {
          id: input.roundId,
          tenantId,
        },
      });

      if (!round) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Round ${input.roundId} not found in tenant ${tenantId}`,
        });
      }

      // Calculate points without changing status
      const result = await calculateRoundPoints(prisma, tenantId, input.roundId);

      logger.info(
        `Round ${input.roundId} recalculated for tenant ${tenantId}: ${result.teamsUpdated} teams, ${result.playersUpdated} players updated`
      );

      return {
        roundId: input.roundId,
        teamsUpdated: result.teamsUpdated,
        playersUpdated: result.playersUpdated,
      };
    }),
});
