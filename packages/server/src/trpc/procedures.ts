/**
 * tRPC Procedures
 * 
 * Base procedures with common middleware applied.
 */

import { TRPCError } from '@trpc/server';
import { publicProcedure, middleware } from './index.js';
import { loggingMiddleware, tenantMiddleware, auditMiddleware, authMiddleware } from './middleware.js';
import { prisma } from '../db/prisma.js';

/**
 * Base procedure with logging
 */
export const baseProcedure = publicProcedure.use(loggingMiddleware);

/**
 * Protected procedure with tenant validation
 * Use this for all tenant-scoped endpoints
 */
export const protectedProcedure = baseProcedure.use(tenantMiddleware);

/**
 * Authenticated procedure with tenant validation
 * Requires valid Clerk session + tenant header
 * Use this for endpoints that require user authentication (team creation, league management, etc.)
 */
export const authedProcedure = protectedProcedure.use(authMiddleware);

/**
 * Mutation procedure with audit logging
 * Use this for all mutations that should be audited (player selection, transfers, etc.)
 */
export const auditedProcedure = protectedProcedure.use(auditMiddleware);

/**
 * Admin middleware - requires isAdmin flag on user record
 * Fetches isAdmin from database (not JWT claims) for security.
 */
const adminMiddleware = middleware(async ({ ctx, next }) => {
  // userId is guaranteed by authedProcedure chain
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId! },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  return next({ ctx });
});

/**
 * Admin procedure - requires authentication AND isAdmin = true
 * Use this for admin-only endpoints (round finalisation, scoring rule management, etc.)
 * 
 * Note: isAdmin is a global flag on the User model.
 * Tenant-scoped admin roles are planned for Phase 2.
 */
export const adminProcedure = authedProcedure.use(adminMiddleware);
