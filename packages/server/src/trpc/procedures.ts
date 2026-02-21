/**
 * tRPC Procedures
 * 
 * Base procedures with common middleware applied.
 */

import { publicProcedure } from './index.js';
import { loggingMiddleware, tenantMiddleware, auditMiddleware, authMiddleware } from './middleware.js';

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
