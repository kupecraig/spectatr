import { useTrpcClient } from './useTrpcClient';
import { useTenantQuery } from './useTenantQuery';

export type GameweekStatus = 'pre_round' | 'active' | 'locked' | 'processing' | 'complete';

export interface GameweekState {
  currentRound: number;
  status: GameweekStatus;
  deadline: Date | null;
  nextRoundStarts: Date | null;
}

/**
 * Hook to fetch current gameweek state
 * Cached aggressively (5 minutes) as gameweek state changes infrequently
 */
export const useGameweekQuery = () => {
  const trpc = useTrpcClient();
  
  return useTenantQuery({
    queryKey: ['gameweek', 'current'],
    queryFn: () => trpc<GameweekState>('gameweek.current'),
    staleTime: 5 * 60 * 1000, // 5 minutes - gameweek state changes infrequently
  });
};
