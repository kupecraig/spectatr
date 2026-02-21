# Authentication Guide

## Overview

Spectatr uses **Clerk** for authentication with a provider-agnostic architecture that allows easy migration to other auth providers (Auth.js, Lucia, Supabase) if needed.

**Key Decisions:**
- Hosted Clerk pages (keep in-app UI MUI-only)
- Provider-agnostic user IDs (internal CUID + Clerk ID mapping)
- Users are global (not tenant-specific)
- Session duration: 7 days (Clerk default)

## Quick Start

### 1. Create Clerk Account

1. Sign up at https://clerk.com
2. Create new application
3. Get your API keys from dashboard

### 2. Configure Environment Variables

**Backend** (`packages/backend/.env`):
```bash
CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
```

**Frontend** (`packages/frontend/.env.local`):
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
```

### 3. Start Services

```bash
# From project root
npm run dev:all
```

## User Model

### Prisma Schema

```prisma
model User {
  id            String    @id @default(cuid())
  clerkUserId   String    @unique  // Clerk user ID (e.g., user_xxx)
  email         String    @unique
  username      String?   @unique
  avatar        String?
  emailVerified DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  teams      Team[]
  auditLogs  AuditLog[]

  @@index([email])
  @@index([clerkUserId])
  @@map("users")
}
```

**Key Fields:**
- `id` - Our internal CUID (provider-agnostic, used throughout app)
- `clerkUserId` - Clerk-specific ID (only used in auth middleware)
- `email` - User email (synced from Clerk)
- `username` - Display name (synced from Clerk)
- `avatar` - Profile image URL (synced from Clerk)

## Auth Flow

### 1. Sign-In Process

```
User clicks "Sign In" button (MUI)
  ↓
Redirect to Clerk hosted page (accounts.clerk.dev)
  ↓
User authenticates (email/password, OAuth, etc.)
  ↓
Redirect back to app with session cookie
  ↓
Frontend: useAuth() hook provides session
  ↓
All tRPC requests include Authorization: Bearer <token>
```

### 2. Backend Token Verification

```
tRPC request arrives
  ↓
clerkMiddleware() verifies JWT
  ↓
req.auth populated with Clerk user ID
  ↓
tRPC context extracts clerkUserId from req.auth
  ↓
authMiddleware upserts user in DB
  ↓
ctx.userId set to internal CUID
  ↓
Protected procedure executes with userId
```

### 3. User Synchronization

**When:** Every authenticated request  
**Where:** `authMiddleware` in `packages/backend/src/trpc/middleware.ts`

```typescript
// Upsert user on every authenticated request
const clerkUser = await clerkClient.users.getUser(ctx.clerkUserId);
const user = await prisma.user.upsert({
  where: { clerkUserId: ctx.clerkUserId },
  update: {
    email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
    username: clerkUser.username,
    avatar: clerkUser.imageUrl,
    emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified'
      ? new Date()
      : null,
  },
  create: { /* same fields */ },
});
```

**Why upsert on every request?**
- Keeps user data fresh (email changes, avatar updates)
- Clerk SDK caches user lookups (fast)
- Ensures user exists before any DB operations

## tRPC Procedures

### Protected Procedure (No Auth Required)

```typescript
// Tenant-scoped, no authentication
export const protectedProcedure = baseProcedure
  .use(loggingMiddleware)
  .use(tenantMiddleware);
```

**Use for:**
- Public player lists
- Public leaderboards
- Read-only endpoints

### Authenticated Procedure (Auth Required)

```typescript
// Tenant-scoped + authenticated
export const authedProcedure = baseProcedure
  .use(loggingMiddleware)
  .use(tenantMiddleware)
  .use(authMiddleware);
```

**Use for:**
- Team management
- Squad building
- League creation
- User profile updates

**Example:**
```typescript
export const teamsRouter = router({
  create: authedProcedure
    .input(createTeamSchema)
    .mutation(async ({ ctx, input }) => {
      // ctx.userId is guaranteed to exist
      return await ctx.prisma.team.create({
        data: {
          ...input,
          userId: ctx.userId,  // Our internal CUID
          tenantId: ctx.tenantId,
        },
      });
    }),
});
```

## Multi-Tenancy

**Users are global** (not tenant-specific):
- Same user can participate in multiple tenants
- User record shared across all tenants
- Tenant ID stored on teams, not users

**Example:**
```typescript
// User A in multiple tenants
User { id: "cuid123", clerkUserId: "user_abc", email: "user@example.com" }
  ↓
Tenant: trc-2025
  └─ Team { userId: "cuid123", tenantId: "trc-2025", name: "My TRC Team" }
  
