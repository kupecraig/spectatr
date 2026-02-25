---
title: Configurable Tenant ID Resolution
version: 1.0
date_created: 2026-02-15
last_updated: 2026-02-15
---
# Implementation Plan: Configurable Tenant ID

Replace hardcoded `'trc-2025'` tenant ID with configurable resolution supporting environment variables (development) and subdomain parsing (production). This enables multi-sport competition support without code changes.

## Architecture and Design

### High-Level Architecture

**Tenant Hierarchy (Clarified):**
```
Tenant (Sport Competition)
  ├─ Examples: trc-2025, svns, a-league, fa-cup, nrl, nba, nfl
  └─ Leagues (User-Created Groups)
      ├─ Examples: family-league, office-league, mates-league
      └─ Teams (One per User per League)
          └─ Players (User Selections)
```

**Tenant vs League:**
- **Tenant:** Sport competition/instance - separate data, separate branding, separate DBs
- **League:** User-created group within a tenant - shared player pool, compete against each other

**Resolution Strategy:**
```
Production:  trc-2025.fantasy-union.com  → Subdomain extraction → "trc-2025"
Development: localhost:5173               → Environment variable → VITE_TENANT_ID
Fallback:    (no subdomain, no env)       → Default              → "trc-2025"
```

### Component Breakdown

**New Components:**
- `resolveTenantId()` - Utility function in `packages/ui/src/utils/tenant.ts`

**Modified Components:**
- `fetchTrpc()` - Replace hardcoded tenant ID with resolver call

**Configuration:**
- `.env.example` - Document `VITE_TENANT_ID` variable
- `.env.local` - User-specific tenant configuration (gitignored)

### Tenant Resolution Logic

**Priority Order:**
1. **Subdomain** (production)
   - Parse `window.location.hostname`
   - Extract first segment before domain
   - Example: `trc-2025.fantasy-union.com` → `trc-2025`
   - Skip `www` subdomain (not a tenant)

2. **Environment Variable** (development)
   - Read `import.meta.env.VITE_TENANT_ID`
   - Allows easy tenant switching during development
   - Example: `VITE_TENANT_ID=svns` in `.env.local`

3. **Default Fallback**
   - Return `'trc-2025'` if neither above available
   - Ensures app always has a valid tenant ID

## State Management

No state management needed - tenant ID is static per deployment/environment.

## Validation

**Input Validation:**
- Tenant ID format: lowercase, alphanumeric + hyphens only
- Regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- Examples: ✅ `trc-2025`, `svns`, `a-league` | ❌ `TRC_2025`, `svns!`, `A League`

**Error Handling:**
- If subdomain parsing fails → fall back to env var
- If env var invalid → fall back to default
- Log warnings in development mode for debugging

## Theming

No theming changes needed for this task. Tenant-specific themes will be handled separately.

## MUI Components

No UI components - this is a backend-facing configuration change.

## Tasks

### Setup
- [x] Create plan document
- [ ] Review with team for tenant naming conventions

### Utility Implementation
- [ ] Create `packages/ui/src/utils/tenant.ts`
- [ ] Implement subdomain parsing logic
- [ ] Implement environment variable fallback
- [ ] Implement default fallback
- [ ] Add input validation (regex check)
- [ ] Add development mode logging
- [ ] Export `resolveTenantId()` function

### API Client Integration
- [ ] Import `resolveTenantId` in `client.ts`
- [ ] Call resolver at module initialization
- [ ] Replace hardcoded `'trc-2025'` with resolved value
- [ ] Remove TODO comment

### Environment Configuration
- [ ] Add `VITE_TENANT_ID=trc-2025` to `.env.example`
- [ ] Document supported tenant IDs in comments
- [ ] Update README with tenant configuration instructions

### Testing
- [ ] Unit test: Subdomain parsing (`trc-2025.fantasy-union.com` → `trc-2025`)
- [ ] Unit test: Ignore `www` subdomain
- [ ] Unit test: Environment variable fallback
- [ ] Unit test: Default fallback
- [ ] Unit test: Invalid subdomain handling
- [ ] Integration test: API calls use correct tenant header
- [ ] Manual test: Change `.env.local` tenant and verify API calls
- [ ] Manual test: Verify localhost uses env var (no subdomain)

### Documentation
- [ ] Document tenant vs league hierarchy
- [ ] Add tenant configuration section to README
- [ ] List supported tenant IDs (trc-2025, svns, a-league, etc.)
- [ ] Add production subdomain setup guide
- [ ] Update ARCHITECTURE.md with tenant resolution strategy

## Open Questions

