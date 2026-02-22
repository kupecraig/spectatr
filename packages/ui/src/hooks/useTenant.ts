import { getActiveTenantId } from '@/utils/tenant';

/**
 * React hook that returns the active tenant ID.
 * Reads from query param (DEV), sessionStorage (DEV), or env var.
 *
 * @example
 * const { tenantId } = useTenant();
 */
export function useTenant(): { tenantId: string } {
  // getActiveTenantId() is a pure synchronous function — safe to call in render
  return { tenantId: getActiveTenantId() };
}
