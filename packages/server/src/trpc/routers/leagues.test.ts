/**
 * Leagues Router Integration Tests
 *
 * Tests for tRPC leagues router:
 * - list returns public leagues
 * - list returns empty when tenant has no leagues
 * - myLeagues returns empty when authenticated user has no memberships
 * - create creates a league and member row (authed)
 * - getById returns league detail (authed)
 * - getById throws NOT_FOUND when league belongs to a different tenant (authed)
 *
 * Note: authedProcedure tests use createAuthedTestContext which pre-sets userId,
 * causing authMiddleware to skip the Clerk API call.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TRPCError } from '@trpc/server';
import { createCallerFactory } from '../index.js';
import { appRouter } from './_app.js';
import { createTestContext, createAuthedTestContext } from '../../test/helpers/context.js';
import {
  createTestTenant,
  createTestUser,
  createTestTournament,
  createTestLeague,
  createTestUserLeague,
} from '../../test/helpers/database.js';

describe('leagues router', () => {
  // Test fixtures
  let tenantA: Awaited<ReturnType<typeof createTestTenant>>;
  let tenantB: Awaited<ReturnType<typeof createTestTenant>>;
  let user1: Awaited<ReturnType<typeof createTestUser>>;
  let user2: Awaited<ReturnType<typeof createTestUser>>;
  let tournamentA: Awaited<ReturnType<typeof createTestTournament>>;
  let tournamentB: Awaited<ReturnType<typeof createTestTournament>>;
  let publicLeague: Awaited<ReturnType<typeof createTestLeague>>;
  let privateLeague: Awaited<ReturnType<typeof createTestLeague>>;
  let createdLeague: { id: number } | null = null;

  const createCaller = createCallerFactory(appRouter);

  beforeAll(async () => {
    // Create tenants
    tenantA = await createTestTenant();
    tenantB = await createTestTenant();

    // Create users
    user1 = await createTestUser();
    user2 = await createTestUser();

    // Create tournaments (required for league creation)
    // Dates must encompass "today" for the league.create procedure
    tournamentA = await createTestTournament(tenantA.tenant.id, {
      name: 'TRC 2026',
      season: '2026',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    });

    tournamentB = await createTestTournament(tenantB.tenant.id, {
      name: 'Super Rugby 2026',
      season: '2026',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    });

    // Create leagues in tenant A
    publicLeague = await createTestLeague(tenantA.tenant.id, user1.user.id, {
      name: 'Public Test League',
      isPublic: true,
      sportType: 'rugby-union',
      season: '2026',
    });

    privateLeague = await createTestLeague(tenantA.tenant.id, user1.user.id, {
      name: 'Private Test League',
      isPublic: false,
      sportType: 'rugby-union',
      season: '2026',
    });
  });

  afterAll(async () => {
    // Cleanup created league from test (if it exists)
    if (createdLeague) {
      const { prisma } = await import('../../db/prisma.js');
      await prisma.team.deleteMany({ where: { leagueId: createdLeague.id } });
      await prisma.userLeague.deleteMany({ where: { leagueId: createdLeague.id } });
      await prisma.league.delete({ where: { id: createdLeague.id } });
    }

    // Cleanup in reverse order
    await privateLeague?.cleanup();
    await publicLeague?.cleanup();
    await tournamentB?.cleanup();
    await tournamentA?.cleanup();
    await user2?.cleanup();
    await user1?.cleanup();
    await tenantB?.cleanup();
    await tenantA?.cleanup();
  });

  describe('list', () => {
    it('returns public leagues for the current tenant', async () => {
      const ctx = await createTestContext(tenantA.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.leagues.list({});

      // Should only include public leagues
      expect(result.leagues).toHaveLength(1);
      expect(result.leagues[0].name).toBe('Public Test League');
      expect(result.leagues[0].isPublic).toBe(true);
    });

    it('returns empty when tenant has no leagues', async () => {
      // Tenant B has no leagues
      const ctx = await createTestContext(tenantB.tenant.id);
      const caller = createCaller(ctx);

      const result = await caller.leagues.list({});

      expect(result.leagues).toHaveLength(0);
    });
  });

  describe('myLeagues', () => {
    it('returns empty when authenticated user has no memberships', async () => {
      // User 2 has no league memberships
      const ctx = await createAuthedTestContext(
        tenantA.tenant.id,
        user2.user.clerkUserId,
        user2.user.id
      );
      const caller = createCaller(ctx);

      const result = await caller.leagues.myLeagues();

      expect(result).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('creates a league and member row for authenticated user', async () => {
      const ctx = await createAuthedTestContext(
        tenantA.tenant.id,
        user2.user.clerkUserId,
        user2.user.id
      );
      const caller = createCaller(ctx);

      const result = await caller.leagues.create({
        name: 'My New League',
        gameMode: 'standard',
        isPublic: true,
        maxParticipants: 8,
        teamName: 'My Team',
      });

      createdLeague = result; // Save for cleanup

      expect(result.name).toBe('My New League');
      expect(result.gameMode).toBe('standard');
      expect(result.isPublic).toBe(true);
      expect(result.creatorId).toBe(user2.user.id);
      expect(result.tenantId).toBe(tenantA.tenant.id);
      expect(result.inviteCode).toBeTruthy();
    });
  });

  describe('getById', () => {
    it('returns league detail for authenticated user', async () => {
      // Create membership for user1 to the public league
      const membership = await createTestUserLeague(
        user1.user.id,
        publicLeague.league.id,
        'creator'
      );

      const ctx = await createAuthedTestContext(
        tenantA.tenant.id,
        user1.user.clerkUserId,
        user1.user.id
      );
      const caller = createCaller(ctx);

      const result = await caller.leagues.getById({ id: publicLeague.league.id });

      expect(result.id).toBe(publicLeague.league.id);
      expect(result.name).toBe('Public Test League');
      expect(result.myMembership).toBeTruthy();
      expect(result.myMembership?.role).toBe('creator');

      // Cleanup membership
      await membership.cleanup();
    });

    it('throws NOT_FOUND when league belongs to a different tenant', async () => {
      // Try to access league from tenant A using tenant B context
      const ctx = await createAuthedTestContext(
        tenantB.tenant.id,
        user1.user.clerkUserId,
        user1.user.id
      );
      const caller = createCaller(ctx);

      await expect(
        caller.leagues.getById({ id: publicLeague.league.id })
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.leagues.getById({ id: publicLeague.league.id })
      ).rejects.toThrow(/League not found/);
    });
  });
});
