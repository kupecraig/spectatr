import { Request, Response } from 'express';
import { Tenant } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { prisma } from '../db/prisma.js';

/**
 * Create tenant-scoped Prisma client.
 *
 * Two complementary layers of tenant isolation:
 *
 *  Layer 1 — PostgreSQL RLS (primary, production):
 *    Sets `app.current_tenant` via SET LOCAL inside a transaction.
 *    Effective when connecting as the `spectatr_app` role (see migration
 *    20260222000000_add_rls). Superusers (postgres) bypass RLS by design,
 *    so seeds and migrations are unaffected.
 *
 *  Layer 2 — Application-level filtering (belt-and-suspenders, local dev):
 *    Injects `tenantId` into every Prisma where/create/update clause,
 *    ensuring isolation even when connected as the postgres superuser.
 */

// Prisma model names lowercased — these models carry a tenantId column
const TENANT_SCOPED_MODELS = new Set([
  'player', 'squad', 'round', 'tournament', 'league', 'team',
  'gameweekstate', 'scoringevent', 'checksum',
]);

function createTenantScopedPrisma(tenantId: string) {
  const safeTenantId = tenantId.replaceAll("'", "''");

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // ── Layer 2: inject tenantId into Prisma where/create/update ──
          if (model && TENANT_SCOPED_MODELS.has(model.toLowerCase())) {
            if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'groupBy'].includes(operation)) {
              args.where = { ...args.where, tenantId };
            }
            if (operation === 'create') {
              args.data = { ...args.data, tenantId };
            }
            if (operation === 'createMany') {
              const records = Array.isArray(args.data) ? args.data : [args.data];
              args.data = records.map((r: Record<string, unknown>) => ({ ...r, tenantId }));
            }
            if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
              args.where = { ...args.where, tenantId };
            }
          }

          // ── Layer 1: set PostgreSQL session variable for RLS policies ──
          const [, result] = await prisma.$transaction([
            prisma.$executeRawUnsafe(
              `SET LOCAL "app.current_tenant" = '${safeTenantId}'`
            ),
            query(args),
          ]);
          return result;
        },
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
