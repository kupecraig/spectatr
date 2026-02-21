import { useAuth } from '@clerk/clerk-react';
import { useCallback } from 'react';
import { fetchTrpc } from './client';

/**
 * Hook that provides an authenticated tRPC client
 * Automatically injects auth token into all requests
 * 
 * @example
 * const trpc = useTrpcClient();
 * const result = await trpc<Player[]>('players.list', { position: 'hooker' });
 */
export function useTrpcClient() {
  const { getToken } = useAuth();

  const authenticatedFetch = useCallback(
    async <T>(path: string, input?: Record<string, unknown>): Promise<T> => {
      return fetchTrpc<T>(path, input, getToken);
    },
    [getToken]
  );

  return authenticatedFetch;
}
