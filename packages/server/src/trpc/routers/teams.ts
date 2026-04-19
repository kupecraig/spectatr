import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router } from '../index.js';
import { authedProcedure } from '../procedures.js';
import {
  saveSquadInputSchema,
  updateTeamNameInputSchema,
  type LeagueRules,
} from '@spectatr/shared-types';
import { sportSquadConfig } from '@spectatr/shared-types';

export const teamsRouter = router({
  /**
   * Get the current user's team for a given league, including all team players.
   */
  getByLeague: authedProcedure
    .input(z.object({ leagueId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const { prisma, userId } = ctx;

      const team = await prisma.team.findFirst({
        where: { leagueId: input.leagueId, userId },
        include: {
          teamPlayers: {
            include: { player: true },
          },
        },
      });

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found for this league.' });
      }

      return team;
    }),

  /**
   * Save the squad for a team in a given league.
   * Validates position counts and price cap, then replaces all TeamPlayer records.
   */
  saveSquad: authedProcedure
    .input(saveSquadInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { prisma, userId, tenantId } = ctx;
      const { leagueId, players } = input;

      // Find the team
      const team = await prisma.team.findFirst({
        where: { leagueId, userId },
        include: { league: true },
      });

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found for this league.' });
      }

      // Validate position counts against sport config
      const positionCounts: Record<string, number> = {};
      for (const p of players) {
        positionCounts[p.position] = (positionCounts[p.position] ?? 0) + 1;
      }

      for (const [position, req] of Object.entries(sportSquadConfig.positions)) {
        const count = positionCounts[position] ?? 0;
        if (count < req.min) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Not enough players for position ${req.label}: min ${req.min}, got ${count}.`,
          });
        }
        if (count > req.max) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Too many players for position ${req.label}: max ${req.max}, got ${count}.`,
          });
        }
      }

      // Fetch player costs for price cap validation
      const playerIds = players.map((p) => p.playerId);
      const dbPlayers = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, cost: true },
      });

      const costMap = new Map(dbPlayers.map((p) => [p.id, p.cost]));
      const totalCost = players.reduce((sum, p) => sum + (costMap.get(p.playerId) ?? 0), 0);

      // Check price cap from league rules
      const rules = team.league.rules as LeagueRules | null;
      const priceCap = rules?.priceCap ?? null;
      if (priceCap !== null && totalCost > priceCap) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Squad cost (${totalCost}) exceeds price cap (${priceCap}).`,
        });
      }

      // Check gameweek state for snapshot creation
      const gameweekState = await prisma.gameweekState.findUnique({
        where: { tenantId },
      });

      // Get the current round if status allows snapshots
      let currentRoundId: number | null = null;
      if (gameweekState && (gameweekState.status === 'pre_round' || gameweekState.status === 'active')) {
        const currentRound = await prisma.round.findFirst({
          where: { tenantId, roundNumber: gameweekState.currentRound },
          select: { id: true },
        });
        currentRoundId = currentRound?.id ?? null;
      }

      // Atomically replace TeamPlayer rows and upsert snapshot if applicable
      await prisma.$transaction(async (tx) => {
        // Delete and recreate TeamPlayer rows
        await tx.teamPlayer.deleteMany({ where: { teamId: team.id } });
        await tx.teamPlayer.createMany({
          data: players.map((p) => ({
            teamId: team.id,
            playerId: p.playerId,
            position: p.position,
          })),
        });
        await tx.team.update({
          where: { id: team.id },
          data: { totalCost },
        });

        // Upsert TeamPlayerSnapshot for current round if allowed
        if (currentRoundId !== null) {
          const roundIdForSnapshot = currentRoundId; // Capture to avoid non-null assertion
          // Delete existing snapshots for this team+round (idempotent)
          await tx.teamPlayerSnapshot.deleteMany({
            where: { teamId: team.id, roundId: roundIdForSnapshot },
          });
          // Create new snapshots
          await tx.teamPlayerSnapshot.createMany({
            data: players.map((p) => ({
              tenantId,
              teamId: team.id,
              leagueId: team.leagueId,
              roundId: roundIdForSnapshot,
              playerId: p.playerId,
              position: p.position,
            })),
          });
        }
      });

      return { teamId: team.id, playerCount: players.length, totalCost };
    }),

  /**
   * Update the name of the current user's team in a league.
   */
  updateName: authedProcedure
    .input(updateTeamNameInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { prisma, userId } = ctx;

      const team = await prisma.team.findFirst({
        where: { leagueId: input.leagueId, userId },
      });

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found for this league.' });
      }

      return prisma.team.update({
        where: { id: team.id },
        data: { name: input.name },
      });
    }),
});
