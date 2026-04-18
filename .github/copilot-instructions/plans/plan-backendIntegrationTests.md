---
title: Backend Integration Test Infrastructure and Initial tRPC Tests
version: 1.0
date_created: 2026-04-12
last_updated: 2026-04-12
---
# Implementation Plan: Backend Integration Test Infrastructure

Add Vitest-based integration test infrastructure to packages/server and write an initial suite covering all 5 tRPC routers. Tests call procedures directly via createCallerFactory (no HTTP), run against a real PostgreSQL instance, and use vi.mock for Clerk so authed procedures never hit a real API.

## Architecture and Design

### High-Level Architecture

- Test runner: Vitest (Node environment, 30s timeout, dotenv via scripts)
- Invocation: `createCallerFactory` from `@trpc/server` — direct procedure calls, no Express
- Context: test-specific `createTestContext` / `createAuthedTestContext` helpers
- Tenant isolation: unique tenant ID per test file, seeded in `beforeAll`, cleaned in `afterAll`
- Auth mocking: `vi.mock('@clerk/backend')` — fake `clerkClient.users.getUser()`
- DB: real PostgreSQL with migrations applied; `spectatr_app` role (RLS enforced)

### Data Flow in Tests

```
Test → createCallerFactory(appRouter) → caller.players.list({}) → procedure
  → middleware stack (logging → tenantMiddleware → authMiddleware if authed)
  → real Prisma query (tenant-scoped) → real PostgreSQL → result
```

### Key Design Decisions

**context.ts export:** `createTenantScopedPrisma` is currently unexported. Export it so `createTestContext` can reuse it. Zero-risk refactor.

**Tenant injection:** `createTestContext` loads the `Tenant` row from DB and injects it directly as `ctx.tenant`. Does NOT call `loadTenantCache()` — that has side effects. Each test is self-contained.

**Unique tenant per file:** Each test file generates a unique `tenantId` (nanoid), creates it in `beforeAll`, deletes it in `afterAll`. Tests never share tenants.

## Component Breakdown

### `vitest.config.ts` (packages/server/)
- `environment: 'node'`
- `testTimeout: 30000`, `hookTimeout: 30000`
- `include: src/**/*.test.ts`
- `setupFiles: src/test/setup.ts`

### `src/test/setup.ts`
- Load dotenv from `env/.env.test`
- Connect Prisma on `beforeAll` (global), disconnect on `afterAll`

### `env/.env.test.example`
```
DATABASE_URL=postgresql://spectatr_app:spectatr_app@localhost:5432/spectatr
CLERK_SECRET_KEY=test_not_real
REDIS_HOST=localhost
REDIS_PORT=6379
```

### `src/test/helpers/database.ts`

Exports:
- `createTestTenant(id: string): Promise<{ tenant: Tenant; cleanup: () => Promise<void> }>`
- `createTestUser(clerkUserId: string): Promise<{ user: User; cleanup: () => Promise<void> }>`
- `createTestSquad(tenantId: string, overrides?): Promise<{ squad: Squad; cleanup: () => Promise<void> }>`
- `createTestPlayer(tenantId: string, squadId: string, overrides?): Promise<{ player: Player; cleanup: () => Promise<void> }>`
- `createTestLeague(tenantId: string, overrides?): Promise<{ league: League; cleanup: () => Promise<void> }>`

Each uses the base prisma client (not tenant-scoped) to create and delete rows. Cleanup deletes by specific row ID.

### `src/test/helpers/context.ts`

Exports:
- `createTestContext(tenantId: string): Promise<Context>`
  - Loads Tenant row from DB
  - Calls `createTenantScopedPrisma(tenantId)` (re-exported from `context.ts`)
  - Returns mock req/res with `tenantId` in headers
  - `clerkUserId: null`, `userId: null`

- `createAuthedTestContext(tenantId: string, clerkUserId: string): Promise<Context>`
  - Same but sets `clerkUserId` from parameter
  - `authMiddleware` calls (mocked) `clerkClient.users.getUser` and upserts user

