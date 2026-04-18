---
title: Admin Foundation — isAdmin flag and adminProcedure guard
version: 1.0
date_created: 2026-04-19
last_updated: 2026-04-19
---
# Implementation Plan: Admin Foundation

Adds `User.isAdmin` boolean and a new `adminProcedure` tRPC guard. This is the prerequisite for all admin-gated features (scoring round finalisation, future admin UI). The admin flag is global on the `User` model — a tenant-scoped admin role is Phase 2.

**GitHub Issue:** #29

## Architecture and Design

### High-Level Architecture

- `User.isAdmin` is a plain boolean column on the global `users` table
- `adminProcedure` extends `authedProcedure` with a middleware that queries the DB for `isAdmin`
- No JWT claims — Clerk cannot be trusted to carry this flag without custom session claim sync
- Setting the flag is manual for MVP (Prisma Studio or SQL); the admin UI is Phase 2

### Why not a role field?

A single boolean is sufficient for MVP and Phase 2 planning. When tenant-scoped admin roles are needed, a `tenantAdmins` join table will be added rather than complicating the `User` model now.

## Component Breakdown

### Migration
```sql
ALTER TABLE "users" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;
```
Standard migration — no RLS (users table is global). Run with `npm run db:migrate`.

### `adminProcedure` in `procedures.ts`
```typescript
export const adminProcedure = authedProcedure.use(async ({ ctx, next }) => {
  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});
```

## Tasks

### Migration
- [ ] Add `isAdmin Boolean @default(false)` to `User` model in `schema.prisma`
- [ ] Run `npm run db:migrate` — name migration `add_is_admin_to_users`
- [ ] Run `npm run db:generate`

### Procedure
- [ ] Add `adminProcedure` to `packages/server/src/trpc/procedures.ts`
- [ ] Export from procedures index

### Tests
- [ ] `packages/server/src/trpc/procedures.test.ts` — `adminProcedure` returns FORBIDDEN for non-admin; succeeds for admin; UNAUTHORIZED for unauthenticated

### Documentation
- [ ] `packages/server/START.md` — add "Granting admin access" section:
  ```sql
  -- Via psql
  UPDATE users SET "isAdmin" = true WHERE email = 'your@email.com';
  -- Or via Prisma Studio: npm run db:studio
  ```

## Success Criteria

- [ ] Migration applied, Prisma client regenerated
- [ ] `adminProcedure` throws FORBIDDEN for non-admin authenticated users
- [ ] `adminProcedure` passes for `isAdmin = true` users
- [ ] Tests pass
- [ ] START.md documents how to grant admin