1. **Tenant ID Registry?**
   - Context: Should we maintain a list of valid tenant IDs to validate against?
   - Options: 
     - Hard-code tenant registry (simple, less flexible)
     - Fetch from backend `/tenants` endpoint (dynamic, requires API call)
     - No validation (trust subdomain/env var)
   - Decision needed: **No validation for MVP** - trust configuration

2. **Subdomain Parsing Edge Cases?**
   - Context: What about multi-level subdomains? Example: `admin.trc-2025.fantasy-union.com`
   - Options:
     - Use first segment only (`admin` becomes tenant - wrong!)
     - Use second segment (`trc-2025` - correct, more complex logic)
     - Disallow multi-level subdomains
   - Decision needed: **First segment only, document single-level subdomains for tenants**

3. **Development Multi-Tenant Testing?**
   - Context: How to test multiple tenants locally without subdomain setup?
   - Options:
     - Change `.env.local` and restart (simple, slow)
     - Query parameter override `?tenant=svns` (fast, requires code)
     - Browser extension to override headers (complex)
   - Decision needed: **Change .env.local for now, query param in future enhancement**

## Testing Strategy

### Unit Tests

**`tenant.test.ts`:**
```typescript
describe('resolveTenantId', () => {
  it('extracts subdomain from production URL', () => {
    // Mock window.location.hostname = 'trc-2025.fantasy-union.com'
    expect(resolveTenantId()).toBe('trc-2025');
  });

  it('ignores www subdomain', () => {
    // Mock window.location.hostname = 'www.fantasy-union.com'
    expect(resolveTenantId()).toBe('trc-2025'); // Falls back to default
  });

  it('uses environment variable in development', () => {
    // Mock window.location.hostname = 'localhost'
    // Mock import.meta.env.VITE_TENANT_ID = 'svns'
    expect(resolveTenantId()).toBe('svns');
  });

  it('falls back to default when no config', () => {
    // Mock window.location.hostname = 'localhost'
    // Mock import.meta.env.VITE_TENANT_ID = undefined
    expect(resolveTenantId()).toBe('trc-2025');
  });

  it('validates tenant ID format', () => {
    // Mock invalid env var
    // Should fall back to default or throw error
  });
});
```

### Integration Tests

**API Client:**
- Verify `fetchTrpc` includes correct `x-tenant-id` header
- Change tenant and verify new header value
- Mock fetch to inspect headers

### Manual Testing

**Development:**
1. Set `VITE_TENANT_ID=trc-2025` in `.env.local`
2. Start dev server
3. Open Network tab → verify `x-tenant-id: trc-2025` header
4. Change to `VITE_TENANT_ID=svns`
5. Restart dev server
6. Verify `x-tenant-id: svns` header

**Production Simulation:**
- Use `/etc/hosts` to map `trc-2025.localhost` to `127.0.0.1`
- Access `http://trc-2025.localhost:5173`
- Verify subdomain extraction works

## Success Criteria

- [ ] **No Hardcoded Tenant ID:** No `'trc-2025'` strings in client code (except default fallback)
- [ ] **Development:** Tenant configurable via `.env.local` without code changes
- [ ] **Production:** Subdomain parsing works (`trc-2025.fantasy-union.com` → `trc-2025`)
- [ ] **Fallback:** Default tenant used when no subdomain or env var
- [ ] **API Calls:** All requests include correct `x-tenant-id` header
- [ ] **Testing:** Unit tests pass for all resolution paths
- [ ] **Documentation:** README explains tenant configuration for dev and prod

## Notes

**Future Enhancements:**
- Query parameter override for testing: `?tenant=svns`
- Tenant-specific theming based on resolved ID
- Tenant metadata API (name, logo, sport type, colors)
- User-tenant relationship (user can switch between tenants they participate in)
- Tenant selector UI (if user participates in multiple tenants)

**Production Deployment:**
- DNS wildcard subdomain setup: `*.fantasy-union.com` → app server
- Load balancer/reverse proxy routes by subdomain
- Each tenant can have separate database or shared with tenant filtering
- SSL certificate must cover wildcard subdomain

**Tenant Naming Conventions:**
- Lowercase only
- Hyphens for word separation (not underscores)
- Short and memorable (max 20 chars)
- Sport abbreviation + year: `trc-2025`, `rwc-2027`
- League name: `a-league`, `fa-cup`, `nba`, `nfl`

**Backend Alignment:**
- Backend already supports `x-tenant-id` header
- Backend tenant resolution: header → subdomain → default
- Backend validates tenant exists in database
- Frontend sends header, backend enforces data isolation

