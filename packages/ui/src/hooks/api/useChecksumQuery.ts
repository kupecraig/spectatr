import { useTrpcClient } from './useTrpcClient';
import { useTenantQuery } from './useTenantQuery';

export interface ChecksumResponse {
  version: number;
  checksums: {
    squads: string;
    players: string;
    rounds: string;
  };
  lastUpdated: string;
}

/**
 * Hook to fetch current checksums for change detection
 * Short cache time as this is polled frequently
 */
export const useChecksumQuery = () => {
  const trpc = useTrpcClient();
  
  return useTenantQuery({
    queryKey: ['checksum', 'current'],
    queryFn: () => trpc<ChecksumResponse>('checksum.current'),
    staleTime: 0, // Always consider stale for accurate polling
    gcTime: 60 * 1000, // Keep in cache for 1 minute
  });
};
