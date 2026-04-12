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
      const { prisma, userId } = ctx;
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

      // Atomically replace TeamPlayer rows
      await prisma.$transaction([
        prisma.teamPlayer.deleteMany({ where: { teamId: team.id } }),
        prisma.teamPlayer.createMany({
          data: players.map((p) => ({
            teamId: team.id,
            playerId: p.playerId,
            position: p.position,
          })),
        }),
        prisma.team.update({
          where: { id: team.id },
          data: { totalCost },
        }),
      ]);

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
