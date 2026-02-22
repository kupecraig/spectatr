# Implementation Plan: Multi-Tenant Seed Data & Tenant Switcher

Enable seeding of `super-2026` (Super Rugby Pacific) as a fully isolated second tenant, replace the hardcoded `x-tenant-id` header in the API client with a dev-time query-param override, fix squad name lookups to use API-sourced data, and clear client stores on tenant switch. The DB schema and tRPC routers require no changes — all gaps are in the seed script, API client, two player-list components, and `myTeamStore`.

---

## Architecture and Design

### High-Level Architecture

The DB schema is **already fully multi-tenant** — every data model has a `tenantId` FK. The gaps are entirely in:

1. The **seed script** — hardcoded to `trc-2025`
2. The **frontend API client** — hardcoded `x-tenant-id: 'trc-2025'` header
3. The **frontend squad name lookups** — importing static `@data/trc-2025/squads.json`

The plan does **not** touch the backend tRPC routers. One small schema change is included: removing the hardcoded `@default(42000000)` from `Team.budget` (currently unused and rugby-specific).

### Tenant Resolution Flow

```
Development
  URL ?tenant=super-2026              ← highest priority (ad-hoc override)
  sessionStorage 'spectatr-dev-tenant' ← persists across React Router navigation
  VITE_TENANT_ID=trc-2025 (env var)   ← session default
  hardcoded fallback: 'trc-2025'

Production
  Cloudflare / DNS injects x-tenant-id header from subdomain/domain alias
  DEV code path is never reached (import.meta.env.DEV guard is dead code)

Frontend (both)
  getActiveTenantId() utility
    └─ reads: new URLSearchParams(window.location.search).get('tenant')
    └─ persists to: sessionStorage('spectatr-dev-tenant')
    └─ falls back to: import.meta.env.VITE_TENANT_ID
    └─ falls back to: 'trc-2025'

  useTenant() hook
    └─ wraps getActiveTenantId()
    └─ single source of tenantId for query cache keys + UI display

  fetchTrpc / client.ts
    └─ calls getActiveTenantId() per request
    └─ injects 'x-tenant-id': tenantId header

  TanStack Query
    └─ all query keys include tenantId: ['players', tenantId]
```

### Key Data Differences: super-2026 vs trc-2025

| Aspect | trc-2025 | super-2026 | Action |
|---|---|---|---|
| Rounds schema | Flat `matches` array | Rounds contain nested `tournaments` array | Normalize in seed script |
| Player images | `/player-images/portrait/{Name}-{id}.jpg` | `image/profile/{feedId}.png` | **Deferred — see docs/PLAYER_IMAGES.md** |
| `priceHistory` field | Not present | `{ "1": 2500000, ... }` (round→price map) | Store in Player `stats` JSONB |
| `player_stats.json` | Not present | Per-player detailed stats (tries, tackles, etc.) | Merge into Player `stats` JSONB during seed |
| Squad badges | `badge: null` | `image/badges/{ABBR}.png` | Store in Squad as-is |
| Sport | rugby-union | rugby-union | No sport config change needed |

### Component Breakdown

**New:**
- `packages/ui/src/utils/tenant.ts` — `getActiveTenantId()` pure utility (DEV-only query param + sessionStorage; env var fallback in all modes)
- `packages/ui/src/hooks/useTenant.ts` — `useTenant()` React hook wrapping `getActiveTenantId()`; returns `{ tenantId }`
- `docs/PLAYER_IMAGES.md` — image naming constraint documentation

