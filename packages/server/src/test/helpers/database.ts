/**
 * Database Test Helpers
 *
 * Factory functions for creating and cleaning up test data.
 * Each function returns a cleanup() that deletes the created rows.
 * 
 * Tenant-scoped tables use createTenantScopedPrisma to set app.current_tenant
 * before writes, satisfying RLS policies when connecting as spectatr_app.
 * Non-tenant tables (Tenant, User) use the base prisma client.
 */

import { Tenant, User, Squad, Player, League, Tournament, Round, GameweekState } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { createTenantScopedPrisma } from '../../trpc/context.js';
import { nanoid } from 'nanoid';

// Counter for unique feedId values (deterministic, no collision risk)
let feedIdCounter = 100000;

/**
 * Create a test tenant with unique ID.
 * Tenants are NOT tenant-scoped (no RLS), so we use the base client for tenant creation.
 * However, cleanup uses tenant-scoped Prisma for deleting tenant-scoped data.
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
      // Use tenant-scoped Prisma for tenant-scoped tables (RLS)
      const scopedPrisma = createTenantScopedPrisma(tenantId);
      
      // Delete in reverse dependency order
      await scopedPrisma.gameweekState.deleteMany({ where: { tenantId } });
      await scopedPrisma.scoringEvent.deleteMany({ where: { tenantId } });
      await scopedPrisma.checksum.deleteMany({ where: { tenantId } });
      await scopedPrisma.team.deleteMany({ where: { tenantId } });
      await scopedPrisma.league.deleteMany({ where: { tenantId } });
      await scopedPrisma.player.deleteMany({ where: { tenantId } });
      await scopedPrisma.round.deleteMany({ where: { tenantId } });
      await scopedPrisma.tournament.deleteMany({ where: { tenantId } });
      await scopedPrisma.squad.deleteMany({ where: { tenantId } });
      // Tenant itself is not RLS-protected
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
 * Uses tenant-scoped Prisma to satisfy RLS policies.
 */
export async function createTestSquad(
  tenantId: string,
  overrides?: Partial<Omit<Squad, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>>
): Promise<{ squad: Squad; cleanup: () => Promise<void> }> {
  const abbrev = overrides?.abbreviation ?? `SQD${nanoid(4)}`;
  const scopedPrisma = createTenantScopedPrisma(tenantId);

  const squad = await scopedPrisma.squad.create({
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
      await scopedPrisma.player.deleteMany({ where: { squadId: squad.id } });
      await scopedPrisma.squad.delete({ where: { id: squad.id } });
    },
  };
}

/**
 * Create a test player for a tenant and squad.
 * Uses tenant-scoped Prisma to satisfy RLS policies.
 */
export async function createTestPlayer(
  tenantId: string,
  squadId: number,
  overrides?: Partial<Omit<Player, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'squadId'>>
): Promise<{ player: Player; cleanup: () => Promise<void> }> {
  // Use counter for unique feedId (deterministic, no collision risk)
  const feedId = overrides?.feedId ?? feedIdCounter++;
  const scopedPrisma = createTenantScopedPrisma(tenantId);

  const player = await scopedPrisma.player.create({
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
      await scopedPrisma.scoringEvent.deleteMany({ where: { playerId: player.id } });
      await scopedPrisma.teamPlayer.deleteMany({ where: { playerId: player.id } });
      await scopedPrisma.player.delete({ where: { id: player.id } });
    },
  };
}

/**
 * Create a test tournament for a tenant.
 * Required for league creation (leagues derive season from tournament).
 * Uses tenant-scoped Prisma to satisfy RLS policies.
 */
export async function createTestTournament(
  tenantId: string,
  overrides?: Partial<Omit<Tournament, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>>
): Promise<{ tournament: Tournament; cleanup: () => Promise<void> }> {
  const scopedPrisma = createTenantScopedPrisma(tenantId);

  const tournament = await scopedPrisma.tournament.create({
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
      await scopedPrisma.round.deleteMany({ where: { tournamentId: tournament.id } });
      await scopedPrisma.tournament.delete({ where: { id: tournament.id } });
    },
  };
}

/**
 * Create a test round for a tenant and tournament.
 * Uses tenant-scoped Prisma to satisfy RLS policies.
 */
export async function createTestRound(
  tenantId: string,
  tournamentId: number,
  overrides?: Partial<Omit<Round, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'tournamentId'>>
): Promise<{ round: Round; cleanup: () => Promise<void> }> {
  const roundNumber = overrides?.roundNumber ?? 1;
  const scopedPrisma = createTenantScopedPrisma(tenantId);

  const round = await scopedPrisma.round.create({
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
      await scopedPrisma.scoringEvent.deleteMany({ where: { roundId: round.id } });
      await scopedPrisma.round.delete({ where: { id: round.id } });
    },
  };
}

/**
 * Create a test gameweek state for a tenant.
 * Uses tenant-scoped Prisma to satisfy RLS policies.
 */
export async function createTestGameweekState(
  tenantId: string,
  overrides?: Partial<Omit<GameweekState, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>>
): Promise<{ gameweekState: GameweekState; cleanup: () => Promise<void> }> {
  const scopedPrisma = createTenantScopedPrisma(tenantId);

  const gameweekState = await scopedPrisma.gameweekState.create({
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
      await scopedPrisma.gameweekState.delete({ where: { id: gameweekState.id } });
    },
  };
}

/**
 * Create a test league for a tenant.
 * Requires a user (creator) and optionally creates UserLeague membership.
 * Uses tenant-scoped Prisma to satisfy RLS policies.
 */
export async function createTestLeague(
  tenantId: string,
  creatorId: string,
  overrides?: Partial<Omit<League, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'creatorId'>>
): Promise<{ league: League; cleanup: () => Promise<void> }> {
  const scopedPrisma = createTenantScopedPrisma(tenantId);

  const league = await scopedPrisma.league.create({
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
      await scopedPrisma.team.deleteMany({ where: { leagueId: league.id } });
      await scopedPrisma.userLeague.deleteMany({ where: { leagueId: league.id } });
      await scopedPrisma.league.delete({ where: { id: league.id } });
    },
  };
}

/**
 * Create a UserLeague membership.
 * Uses tenant-scoped Prisma to satisfy RLS policies.
 * The tenantId is required because user_leagues RLS joins through leagues.tenantId.
 */
export async function createTestUserLeague(
  tenantId: string,
  userId: string,
  leagueId: number,
  role: 'creator' | 'member' = 'member'
): Promise<{ cleanup: () => Promise<void> }> {
  const scopedPrisma = createTenantScopedPrisma(tenantId);

  await scopedPrisma.userLeague.create({
    data: {
      userId,
      leagueId,
      role,
    },
  });

  return {
    cleanup: async () => {
      await scopedPrisma.userLeague.delete({
        where: { userId_leagueId: { userId, leagueId } },
      });
    },
  };
}
