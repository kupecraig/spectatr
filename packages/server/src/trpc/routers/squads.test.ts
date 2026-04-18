/**
 * Squads Router Integration Tests
 *
 * Tests for tRPC squads router:
 * - list returns squads for current tenant only
 * - list returns empty for tenant with no squads
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCallerFactory } from '../index.js';
import { appRouter } from './_app.js';
import { createTestContext } from '../../test/helpers/context.js';
import { createTestTenant, createTestSquad } from '../../test/helpers/database.js';

describe('squads router', () => {
  // Test fixtures
  let tenantA: Awaited<ReturnType<typeof createTestTenant>>;
  let tenantB: Awaited<ReturnType<typeof createTestTenant>>;
  let squad1: Awaited<ReturnType<typeof createTestSquad>>;
  let squad2: Awaited<ReturnType<typeof createTestSquad>>;

  const createCaller = createCallerFactory(appRouter);

  beforeAll(async () => {
    // Create two tenants
    tenantA = await createTestTenant();
    tenantB = await createTestTenant();

    // Create squads only in tenant A
    squad1 = await createTestSquad(tenantA.tenant.id, {
      name: 'All Blacks',
      abbreviation: 'NZL',
    });

    squad2 = await createTestSquad(tenantA.tenant.id, {
      name: 'Springboks',
      abbreviation: 'RSA',
    });
  });

  afterAll(async () => {
    // Cleanup in reverse order
    await squad2?.cleanup();
    await squad1?.cleanup();
    await tenantB?.cleanup();
    await tenantA?.cleanup();
  });

  describe('list', () => {
    it('returns squads for the current tenant only', async () => {
      const ctx = await createTestContext(tenantA.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.squads.list();

      expect(result).toHaveLength(2);
      expect(result.map((s) => s.abbreviation)).toEqual(
        expect.arrayContaining(['NZL', 'RSA'])
      );
    });

    it('returns empty for tenant with no squads', async () => {
      // Tenant B has no squads
      const ctx = await createTestContext(tenantB.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.squads.list();

      expect(result).toHaveLength(0);
    });
  });
});