**Modified:**
- `packages/server/prisma/schema.prisma` — remove `@default(42000000)` from `Team.budget`
- `packages/server/src/scripts/seed.ts` — parameterized, iterates `TENANT_CONFIGS` map
- `packages/ui/src/hooks/api/client.ts` — calls `getActiveTenantId()` per request
- All existing TanStack Query hooks — `tenantId` added to cache keys
- `packages/ui/src/features/players/PlayerList.tsx` — consume `useSquadsQuery`, pass `squads` to children
- `packages/ui/src/features/players/PlayerListItem.tsx` — accept `squads: Squad[]` prop, remove static mock import
- `packages/ui/src/features/players/FilterPanel.tsx` — accept squads as prop if currently using static data
- `packages/ui/src/mocks/playerData.ts` — deprecate `getSquadById` / `getSquadName`
- `myTeamStore` — reset on tenant mismatch at initialisation

**Documentation:**
- `packages/server/START.md` — multi-tenant seeding steps
- `ARCHITECTURE.md` — tenant resolution section update

### Data Model

**Tenant config map (seed script):**
```typescript
const TENANT_CONFIGS: Record<string, TenantSeedConfig> = {
  'trc-2025': {
    id: 'trc-2025',
    name: 'The Rugby Championship 2025',
    slug: 'trc-2025',
    sportType: 'rugby-union',
    primaryColor: '#006400',
    dataPath: resolve(__dirname, '../../../../../data/trc-2025'),
  },
  'super-2026': {
    id: 'super-2026',
    name: 'Super Rugby Pacific 2026',
    slug: 'super-2026',
    sportType: 'rugby-union',
    primaryColor: '#0047AB',
    dataPath: resolve(__dirname, '../../../../../data/super-2026'),
  },
};
```

`seed:all` iterates `Object.values(TENANT_CONFIGS)` — adding a third tenant only requires a new config entry, no script changes.

**`getActiveTenantId()` utility:**
```typescript
// packages/ui/src/utils/tenant.ts
// DEV ONLY: reads ?tenant= query param, persists to sessionStorage for SPA navigation
// In production this code path is never reached — VITE_TENANT_ID is baked at build time
export function getActiveTenantId(): string {
  if (import.meta.env.DEV) {
    const fromUrl = new URLSearchParams(window.location.search).get('tenant');
    if (fromUrl) {
      sessionStorage.setItem('spectatr-dev-tenant', fromUrl);
      return fromUrl;
    }
    const fromSession = sessionStorage.getItem('spectatr-dev-tenant');
    if (fromSession) return fromSession;
  }
  return import.meta.env.VITE_TENANT_ID ?? 'trc-2025';
}
```

Key properties:
- **DEV-only guard** — query param / sessionStorage path is completely dead code in production builds
- **sessionStorage (not localStorage)** — resets on tab close, prevents stale tenant leaking into a new session; isolates per tab
- **Per-request** — called inside `fetchTrpc()` on every request, so navigating to `?tenant=super-2026` mid-session takes effect immediately
- **Shareable** — `http://localhost:5173/my-team?tenant=super-2026` works because sessionStorage is seeded on first load and survives React Router navigation

**`super-2026` rounds.json structure (differs from trc-2025):**
```json
{
  "id": 1, "number": 1, "status": "completed",
  "startDate": "2026-02-13T17:05:00+11:00",
  "endDate": "2026-02-14T19:35:00+11:00",
  "tournaments": [
    { "id": 1, "homeSquadId": 1, "awaySquadId": 2 }
  ]
}
```
Normalizer maps `number` → `roundNumber`, top-level `status`/`startDate`/`endDate` to `Round` fields. Nested `tournaments` fixture data is discarded for now.

---

## Implementation Tasks

### Phase 1: Schema & Seed Script

