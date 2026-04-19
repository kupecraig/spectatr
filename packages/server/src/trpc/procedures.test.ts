/**
 * Admin Procedure Integration Tests
 *
 * Tests for the adminProcedure:
 * - Returns FORBIDDEN for authenticated user with isAdmin = false
 * - Succeeds for authenticated user with isAdmin = true
 * - Returns UNAUTHORIZED for unauthenticated caller (inherited from authedProcedure)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TRPCError } from '@trpc/server';
import { router, createCallerFactory } from './index.js';
import { adminProcedure } from './procedures.js';
import { createTestContext, createAuthedTestContext } from '../test/helpers/context.js';
import { createTestTenant, createTestUser } from '../test/helpers/database.js';
import { prisma } from '../db/prisma.js';

// Create a test router with a simple admin-only procedure
const testRouter = router({
  adminOnly: adminProcedure.query(async () => {
    return { success: true, message: 'Admin access granted' };
  }),
});

const createCaller = createCallerFactory(testRouter);

describe('adminProcedure', () => {
  // Test fixtures
  let tenant: Awaited<ReturnType<typeof createTestTenant>>;
  let normalUser: Awaited<ReturnType<typeof createTestUser>>;
  let adminUser: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    // Create test tenant
    tenant = await createTestTenant();

    // Create a normal user (isAdmin = false by default)
    normalUser = await createTestUser();

    // Create an admin user and set isAdmin = true
    adminUser = await createTestUser();
    await prisma.user.update({
      where: { id: adminUser.user.id },
      data: { isAdmin: true },
    });
  });

  afterAll(async () => {
    // Cleanup in reverse order
    await adminUser?.cleanup();
    await normalUser?.cleanup();
    await tenant?.cleanup();
  });

  it('returns UNAUTHORIZED for unauthenticated caller', async () => {
    // Create unauthenticated context (no userId or clerkUserId)
    const ctx = await createTestContext(tenant.tenant.id);
    const caller = createCaller(ctx);

    // Capture promise once to avoid re-executing the procedure
    const promise = caller.adminOnly();
    await expect(promise).rejects.toThrow(TRPCError);
    await expect(promise).rejects.toThrow(/Authentication required/);
  });

  it('returns FORBIDDEN for authenticated user with isAdmin = false', async () => {
    // Create authenticated context with normal user
    const ctx = await createAuthedTestContext(
      tenant.tenant.id,
      normalUser.user.clerkUserId,
      normalUser.user.id
    );
    const caller = createCaller(ctx);

    // Capture promise once to avoid re-executing the procedure
    const promise = caller.adminOnly();
    await expect(promise).rejects.toThrow(TRPCError);
    await expect(promise).rejects.toThrow(/Admin access required/);
  });

  it('succeeds for authenticated user with isAdmin = true', async () => {
    // Create authenticated context with admin user
    const ctx = await createAuthedTestContext(
      tenant.tenant.id,
      adminUser.user.clerkUserId,
      adminUser.user.id
    );
    const caller = createCaller(ctx);

    const result = await caller.adminOnly();

    expect(result).toEqual({
      success: true,
      message: 'Admin access granted',
    });
  });

  it('returns correct TRPC error code for unauthenticated caller', async () => {
    const ctx = await createTestContext(tenant.tenant.id);
    const caller = createCaller(ctx);

    try {
      await caller.adminOnly();
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe('UNAUTHORIZED');
    }
  });

  it('returns correct TRPC error code for non-admin user', async () => {
    const ctx = await createAuthedTestContext(
      tenant.tenant.id,
      normalUser.user.clerkUserId,
      normalUser.user.id
    );
    const caller = createCaller(ctx);

    try {
      await caller.adminOnly();
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe('FORBIDDEN');
    }
  });
});