Tenant: svns
  └─ Team { userId: "cuid123", tenantId: "svns", name: "My Sevens Team" }
```

## Testing Auth

### Manual Testing

**Without signing in:**
```bash
# Public endpoint - should work
curl http://localhost:3001/trpc/players.list

# Protected endpoint - should return 401
curl http://localhost:3001/trpc/teams.create \
  -H "Content-Type: application/json" \
  -d '{"name": "My Team"}'
```

**With authentication:**
1. Sign in via frontend UI
2. Open browser DevTools → Network tab
3. Make request to protected endpoint
4. Verify `Authorization: Bearer <token>` header present
5. Check backend logs for `userId` in context

**Database verification:**
```sql
-- Check user created
SELECT * FROM users WHERE "clerkUserId" = 'user_xxx';

-- Check teams linked to user
SELECT t.*, u.email 
FROM teams t 
JOIN users u ON t."userId" = u.id;
```

### E2E Testing Checklist

- [ ] Public dashboard loads without auth
- [ ] Protected routes redirect to dashboard when signed out
- [ ] Sign-in redirects to Clerk hosted page
- [ ] Sign-in callback returns to app with session
- [ ] UserButton appears with avatar after sign-in
- [ ] Authorization header sent with tRPC requests
- [ ] User record created in database
- [ ] Protected endpoints work with valid token
- [ ] Protected endpoints reject invalid/missing token
- [ ] Sign-out clears session and redirects
- [ ] Auth persists across tenant switches

## Provider Migration Guide

### Switching to Another Provider

**1. Update Auth Middleware** (`packages/backend/src/trpc/middleware.ts`):

Replace Clerk-specific code:
```typescript
// Before (Clerk)
const clerkUser = await clerkClient.users.getUser(ctx.clerkUserId);

// After (Auth.js example)
const session = await getServerSession(req, res, authOptions);
const user = await prisma.user.upsert({
  where: { authJsId: session.user.id },
  // ...
});
```

**2. Update Context** (`packages/backend/src/trpc/context.ts`):

```typescript
// Before (Clerk)
const clerkUserId = req.auth?.userId ?? null;

// After (Auth.js example)
const session = await getServerSession(req, res, authOptions);
const authProviderId = session?.user?.id ?? null;
```

**3. Update Frontend Provider** (`packages/frontend/src/main.tsx`):

```typescript
// Before (Clerk)
<ClerkProvider publishableKey={clerkPubKey}>

// After (Auth.js example)
<SessionProvider session={session}>
```

**4. Update User Model** (add migration):

```prisma
model User {
  id              String  @id @default(cuid())
  clerkUserId     String? @unique  // Make nullable during transition
  authJsId        String? @unique  // New provider ID
  // ... rest unchanged
}
```

**What doesn't change:**
- ✅ `ctx.userId` (internal CUID used throughout app)
- ✅ tRPC procedure composition (`authedProcedure`, `protectedProcedure`)
- ✅ Frontend route guards (just swap provider hooks)
- ✅ Database schema (just add new provider ID column)

## Security Considerations

**JWT Verification:**
- Clerk middleware verifies tokens before tRPC
- Invalid tokens rejected at Express layer
- No unverified requests reach tRPC procedures

**Rate Limiting:**
- Redis-backed rate limiting (100 req/15min per IP)
- Same limits for authenticated and unauthenticated users
- See `packages/backend/src/middleware/rateLimiter.ts`

**Audit Trail:**
- All mutations logged with `userId`
- Tracks who made changes and when
- See `packages/backend/src/utils/audit.ts`

**Session Management:**
- 7-day session duration (Clerk default)
- Automatic token refresh by Clerk SDK
- Revoke sessions in Clerk dashboard

## Troubleshooting

### "Authentication required" error

**Cause:** Missing or invalid Clerk token

**Solution:**
1. Check `Authorization: Bearer` header in request
2. Verify Clerk keys in `.env` files
3. Check Clerk dashboard for user session status
4. Clear browser cookies and sign in again

### User not created in database

**Cause:** Database connection or migration issue

**Solution:**
1. Verify PostgreSQL is running: `docker ps`
2. Run migrations: `npm run db:migrate`
3. Check backend logs for Prisma errors
4. Verify `clerkUserId` field exists in schema

### Token expired errors

**Cause:** Clerk session expired

**Solution:**
- Clerk automatically refreshes tokens
- If persisting, sign out and sign in again
- Check Clerk dashboard session settings

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk + Express Setup](https://clerk.com/docs/backend-requests/handling/nodejs)
- [tRPC Authentication Patterns](https://trpc.io/docs/server/middlewares)
- [Multi-Tenancy Architecture](../../ARCHITECTURE.md#multi-tenancy)