- [ ] In `packages/server/prisma/schema.prisma`, remove `@default(42000000)` from `Team.budget`. The column remains; the default is dropped so budget must be supplied explicitly when a team is created (it will come from league rules, not a hardcoded constant).
- [ ] Run `npm run db:migrate -- --name remove_team_budget_default` to generate and apply the migration.
- [ ] Read `--tenant <id>` from `process.argv` in `seed.ts`. Default to `trc-2025` when omitted (existing `db:seed` behaviour preserved).
- [ ] Define `TENANT_CONFIGS` map with both `trc-2025` and `super-2026` entries as above.
- [ ] Validate the provided tenant ID against `TENANT_CONFIGS`; exit with a clear error if unknown.
- [ ] Extract all seeding logic into `seedTenant(config: TenantSeedConfig)` so `seed:all` can iterate `Object.values(TENANT_CONFIGS)` automatically.
- [ ] Add round-format normalizer: detect `tournaments` array vs flat `matches` on each round object; map only top-level round fields to the `Round` upsert.
- [ ] Merge `data/super-2026/player_stats.json` into each player's `stats` JSONB field during seeding. Store `priceHistory` inside `stats` JSONB.
- [ ] If `players.json` is an empty array, log `"No players found for {tenantId} — skipping player seeding."` and continue gracefully.
- [ ] **Squad ID safety:** After upserting each squad, use the DB-returned `id` (not the raw JSON `id`) when linking players — squad ID values overlap between tenants in the source JSON files (both start from 1).
- [ ] Add to `packages/server/package.json`:
  - `"seed:trc": "tsx src/scripts/seed.ts --tenant trc-2025"`
  - `"seed:super": "tsx src/scripts/seed.ts --tenant super-2026"`
- [ ] Add to root `package.json`: `"seed:all"` that iterates all tenants in a single command.
- [ ] Verify `trc-2025` seeding still works: `npm run db:seed` (default, no `--tenant` flag).

### Phase 2: Seed super-2026 Data

- [ ] Run `npm run seed:super` and verify:
  - Tenant record: `id=super-2026`, `name=Super Rugby Pacific 2026`, `slug=super`
  - 11 Squad records with `tenantId=super-2026`
  - 16 Round records with `tenantId=super-2026`
  - 1 GameweekState with `tenantId=super-2026`, `currentRound=1`
  - 0 Players (expected — `players.json` is empty; warning logged)
- [ ] Confirm no `trc-2025` data is affected after re-seeding.
- [ ] Run `npm run seed:all` — both tenants seeded, no duplicate key errors (idempotent).

### Phase 3: Frontend — Tenant Utility + useTenant Hook

- [ ] Create `packages/ui/src/utils/tenant.ts` with `getActiveTenantId()` as defined above.
- [ ] Create `packages/ui/src/hooks/useTenant.ts`:
  ```typescript
  import { getActiveTenantId } from '@/utils/tenant';
  export function useTenant() {
    return { tenantId: getActiveTenantId() };
  }
  ```
- [ ] Add `VITE_TENANT_ID=trc-2025` to `packages/ui/env/.env` and `packages/ui/env/.env.example`.
- [ ] Export `getActiveTenantId` from `packages/ui/src/utils/` barrel (create `index.ts` if absent).
- [ ] Write unit tests `packages/ui/src/utils/tenant.test.ts`:
  - Returns `VITE_TENANT_ID` when no query param / sessionStorage present
  - Returns query param value in DEV mode and writes to sessionStorage
  - Returns sessionStorage value when no query param (simulates SPA navigation away from `?tenant=` URL)
  - DEV block is not entered when `import.meta.env.DEV` is false

### Phase 4: Frontend — API Client + Query Cache Keys

- [ ] In `packages/ui/src/hooks/api/client.ts`:
  - Import `getActiveTenantId` from `@/utils/tenant`
  - Replace `'x-tenant-id': 'trc-2025'` with `'x-tenant-id': getActiveTenantId()`
  - Remove the `// TODO: Make this configurable per tenant` comment
- [ ] Update **all existing query hooks** to include `tenantId` from `useTenant()` in their cache keys:
  - `['players', tenantId]`, `['squads', tenantId]`, `['gameweek', tenantId]`, etc.
  - Check `usePlayersQuery`, `useSquadsQuery`, `useGameweekQuery` and any others.

### Phase 5: Frontend — Fix Squad Name Lookups

