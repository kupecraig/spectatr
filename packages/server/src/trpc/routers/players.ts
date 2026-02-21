import { z } from 'zod';
import { router } from '../index.js';
import { protectedProcedure } from '../procedures.js';

export const playersRouter = router({
  /**
   * List players with filtering
   * Tenant-scoped, supports position, squad, price range, search
   */
  list: protectedProcedure
    .input(
      z.object({
        position: z.string().optional(),
        squadId: z.number().optional(),
        minCost: z.number().optional(),
        maxCost: z.number().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { prisma } = ctx;
      const { position, squadId, minCost, maxCost, search, limit, offset } = input;

      // Build where clause - tenantId automatically injected by Prisma middleware
      const where: any = {};

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

      // Fetch players and total count
      const [players, total] = await Promise.all([
        prisma.player.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: [{ cost: 'desc' }, { lastName: 'asc' }],
        }),
        prisma.player.count({ where }),
      ]);

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
