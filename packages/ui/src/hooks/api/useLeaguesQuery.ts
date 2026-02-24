import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTrpcClient } from './useTrpcClient';
import { useTenantQuery } from './useTenantQuery';
import { useTenant } from '@/hooks/useTenant';
import type {
  CreateLeagueInput,
  UpdateLeagueInput,
  JoinLeagueByCodeInput,
  League,
  Team,
} from '@spectatr/shared-types';

// ─────────────────────────────────────────────────────────────────────────────
// Response types (shapes returned from the tRPC procedures)
// ─────────────────────────────────────────────────────────────────────────────

export interface LeagueWithCount extends League {
  _count: { members: number };
}

export interface LeagueListResult {
  leagues: LeagueWithCount[];
  nextCursor: number | undefined;
}

export interface MyLeague extends League {
  role: string;
  joinedAt: string;
  myTeam: Team | null;
  memberCount: number;
}

export interface LeagueMember {
  userId: string;
  leagueId: number;
  role: string;
  joinedAt: string;
  user: { id: string; username: string | null; avatar: string | null };
}

export interface LeagueDetail extends League {
  members: LeagueMember[];
  teams: Team[];
  myMembership: LeagueMember | null;
}

export interface LeagueStanding extends Team {
  rank: number;
  user: { id: string; username: string | null; avatar: string | null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Browse public leagues (no auth required).
 * Tenant-scoped — cache key includes tenantId automatically.
 */
export const useLeagueListQuery = (gameMode?: 'standard' | 'round-robin' | 'ranked') => {
  const trpc = useTrpcClient();
  const input = gameMode ? { gameMode } : undefined;

  return useTenantQuery<LeagueListResult>({
    queryKey: ['leagues', 'list', input ?? {}],
    queryFn: () =>
      trpc<LeagueListResult>('leagues.list', input as Record<string, unknown> | undefined),
    staleTime: 30 * 1000,
  });
};

/**
 * Fetch the authenticated user's own leagues.
 * Returns combined league + team + membership info.
 */
export const useMyLeaguesQuery = () => {
  const trpc = useTrpcClient();

  return useTenantQuery<MyLeague[]>({
    queryKey: ['leagues', 'my'],
    queryFn: () => trpc<MyLeague[]>('leagues.myLeagues'),
    staleTime: 30 * 1000,
  });
};

/**
 * Fetch full detail for a single league.
 * Includes members, teams, and the current user's membership status.
 */
export const useLeagueDetailQuery = (leagueId: number | null) => {
  const trpc = useTrpcClient();

  return useTenantQuery<LeagueDetail>({
    queryKey: ['leagues', 'detail', leagueId],
    queryFn: () => trpc<LeagueDetail>('leagues.getById', { id: leagueId! }),
    enabled: leagueId !== null,
    staleTime: 30 * 1000,
  });
};

/**
 * Fetch standings (teams ranked by points) for a league.
 */
export const useLeagueStandingsQuery = (leagueId: number | null) => {
  const trpc = useTrpcClient();

  return useTenantQuery<LeagueStanding[]>({
    queryKey: ['leagues', 'standings', leagueId],
    queryFn: () => trpc<LeagueStanding[]>('leagues.standings', { id: leagueId! }),
    enabled: leagueId !== null,
    staleTime: 60 * 1000,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

/** Create a new league. Invalidates myLeagues on success. */
export const useCreateLeagueMutation = () => {
  const trpc = useTrpcClient();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: (input: CreateLeagueInput) =>
      trpc<League>('leagues.create', input as unknown as Record<string, unknown>, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'leagues', 'my'] });
      queryClient.invalidateQueries({ queryKey: [tenantId, 'leagues', 'list'] });
    },
  });
};

/** Join a league by invite code. Invalidates myLeagues on success. */
export const useJoinLeagueMutation = () => {
  const trpc = useTrpcClient();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: (input: JoinLeagueByCodeInput) =>
      trpc<{ leagueId: number; leagueName: string }>(
        'leagues.join',
        input as unknown as Record<string, unknown>,
        'POST'
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'leagues', 'my'] });
      queryClient.invalidateQueries({ queryKey: [tenantId, 'leagues', 'list'] });
    },
  });
};

/** Update a league (creator only). Invalidates detail + myLeagues on success. */
export const useUpdateLeagueMutation = () => {
  const trpc = useTrpcClient();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: (input: UpdateLeagueInput) =>
      trpc<League>('leagues.update', input as unknown as Record<string, unknown>, 'POST'),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'leagues', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: [tenantId, 'leagues', 'my'] });
    },
  });
};

/** Leave a league. Invalidates myLeagues on success. */
export const useLeaveLeagueMutation = () => {
  const trpc = useTrpcClient();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: (leagueId: number) =>
      trpc<{ success: boolean }>('leagues.leave', { leagueId }, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'leagues', 'my'] });
    },
  });
};

/** Delete a league (creator only). Invalidates list + myLeagues on success. */
export const useDeleteLeagueMutation = () => {
  const trpc = useTrpcClient();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: (leagueId: number) =>
      trpc<{ success: boolean }>('leagues.delete', { id: leagueId }, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'leagues', 'my'] });
      queryClient.invalidateQueries({ queryKey: [tenantId, 'leagues', 'list'] });
    },
  });
};
