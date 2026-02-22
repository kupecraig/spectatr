# Spectatr - System Architecture

## Monorepo Structure

```
spectatr/
├── packages/
│   ├── shared-types/          # Zod schemas, validation, sport configs
│   ├── ui/                    # React + MUI + Vite
│   └── server/                # tRPC API + Prisma + PostgreSQL
├── data/
│   ├── trc-2025/              # Seed data: 160 players, 4 squads, 16 rounds
│   └── super-2026/            # Seed data: 441 players, 11 squads, 16 rounds
└── docker-compose.yml         # PostgreSQL + Redis services
```

**Benefits:** Shared validation logic, TypeScript types from Zod schemas, single source of truth for configurations.

## Tech Stack

### Frontend
- **Core:** React 18.3, TypeScript 5.6, Vite 6.0
- **UI:** Material-UI v7.2.0, Emotion (CSS-in-JS)
- **State:** Zustand (client), TanStack Query (server), React Hook Form
- **Routing:** React Router v6
- **Validation:** Zod (shared with backend)

### Backend
- **Runtime:** Node.js 20+, TypeScript
- **Framework:** tRPC - End-to-end type safety from server to client
- **Database:** PostgreSQL with Prisma ORM
- **Caching:** Redis + BullMQ (background jobs)
- **Real-time:** WebSocket (planned for live scoring, drafts)
- **Auth:** Clerk (implemented) - Hosted pages, JWT verification, user persistence

**Schema Changes:** Use Prisma migrations for all database schema updates. Do not use `db:push` for shared or reviewed changes.

**Why tRPC:** Chose tRPC over NestJS for automatic TypeScript types across client/server boundary, zero boilerplate in monorepo setup, native TanStack Query integration, and direct imports of shared Zod schemas.

See [Backend API Guide](.github/copilot-instructions/backend-api.md) for patterns and examples.

## Multi-Tenancy Architecture

**Frontend Tenant Resolution** (`packages/ui/src/utils/tenant.ts`):
1. **Dev only:** `?tenant=<id>` URL param → persisted to `sessionStorage` (survives SPA navigation, resets on tab close)
2. **Dev only:** `sessionStorage` key `spectatr_tenant_id` (set by step 1 on prior navigation)
3. **All modes:** `VITE_TENANT_ID` env var (baked in at build time)

```typescript
import { getActiveTenantId } from '@/utils/tenant';
// or via hook:
const { tenantId } = useTenant();
```

**Dev tenant switching:** Append `?tenant=super-2026` once — sessionStorage persists it for the tab.

**`useTenantQuery`** (`packages/ui/src/hooks/api/useTenantQuery.ts`):
- Drop-in for `useQuery` that auto-prefixes every cache key with `tenantId`
- Switching tenant automatically invalidates all cached data (different key prefix)
- All query hooks (`usePlayersQuery`, `useSquadsQuery`, etc.) use this

```typescript
// ✅ DO — tenant key auto-injected, cache isolated per tenant
useTenantQuery({ queryKey: ['players', filters], queryFn: ... });

// ❌ DON'T — missing tenant prefix, cross-tenant cache pollution
useQuery({ queryKey: ['players', filters], queryFn: ... });
```

**Backend Tenant Resolution:**
- `x-tenant-id` request header (set by frontend `client.ts`)
- Subdomain detection (production: `trc-2025.spectatr.com`)
- Default: `trc-2025`

**Dual-Layer Data Isolation** (`packages/server/src/trpc/context.ts`):

| Layer | Enforced when | Mechanism |
|---|---|---|
| PostgreSQL RLS | `spectatr_app` role | `SET LOCAL "app.current_tenant"` + DB policy per table |
| Prisma app-level | Always (incl. `postgres` superuser) | `tenantId` injected into every `where`/`create`/`update` |

RLS policies created by migration `20260222000000_add_rls`. Seeds and migrations use the `postgres` superuser and bypass RLS intentionally.

**Seeding:** `npm run db:seed -- --tenant trc-2025` or `--all`

See [Tenant Configuration Plan](.github/copilot-instructions/plans/plan-tenantConfiguration.md) for implementation details.

## State Management

### Client State (Zustand)
Feature-based stores combining data + UI state per feature/page.

**Use Cases:** UI state, local squad composition, business logic (rules engine, price cap validation), filters.

**Example:**
```typescript
export const useMyTeamStore = create<MyTeamState>()(
  persist((set, get) => ({
    selectedPlayers: [],
    totalCost: 0,
    filters: {},
    activeTab: 'LIST',
    addPlayer: (player) => set(...),
    setFilters: (filters) => set(...),
  }), { name: 'my-team-store' })
);
```

