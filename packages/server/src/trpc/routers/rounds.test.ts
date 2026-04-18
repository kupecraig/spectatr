/**
 * Rounds Router Integration Tests
 *
 * Tests for tRPC rounds router:
 * - list returns rounds with isCurrent flag
 * - list returns isCurrent: false for all rounds when no GameweekState row exists
 * - list returns correct currentRound from GameweekState
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCallerFactory } from '../index.js';
import { appRouter } from './_app.js';
import { createTestContext } from '../../test/helpers/context.js';
import {
  createTestTenant,
  createTestTournament,
  createTestRound,
  createTestGameweekState,
} from '../../test/helpers/database.js';

describe('rounds router', () => {
  // Test fixtures
  let tenantA: Awaited<ReturnType<typeof createTestTenant>>;
  let tenantB: Awaited<ReturnType<typeof createTestTenant>>;
  let tournament: Awaited<ReturnType<typeof createTestTournament>>;
  let round1: Awaited<ReturnType<typeof createTestRound>>;
  let round2: Awaited<ReturnType<typeof createTestRound>>;
  let round3: Awaited<ReturnType<typeof createTestRound>>;
  let gameweekState: Awaited<ReturnType<typeof createTestGameweekState>> | null = null;

  const createCaller = createCallerFactory(appRouter);

  beforeAll(async () => {
    // Create tenants
    tenantA = await createTestTenant();
    tenantB = await createTestTenant(); // No rounds, no gameweek state

    // Create tournament and rounds in tenant A
    tournament = await createTestTournament(tenantA.tenant.id, {
      name: 'Test Tournament 2025',
      season: '2025',
    });

    round1 = await createTestRound(tenantA.tenant.id, tournament.tournament.id, {
      roundNumber: 1,
      name: 'Round 1',
      status: 'complete',
    });

    round2 = await createTestRound(tenantA.tenant.id, tournament.tournament.id, {
      roundNumber: 2,
      name: 'Round 2',
      status: 'live',
    });

    round3 = await createTestRound(tenantA.tenant.id, tournament.tournament.id, {
      roundNumber: 3,
      name: 'Round 3',
      status: 'upcoming',
    });
  });

  afterAll(async () => {
    // Cleanup in reverse order
    await gameweekState?.cleanup();
    await round3?.cleanup();
    await round2?.cleanup();
    await round1?.cleanup();
    await tournament?.cleanup();
    await tenantB?.cleanup();
    await tenantA?.cleanup();
  });

  describe('list', () => {
    it('returns isCurrent: false for all rounds when no GameweekState row exists', async () => {
      const ctx = await createTestContext(tenantA.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.rounds.list();

      expect(result.rounds).toHaveLength(3);
      // No GameweekState → all rounds should have isCurrent: false
      expect(result.rounds.every((r) => r.isCurrent === false)).toBe(true);
      // Default values when no GameweekState
      expect(result.currentRound).toBe(1);
      expect(result.gameweekStatus).toBe('pre_round');
    });

    it('returns rounds with isCurrent flag when GameweekState exists', async () => {
      // Create gameweek state pointing to round 2
      gameweekState = await createTestGameweekState(tenantA.tenant.id, {
        currentRound: 2,
        status: 'active',
      });

      const ctx = await createTestContext(tenantA.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.rounds.list();

      expect(result.rounds).toHaveLength(3);
      // Only round 2 should have isCurrent: true
      const currentRounds = result.rounds.filter((r) => r.isCurrent);
      expect(currentRounds).toHaveLength(1);
      expect(currentRounds[0].roundNumber).toBe(2);
      expect(result.currentRound).toBe(2);
      expect(result.gameweekStatus).toBe('active');
    });

    it('returns correct currentRound from GameweekState', async () => {
      // gameweekState is already set from the previous test (currentRound: 2)
      const ctx = await createTestContext(tenantA.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.rounds.list();

      expect(result.currentRound).toBe(2);
      
      // Verify round details
      const round2Result = result.rounds.find((r) => r.roundNumber === 2);
      expect(round2Result?.isCurrent).toBe(true);
      expect(round2Result?.name).toBe('Round 2');
    });
  });
});
