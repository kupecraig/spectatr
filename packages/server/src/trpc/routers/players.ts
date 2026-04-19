import { z } from 'zod';
import { Prisma, Player } from '@prisma/client';
import { router } from '../index.js';
import { protectedProcedure } from '../procedures.js';
import { playerStatusSchema, PlayerSortBySchema } from '@spectatr/shared-types';

// Native columns that can be sorted directly via Prisma orderBy
const NATIVE_SORT_COLUMNS = ['totalPoints', 'avgPoints', 'lastRoundPoints', 'cost'] as const;

// Mapping from sort option to JSONB stat field name
const JSONB_STAT_FIELDS: Record<string, string> = {
  tries: 'tries',
  tackles: 'tackles',
  conversions: 'conversions',
  metresGained: 'metresGained',
};

export const playersRouter = router({
  /**
   * List players with filtering and sorting
   * Tenant-scoped, supports position, squad, price range, search, statuses
   * Sort options: native columns (totalPoints, avgPoints, lastRoundPoints, cost)
   *               or JSONB stats (tries, tackles, conversions, metresGained)
   */
  list: protectedProcedure
    .input(
      z.object({
        position: z.string().optional(),
        squadId: z.number().optional(),
        minCost: z.number().optional(),
        maxCost: z.number().optional(),
        search: z.string().optional(),
        statuses: z.array(playerStatusSchema).optional(),
        sortBy: PlayerSortBySchema.default('totalPoints'),
        limit: z.number().min(1).max(500).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { prisma, tenantId } = ctx;
      const { position, squadId, minCost, maxCost, search, statuses, sortBy, limit, offset } = input;

      // Build where clause - tenantId automatically injected by Prisma middleware
      const where: Prisma.PlayerWhereInput = {};

      if (position) {
        where.position = position;
      }

      if (squadId) {
        where.squadId = squadId;
      }

      if (minCost !== undefined || maxCost !== undefined) {
        where.cost = {};
        if (minCost !== undefined) where.cost.gte = minCost;
        if (maxCost !== undefined) where.cost.lte = maxCost;
      }

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (statuses?.length) {
        where.status = { in: statuses };
      }

      // Get total count (same regardless of sort method)
      const total = await prisma.player.count({ where });

      // Check if we need JSONB sorting
      const jsonbField = JSONB_STAT_FIELDS[sortBy];

      let players: Player[];

      if (jsonbField) {
        // JSONB stat sorting requires raw SQL
        // Build where conditions for raw query
        const whereConditions: string[] = [`"tenantId" = $1`];
        const params: unknown[] = [tenantId];
        let paramIndex = 2;

        if (position) {
          whereConditions.push(`"position" = $${paramIndex++}`);
          params.push(position);
        }

        if (squadId) {
          whereConditions.push(`"squadId" = $${paramIndex++}`);
          params.push(squadId);
        }

        if (minCost !== undefined) {
          whereConditions.push(`"cost" >= $${paramIndex++}`);
          params.push(minCost);
        }

        if (maxCost !== undefined) {
          whereConditions.push(`"cost" <= $${paramIndex++}`);
          params.push(maxCost);
        }

        if (search) {
          whereConditions.push(
            `("firstName" ILIKE $${paramIndex} OR "lastName" ILIKE $${paramIndex})`
          );
          params.push(`%${search}%`);
          paramIndex++;
        }

        if (statuses?.length) {
          const statusPlaceholders = statuses.map(() => `$${paramIndex++}`).join(', ');
          whereConditions.push(`"status" IN (${statusPlaceholders})`);
          params.push(...statuses);
        }

        params.push(limit, offset);
        const limitParam = paramIndex++;
        const offsetParam = paramIndex++;

        const whereClause = whereConditions.join(' AND ');

        // Query with JSONB field ordering (cast to numeric, nulls last)
        players = await prisma.$queryRawUnsafe<Player[]>(
          `SELECT * FROM "players" WHERE ${whereClause} ORDER BY (stats->>'${jsonbField}')::numeric DESC NULLS LAST, "lastName" ASC LIMIT $${limitParam} OFFSET $${offsetParam}`,
          ...params
        );
      } else {
        // Native column sorting via Prisma orderBy
        const isNativeColumn = (NATIVE_SORT_COLUMNS as readonly string[]).includes(sortBy);
        const sortDirection = sortBy === 'cost' ? 'asc' : 'desc';

        const orderBy: Prisma.PlayerOrderByWithRelationInput[] = isNativeColumn
          ? [{ [sortBy]: sortDirection }, { lastName: 'asc' }]
          : [{ totalPoints: 'desc' }, { lastName: 'asc' }]; // Fallback

        players = await prisma.player.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy,
        });
      }

      return {
        players,
        total,
        limit,
        offset,
      };
    }),

  /**
   * Get single player by ID
   * Tenant-scoped
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { prisma } = ctx;

      // tenantId automatically injected - will only find player if it belongs to this tenant
      const player = await prisma.player.findFirst({
        where: {
          id: input.id,
        },
      });

      if (!player) {
        throw new Error(`Player not found: ${input.id}`);
      }

      return player;
    }),
});
