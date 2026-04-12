import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTrpcClient } from './useTrpcClient';
import { useTenantQuery } from './useTenantQuery';
import { useTenant } from '@/hooks/useTenant';
import type {
  SaveSquadInput,
  UpdateTeamNameInput,
  TeamWithPlayers,
  Team,
} from '@spectatr/shared-types';

/**
 * Fetch the current user's team for a given league, including team players.
 */
export const useTeamByLeagueQuery = (leagueId: number | null) => {
  const trpc = useTrpcClient();

  return useTenantQuery<TeamWithPlayers>({
    queryKey: ['teams', 'byLeague', leagueId],
    queryFn: () => trpc<TeamWithPlayers>('teams.getByLeague', { leagueId: leagueId! }),
    enabled: leagueId !== null,
    staleTime: 30 * 1000,
  });
};

/**
 * Save a squad for a team in a league.
 * Invalidates the team query and myLeagues on success.
 */
export const useSaveSquadMutation = () => {
  const trpc = useTrpcClient();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: (input: SaveSquadInput) =>
      trpc<{ teamId: number; playerCount: number; totalCost: number }>(
        'teams.saveSquad',
        input as unknown as Record<string, unknown>,
        'POST'
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [tenantId, 'teams', 'byLeague', variables.leagueId],
      });
      queryClient.invalidateQueries({ queryKey: [tenantId, 'leagues', 'my'] });
    },
  });
};

/**
 * Update the name of a team in a league.
 * Invalidates the team query and myLeagues on success.
 */
export const useUpdateTeamNameMutation = () => {
  const trpc = useTrpcClient();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: (input: UpdateTeamNameInput) =>
      trpc<Team>(
        'teams.updateName',
        input as unknown as Record<string, unknown>,
        'POST'
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [tenantId, 'teams', 'byLeague', variables.leagueId],
      });
      queryClient.invalidateQueries({ queryKey: [tenantId, 'leagues', 'my'] });
    },
  });
};
