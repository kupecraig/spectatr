import { useQuery } from '@tanstack/react-query';
import { useTrpcClient } from './useTrpcClient';

export interface Squad {
  id: number;
  tenantId: string;
  name: string;
  abbreviation: string;
  badge: string | null;
  backgroundColor: string | null;
  createdAt: string;
  updatedAt: string;
}

export const useSquadsQuery = () => {
  const trpc = useTrpcClient();
  
  return useQuery({
    queryKey: ['squads'],
    queryFn: () => trpc<Squad[]>('squads.list'),
    staleTime: 24 * 60 * 60 * 1000,
  });
};
