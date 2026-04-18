/**
 * Gameweek Router Integration Tests
 *
 * Tests for tRPC gameweek router:
 * - current returns live gameweek state
 * - current returns default values { currentRound: 1, status: 'pre_round' } when no GameweekState row exists
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCallerFactory } from '../index.js';
import { appRouter } from './_app.js';
import { createTestContext } from '../../test/helpers/context.js';
import { createTestTenant, createTestGameweekState } from '../../test/helpers/database.js';

describe('gameweek router', () => {
  // Test fixtures
  let tenantA: Awaited<ReturnType<typeof createTestTenant>>;
  let tenantB: Awaited<ReturnType<typeof createTestTenant>>;
  let gameweekState: Awaited<ReturnType<typeof createTestGameweekState>> | null = null;

  const createCaller = createCallerFactory(appRouter);

  beforeAll(async () => {
    // Create two tenants
    tenantA = await createTestTenant();
    tenantB = await createTestTenant(); // Will have no GameweekState
  });

  afterAll(async () => {
    // Cleanup in reverse order
    await gameweekState?.cleanup();
    await tenantB?.cleanup();
    await tenantA?.cleanup();
  });

  describe('current', () => {
    it('returns default values when no GameweekState row exists', async () => {
      // Tenant A has no GameweekState yet
      const ctx = await createTestContext(tenantA.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.gameweek.current();

      expect(result).toEqual({
        currentRound: 1,
        status: 'pre_round',
        deadline: null,
        nextRoundStarts: null,
      });
    });

    it('returns live gameweek state when it exists', async () => {
      // Create gameweek state for tenant A
      const deadline = new Date('2025-06-15T12:00:00Z');
      const nextRoundStarts = new Date('2025-06-22T12:00:00Z');

      gameweekState = await createTestGameweekState(tenantA.tenant.id, {
        currentRound: 5,
        status: 'active',
        deadline,
        nextRoundStarts,
      });

      const ctx = await createTestContext(tenantA.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.gameweek.current();

      expect(result.currentRound).toBe(5);
      expect(result.status).toBe('active');
      expect(result.deadline).toEqual(deadline);
      expect(result.nextRoundStarts).toEqual(nextRoundStarts);
    });
  });
});
