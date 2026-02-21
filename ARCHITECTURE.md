# Spectatr - System Architecture

## Monorepo Structure

```
spectatr/
├── packages/
│   ├── shared-types/          # Zod schemas, validation, sport configs
│   ├── frontend/              # React + MUI + Vite
│   └── backend/               # NestJS/tRPC (planned)
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

See [Backend API Guide](../.github/copilot-instructions/backend-api.md) for patterns and examples.

## Multi-Tenancy Architecture

**Tenant Resolution:**
- **Production:** Subdomain-based (`trc-2025.spectatr.com` → `trc-2025`)
- **Development:** Environment variable (`VITE_TENANT_ID=trc-2025`)
- **Fallback:** Default tenant (`trc-2025`)

**Data Isolation:**
- Each tenant has separate database scope via Prisma middleware
- Backend resolves tenant from `x-tenant-id` header or subdomain
- Users are global (not tenant-specific) - can participate in multiple tenants
- Leagues exist within a single tenant (share player pool)

**Example:**
```
Tenant: trc-2025
  ├─ League: family-league
  │   └─ Team: Craig's Team (User: craig@example.com)
  └─ League: office-league
      └─ Team: Craig's Office Team (User: craig@example.com)

Tenant: svns
  └─ League: mates-league
      └─ Team: Craig's Sevens Squad (User: craig@example.com)
```

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
  mocks/           # Mock data
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
