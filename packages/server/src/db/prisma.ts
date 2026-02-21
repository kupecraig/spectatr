/**
 * Shared Prisma client instance
 * 
 * Used by:
 * - tRPC context (for HTTP requests with tenant scoping)
 * - Background jobs (direct multi-tenant queries)
 * - Database scripts and utilities
 * 
 * ⚠️ WARNING: This is the base client without tenant scoping
 * For HTTP requests, use ctx.prisma (tenant-scoped) from tRPC context
 */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
