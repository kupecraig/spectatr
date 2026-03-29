# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root (runs all workspaces concurrently)
```bash
npm run dev          # Start frontend + backend + shared-types watch
npm run build        # Build all packages
npm run lint         # Lint all workspaces
```

### Frontend (`packages/ui`)
```bash
npm test                  # Unit tests in watch mode (Vitest)
npm run test:unit         # Unit tests once
npm run test:coverage     # Coverage report
npm run storybook         # Storybook dev server (port 6006)
npm run test-storybook    # Run Storybook interaction tests (requires storybook running)
npm run test:all          # Unit + Storybook tests
```

### Backend (`packages/server`)
```bash
npm run db:migrate        # Create and apply Prisma migrations (use this, not db:push)
npm run db:migrate:superuser  # Migrations touching RLS/grants (requires postgres role)
npm run db:seed           # Seed tenant data: npm run db:seed -- --tenant trc-2025
npm run db:studio         # Prisma Studio GUI
npm run db:reset          # WARNING: destroys all data
```

### Infrastructure
```bash
docker-compose up -d      # Start PostgreSQL 15 + Redis 7
docker-compose down       # Stop services
```

## Architecture

### Monorepo Structure
- `packages/shared-types` — Zod schemas, validation functions, sport configs. Consumed by both UI and server.
- `packages/ui` — React 18 + MUI v7 + Vite frontend
- `packages/server` — tRPC 11 + Express + Prisma + PostgreSQL backend

### Multi-Tenancy
- **Tenant** = sport competition instance (e.g. `trc-2025`, `super-2026`) — isolated data, branding, player pool
- **League** = user-created group within a tenant (e.g. family league, office league)
- Isolation is dual-layer: PostgreSQL RLS via `spectatr_app` role + Prisma app-level `tenantId` injection
- Frontend resolves tenant from URL `?tenant=<id>` → sessionStorage → `VITE_TENANT_ID` env var
- Backend resolves from `x-tenant-id` header

### API Layer
- tRPC over `POST /api/trpc/*` — end-to-end type safety between frontend and backend
- All tRPC types are auto-inferred; never manually duplicate them
- Auth via Clerk (JWT middleware on Express)

### State Management
- **Zustand** — one store per feature/page, combining data + UI state together, persisted with `{ name: 'store-name' }`
- **TanStack Query** — server state (players, auth, live scores). Use `useTenantQuery` (drop-in replacement for `useQuery`) to auto-scope cache keys by tenant
- **React Hook Form** — complex forms paired with TanStack Query mutations

### Validation Architecture
Two-layer validation, both using Zod from `@spectatr/shared-types`:
1. **SportSquadConfig** — immutable sport structure (positions, max players, budget)
2. **League Rules** — user-configurable constraints layered on top

The same schemas run on the frontend (UX feedback) and backend (security enforcement).

### Checksum Polling
Frontend polls `GET /checksum.json` every 30–60s. Backend returns MD5 hashes per data partition. Only changed partitions trigger refetches. Avoids persistent WebSockets for battery efficiency.

## Critical Rules

### MUI Only
All styling via MUI `sx` prop and theme tokens. No custom CSS, no other component libraries.
- Colors: `theme.palette.positions`, `.field`, `.player`, `.selection`, `.navigation`, `.stats`
- Typography variants: `playerLabel`, `fieldLabel`, `emptySlotLabel`, `statValue`

### Sport-Agnostic Design
Never hardcode sport-specific values. Always load from config:
```typescript
// ❌ Wrong
const positions = ['fly_half', 'scrum_half'];

// ✅ Correct
import { sportSquadConfig } from '@spectatr/shared-types';
const positions = Object.keys(sportSquadConfig.positions);
```

### Storybook Stories Required
Every new component needs a `.stories.tsx` file co-located with it:
- Include default, loading, error, and edge-case states
- Add `play` functions with `@storybook/test` (`userEvent`, `within`, `expect`) for interaction tests
- Stories must be sport-agnostic (use `sportSquadConfig`, not hardcoded rugby values)

### Skeleton Loading States
Use `<Skeleton>` (not spinners) for all loading states, matching the shape and size of actual content to prevent layout shift.

### Database Migrations
Always use `npm run db:migrate` for schema changes — never `db:push`. Migrations touching RLS policies or Postgres grants must use `npm run db:migrate:superuser`. Every new table needs an RLS evaluation — see `.github/copilot-instructions/database-migrations.md`.

## Environment Setup

Copy env examples before first run:
```bash
cp packages/ui/env/.env.example packages/ui/env/.env
cp packages/server/env/.env.example packages/server/env/.env
```

Clerk keys (`VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) are required for auth. Create an app at https://dashboard.clerk.com.

## Key Documentation

- `ARCHITECTURE.md` — Detailed technical patterns, state management, multi-tenancy
- `PRODUCT.md` — Game modes, league configuration, business rules
- `.github/copilot-instructions/backend-api.md` — tRPC patterns and examples
- `.github/copilot-instructions/database-migrations.md` — RLS decision tree and new table checklist
- `.github/copilot-instructions/league-rules.md` — League rule formats and MVP scope
- `packages/ui/src/theme/README.md` — Theme system documentation
- `packages/ui/TESTING.md` — Unit test and Storybook testing patterns
- `docs/DATA_MODEL.md` — Entity relationships and data structures
- `.github/copilot-instructions/plans/` — Current implementation plans
