/**
 * Scoring Utility Tests
 *
 * Tests for:
 * - calculateStatPoints with various stat types
 * - Metres gained rounding (14m → 1pt, 20m → 2pts, 9m → 0pts)
 * - calculateRoundPoints produces correct team totals
 * - Team with no snapshot for a round gets 0 pts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  calculateStatPoints,
  calculateRoundPoints,
  STAT_FIELD_TO_RULE_KEY,
  SUPER_2026_SCORING_RULES,
} from './scoring.js';
import {
  createTestTenant,
  createTestSquad,
  createTestPlayer,
  createTestTournament,
  createTestRound,
  createTestLeague,
  createTestUser,
  createTestTeam,
  createTestTeamPlayerSnapshot,
  createTestScoringEvent,
} from '../test/helpers/database.js';
import { prisma } from '../db/prisma.js';

describe('scoring utility', () => {
  describe('calculateStatPoints', () => {
    it('calculates try points correctly', () => {
      const points = calculateStatPoints('tries', 2, SUPER_2026_SCORING_RULES);
      expect(points).toBe(30); // 2 tries * 15 points
    });

    it('calculates tackle points correctly', () => {
      const points = calculateStatPoints('tackles', 8, SUPER_2026_SCORING_RULES);
      expect(points).toBe(8); // 8 tackles * 1 point
    });

    it('calculates metres gained with rounding - 14m → 1pt', () => {
      const points = calculateStatPoints('metresGained', 14, SUPER_2026_SCORING_RULES);
      expect(points).toBe(1); // floor(14/10) * 1 = 1
    });

    it('calculates metres gained with rounding - 20m → 2pts', () => {
      const points = calculateStatPoints('metresGained', 20, SUPER_2026_SCORING_RULES);
      expect(points).toBe(2); // floor(20/10) * 1 = 2
    });

    it('calculates metres gained with rounding - 9m → 0pts', () => {
      const points = calculateStatPoints('metresGained', 9, SUPER_2026_SCORING_RULES);
      expect(points).toBe(0); // floor(9/10) * 1 = 0
    });

    it('calculates negative points for yellow card', () => {
      const points = calculateStatPoints('yellowCards', 1, SUPER_2026_SCORING_RULES);
      expect(points).toBe(-5);
    });

    it('returns 0 for unknown stat field', () => {
      const points = calculateStatPoints('unknownStat', 10, SUPER_2026_SCORING_RULES);
      expect(points).toBe(0);
    });

    it('returns 0 for stat with no rule', () => {
      const points = calculateStatPoints('tries', 1, {}); // empty rules
      expect(points).toBe(0);
    });
  });

  describe('STAT_FIELD_TO_RULE_KEY mapping', () => {
    it('maps common stats correctly', () => {
      expect(STAT_FIELD_TO_RULE_KEY['tries']).toBe('T');
      expect(STAT_FIELD_TO_RULE_KEY['tackles']).toBe('TK');
      expect(STAT_FIELD_TO_RULE_KEY['linebreaks']).toBe('LB');
      expect(STAT_FIELD_TO_RULE_KEY['kick5022']).toBe('K_50_22');
    });

    it('maps aliases correctly', () => {
      expect(STAT_FIELD_TO_RULE_KEY['assists']).toBe('TA'); // alias for tryAssists
      expect(STAT_FIELD_TO_RULE_KEY['penalties']).toBe('PG'); // alias for penaltyGoals
      expect(STAT_FIELD_TO_RULE_KEY['turnovers']).toBe('TW'); // alias for turnoversWon
    });
  });

  describe('calculateRoundPoints', () => {
    // Test fixtures
    let tenant: Awaited<ReturnType<typeof createTestTenant>>;
    let squad: Awaited<ReturnType<typeof createTestSquad>>;
    let player1: Awaited<ReturnType<typeof createTestPlayer>>;
    let player2: Awaited<ReturnType<typeof createTestPlayer>>;
    let tournament: Awaited<ReturnType<typeof createTestTournament>>;
    let round: Awaited<ReturnType<typeof createTestRound>>;
    let user: Awaited<ReturnType<typeof createTestUser>>;
    let league: Awaited<ReturnType<typeof createTestLeague>>;
    let team1: Awaited<ReturnType<typeof createTestTeam>>;
    let team2: Awaited<ReturnType<typeof createTestTeam>>;
    let snapshot1: Awaited<ReturnType<typeof createTestTeamPlayerSnapshot>>;
    let event1: Awaited<ReturnType<typeof createTestScoringEvent>>;
    let event2: Awaited<ReturnType<typeof createTestScoringEvent>>;

    beforeAll(async () => {
      // Create tenant, squad, players
      tenant = await createTestTenant();
      squad = await createTestSquad(tenant.tenant.id);
      player1 = await createTestPlayer(tenant.tenant.id, squad.squad.id, {
        firstName: 'Test',
        lastName: 'Player1',
      });
      player2 = await createTestPlayer(tenant.tenant.id, squad.squad.id, {
        firstName: 'Test',
        lastName: 'Player2',
      });

      // Create tournament and round
      tournament = await createTestTournament(tenant.tenant.id);
      round = await createTestRound(tenant.tenant.id, tournament.tournament.id, {
        roundNumber: 1,
        status: 'complete',
      });

      // Create user, league, teams
      user = await createTestUser();
      league = await createTestLeague(tenant.tenant.id, user.user.id);
      team1 = await createTestTeam(tenant.tenant.id, user.user.id, league.league.id, 'Team 1');

      // Create a second user for team2
      const user2 = await createTestUser();
      team2 = await createTestTeam(tenant.tenant.id, user2.user.id, league.league.id, 'Team 2');

      // Create snapshots - team1 has player1, team2 has no players
      snapshot1 = await createTestTeamPlayerSnapshot(
        tenant.tenant.id,
        team1.team.id,
        league.league.id,
        round.round.id,
        player1.player.id,
        'fly_half'
      );

      // Create scoring events - player1 scored, player2 also scored but not in any team
      event1 = await createTestScoringEvent(
        tenant.tenant.id,
        player1.player.id,
        round.round.id,
        'T', // Try
        15
      );
      event2 = await createTestScoringEvent(
        tenant.tenant.id,
        player2.player.id,
        round.round.id,
        'TK', // Tackle
        5
      );
    });

    afterAll(async () => {
      // Cleanup in reverse order
      await event2?.cleanup();
      await event1?.cleanup();
      await snapshot1?.cleanup();
      await team2?.cleanup();
      await team1?.cleanup();
      await league?.cleanup();
      await user?.cleanup();
      await round?.cleanup();
      await tournament?.cleanup();
      await player2?.cleanup();
      await player1?.cleanup();
      await squad?.cleanup();
      await tenant?.cleanup();
    });

    it('produces correct team totals from known events', async () => {
      const result = await calculateRoundPoints(prisma, tenant.tenant.id, round.round.id);

      expect(result.teamsUpdated).toBeGreaterThan(0);

      // Check team1 got player1's points (15 for try)
      const updatedTeam1 = await prisma.team.findUnique({
        where: { id: team1.team.id },
      });
      expect(updatedTeam1?.points).toBe(15);
    });

    it('team with no snapshot for a round gets 0 pts', async () => {
      // team2 has no snapshot, should have 0 points
      await calculateRoundPoints(prisma, tenant.tenant.id, round.round.id);

      const updatedTeam2 = await prisma.team.findUnique({
        where: { id: team2.team.id },
      });
      expect(updatedTeam2?.points).toBe(0);
    });

    it('updates player totalPoints and lastRoundPoints', async () => {
      await calculateRoundPoints(prisma, tenant.tenant.id, round.round.id);

      const updatedPlayer1 = await prisma.player.findUnique({
        where: { id: player1.player.id },
      });
      expect(updatedPlayer1?.totalPoints).toBe(15);
      expect(updatedPlayer1?.lastRoundPoints).toBe(15);
    });
  });
});
