import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { useTenant } from '@/hooks/useTenant';

/**
 * Drop-in replacement for `useQuery` that automatically prefixes every query
 * key with the active tenant ID.
 *
 * This means:
 *  - Individual query hooks don't need to import or call `useTenant` — the
 *    tenant concern is handled here, once.
 *  - Switching tenant invalidates all cached data automatically because the
 *    keys are different (e.g. `['trc-2025', 'players', ...]` vs
 *    `['super-2026', 'players', ...]`).
 *
 * @example
 * // Before
 * const { tenantId } = useTenant();
 * useQuery({ queryKey: ['players', tenantId, input], ... });
 *
 * // After
 * useTenantQuery({ queryKey: ['players', input], ... });
 */
export function useTenantQuery<
  TData,
  TError = Error,
>(options: UseQueryOptions<TData, TError>) {
  const { tenantId } = useTenant();

  return useQuery<TData, TError>({
    ...options,
    queryKey: [tenantId, ...options.queryKey],
  });
}
