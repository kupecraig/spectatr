import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { nanoid } from 'nanoid';
import { router } from '../index.js';
import { protectedProcedure, authedProcedure } from '../procedures.js';
import { prisma as basePrisma } from '../../db/prisma.js';
import {
  createLeagueSchema,
  updateLeagueSchema,
  joinLeagueByCodeSchema,
  leagueStandingsInputSchema,
  type LeagueRules,
} from '@spectatr/shared-types';

export const leaguesRouter = router({
  /**
   * List public leagues for the current tenant.
   * Public browsing — no auth required.
   * Supports optional gameMode filter and cursor pagination.
   */
  list: protectedProcedure
    .input(
      z.object({
        gameMode: z.enum(['standard', 'round-robin', 'ranked']).optional(),
        limit: z.number().int().min(1).max(50).default(20),
        cursor: z.number().optional(), // last league id for cursor pagination
      })
    )
    .query(async ({ ctx, input }) => {
      const { prisma, tenantId } = ctx;
      const { gameMode, limit, cursor } = input;

      const where: Record<string, unknown> = { tenantId, isPublic: true };
      if (gameMode) where.gameMode = gameMode;
      if (cursor) where.id = { lt: cursor };

      const leagues = await prisma.league.findMany({
        where,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          _count: { select: { members: true } },
        },
      });

      const nextCursor = leagues.length === limit ? leagues[leagues.length - 1]?.id : undefined;
      return { leagues, nextCursor };
    }),

  /**
   * List leagues the current user is a member of.
   * Includes member count and the user's own team per league.
   */
  myLeagues: authedProcedure.query(async ({ ctx }) => {
    const { prisma, userId, tenantId } = ctx;

    const memberships = await prisma.userLeague.findMany({
      where: { userId, league: { tenantId } },
      include: {
        league: {
          include: {
            _count: { select: { members: true } },
            teams: {
              where: { userId },
              take: 1,
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.league,
      role: m.role,
      joinedAt: m.joinedAt,
      myTeam: m.league.teams[0] ?? null,
      memberCount: m.league._count.members,
    }));
  }),

  /**
   * Get a single league by ID.
   * Includes members (with user info), teams, and current user's membership status.
   */
  getById: authedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { prisma, userId, tenantId } = ctx;

      const league = await prisma.league.findFirst({
        where: { id: input.id, tenantId },
        include: {
          members: {
            include: { user: { select: { id: true, username: true, firstName: true, lastName: true, email: true, avatar: true } } },
          },
          teams: {
            orderBy: { points: 'desc' },
          },
        },
      });

      if (!league) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'League not found.' });
      }

      const myMembership = league.members.find((m) => m.userId === userId) ?? null;

      return { ...league, myMembership };
    }),

  /**
   * Get standings for a league — teams ordered by points descending.
   * When roundId is absent: returns Team.points (season totals).
   * When roundId is provided: computes per-round points from TeamPlayerSnapshot + ScoringEvent.
   * Includes user avatar and username per team.
   */
  standings: authedProcedure
    .input(leagueStandingsInputSchema)
    .query(async ({ ctx, input }) => {
      const { prisma, tenantId } = ctx;
      const { leagueId, roundId } = input;

      // Per-round standings: compute points from TeamPlayerSnapshot + ScoringEvent
      if (roundId !== undefined) {
        // Use basePrisma with explicit transaction to set RLS context for raw query
        // The extended ctx.prisma doesn't handle $queryRaw inside its $allOperations wrapper
        const safeTenantId = tenantId.replace(/'/g, "''");
        
        const result = await basePrisma.$transaction(async (tx) => {
          // Set RLS context for raw query
          await tx.$executeRawUnsafe(`SET LOCAL "app.current_tenant" = '${safeTenantId}'`);

          return tx.$queryRaw<
            Array<{
              teamId: number;
              teamName: string;
              userId: string;
              budget: number;
              totalCost: number;
              wins: number;
              losses: number;
              draws: number;
              points: bigint;
              username: string | null;
              firstName: string | null;
              lastName: string | null;
              email: string;
              avatar: string | null;
            }>
          >`
            SELECT
              t.id AS "teamId",
              t.name AS "teamName",
              t."userId",
              t.budget,
              t."totalCost",
              t.wins,
              t.losses,
              t.draws,
              COALESCE(SUM(se.points), 0)::bigint AS points,
              u.username,
              u."firstName",
              u."lastName",
              u.email,
              u.avatar
            FROM teams t
            LEFT JOIN team_player_snapshots tps
              ON tps."teamId" = t.id
              AND tps."roundId" = ${roundId}
              AND tps."tenantId" = ${tenantId}
            LEFT JOIN scoring_events se
              ON se."playerId" = tps."playerId"
              AND se."roundId" = ${roundId}
              AND se."tenantId" = ${tenantId}
            JOIN users u ON u.id = t."userId"
            WHERE t."leagueId" = ${leagueId}
              AND t."tenantId" = ${tenantId}
            GROUP BY t.id, t.name, t."userId", t.budget, t."totalCost", t.wins, t.losses, t.draws,
                     u.username, u."firstName", u."lastName", u.email, u.avatar
            ORDER BY points DESC, t.name ASC
          `;
        });

        return result.map((row, index) => ({
          id: row.teamId,
          tenantId,
          leagueId,
          name: row.teamName,
          userId: row.userId,
          budget: row.budget,
          totalCost: row.totalCost,
          points: Number(row.points),
          wins: row.wins,
          losses: row.losses,
          draws: row.draws,
          rank: index + 1,
          user: {
            id: row.userId,
            username: row.username,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            avatar: row.avatar,
          },
        }));
      }

      // Season totals: use existing Team.points
      const teams = await prisma.team.findMany({
        where: { leagueId, tenantId },
        orderBy: { points: 'desc' },
        include: {
          user: { select: { id: true, username: true, firstName: true, lastName: true, email: true, avatar: true } },
        },
      });

      return teams.map((team, index) => ({ ...team, rank: index + 1 }));
    }),

  /**
   * Create a new league.
   * Season is resolved from the tenant's active Tournament — throws if none found.
   * Creates League + UserLeague (creator role) + blank Team in a single transaction.
   */
  create: authedProcedure
    .input(createLeagueSchema)
    .mutation(async ({ ctx, input }) => {
      const { prisma, userId, tenantId } = ctx;

      // Resolve season from the tenant's active (or most recent) tournament
      const tournament = await prisma.tournament.findFirst({
        where: {
          tenantId,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        orderBy: { startDate: 'desc' },
      });

      if (!tournament) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No active tournament found for this competition.',
        });
      }

      const inviteCode = nanoid(8);

      const [league] = await prisma.$transaction([
        prisma.league.create({
          data: {
            tenantId,
            name: input.name,
            creatorId: userId,
            sportType: tournament.name, // derived from tenant's tournament
            gameMode: input.gameMode,
            format: input.format ?? 'classic',
            season: tournament.season,
            status: 'draft',
            isPublic: input.isPublic,
            inviteCode,
            maxParticipants: input.maxParticipants,
            rules: input.rules ?? {},
          },
        }),
      ]);

      // Create creator's UserLeague and blank Team (cannot be in same transaction as league.create
      // due to FK dependency, so we use nested creates via update)
      await prisma.league.update({
        where: { id: league.id },
        data: {
          members: {
            create: { userId, role: 'creator' },
          },
          teams: {
            create: {
              tenantId,
              userId,
              name: input.teamName,
              budget: input.rules?.priceCap ?? 42_000_000,
            },
          },
        },
      });

      return league;
    }),

  /**
   * Join a league using an 8-character invite code.
   * Atomically creates UserLeague + Team.
   * Throws if: code not found, league full, or user already a member.
   */
  join: authedProcedure
    .input(joinLeagueByCodeSchema)
    .mutation(async ({ ctx, input }) => {
      const { prisma, userId, tenantId } = ctx;

      const league = await prisma.league.findFirst({
        where: { inviteCode: input.inviteCode },
        include: { _count: { select: { members: true } } },
      });

      if (!league) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invite code not found or expired.',
        });
      }

      if (league.maxParticipants && league._count.members >= league.maxParticipants) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This league has reached its participant limit.',
        });
      }

      // Check for existing membership (@@unique enforced at DB level too)
      const existing = await prisma.userLeague.findUnique({
        where: { userId_leagueId: { userId, leagueId: league.id } },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'You are already a member of this league.',
        });
      }

      await prisma.$transaction([
        prisma.userLeague.create({
          data: { userId, leagueId: league.id, role: 'member' },
        }),
        prisma.team.create({
          data: {
            tenantId,
            userId,
            leagueId: league.id,
            name: input.teamName,
            // Derive budget from the league's price cap; fall back to 42M if unlimited.
            budget: (league.rules as LeagueRules | null)?.priceCap ?? 42_000_000,
          },
        }),
      ]);

      return { leagueId: league.id, leagueName: league.name };
    }),

  /**
   * Leave a league.
   * Creators cannot leave — they must delete the league.
   */
  leave: authedProcedure
    .input(z.object({ leagueId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { prisma, userId } = ctx;

      const membership = await prisma.userLeague.findUnique({
        where: { userId_leagueId: { userId, leagueId: input.leagueId } },
      });

      if (!membership) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'You are not a member of this league.' });
      }

      if (membership.role === 'creator') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'League creators cannot leave. Delete the league instead.',
        });
      }

      await prisma.userLeague.delete({
        where: { userId_leagueId: { userId, leagueId: input.leagueId } },
      });

      return { success: true };
    }),

  /**
   * Update a league — creator only.
   * Always replaces the full rules blob.
   */
  update: authedProcedure
    .input(updateLeagueSchema)
    .mutation(async ({ ctx, input }) => {
      const { prisma, userId, tenantId } = ctx;
      const { id, rules, ...rest } = input;

      const league = await prisma.league.findFirst({ where: { id, tenantId } });

      if (!league) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'League not found.' });
      }

      if (league.creatorId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the league creator can edit settings.',
        });
      }

      // ── Rule lock ───────────────────────────────────────────────────────────
      // Once a league moves out of draft, only maxParticipants can be changed
      // (and only increased — we never kick people out).
      if (league.status !== 'draft') {
        const { maxParticipants: newMax, ...lockedChanges } = rest;
        const hasLockedChange =
          Object.values(lockedChanges).some((v) => v !== undefined) ||
          rules !== undefined;

        if (hasLockedChange) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'League rules are locked once the league is active.',
          });
        }

        if (newMax !== undefined && newMax < league.maxParticipants) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot reduce max participants below current value (${league.maxParticipants}).`,
          });
        }
      }

      return prisma.league.update({
        where: { id },
        data: {
          ...rest,
          ...(rules !== undefined && { rules }),
        },
      });
    }),

  /**
   * Activate a league (draft → active) — creator only.
   * Once active, rules are locked; only maxParticipants may still be increased.
   */
  activate: authedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { prisma, userId, tenantId } = ctx;

      const league = await prisma.league.findFirst({
        where: { id: input.id, tenantId },
      });

      if (!league) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'League not found.' });
      }

      if (league.creatorId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the league creator can start the league.',
        });
      }

      if (league.status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `League is already ${league.status}.`,
        });
      }

      return prisma.league.update({
        where: { id: input.id },
        data: { status: 'active' },
      });
    }),

  /**
   * Delete a league — creator only.
   * Cascade handles UserLeague rows and Teams.
   */
  delete: authedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { prisma, userId, tenantId } = ctx;

      const league = await prisma.league.findFirst({ where: { id: input.id, tenantId } });

      if (!league) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'League not found.' });
      }

      if (league.creatorId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the league creator can delete this league.',
        });
      }

      await prisma.league.delete({ where: { id: input.id } });

      return { success: true };
    }),
});
