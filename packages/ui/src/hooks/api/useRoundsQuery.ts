import { useTrpcClient } from './useTrpcClient';
import { useTenantQuery } from './useTenantQuery';

export interface Round {
  id: number;
  tenantId: string;
  tournamentId: number;
  roundNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  isCurrent: boolean;
}

export interface RoundsQueryResult {
  rounds: Round[];
  currentRound: number;
  gameweekStatus: string;
}

export const useRoundsQuery = () => {
  const trpc = useTrpcClient();
  
  return useTenantQuery({
    queryKey: ['rounds'],
    queryFn: () => trpc<RoundsQueryResult>('rounds.list'),
    staleTime: 60 * 1000,
  });
};
