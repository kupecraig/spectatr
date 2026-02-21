import { useQuery } from '@tanstack/react-query';
import { useTrpcClient } from './useTrpcClient';
import type { Player } from '@/mocks/playerData';

export interface PlayersQueryInput {
  position?: string;
  squadId?: number;
  minCost?: number;
  maxCost?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PlayersQueryResult {
  players: Player[];
  total: number;
  limit: number;
  offset: number;
}

export const usePlayersQuery = (input: PlayersQueryInput = {}) => {
  const trpc = useTrpcClient();
  
  // Filter out undefined values for stable query key and clean API calls
  const entries = Object.entries(input).filter(([_, value]) => value !== undefined);
  const cleanInput = entries.length > 0 
    ? (Object.fromEntries(entries) as PlayersQueryInput)
    : undefined;

  return useQuery({
    queryKey: ['players', cleanInput ?? {}],
    queryFn: () => trpc<PlayersQueryResult>('players.list', cleanInput as Record<string, unknown> | undefined),
    staleTime: 60 * 1000,
  });
};
