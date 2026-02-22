import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getActiveTenantId } from './tenant';

/**
 * Unit tests for getActiveTenantId()
 *
 * We test the four resolution branches:
 *  1. DEV + query param  → returns param value & persists to sessionStorage
 *  2. DEV + sessionStorage only  → returns stored value
 *  3. DEV guard off (production) → uses VITE_TENANT_ID env var
 *  4. No env var set  → throws an error
 */

// Helper to reset sessionStorage between tests
const clearSession = () => sessionStorage.clear();

describe('getActiveTenantId', () => {
  beforeEach(() => {
    clearSession();
    // Reset URL to no query params
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { search: '' },
    });
  });

  afterEach(() => {
    clearSession();
    vi.unstubAllEnvs();
  });

  it('DEV: reads ?tenant= query param, persists to sessionStorage, and returns it', () => {
    vi.stubEnv('DEV', true);
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { search: '?tenant=super-2026' },
    });

    const result = getActiveTenantId();

    expect(result).toBe('super-2026');
    expect(sessionStorage.getItem('spectatr_tenant_id')).toBe('super-2026');
  });

  it('DEV: returns sessionStorage value when no query param present', () => {
    vi.stubEnv('DEV', true);
    sessionStorage.setItem('spectatr_tenant_id', 'super-2026');

    const result = getActiveTenantId();

    expect(result).toBe('super-2026');
  });

  it('DEV fallback: returns VITE_TENANT_ID when neither query param nor session present', () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_TENANT_ID', 'trc-2025');

    const result = getActiveTenantId();

    expect(result).toBe('trc-2025');
  });

  it('throws when VITE_TENANT_ID is not set', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_TENANT_ID', '');

    expect(() => getActiveTenantId()).toThrow('VITE_TENANT_ID is not set');
  });
});
