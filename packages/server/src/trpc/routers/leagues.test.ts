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
 * - standings returns season totals when no roundId
 * - standings returns per-round points when roundId provided
 * - standings returns 0 for teams with no snapshot in the round
 * - standings rank reflects per-round ordering
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
  createTestRound,
  createTestLeague,
  createTestUserLeague,
  createTestTeam,
  createTestSquad,
  createTestPlayer,
  createTestTeamPlayerSnapshot,
  createTestScoringEvent,
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
    if (createdLeague && tenantA) {
      const { createTenantScopedPrisma } = await import('../../trpc/context.js');
      const scopedPrisma = createTenantScopedPrisma(tenantA.tenant.id);
      await scopedPrisma.team.deleteMany({ where: { leagueId: createdLeague.id } });
      await scopedPrisma.userLeague.deleteMany({ where: { leagueId: createdLeague.id } });
      await scopedPrisma.league.delete({ where: { id: createdLeague.id } });
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
        tenantA.tenant.id,
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

  describe('standings', () => {
    // Fixtures for standings tests
    let standingsLeague: Awaited<ReturnType<typeof createTestLeague>>;
    let standingsTeam1: Awaited<ReturnType<typeof createTestTeam>>;
    let standingsTeam2: Awaited<ReturnType<typeof createTestTeam>>;
    let standingsTournament: Awaited<ReturnType<typeof createTestTournament>>;
    let standingsRound1: Awaited<ReturnType<typeof createTestRound>>;
    let standingsRound2: Awaited<ReturnType<typeof createTestRound>>;
    let standingsSquad: Awaited<ReturnType<typeof createTestSquad>>;
    let standingsPlayer1: Awaited<ReturnType<typeof createTestPlayer>>;
    let standingsPlayer2: Awaited<ReturnType<typeof createTestPlayer>>;
    let standingsSnapshot1: Awaited<ReturnType<typeof createTestTeamPlayerSnapshot>>;
    let standingsSnapshot2: Awaited<ReturnType<typeof createTestTeamPlayerSnapshot>>;
    let standingsEvent1: Awaited<ReturnType<typeof createTestScoringEvent>>;
    let standingsEvent2: Awaited<ReturnType<typeof createTestScoringEvent>>;
    let standingsEvent3: Awaited<ReturnType<typeof createTestScoringEvent>>;

    beforeAll(async () => {
      // Create a league with two teams
      standingsLeague = await createTestLeague(tenantA.tenant.id, user1.user.id, {
        name: 'Standings Test League',
        isPublic: false,
        sportType: 'rugby-union',
        season: '2026',
      });

      // Create teams with different season points
      standingsTeam1 = await createTestTeam(tenantA.tenant.id, user1.user.id, standingsLeague.league.id, 'Team Alpha');
      standingsTeam2 = await createTestTeam(tenantA.tenant.id, user2.user.id, standingsLeague.league.id, 'Team Beta');

      // Set Team.points (season totals) directly
      const { createTenantScopedPrisma } = await import('../../trpc/context.js');
      const scopedPrisma = createTenantScopedPrisma(tenantA.tenant.id);
      await scopedPrisma.team.update({ where: { id: standingsTeam1.team.id }, data: { points: 100 } });
      await scopedPrisma.team.update({ where: { id: standingsTeam2.team.id }, data: { points: 75 } });

      // Create tournament and rounds
      standingsTournament = await createTestTournament(tenantA.tenant.id, {
        name: 'Standings Test Tournament',
        season: '2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      });

      standingsRound1 = await createTestRound(tenantA.tenant.id, standingsTournament.tournament.id, {
        roundNumber: 1,
        name: 'Round 1',
        status: 'complete',
      });

      standingsRound2 = await createTestRound(tenantA.tenant.id, standingsTournament.tournament.id, {
        roundNumber: 2,
        name: 'Round 2',
        status: 'complete',
      });

      // Create squad and players
      standingsSquad = await createTestSquad(tenantA.tenant.id, { name: 'Test Squad' });
      standingsPlayer1 = await createTestPlayer(tenantA.tenant.id, standingsSquad.squad.id, { firstName: 'Player', lastName: 'One' });
      standingsPlayer2 = await createTestPlayer(tenantA.tenant.id, standingsSquad.squad.id, { firstName: 'Player', lastName: 'Two' });

      // Create snapshots for Round 1 only (Team Alpha has player1, Team Beta has player2)
      standingsSnapshot1 = await createTestTeamPlayerSnapshot(
        tenantA.tenant.id,
        standingsTeam1.team.id,
        standingsLeague.league.id,
        standingsRound1.round.id,
        standingsPlayer1.player.id,
        'fly_half'
      );
      standingsSnapshot2 = await createTestTeamPlayerSnapshot(
        tenantA.tenant.id,
        standingsTeam2.team.id,
        standingsLeague.league.id,
        standingsRound1.round.id,
        standingsPlayer2.player.id,
        'scrum_half'
      );

      // Create scoring events for Round 1
      // Player 1 scores 25 points (Team Alpha)
      standingsEvent1 = await createTestScoringEvent(
        tenantA.tenant.id,
        standingsPlayer1.player.id,
        standingsRound1.round.id,
        'try',
        15
      );
      standingsEvent2 = await createTestScoringEvent(
        tenantA.tenant.id,
        standingsPlayer1.player.id,
        standingsRound1.round.id,
        'conversion',
        10
      );
      // Player 2 scores 30 points (Team Beta)
      standingsEvent3 = await createTestScoringEvent(
        tenantA.tenant.id,
        standingsPlayer2.player.id,
        standingsRound1.round.id,
        'try',
        30
      );
    });

    afterAll(async () => {
      await standingsEvent3?.cleanup();
      await standingsEvent2?.cleanup();
      await standingsEvent1?.cleanup();
      await standingsSnapshot2?.cleanup();
      await standingsSnapshot1?.cleanup();
      await standingsPlayer2?.cleanup();
      await standingsPlayer1?.cleanup();
      await standingsSquad?.cleanup();
      await standingsRound2?.cleanup();
      await standingsRound1?.cleanup();
      await standingsTournament?.cleanup();
      await standingsTeam2?.cleanup();
      await standingsTeam1?.cleanup();
      await standingsLeague?.cleanup();
    });

    it('returns season totals when roundId is not provided', async () => {
      const ctx = await createAuthedTestContext(
        tenantA.tenant.id,
        user1.user.clerkUserId,
        user1.user.id
      );
      const caller = createCaller(ctx);

      const result = await caller.leagues.standings({ leagueId: standingsLeague.league.id });

      // Should return Team.points (season totals), ordered by points DESC
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Team Alpha');
      expect(result[0].points).toBe(100);
      expect(result[0].rank).toBe(1);
      expect(result[1].name).toBe('Team Beta');
      expect(result[1].points).toBe(75);
      expect(result[1].rank).toBe(2);
    });

    it('returns per-round points when roundId is provided', async () => {
      const ctx = await createAuthedTestContext(
        tenantA.tenant.id,
        user1.user.clerkUserId,
        user1.user.id
      );
      const caller = createCaller(ctx);

      const result = await caller.leagues.standings({
        leagueId: standingsLeague.league.id,
        roundId: standingsRound1.round.id,
      });

      // Per-round: Team Beta has 30 points, Team Alpha has 25 points
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Team Beta');
      expect(result[0].points).toBe(30);
      expect(result[0].rank).toBe(1);
      expect(result[1].name).toBe('Team Alpha');
      expect(result[1].points).toBe(25);
      expect(result[1].rank).toBe(2);
    });

    it('returns 0 points for teams with no snapshot in the round', async () => {
      const ctx = await createAuthedTestContext(
        tenantA.tenant.id,
        user1.user.clerkUserId,
        user1.user.id
      );
      const caller = createCaller(ctx);

      // Round 2 has no snapshots, so both teams should have 0 points
      const result = await caller.leagues.standings({
        leagueId: standingsLeague.league.id,
        roundId: standingsRound2.round.id,
      });

      expect(result).toHaveLength(2);
      // Both teams have 0 points, order by name ASC (secondary sort)
      expect(result[0].points).toBe(0);
      expect(result[1].points).toBe(0);
      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
    });

    it('rank in per-round response reflects per-round ordering', async () => {
      const ctx = await createAuthedTestContext(
        tenantA.tenant.id,
        user1.user.clerkUserId,
        user1.user.id
      );
      const caller = createCaller(ctx);

      // In season totals, Team Alpha (100) > Team Beta (75)
      const seasonStandings = await caller.leagues.standings({
        leagueId: standingsLeague.league.id,
      });
      expect(seasonStandings[0].name).toBe('Team Alpha');
      expect(seasonStandings[0].rank).toBe(1);

      // In Round 1, Team Beta (30) > Team Alpha (25) — rank is reversed
      const round1Standings = await caller.leagues.standings({
        leagueId: standingsLeague.league.id,
        roundId: standingsRound1.round.id,
      });
      expect(round1Standings[0].name).toBe('Team Beta');
      expect(round1Standings[0].rank).toBe(1);
    });
  });
});
