/**
 * Database Test Helpers
 *
 * Factory functions for creating and cleaning up test data.
 * Each function returns a cleanup() that deletes the created rows.
 * Uses the base Prisma client (not tenant-scoped) for admin operations.
 */

import { Tenant, User, Squad, Player, League, Tournament, Round, GameweekState } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { nanoid } from 'nanoid';

// Counter for unique feedId values (deterministic, no collision risk)
let feedIdCounter = 100000;

/**
 * Create a test tenant with unique ID.
 * Tenants are NOT tenant-scoped (no RLS), so we use the base client.
 */
export async function createTestTenant(
  id?: string
): Promise<{ tenant: Tenant; cleanup: () => Promise<void> }> {
  const tenantId = id ?? `test-${nanoid(8)}`;

  const tenant = await prisma.tenant.create({
    data: {
      id: tenantId,
      name: `Test Tenant ${tenantId}`,
      slug: tenantId,
      sportType: 'rugby-union',
      isActive: true,
      primaryColor: '#006400',
      config: {},
    },
  });

  return {
    tenant,
    cleanup: async () => {
      // Delete in reverse dependency order
      await prisma.gameweekState.deleteMany({ where: { tenantId } });
      await prisma.scoringEvent.deleteMany({ where: { tenantId } });
      await prisma.checksum.deleteMany({ where: { tenantId } });
      await prisma.team.deleteMany({ where: { tenantId } });
      await prisma.league.deleteMany({ where: { tenantId } });
      await prisma.player.deleteMany({ where: { tenantId } });
      await prisma.round.deleteMany({ where: { tenantId } });
      await prisma.tournament.deleteMany({ where: { tenantId } });
      await prisma.squad.deleteMany({ where: { tenantId } });
      await prisma.tenant.delete({ where: { id: tenantId } });
    },
  };
}

/**
 * Create a test user.
 * Users are global (not tenant-scoped).
 */
export async function createTestUser(
  clerkUserId?: string
): Promise<{ user: User; cleanup: () => Promise<void> }> {
  const id = clerkUserId ?? `user_test_${nanoid(8)}`;

  const user = await prisma.user.create({
    data: {
      clerkUserId: id,
      email: `${id}@example.com`,
      username: id.replace('user_', ''),
      firstName: 'Test',
      lastName: 'User',
      avatar: null,
      emailVerified: new Date(),
    },
  });

  return {
    user,
    cleanup: async () => {
      // Delete user's league memberships first (FK constraint)
      await prisma.userLeague.deleteMany({ where: { userId: user.id } });
      // Delete user's teams (FK constraint)
      await prisma.team.deleteMany({ where: { userId: user.id } });
      // Delete user
      await prisma.user.delete({ where: { id: user.id } });
    },
  };
}

/**
 * Create a test squad for a tenant.
 */
export async function createTestSquad(
  tenantId: string,
  overrides?: Partial<Omit<Squad, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>>
): Promise<{ squad: Squad; cleanup: () => Promise<void> }> {
  const abbrev = overrides?.abbreviation ?? `SQD${nanoid(4)}`;

  const squad = await prisma.squad.create({
    data: {
      tenantId,
      name: overrides?.name ?? `Test Squad ${abbrev}`,
      abbreviation: abbrev,
      badge: overrides?.badge ?? null,
      backgroundColor: overrides?.backgroundColor ?? '#000000',
    },
  });

  return {
    squad,
    cleanup: async () => {
      // Delete players in squad first (FK constraint)
      await prisma.player.deleteMany({ where: { squadId: squad.id } });
      await prisma.squad.delete({ where: { id: squad.id } });
    },
  };
}

/**
 * Create a test player for a tenant and squad.
 */
export async function createTestPlayer(
  tenantId: string,
  squadId: number,
  overrides?: Partial<Omit<Player, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'squadId'>>
): Promise<{ player: Player; cleanup: () => Promise<void> }> {
  // Use counter for unique feedId (deterministic, no collision risk)
  const feedId = overrides?.feedId ?? feedIdCounter++;

  const player = await prisma.player.create({
    data: {
      tenantId,
      squadId,
      feedId,
      firstName: overrides?.firstName ?? 'Test',
      lastName: overrides?.lastName ?? `Player${nanoid(4)}`,
      position: overrides?.position ?? 'fly_half',
      cost: overrides?.cost ?? 5000000,
      status: overrides?.status ?? 'available',
      isLocked: overrides?.isLocked ?? false,
      imagePitch: overrides?.imagePitch ?? null,
      imageProfile: overrides?.imageProfile ?? null,
      stats: overrides?.stats ?? {},
      selected: overrides?.selected ?? {},
    },
  });

  return {
    player,
    cleanup: async () => {
      await prisma.scoringEvent.deleteMany({ where: { playerId: player.id } });
      await prisma.teamPlayer.deleteMany({ where: { playerId: player.id } });
      await prisma.player.delete({ where: { id: player.id } });
    },
  };
}

