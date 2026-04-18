/**
 * Test Context Helpers
 *
 * Creates tRPC contexts for integration tests.
 * Uses createTenantScopedPrisma directly (no tenant cache, no HTTP layer).
 */

import { vi } from 'vitest';
import { Request, Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { createTenantScopedPrisma } from '../../trpc/context.js';
import type { Context } from '../../trpc/context.js';

/**
 * Create a minimal mock Express request object.
 * Sets headers for tenant resolution.
 */
function createMockRequest(tenantId: string, clerkUserId?: string): Partial<Request> {
  return {
    headers: {
      'x-tenant-id': tenantId,
      host: 'localhost',
    },
    socket: {
      remoteAddress: '127.0.0.1',
    } as any,
    // Clerk auth info (populated by clerkMiddleware in production)
    // @ts-expect-error - req.auth is added by @clerk/express middleware
    auth: clerkUserId ? { userId: clerkUserId } : undefined,
  };
}

/**
 * Create a minimal mock Express response object.
 * Includes setHeader to avoid errors when routers set cache headers.
 */
function createMockResponse(): Partial<Response> {
  return {
    setHeader: vi.fn(),
  };
}

/**
 * Create a test context for unauthenticated tRPC procedures.
 *
 * Loads the Tenant row from DB and injects it directly into ctx.tenant.
 * Does NOT call loadTenantCache() — tests are self-contained.
 *
 * @param tenantId - The ID of a tenant that already exists in the database
 */
export async function createTestContext(tenantId: string): Promise<Context> {
  // Load tenant from DB (must exist before calling this function)
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error(
      `createTestContext: Tenant not found: ${tenantId}. ` +
        'Did you call createTestTenant() in beforeAll?'
    );
  }

  const scopedPrisma = createTenantScopedPrisma(tenantId);

  return {
    req: createMockRequest(tenantId) as Request,
    res: createMockResponse() as Response,
    prisma: scopedPrisma,
    tenantId,
    tenant,
    clerkUserId: null,
    userId: null,
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
  };
}

/**
 * Create a test context for authenticated tRPC procedures.
 *
 * Sets both clerkUserId and userId so authMiddleware skips the Clerk API call.
 * The userId is our internal user ID (cuid) that would normally be set by authMiddleware
 * after looking up the user in the database.
 *
 * @param tenantId - The ID of a tenant that already exists in the database
 * @param clerkUserId - The Clerk user ID (e.g., 'user_test_abc123')
 * @param userId - Our internal user ID (cuid) — simulates what authMiddleware sets
 */
export async function createAuthedTestContext(
  tenantId: string,
  clerkUserId: string,
  userId: string
): Promise<Context> {
  // Load tenant from DB
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error(
      `createAuthedTestContext: Tenant not found: ${tenantId}. ` +
        'Did you call createTestTenant() in beforeAll?'
    );
  }

  const scopedPrisma = createTenantScopedPrisma(tenantId);

  return {
    req: createMockRequest(tenantId, clerkUserId) as Request,
    res: createMockResponse() as Response,
    prisma: scopedPrisma,
    tenantId,
    tenant,
    clerkUserId,
    userId, // Pre-set userId causes authMiddleware to skip Clerk lookup
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
  };
}
