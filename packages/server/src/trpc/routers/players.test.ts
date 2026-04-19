/**
 * Players Router Integration Tests
 *
 * Tests for tRPC players router:
 * - list returns players for correct tenant
 * - list returns empty for different tenant (tenant isolation proof)
 * - filter by position
 * - filter by search text
 * - sort by totalPoints (DESC)
 * - sort by cost (ASC)
 * - getById returns player
 * - getById throws NOT_FOUND for player in a different tenant
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCallerFactory } from '../index.js';
import { appRouter } from './_app.js';
import { createTestContext } from '../../test/helpers/context.js';
import {
  createTestTenant,
  createTestSquad,
  createTestPlayer,
} from '../../test/helpers/database.js';

describe('players router', () => {
  // Test fixtures
  let tenantA: Awaited<ReturnType<typeof createTestTenant>>;
  let tenantB: Awaited<ReturnType<typeof createTestTenant>>;
  let squadA: Awaited<ReturnType<typeof createTestSquad>>;
  let player1: Awaited<ReturnType<typeof createTestPlayer>>;
  let player2: Awaited<ReturnType<typeof createTestPlayer>>;
  let player3: Awaited<ReturnType<typeof createTestPlayer>>;

  const createCaller = createCallerFactory(appRouter);

  beforeAll(async () => {
    // Create two tenants for isolation tests
    tenantA = await createTestTenant();
    tenantB = await createTestTenant();

    // Create a squad in tenant A
    squadA = await createTestSquad(tenantA.tenant.id);

    // Create players in tenant A with varying costs and points
    player1 = await createTestPlayer(tenantA.tenant.id, squadA.squad.id, {
      firstName: 'John',
      lastName: 'Smith',
      position: 'fly_half',
      cost: 5000000,
      totalPoints: 100,
      avgPoints: 10.0,
      lastRoundPoints: 15,
    });

    player2 = await createTestPlayer(tenantA.tenant.id, squadA.squad.id, {
      firstName: 'Jane',
      lastName: 'Doe',
      position: 'scrum_half',
      cost: 4500000,
      totalPoints: 50,
      avgPoints: 5.0,
      lastRoundPoints: 8,
    });

    player3 = await createTestPlayer(tenantA.tenant.id, squadA.squad.id, {
      firstName: 'Bob',
      lastName: 'Wilson',
      position: 'fly_half',
      cost: 6000000,
      totalPoints: 150,
      avgPoints: 15.0,
      lastRoundPoints: 20,
    });
  });

  afterAll(async () => {
    // Cleanup in reverse order of creation (respects FK constraints)
    await player3?.cleanup();
    await player2?.cleanup();
    await player1?.cleanup();
    await squadA?.cleanup();
    await tenantB?.cleanup();
    await tenantA?.cleanup();
  });

  describe('list', () => {
    it('returns players for the correct tenant', async () => {
      const ctx = await createTestContext(tenantA.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.players.list({});

      expect(result.total).toBe(3);
      expect(result.players).toHaveLength(3);
      expect(result.players.map((p) => p.id)).toEqual(
        expect.arrayContaining([player1.player.id, player2.player.id, player3.player.id])
      );
    });

    it('returns empty for a different tenant (tenant isolation)', async () => {
      // Tenant B has no players - should see zero players from tenant A
      const ctx = await createTestContext(tenantB.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.players.list({});

      expect(result.total).toBe(0);
      expect(result.players).toHaveLength(0);
    });

    it('filters by position', async () => {
      const ctx = await createTestContext(tenantA.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.players.list({ position: 'fly_half' });

      expect(result.total).toBe(2);
      expect(result.players).toHaveLength(2);
      expect(result.players.map((p) => p.firstName)).toEqual(
        expect.arrayContaining(['John', 'Bob'])
      );
    });

    it('filters by search text (lastName)', async () => {
      const ctx = await createTestContext(tenantA.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.players.list({ search: 'Smith' });

      expect(result.total).toBe(1);
      expect(result.players).toHaveLength(1);
      expect(result.players[0].lastName).toBe('Smith');
    });

    it('sorts by totalPoints in descending order', async () => {
      const ctx = await createTestContext(tenantA.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.players.list({ sortBy: 'totalPoints' });

      expect(result.total).toBe(3);
      expect(result.players).toHaveLength(3);
      // Player3 (150pts) > Player1 (100pts) > Player2 (50pts)
      expect(result.players[0].id).toBe(player3.player.id);
      expect(result.players[1].id).toBe(player1.player.id);
      expect(result.players[2].id).toBe(player2.player.id);
    });

    it('sorts by cost in ascending order', async () => {
      const ctx = await createTestContext(tenantA.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.players.list({ sortBy: 'cost' });

      expect(result.total).toBe(3);
      expect(result.players).toHaveLength(3);
      // Player2 (4.5M) < Player1 (5M) < Player3 (6M)
      expect(result.players[0].id).toBe(player2.player.id);
      expect(result.players[1].id).toBe(player1.player.id);
      expect(result.players[2].id).toBe(player3.player.id);
    });

    it('returns totalPoints, avgPoints, lastRoundPoints in player objects', async () => {
      const ctx = await createTestContext(tenantA.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.players.list({});

      // Find player1 in results
      const player1Result = result.players.find((p) => p.id === player1.player.id);
      expect(player1Result).toBeDefined();
      expect(player1Result?.totalPoints).toBe(100);
      expect(player1Result?.avgPoints).toBe(10.0);
      expect(player1Result?.lastRoundPoints).toBe(15);
    });
  });

  describe('getById', () => {
    it('returns the player when it exists in the current tenant', async () => {
      const ctx = await createTestContext(tenantA.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.players.getById({ id: player1.player.id });

      expect(result.id).toBe(player1.player.id);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Smith');
      expect(result.position).toBe('fly_half');
    });

    it('throws NOT_FOUND when player belongs to a different tenant', async () => {
      // Try to access player1 (tenant A) from tenant B context
      const ctx = await createTestContext(tenantB.tenant.id);
      const caller = createCaller(ctx);

      await expect(
        caller.players.getById({ id: player1.player.id })
      ).rejects.toThrow(/Player not found/);
    });
  });
});
