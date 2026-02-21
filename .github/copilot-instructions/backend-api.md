# Backend API - tRPC Patterns

**When to use:** All API communication between frontend and backend for Spectatr.

**Overview:** Type-safe RPC framework providing end-to-end TypeScript types from server to client. Zero boilerplate for monorepo setups, automatic type inference, and native TanStack Query integration.

## Why tRPC?

**Decision Context:** Chose tRPC over NestJS for Spectatr backend because:
- **End-to-end type safety** - Automatic TypeScript types from server procedures to client calls
- **Zero boilerplate** - No code generation, OpenAPI specs, or manual type definitions
- **Monorepo native** - Direct imports of Zod schemas from `@spectatr/shared-types`
- **TanStack Query ready** - First-class React Query integration on frontend
- **Developer experience** - Autocomplete, refactoring support, instant feedback

See [Architecture Decision](../../ARCHITECTURE.md#backend) for full context.

## Creating an Endpoint

### Basic Query Endpoint

✅ **DO:** Use baseProcedure with Zod validation and tenant isolation
```typescript
// packages/server/src/trpc/routers/players.ts
import { z } from 'zod';
import { router } from '../index';
import { baseProcedure } from '../procedures';

export const playersRouter = router({
  list: baseProcedure
    .input(z.object({ 
      position: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      // Always filter by tenantId from context
      return await ctx.prisma.player.findMany({
        where: { 
          tenantId: ctx.tenantId,
          ...(input.position && { position: input.position })
        },
        take: input.limit,
        skip: input.offset,
        include: { squad: true },
      });
    }),
});
```

❌ **DON'T:** Bypass tenant isolation or skip input validation
```typescript
// WRONG: Missing tenantId filter - cross-tenant data leak!
return await ctx.prisma.player.findMany({
  where: { position: input.position } // ❌ No tenantId filter
});

// WRONG: No input validation
list: baseProcedure.query(async ({ ctx, input }) => {
  // ❌ 'input' is 'any' type - no validation!
});
```

### Mutation Endpoint

✅ **DO:** Use Zod schemas from shared-types for consistency
```typescript
// packages/server/src/trpc/routers/teams.ts
import { createTeamSchema } from '@spectatr/shared-types';

export const teamsRouter = router({
  create: baseProcedure
    .input(createTeamSchema) // Reuse shared validation
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.team.create({
        data: {
          ...input,
          tenantId: ctx.tenantId,
          userId: ctx.userId, // From auth context
        },
      });
    }),
});
```

## Multi-Tenancy Pattern

**Critical:** All database queries MUST filter by `tenantId` from context.

✅ **DO:** Always include tenantId filter
```typescript
// Context provides tenantId automatically
const players = await ctx.prisma.player.findMany({
  where: { tenantId: ctx.tenantId }, // ✅ Required!
});
```

❌ **DON'T:** Query without tenant isolation
```typescript
// ❌ SECURITY ISSUE - Returns data across all tenants!
const players = await ctx.prisma.player.findMany();
```

See [packages/server/src/trpc/context.ts](../../packages/server/src/trpc/context.ts) for tenant resolution logic.

## Context and Middleware

**Available in Context:**
- `ctx.prisma` - Prisma client instance
- `ctx.tenantId` - Current tenant ID (from x-tenant-id header or subdomain)
- `ctx.userId` - Authenticated user ID (future: from auth middleware)
- `ctx.req` - Express request object
- `ctx.res` - Express response object

**Audit Trail Middleware:**
All mutations automatically logged to `AuditLog` table via middleware:
```typescript
// Automatically captures:
// - User ID, tenant ID, action, entity type, entity ID
// - Old/new values (JSON diff)
// - Timestamp, IP address
```

See [packages/server/src/trpc/middleware.ts](../../packages/server/src/trpc/middleware.ts#audit-trail).

## Checksum System

**Background:** Enables efficient polling for data changes without full fetches.

✅ **DO:** Use checksum endpoint for change detection
```typescript
// Frontend checks for changes
const checksums = await fetch('/checksum.json').then(r => r.json());
// { players: "abc123", rounds: "def456" }

// Only refetch if checksum changed
if (checksums.players !== lastChecksum) {
  queryClient.invalidateQueries(['players']);
}
```

**Checksum Calculation:** MD5 hash of relevant table data (updated on write).

See [packages/server/src/routes/checksum.ts](../../packages/server/src/routes/checksum.ts) for implementation.

## Background Jobs

**Auto-lock Players:** Locks players 15 minutes before round kickoff.

```typescript
// packages/server/src/jobs/autoLockPlayers.ts
// Runs every 5 minutes via cron
// Finds rounds starting soon, locks their players
```

**Job Scheduler:** BullMQ with Redis backing for reliability.

See [packages/server/src/jobs/scheduler.ts](../../packages/server/src/jobs/scheduler.ts).

## Rate Limiting

**Redis-backed rate limiting** to prevent abuse:
- **Default:** 100 requests per 15 minutes per IP
- **Configuration:** `REDIS_HOST`, `REDIS_PORT` in `.env`

See [packages/server/src/middleware/rateLimiter.ts](../../packages/server/src/middleware/rateLimiter.ts).

## Quick Start

See [packages/server/START.md](../../packages/server/START.md) for complete setup guide:
1. Start Docker (PostgreSQL + Redis)
2. Generate Prisma client
3. Run migrations
4. Seed database
5. Start server (`npm run dev`)

## Related

- [Backend Setup Plan](plans/plan-backendSetup.md) - Implementation details
- [Architecture Decision](../../ARCHITECTURE.md#backend) - Why tRPC over NestJS
- [Data Model](../../docs/DATA_MODEL.md) - Database schema
- [Shared Validation](../../packages/shared-types/README.md) - Zod schemas