/**
 * Create a test tournament for a tenant.
 * Required for league creation (leagues derive season from tournament).
 */
export async function createTestTournament(
  tenantId: string,
  overrides?: Partial<Omit<Tournament, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>>
): Promise<{ tournament: Tournament; cleanup: () => Promise<void> }> {
  const tournament = await prisma.tournament.create({
    data: {
      tenantId,
      name: overrides?.name ?? 'Test Tournament',
      season: overrides?.season ?? '2025',
      startDate: overrides?.startDate ?? new Date('2025-01-01'),
      endDate: overrides?.endDate ?? new Date('2025-12-31'),
    },
  });

  return {
    tournament,
    cleanup: async () => {
      // Delete rounds first (FK constraint)
      await prisma.round.deleteMany({ where: { tournamentId: tournament.id } });
      await prisma.tournament.delete({ where: { id: tournament.id } });
    },
  };
}

/**
 * Create a test round for a tenant and tournament.
 */
export async function createTestRound(
  tenantId: string,
  tournamentId: number,
  overrides?: Partial<Omit<Round, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'tournamentId'>>
): Promise<{ round: Round; cleanup: () => Promise<void> }> {
  const roundNumber = overrides?.roundNumber ?? 1;

  const round = await prisma.round.create({
    data: {
      tenantId,
      tournamentId,
      roundNumber,
      name: overrides?.name ?? `Round ${roundNumber}`,
      startDate: overrides?.startDate ?? new Date('2025-06-01'),
      endDate: overrides?.endDate ?? new Date('2025-06-07'),
      status: overrides?.status ?? 'upcoming',
    },
  });

  return {
    round,
    cleanup: async () => {
      await prisma.scoringEvent.deleteMany({ where: { roundId: round.id } });
      await prisma.round.delete({ where: { id: round.id } });
    },
  };
}

/**
 * Create a test gameweek state for a tenant.
 */
export async function createTestGameweekState(
  tenantId: string,
  overrides?: Partial<Omit<GameweekState, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>>
): Promise<{ gameweekState: GameweekState; cleanup: () => Promise<void> }> {
  const gameweekState = await prisma.gameweekState.create({
    data: {
      tenantId,
      currentRound: overrides?.currentRound ?? 1,
      status: overrides?.status ?? 'pre_round',
      deadline: overrides?.deadline ?? null,
      nextRoundStarts: overrides?.nextRoundStarts ?? null,
    },
  });

  return {
    gameweekState,
    cleanup: async () => {
      await prisma.gameweekState.delete({ where: { id: gameweekState.id } });
    },
  };
}

/**
 * Create a test league for a tenant.
 * Requires a user (creator) and optionally creates UserLeague membership.
 */
export async function createTestLeague(
  tenantId: string,
  creatorId: string,
  overrides?: Partial<Omit<League, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'creatorId'>>
): Promise<{ league: League; cleanup: () => Promise<void> }> {
  const league = await prisma.league.create({
    data: {
      tenantId,
      creatorId,
      name: overrides?.name ?? `Test League ${nanoid(6)}`,
      sportType: overrides?.sportType ?? 'rugby-union',
      gameMode: overrides?.gameMode ?? 'standard',
      format: overrides?.format ?? 'classic',
      season: overrides?.season ?? '2025',
      status: overrides?.status ?? 'draft',
      isPublic: overrides?.isPublic ?? true,
      inviteCode: overrides?.inviteCode ?? nanoid(8),
      maxParticipants: overrides?.maxParticipants ?? 10,
      rules: overrides?.rules ?? {},
    },
  });

  return {
    league,
    cleanup: async () => {
      // Delete in FK order
      await prisma.team.deleteMany({ where: { leagueId: league.id } });
      await prisma.userLeague.deleteMany({ where: { leagueId: league.id } });
      await prisma.league.delete({ where: { id: league.id } });
    },
  };
}

/**
 * Create a UserLeague membership.
 */
export async function createTestUserLeague(
  userId: string,
  leagueId: number,
  role: 'creator' | 'member' = 'member'
): Promise<{ cleanup: () => Promise<void> }> {
  await prisma.userLeague.create({
    data: {
      userId,
      leagueId,
      role,
    },
  });

  return {
    cleanup: async () => {
      await prisma.userLeague.delete({
        where: { userId_leagueId: { userId, leagueId } },
      });
    },
  };
}
