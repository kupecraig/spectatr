# Database Migrations Guide

**When to use:** Any time you add a table, change a schema, or need to run/deploy migrations in Spectatr.

All migrations live in `packages/server/`. Run all commands from that directory (or use the root `npm run` which delegates via Turborepo).

---

## Script Reference

| Script | When to use |
|---|---|
| `npm run db:migrate` | **Dev only.** Interactive — prompts for migration name, applies to local DB. Creates the migration file. |
| `npm run db:migrate:deploy` | **Prod / CI.** Applies all pending migrations without prompting or generating new ones. |
| `npm run db:migrate:superuser` | **Required when the migration needs superuser privileges** (see [When to use superuser](#when-to-use-dbmigratesuperuser)). Connects as `postgres` directly, bypassing `env/.env`. |
| `npm run db:generate` | Regenerate the Prisma client after any schema change. Always run this after editing `schema.prisma`. |
| `npm run db:push` | **Never for shared/reviewed changes.** Pushes schema directly without creating a migration file — causes drift for other developers. Dev prototyping only. |
| `npm run db:reset` | Wipe local DB + replay every migration from scratch. Destroys all local data. |
| `npm run db:seed` | Seed tenant data. Pass `--tenant trc-2025` or `--all`. |

### When to use `db:migrate:superuser`

Use this script any time your migration SQL contains any of the following:

- `CREATE ROLE` / `ALTER ROLE`
- `ENABLE ROW LEVEL SECURITY`
- `CREATE POLICY` / `ALTER POLICY`
- `GRANT ... TO spectatr_app`
- `ALTER DEFAULT PRIVILEGES`

The `spectatr_app` role (used by the runtime app) does not have the privileges to run these statements. The `postgres` superuser does. Seeds and all migrations that touch RLS must use this path.

---

## Adding a New Table: Checklist

When adding a new Prisma model, three places must stay in sync:

### 1. `schema.prisma`
Add the model with appropriate fields. Remember:
- Tenant-scoped tables need a `tenantId String` field
- Adding a `NOT NULL` column to a table that may already have rows requires a `@default(...)` or the migration will fail — see [Pitfalls](#known-pitfalls)

### 2. Migration SQL
- Run `npm run db:migrate` to generate the migration file
- Then manually edit the generated SQL to add RLS if required (see [RLS Pattern](#rls-migration-pattern))
- If the migration touches RLS/roles, apply with `npm run db:migrate:superuser` instead of `db:migrate:deploy`

### 3. `TENANT_SCOPED_MODELS` in `packages/server/src/trpc/context.ts`
If the table is tenant-scoped, add the Prisma model name (lowercase) to the `TENANT_SCOPED_MODELS` array. This enables the app-level Prisma extension that auto-injects `tenantId` into every query — the second isolation layer that works even when running as the `postgres` superuser (which bypasses RLS).

```typescript
// packages/server/src/trpc/context.ts
const TENANT_SCOPED_MODELS = [
  'player', 'squad', 'round', 'tournament',
  'league', 'team', 'gameweekstate', 'scoringevent', 'checksum',
  'myNewModel', // ← add here
];
```

---

## RLS Decision Tree

For every new table, work through these questions:

#### If unsure prompt user: "Does this table have a `tenantId` column, or would it need one to function correctly?"

**YES → Tenant-scoped table**

Examples: `players`, `squads`, `rounds`, `leagues`, `teams`, `gameweek_states`

Required steps:
1. Add `tenantId String` column to the Prisma model
2. Enable RLS and add `tenant_isolation` policy in the migration SQL (see [pattern below](#rls-migration-pattern))
3. Add model name to `TENANT_SCOPED_MODELS` in `context.ts`
4. Apply migration with `db:migrate:superuser`

---

**NO → Continue...**

### Is it a join/junction table whose parent is tenant-scoped?

**YES → Derive isolation via subquery policy**

Examples: `user_leagues` (parent: `leagues`)

The table has no `tenantId` column of its own — it's isolated because its parent FK already scopes it. Use a subquery policy:

```sql
ALTER TABLE "user_leagues" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "user_leagues"
  FOR ALL TO spectatr_app
  USING (
    "leagueId" IN (
      SELECT id FROM leagues
      WHERE "tenantId" = current_setting('app.current_tenant', true)
    )
  );
```

Do **not** add these models to `TENANT_SCOPED_MODELS` — the app-level extension cannot inject `tenantId` because the column doesn't exist. Isolation is enforced entirely by RLS.

---

**NO → Global/platform table**

Examples: `users`, `tenants`, `audit_logs`

No RLS needed. No `tenantId` column. Do not add to `TENANT_SCOPED_MODELS`.

These tables are intentionally visible across all tenant contexts — users are global (one user can participate in multiple tenants), tenants is the registry itself, and audit_logs captures cross-tenant events.

---

## RLS Migration Pattern

For a standard tenant-scoped table:

```sql
-- Enable RLS on the table
ALTER TABLE "my_table" ENABLE ROW LEVEL SECURITY;

-- Policy: rows are visible/writable only when tenantId matches the current session tenant
-- current_setting('app.current_tenant', true) returns NULL (not an error) when unset,
-- which causes the USING check to fail — denying access by default.
CREATE POLICY tenant_isolation ON "my_table"
  FOR ALL TO spectatr_app
  USING ("tenantId" = current_setting('app.current_tenant', true));
```

**Note on GRANT:** The `ALTER DEFAULT PRIVILEGES` statement in migration `20260222000000_add_rls` already grants `SELECT, INSERT, UPDATE, DELETE` to `spectatr_app` on all future tables automatically. You do **not** need to add an explicit `GRANT` for new tables — but RLS must still be enabled per-table manually.

**Note on `WITH CHECK`:** The policies use `USING` only (no `WITH CHECK`). For `INSERT`, PostgreSQL reuses the `USING` expression as the check condition, so inserts with a non-matching `tenantId` are also blocked.

**How tenant context is set at runtime** (in `createTenantScopedPrisma`):

```typescript
// context.ts — inside a $transaction so SET LOCAL only persists for that transaction
await prisma.$transaction([
  prisma.$executeRaw`SET LOCAL "app.current_tenant" = ${tenantId}`,
  // ... your queries
]);
```

---

## Known Pitfalls

### Adding a NOT NULL column to an existing table
If the table already has rows, `NOT NULL` without a default will fail at migration time.

```prisma
// ❌ Will fail if users table has rows
clerkUserId  String  @unique

// ✅ Add a default or make it optional, then backfill if needed
clerkUserId  String  @unique @default("")
```

This happened with `clerkUserId` in migration `20260214222649_add_clerk_user_id`.

### RLS and table creation split across migrations
A new table that has RLS added in a later migration is unprotected in between. Prefer enabling RLS in the **same migration** that creates the table.

This happened with `user_leagues`: the table was created in `20260223000000` and the policy added in `20260223000002`. This is acceptable when intentional, but be aware of the gap.

### `db:push` leaves no migration file
Any schema changes applied with `db:push` will cause drift for other developers and will not be deployed to production via `db:migrate:deploy`. Never use it for changes that need to be shared or reviewed.

### `postgres` superuser bypasses RLS
Migrations, seeds, and `db:migrate:superuser` all run as `postgres`. This is intentional — they need to create roles and policies. Runtime app traffic must use `spectatr_app` credentials (set in `env/.env`) so RLS is enforced.

### `SET LOCAL` requires a transaction
`SET LOCAL "app.current_tenant"` only holds for the current transaction. The `createTenantScopedPrisma` function wraps queries in `$transaction` to ensure this works correctly. If you query outside of that context (e.g. raw SQL outside a transaction), the tenant setting will not be active and RLS will deny access.

---

## Quick Reference: Which Tables Have RLS

| Table | RLS | Policy type | `TENANT_SCOPED_MODELS` |
|---|---|---|---|
| `players` | ✅ | direct `tenantId` | ✅ |
| `squads` | ✅ | direct `tenantId` | ✅ |
| `rounds` | ✅ | direct `tenantId` | ✅ |
| `tournaments` | ✅ | direct `tenantId` | ✅ |
| `leagues` | ✅ | direct `tenantId` | ✅ |
| `teams` | ✅ | direct `tenantId` | ✅ |
| `gameweek_states` | ✅ | direct `tenantId` | ✅ |
| `scoring_events` | ✅ | direct `tenantId` | ✅ |
| `checksums` | ✅ | direct `tenantId` | ✅ |
| `user_leagues` | ✅ | subquery via `leagues` | ❌ |
| `team_players` | ❌ | isolated via `teams` FK | ❌ |
| `users` | ❌ | global | ❌ |
| `tenants` | ❌ | global | ❌ |
| `audit_logs` | ❌ | global | ❌ |

---

## Related

- [Multi-Tenancy Architecture](../../ARCHITECTURE.md#multi-tenancy-architecture) — how tenant resolution and dual-layer isolation work end-to-end
- [Security Notes](../docs/SECURITY.md) — RLS role setup and runtime security model
- [`context.ts`](../../packages/server/src/trpc/context.ts) — `TENANT_SCOPED_MODELS`, `createTenantScopedPrisma`
- Migration `20260222000000_add_rls` — canonical reference for the RLS setup SQL
