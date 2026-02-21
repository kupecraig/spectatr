import { router } from '../index.js';
import { protectedProcedure } from '../procedures.js';

export const squadsRouter = router({
  /**
   * List all squads for the tenant
   * Static data - cache aggressively (24h TTL)
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const { prisma } = ctx;

    // tenantId automatically injected by Prisma middleware
    const squads = await prisma.squad.findMany({
      orderBy: { name: 'asc' },
    });

    // Set cache headers for 24 hours (squads don't change during season)
    ctx.res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');

    return squads;
  }),
});