### Server State (TanStack Query)
Manages authentication (Clerk session), player data with caching, live scores, draft data, league/team data.

**Benefits:** Auto refetching, cache invalidation, optimistic updates, request deduplication.

**Tenant isolation:** Use `useTenantQuery` instead of `useQuery` — automatically scopes cache keys by tenant. See [Multi-Tenancy Architecture](#multi-tenancy-architecture).

**Auth Integration:** Token injection via `getToken()` in all tRPC requests (`Authorization: Bearer` header).

## Validation Architecture

### Shared Validation (Zod)
**Core Principle:** Validation runs identically on frontend (UX) and backend (security).

- Schemas in `@spectatr/shared-types` package
- Pure functions for deterministic testing
- TypeScript types inferred from schemas

**Two-Layer Validation:**
1. **SportSquadConfig** - Sport structure (positions, max players, budget) - immutable
2. **League Rules** - League-specific constraints (draft mode, pricing, caps) - configurable

**Flow:** `User Input → Sport Config → League Rules → Result`

## Field Visualization

**JSON-Configured Layouts:**
- Flexbox-based positioning
- Instance-specific per sport
- SVG backgrounds with responsive scaling

**Rugby Layout:** 6 rows (fullback → wings/centers → halves → back-row → locks → front-row)

## Component Architecture

### Design Patterns

**Dialog:** MUI Dialog with `open`/`onClose` props, IconButton close (see `SettingsDialog`)  
**Drawer:** Temporary MUI Drawer with icon menu  
**Layout:** Fixed AppBar + Container maxWidth="lg" + Card/CardContent

### Theme System

**Modular Structure:**
- `tokens/` - palette (positions, field, player, selection, navigation, stats), typography (playerLabel, fieldLabel, emptySlotLabel, statValue), spacing, shape, transitions
- `components/` - Button, Chip, List overrides
- `instances/` - light, dark, rugby themes

**Custom Components:** PlayerSlot, EmptySlot (use theme tokens)

## Data Flow

### Authentication Flow
```
User clicks "Sign In" (MUI Button)
→ Redirect to Clerk hosted page (accounts.clerk.dev)
→ User authenticates → Redirect back to app with session
→ Frontend: useAuth() provides session + getToken()
→ tRPC request with Authorization: Bearer <token> header
→ Backend: clerkMiddleware verifies token → req.auth populated
→ tRPC context: Extract userId from req.auth.userId
→ Auth middleware: Upsert user in DB if authenticated
→ Protected procedure: Reject if no userId (401)
```

### Request Flow
```
User Action → Component → Zustand/TanStack Query → tRPC Endpoint
→ Validation (Zod) → Business Logic → Prisma → PostgreSQL
→ Response → Cache Update → Re-render
```

### Real-time (Planned)
```
Server Event → Socket.io → WebSocket Listener
→ Cache Invalidation → Re-render
```

## File Organization

```
src/
  components/      # Reusable (PlayerSlot, EmptySlot, SettingsDialog)
  features/        # Feature-specific (players/, squad/)
  pages/           # Page-level (DashboardPage, MyTeamPage)
  stores/          # Zustand stores (myTeamStore)
  theme/           # MUI theme (tokens/, components/, instances/)
  config/          # Configuration (fieldLayouts, validationErrors)
  mocks/           # UI mock data (leagues, leagueRules) - seed data in data/trc-2025/
```

## Testing Strategy

**State Export/Import:** Support for exporting/importing app state for testing and debugging.

```typescript
window.exportState();               // Downloads JSON
window.importState(stateObject);    // Loads state
window.saveStateSlot('scenario');   // Save named slot
window.loadStateSlot('scenario');   // Load named slot
```

## Performance

**Frontend:** Code splitting (React Router), lazy loading, image optimization (WebP), MUI tree-shaking, TanStack Query caching

**Backend:** Redis caching (implemented), rate limiting (implemented), background jobs (BullMQ), query optimization, WebSocket pooling (planned)

## Security

**Frontend:** Zod validation, React XSS prevention, route guards (ProtectedRoute), CSRF tokens (planned)  
**Backend:** Clerk JWT verification (implemented), Zod validation, Prisma parameterized queries, auth middleware (implemented), authorization checks, rate limiting (Redis, implemented), CORS

**Auth Strategy:** Provider-agnostic design - auth middleware maps Clerk IDs to internal user IDs, enabling easy migration to other providers.

## Deployment (Planned)

**Frontend:** Static site (Vercel/Netlify/CloudFront) + CDN  
**Backend:** Docker containers + K8s/ECS with load balancing and auto-scaling  
**Database:** Managed PostgreSQL with automated backups and read replicas  
**Monitoring:** APM, error tracking (Sentry), log aggregation, uptime monitoring