- [ ] Update `packages/ui/src/features/players/PlayerList.tsx`:
  - Consume `useSquadsQuery()` to get the current tenant's squads
  - Pass `squads` as a prop to `PlayerListItem`
  - Pass `squads` to `FilterPanel` for the squad filter dropdown
- [ ] Update `packages/ui/src/features/players/PlayerListItem.tsx`:
  - Add `squads: Squad[]` prop
  - Replace `getSquadName(player.squadId)` with `squads.find(s => s.id === player.squadId)?.name ?? 'Unknown'`
  - Remove the static `getSquadName` import from `@/mocks/playerData`
- [ ] Check `FilterPanel.tsx` — if it imports a static squad list, update it to accept squads as a prop.
- [ ] In `packages/ui/src/mocks/playerData.ts`, mark `getSquadById` / `getSquadName` as `@deprecated — Use API squads from useSquadsQuery instead`. Do not delete (Storybook stories may still depend on them).
- [ ] Update the `PlayerListItem` Storybook story to pass `squads` as an explicit prop instead of relying on the deprecated static helper.

### Phase 6: Store Reset on Tenant Switch

- [ ] In `myTeamStore` (and any other store holding tenant-scoped data), store the `tenantId` when persisting state.
- [ ] On store initialisation, compare the persisted `tenantId` with `getActiveTenantId()`. If they differ, reset the store to its initial state and write the new `tenantId`.
- [ ] Verify: select players in `trc-2025`, switch to `?tenant=super-2026`, reload — squad should be empty in the super-2026 session.

### Phase 7: Documentation

- [ ] Update `packages/server/START.md`:
  - Add multi-tenant seeding steps (`seed:trc`, `seed:super`, `seed:all`)
  - Note that `db:seed` without `--tenant` still defaults to `trc-2025`
- [ ] Update `ARCHITECTURE.md` tenant section:
  - Add `VITE_TENANT_ID` env var
  - Add `?tenant=` dev override with sessionStorage behaviour and per-tab isolation
  - Add production Cloudflare header injection pattern
- [ ] Create `docs/PLAYER_IMAGES.md` — document the image naming incompatibility between tenants, the current 404 consequence for super-2026 players, and constraints the future image plan must address:
  - Tenant-scoped subdirectory approach (`/player-images/{tenantId}/`)
  - Migration cost for existing trc-2025 images
  - Fallback/placeholder image strategy
  - `getPlayerPitchImage()` / `getPlayerProfileImage()` must become tenant-aware

---

## Open Questions

### 1. super-2026/players.json — Scope of this plan?

`super-2026/players.json` is currently empty. Seeding squads + rounds is sufficient to validate the multi-tenant infrastructure. Populating player data is a data task independent of this plan.

> **Decision: Seeding squads + rounds is sufficient to close this plan.** Player data is deferred.

### 2. Squad ID collisions

`trc-2025` squads have IDs 1–4 in the source JSON; `super-2026` squads also start from 1. The DB upserts by `[tenantId, abbreviation]` so there is no conflict — but the seed script must use the DB-returned `id` after upsert, not the raw JSON `id`, when writing `squadId` on player records.

> **Action: Verify the existing trc-2025 seed script already does this correctly, and carry the pattern forward for super-2026.**

### 3. super-2026 rounds nested fixture data

`tournaments` array contains full fixture data (venue, score, status) with no equivalent in the `Round` model.

> **Decision: Normalize to the existing `Round` model shape.** Discard venue/score/status for now. Revisit when `ScoringEvent` seeding is planned.

---

## Testing Strategy

### Unit Tests

- `tenant.test.ts` — 4 branches: query param (DEV), sessionStorage (DEV), env var, DEV guard off
- Round-format normalizer — unit test with both round schemas (trc-2025 flat, super-2026 with tournaments)

### Seed Integration

