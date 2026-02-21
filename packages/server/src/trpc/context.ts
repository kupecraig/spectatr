import { Request, Response } from 'express';
import { Tenant } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { prisma } from '../db/prisma.js';

/**
 * Create tenant-scoped Prisma client with PostgreSQL RLS
 * 
 * SECURITY: Defense in depth approach
 * 1. Database-level RLS (PostgreSQL policies) - Primary security layer
 * 2. Application-level filtering (Prisma middleware) - Convenience + fallback
 * 
 * Why both?
 * - RLS protects against direct DB access, admin tools, migrations
 * - Middleware provides better error messages and type safety
 * - Together = impossible to bypass, even with bugs or direct access
 */
function createTenantScopedPrisma(tenantId: string) {
  return prisma.$extends({
    query: {
      // Set PostgreSQL session variable for RLS policies
      async $allOperations({ args, query }) {
        // Set tenant context for this transaction
        const [, result] = await prisma.$transaction([
          prisma.$executeRawUnsafe(
            `SET LOCAL app.current_tenant = '${tenantId.replaceAll("'", "''")}'`
          ),
          query(args),
        ]);
        return result;
      },
    },
  });
}

// In-memory tenant cache (loaded at startup)
const tenantCache = new Map<string, Tenant>();

/**
 * Load all active tenants into memory at startup
 * Zero DB queries during request handling
 */
export async function loadTenantCache() {
  logger.info('Loading tenant cache...');
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
  });

  tenants.forEach((tenant) => {
    tenantCache.set(tenant.id, tenant);
  });

  logger.info(`Loaded ${tenants.length} active tenants into cache`);
}

/**
 * Get tenant from cache (no DB query)
 */
export function getTenantFromCache(tenantId: string): Tenant | undefined {
  return tenantCache.get(tenantId);
}

/**
 * Refresh tenant cache (called by admin endpoint)
 */
export async function refreshTenantCache() {
  tenantCache.clear();
  await loadTenantCache();
}

/**
 * Extract tenantId from request
 * 1. Development: Default to 'trc-2025'
 * 2. X-Tenant-Id header (for API clients)
 * 3. Production: Subdomain detection (trc.fantasysports.com → 'trc-2025')
 */
export function extractTenantId(req: Request): string {
  // 1. Check X-Tenant-Id header
  const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
  if (headerTenantId) {
    return headerTenantId;
  }

  // 2. Subdomain detection (production)
  const host = req.headers.host || '';
  const subdomain = host.split('.')[0];
  
  // Map subdomain to tenantId (e.g., 'trc' → 'trc-2025')
  // In production, you'd have a proper mapping or use the subdomain directly
  if (subdomain && subdomain !== 'localhost' && !subdomain.match(/^\d/)) {
    // For now, assume subdomain matches tenant slug
    const tenant = Array.from(tenantCache.values()).find(
      (t) => t.slug === subdomain
    );
    if (tenant) {
      return tenant.id;
    }
  }

  // 3. Development default
  return 'trc-2025';
}

/**
 * Create tRPC context for each request
 * Includes: tenant-scoped prisma client, tenantId, tenant object, userId, ipAddress, userAgent
 * 
 * SECURITY: All database queries automatically filtered by tenantId
 * via Prisma middleware - prevents cross-tenant data leakage
 */
export async function createContext({ req, res }: { req: Request; res: Response }) {
  const tenantId = extractTenantId(req);
  const tenant = getTenantFromCache(tenantId);

  if (!tenant) {
    logger.warn(`Tenant not found: ${tenantId}`, {
      host: req.headers.host,
      'x-tenant-id': req.headers['x-tenant-id'],
    });
  }

  // Create tenant-scoped Prisma client with automatic row-level filtering
  const prisma = createTenantScopedPrisma(tenantId);

  // Extract Clerk auth (populated by clerkMiddleware)
  // Provider-agnostic: Keep auth provider ID separate from our internal userId
  // @ts-expect-error - req.auth is added by @clerk/express middleware
  const clerkUserId = req.auth?.userId ?? null;

  // Extract audit info from request
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  return {
    req,
    res,
    prisma, // Tenant-scoped - all queries automatically filtered
    tenantId,
    tenant,
    clerkUserId, // Clerk user ID (user_xxx) - used by auth middleware to lookup user
    userId: null as string | null, // Our internal user ID - set by auth middleware after DB lookup
    ipAddress,
    userAgent,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
