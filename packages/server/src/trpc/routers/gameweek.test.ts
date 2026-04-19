/**
 * Gameweek Router Integration Tests
 *
 * Tests for tRPC gameweek router:
 * - current returns live gameweek state
 * - current returns default values { currentRound: 1, status: 'pre_round' } when no GameweekState row exists
 * - finaliseRound updates Round.status, returns counts, works for admin
 * - finaliseRound throws FORBIDDEN for non-admin
 * - recalculateLive does not change Round.status
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TRPCError } from '@trpc/server';
import { createCallerFactory } from '../index.js';
import { appRouter } from './_app.js';
import { createTestContext, createAuthedTestContext } from '../../test/helpers/context.js';
import {
  createTestTenant,
  createTestGameweekState,
  createTestUser,
  createTestSquad,
  createTestPlayer,
  createTestTournament,
  createTestRound,
  createTestLeague,
  createTestTeam,
  createTestTeamPlayerSnapshot,
  createTestScoringEvent,
} from '../../test/helpers/database.js';
import { prisma } from '../../db/prisma.js';
import { createTenantScopedPrisma } from '../context.js';

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

  describe('finaliseRound', () => {
    // Test fixtures for finaliseRound
    let tenant: Awaited<ReturnType<typeof createTestTenant>>;
    let squad: Awaited<ReturnType<typeof createTestSquad>>;
    let player: Awaited<ReturnType<typeof createTestPlayer>>;
    let tournament: Awaited<ReturnType<typeof createTestTournament>>;
    let round: Awaited<ReturnType<typeof createTestRound>>;
    let normalUser: Awaited<ReturnType<typeof createTestUser>>;
    let adminUser: Awaited<ReturnType<typeof createTestUser>>;
    let league: Awaited<ReturnType<typeof createTestLeague>>;
    let team: Awaited<ReturnType<typeof createTestTeam>>;
    let snapshot: Awaited<ReturnType<typeof createTestTeamPlayerSnapshot>>;
    let event: Awaited<ReturnType<typeof createTestScoringEvent>>;

    beforeAll(async () => {
      // Create test data
      tenant = await createTestTenant();
      squad = await createTestSquad(tenant.tenant.id);
      player = await createTestPlayer(tenant.tenant.id, squad.squad.id);
      tournament = await createTestTournament(tenant.tenant.id);
      round = await createTestRound(tenant.tenant.id, tournament.tournament.id, {
        roundNumber: 1,
        status: 'active',
      });
      normalUser = await createTestUser();
      adminUser = await createTestUser();
      
      // Set admin flag
      await prisma.user.update({
        where: { id: adminUser.user.id },
        data: { isAdmin: true },
      });
      
      league = await createTestLeague(tenant.tenant.id, adminUser.user.id);
      team = await createTestTeam(tenant.tenant.id, adminUser.user.id, league.league.id);
      snapshot = await createTestTeamPlayerSnapshot(
        tenant.tenant.id,
        team.team.id,
        league.league.id,
        round.round.id,
        player.player.id,
        'fly_half'
      );
      event = await createTestScoringEvent(
        tenant.tenant.id,
        player.player.id,
        round.round.id,
        'T',
        15
      );
    });

    afterAll(async () => {
      await event?.cleanup();
      await snapshot?.cleanup();
      await team?.cleanup();
      await league?.cleanup();
      await adminUser?.cleanup();
      await normalUser?.cleanup();
      await round?.cleanup();
      await tournament?.cleanup();
      await player?.cleanup();
      await squad?.cleanup();
      await tenant?.cleanup();
    });

    it('throws FORBIDDEN for non-admin user', async () => {
      const ctx = await createAuthedTestContext(
        tenant.tenant.id,
        normalUser.user.clerkUserId,
        normalUser.user.id
      );
      const caller = createCaller(ctx);

      const promise = caller.gameweek.finaliseRound({ roundId: round.round.id });
      await expect(promise).rejects.toThrow(TRPCError);
      await expect(promise).rejects.toThrow(/Admin access required/);
    });

    it('updates Round.status and returns counts for admin', async () => {
      const ctx = await createAuthedTestContext(
        tenant.tenant.id,
        adminUser.user.clerkUserId,
        adminUser.user.id
      );
      const caller = createCaller(ctx);

      const result = await caller.gameweek.finaliseRound({ roundId: round.round.id });

      expect(result.roundId).toBe(round.round.id);
      expect(result.teamsUpdated).toBeGreaterThanOrEqual(0);
      expect(result.playersUpdated).toBeGreaterThanOrEqual(0);

      // Verify round status changed (use tenant-scoped client for RLS)
      const scopedPrisma = createTenantScopedPrisma(tenant.tenant.id);
      const updatedRound = await scopedPrisma.round.findUnique({
        where: { id: round.round.id },
      });
      expect(updatedRound?.status).toBe('complete');
    });
  });

  describe('recalculateLive', () => {
    // Test fixtures
    let tenant: Awaited<ReturnType<typeof createTestTenant>>;
    let squad: Awaited<ReturnType<typeof createTestSquad>>;
    let player: Awaited<ReturnType<typeof createTestPlayer>>;
    let tournament: Awaited<ReturnType<typeof createTestTournament>>;
    let round: Awaited<ReturnType<typeof createTestRound>>;
    let adminUser: Awaited<ReturnType<typeof createTestUser>>;

    beforeAll(async () => {
      tenant = await createTestTenant();
      squad = await createTestSquad(tenant.tenant.id);
      player = await createTestPlayer(tenant.tenant.id, squad.squad.id);
      tournament = await createTestTournament(tenant.tenant.id);
      round = await createTestRound(tenant.tenant.id, tournament.tournament.id, {
        roundNumber: 1,
        status: 'active',
      });
      adminUser = await createTestUser();
      
      await prisma.user.update({
        where: { id: adminUser.user.id },
        data: { isAdmin: true },
      });
    });

    afterAll(async () => {
      await adminUser?.cleanup();
      await round?.cleanup();
      await tournament?.cleanup();
      await player?.cleanup();
      await squad?.cleanup();
      await tenant?.cleanup();
    });

    it('does not change Round.status', async () => {
      const ctx = await createAuthedTestContext(
        tenant.tenant.id,
        adminUser.user.clerkUserId,
        adminUser.user.id
      );
      const caller = createCaller(ctx);

      const result = await caller.gameweek.recalculateLive({ roundId: round.round.id });

      expect(result.roundId).toBe(round.round.id);

      // Verify round status did NOT change (use tenant-scoped client for RLS)
      const scopedPrisma = createTenantScopedPrisma(tenant.tenant.id);
      const updatedRound = await scopedPrisma.round.findUnique({
        where: { id: round.round.id },
      });
      expect(updatedRound?.status).toBe('active');
    });
  });
});