```typescript
// mock req
{
  headers: { 'x-tenant-id': tenantId, host: 'localhost' },
  socket: { remoteAddress: '127.0.0.1' },
  auth: undefined, // or { userId: clerkUserId } for authed variant
}
// mock res
{ setHeader: vi.fn() }
```

## State Management

Not applicable — server-only feature.

## Validation

No new Zod schemas. No changes to `@spectatr/shared-types`. Tests exercise existing procedure input validation.

## Theming

Not applicable — server-only.

## Tasks

### Setup
- [ ] Add `vitest`, `@vitest/coverage-v8` to `packages/server` devDependencies
- [ ] Create `packages/server/vitest.config.ts`
- [ ] Add `test:integration`, `test:integration:watch`, `test:coverage` scripts to `packages/server/package.json`
- [ ] Create `packages/server/env/.env.test.example`
- [ ] Ensure `env/.env.test` is in `.gitignore`
- [ ] Create `packages/server/src/test/setup.ts`

### `context.ts` Refactor
- [ ] Export `createTenantScopedPrisma` from `packages/server/src/trpc/context.ts`

### Test Helpers
- [ ] Create `packages/server/src/test/helpers/database.ts`
- [ ] Create `packages/server/src/test/helpers/context.ts`

### Test Files
- [ ] `packages/server/src/trpc/routers/players.test.ts` (6 tests)
- [ ] `packages/server/src/trpc/routers/squads.test.ts` (2 tests)
- [ ] `packages/server/src/trpc/routers/rounds.test.ts` (3 tests)
- [ ] `packages/server/src/trpc/routers/gameweek.test.ts` (2 tests)
- [ ] `packages/server/src/trpc/routers/leagues.test.ts` (6 tests — includes Clerk mock)

### Docs
- [ ] Update `ARCHITECTURE.md` Testing Strategy section to mention backend integration tests
- [ ] Update `packages/server/START.md` with "Running Integration Tests" section

## Open Questions

1. **Separate test database?**
   Recommendation: Same DB with unique tenant IDs per test file. Cleanup in `afterAll` makes this safe. Only add `spectatr_test` DB if orphaned rows become a problem in practice.

2. **GameweekState in rounds tests**
   Recommendation: Test the no-`GameweekState` case first (all rounds return `isCurrent: false`), then create a `GameweekState` row for the `isCurrent` test. Covers both branches.

3. **Cleanup order for leagues.test.ts**
   Recommendation: `createTestLeague` cleanup deletes `UserLeague` members before `League` to respect FK constraints.

## Testing Strategy

This issue IS the testing strategy. Key coverage requirements:
- **Happy path** — each procedure returns the expected shape
- **Tenant isolation** — explicit cross-tenant NO-READ test in `players.test.ts` (data from tenant A invisible to tenant B)
- **Empty state** — procedures with optional data (e.g. `GameweekState`) tested with and without
- **Auth boundary** — `authedProcedure` throws `UNAUTHORIZED` when `userId` is null (leagues.test.ts)
- **NOT_FOUND** — `getById` procedures throw when row exists in a different tenant

## Success Criteria

- [ ] `npm run test:integration` exits 0 against local PostgreSQL with migrations applied
- [ ] ≥ 25 integration tests across 5 routers, all passing
- [ ] At least 1 explicit tenant isolation test (data from tenant A invisible to tenant B)
- [ ] Zero real Clerk API calls (confirmed via `vi.mock` assertion in `leagues.test.ts`)
- [ ] All authed tests work without a real JWT
- [ ] `afterAll` cleanup leaves no orphaned rows
- [ ] Issue #12 CI steps can run `npm run test:integration` after `prisma migrate deploy`

## Notes

- GitHub issue: https://github.com/kupecraig/spectatr/issues/20
- Prerequisite of: #12 (`CI: Add PostgreSQL + Redis service containers for backend integration tests`)
- `DATABASE_URL` in `.env.test` must use the `spectatr_app` role so RLS is enforced — tenant isolation is validated at DB level, not just application layer
- `nanoid` is already in `packages/server` dependencies — use it for unique test tenant IDs
- `env/.env.test` must NOT be committed; only `.env.test.example` goes in git
