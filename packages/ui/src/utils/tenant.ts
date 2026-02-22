/**
 * Tenant resolution utility
 *
 * Priority order:
 *  1. DEV ONLY: `?tenant=<id>` query param → persisted to sessionStorage for SPA navigation
 *  2. DEV ONLY: sessionStorage key `spectatr_tenant_id` (set by step 1)
 *  3. All modes: `VITE_TENANT_ID` env var (baked in at build time)
 *
 * Notes:
 * - The query-param / sessionStorage path is compiled out in production builds
 *   (import.meta.env.DEV is false → dead code eliminated by Vite/Rollup).
 * - sessionStorage (not localStorage) is intentional: resets on tab close,
 *   prevents stale tenant leaking into a new session, and isolates per tab.
 * - Calling `?tenant=super-2026` once is enough — sessionStorage survives
 *   React Router navigation within the same tab.
 */

const SESSION_KEY = 'spectatr_tenant_id';

export function getActiveTenantId(): string {
  if (import.meta.env.DEV) {
    // Check for ?tenant= query param and persist it
    const params = new URLSearchParams(window.location.search);
    const queryTenant = params.get('tenant');
    if (queryTenant) {
      sessionStorage.setItem(SESSION_KEY, queryTenant);
      return queryTenant;
    }

    // Check sessionStorage (set on a previous navigation within this tab)
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      return stored;
    }
  }

  const tenantId = import.meta.env.VITE_TENANT_ID;
  if (!tenantId) {
    throw new Error(
      'VITE_TENANT_ID is not set. Add it to packages/ui/env/.env (e.g. VITE_TENANT_ID=trc-2025).'
    );
  }
  return tenantId;
}