- Seed both tenants → verify DB row counts in `Tenant`, `Squad`, `Round`, `GameweekState`
- Re-run `seed:all` → no errors (idempotent upserts)
- Verify trc-2025 player/squad data unchanged after re-seeding

### Frontend Integration

- Load `?tenant=super-2026` → Network tab: `x-tenant-id: super-2026` on all tRPC requests
- Navigate to `/my-team` (no query param in URL) → sessionStorage keeps `x-tenant-id: super-2026`
- Open new tab without query param → defaults to `trc-2025`
- Player list with `?tenant=super-2026` → 11 Super Rugby squads, empty player list (no crash)
- Player list with `?tenant=trc-2025` → correct squad names via API (not static mock)
- Select players in `trc-2025`, switch to `?tenant=super-2026` → `myTeamStore` is empty

### Storybook

- `PlayerListItem` stories pass `squads` prop explicitly (no dependency on deprecated static helper)
- All existing stories still pass

---

## Success Criteria

- [ ] `npm run seed:all` iterates both tenants from `TENANT_CONFIGS`; succeeds with no errors
- [ ] `npm run seed:trc` and `npm run seed:super` both work independently
- [ ] DB contains correct rows for both tenants; re-run is idempotent
- [ ] `?tenant=super-2026` causes all tRPC requests to send `x-tenant-id: super-2026`
- [ ] Tenant param survives React Router navigation within the same tab (sessionStorage)
- [ ] New tab without query param reverts to `trc-2025`
- [ ] `VITE_TENANT_ID` env var sets the session default when no query param present
- [ ] All TanStack Query cache keys include `tenantId`
- [ ] No `getSquadName` calls depend on static `trc-2025/squads.json` at runtime
- [ ] `myTeamStore` resets when tenant changes
- [ ] All `tenant.test.ts` unit tests pass
- [ ] All existing Storybook stories pass
- [ ] No TypeScript errors, no `any` types introduced
- [ ] Production build: DEV-only code path is tree-shaken (`import.meta.env.DEV` guard)
- [ ] Player image constraint documented in `docs/PLAYER_IMAGES.md`
- [ ] `Team.budget` DB default removed; migration applied cleanly

---

## Decisions

- **`seed:all` iterates `TENANT_CONFIGS`** — adding a third tenant only requires a new config entry, no script changes
- **`useTenant()` is the single source of tenant identity** across query cache keys and UI display (AppBar, SettingsDialog, etc.)
- **sessionStorage over localStorage** — clears on tab close, isolates per tab, no stale override leaking into a new session
- **`import.meta.env.DEV` guard** — query param path is dead code in production; a prod user appending `?tenant=` is structurally ignored
- **API-sourced squad lookups over tenant-aware mock registry** — mocks are for Storybook/offline dev only; fixing the root cause is cleaner than maintaining a parallel tenant-aware mock registry
- **`priceHistory` + `player_stats.json` in `stats` JSONB** — no schema migration; revisit if filtering/querying by price history becomes a requirement
- **Store reset on tenant mismatch at initialisation** — deterministic, runs once at startup, no runtime overhead
- **No in-app tenant switcher UI** — tenant identity comes from outside the app (URL/env/CDN), not from application state; no Zustand store, no SettingsDialog changes
- **`db:seed` default preserved** — `trc-2025` default ensures existing `START.md` onboarding flow is unchanged

---

## Notes

- **Jira ticket:** FSA-TBD
- **Image plan dependency:** `super-2026` players will show broken/missing images until the player image plan is implemented — acceptable for this infrastructure milestone
- **Sport config:** Both tenants are `rugby-union` — no `getSportConfig` changes needed
- **Team budget default removed** — `@default(42000000)` dropped from `Team.budget`; no code currently reads it back, and budget cap will come from `League.rules` when teams are implemented
- **`priceHistory` storage:** Stored in `stats` JSONB with no migration. Revisit if querying/filtering by price history becomes a requirement.
