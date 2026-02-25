# Implementation Plan: Clerk Authentication

## Overview

Implement full-stack Clerk authentication with hosted sign-in pages to maintain MUI-only UI standards. The backend will verify Clerk JWT tokens, populate `ctx.userId` in tRPC context, and persist user records in PostgreSQL (adding `clerkUserId` to the User model). The frontend will wrap the app in `ClerkProvider`, add MUI-based auth controls linking to hosted pages, and send bearer tokens with all tRPC requests. Multi-tenant architecture remains header-based—users are shared across tenants, with tenant context independent of auth.

## Architecture and Design

### High-Level Architecture

**Backend Integration Points:**
- **Express middleware**: `clerkMiddleware()` at packages/server/src/index.ts (before tRPC handler)
- **tRPC context**: Extract `auth` from `req` in packages/server/src/trpc/context.ts, set `ctx.userId`
- **Auth middleware**: New `authMiddleware` in packages/server/src/trpc/middleware.ts validates session
- **Protected procedure**: New `authedProcedure` in packages/server/src/trpc/procedures.ts composes auth + tenant middleware
- **User persistence**: Upsert user in auth middleware using Clerk session data (email, username, clerkUserId)

**Frontend Integration Points:**
- **Provider wrapper**: `ClerkProvider` in packages/ui/src/main.tsx with publishable key
- **Auth UI**: MUI Button components linking to Clerk hosted pages (sign-in, sign-up, user profile)
- **Token injection**: Modify `fetchTrpc` in packages/ui/src/hooks/api/client.ts to add `Authorization: Bearer <token>` header
- **Route guards**: Optional protected route wrapper in packages/ui/src/App.tsx

**Data Flow:**
```
User clicks "Sign In" (MUI Button)
→ Redirect to Clerk hosted page (accounts.clerk.dev)
→ User authenticates → Redirect back to app with session
→ Frontend: `useAuth()` provides session + `getToken()`
→ tRPC request with `Authorization: Bearer <token>` header
→ Backend: clerkMiddleware verifies token → `req.auth` populated
→ tRPC context: Extract userId from `req.auth.userId`
→ Auth middleware: Upsert user in DB if authenticated
→ Protected procedure: Reject if no userId
```

**Multi-Tenant + Auth Interaction:**
- Users are **global** (not tenant-specific)
- Tenant resolution stays **header-based** (x-tenant-id or subdomain)
- A user can participate in multiple tenants (leagues)
- Future: User-Tenant-Team junction table for league participation

### Component Breakdown

**Backend Components:**
- `clerkMiddleware()` - Express middleware from `@clerk/express` (verifies JWT, populates `req.auth`)
- `createContext()` - Maps `req.auth.userId` to `ctx.userId`
- `authMiddleware` - tRPC middleware: validates session exists, upserts user in DB
- `authedProcedure` - Composed procedure (logging + tenant + auth)
- `protectedProcedure` - Existing (logging + tenant only, no auth required)

**Frontend Components:**
- `<ClerkProvider>` - Wraps entire app, provides auth context
- `<SignInButton>` - MUI Button linking to Clerk hosted sign-in
- `<UserButton>` - MUI Avatar/Menu for signed-in user (profile, sign-out)
- `useAuth()` hook - Access current user session
- `fetchTrpc` - HTTP client (modified to inject bearer token)

**Supporting Files:**
- `packages/server/.env` - Add `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `packages/ui/.env` - Add `VITE_CLERK_PUBLISHABLE_KEY`
- `packages/server/src/config/env.ts` - Validate Clerk env vars with Zod
- Migration: Add `clerkUserId` to User model

### Data Model

**User Model Changes (Prisma):**
```prisma
model User {
  id            String    @id @default(cuid())
  clerkUserId   String    @unique  // NEW: Clerk user ID (user_xxx)
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
  @@index([clerkUserId])  // NEW: Index for fast lookups
  @@map("users")
}
```

**Clerk Session Shape (from req.auth):**
```typescript
interface ClerkAuth {
  userId: string;          // Clerk user ID (user_xxx)
  sessionId: string;       // Session ID
  orgId?: string;          // Organization ID (unused for now)
  // ... other Clerk metadata
}
```

**User Upsert Logic (Provider-Agnostic):**
```typescript
// In authMiddleware
const clerkUser = await clerkClient.users.getUser(ctx.clerkUserId);
const user = await prisma.user.upsert({
  where: { clerkUserId: ctx.clerkUserId },
  update: {
    email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
    username: clerkUser.username,
    avatar: clerkUser.imageUrl,
  },
  create: {
    clerkUserId: ctx.clerkUserId,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
    username: clerkUser.username,
    avatar: clerkUser.imageUrl,
  },
});

// Set ctx.userId to our internal ID (provider-agnostic)
return next({ ctx: { userId: user.id, user } });
```

## Implementation Tasks

### Phase 1: Backend Setup

#### Task 1.1: Install Dependencies
```bash
cd packages/server
npm install @clerk/express @clerk/backend
```

#### Task 1.2: Update Environment Configuration
- [ ] Add to `packages/server/.env.example`:
  ```
  CLERK_PUBLISHABLE_KEY=pk_test_xxx
  CLERK_SECRET_KEY=sk_test_xxx
  ```
- [ ] Add to `packages/server/src/config/env.ts`:
  ```typescript
  clerkPublishableKey: z.string().startsWith('pk_'),
  clerkSecretKey: z.string().startsWith('sk_'),
  ```
- [ ] Update README with Clerk setup instructions

#### Task 1.3: Update User Model (Prisma)
- [ ] Modify `packages/server/prisma/schema.prisma`:
  ```prisma
  model User {
    id            String    @id @default(cuid())
    clerkUserId   String    @unique  // NEW: Clerk user ID (user_xxx)
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
    @@index([clerkUserId])  // NEW: Index for fast lookups
    @@map("users")
  }
  ```
- [ ] Run migration: `npm run db:migrate -- --name add_clerk_user_id`
- [ ] Update seed script if needed (users will be created on first sign-in)

#### Task 1.4: Wire Clerk Middleware in Express
- [ ] Import `clerkMiddleware` from `@clerk/express`
- [ ] Add to Express app in `packages/server/src/index.ts` **before** tRPC handler:
  ```typescript
  import { clerkMiddleware } from '@clerk/express';
  
  app.use(clerkMiddleware({
    publishableKey: env.clerkPublishableKey,
    secretKey: env.clerkSecretKey,
  }));
  ```
- [ ] Verify `req.auth` is available in context

#### Task 1.5: Update tRPC Context
- [ ] Modify `createContext` in `packages/server/src/trpc/context.ts`:
  ```typescript
  export const createContext = async ({ req, res }: CreateContextOptions) => {
    const tenantId = resolveTenantId(req);
    const tenant = tenantCache.get(tenantId);
    
    // Extract Clerk auth (provider-specific ID)
    // @ts-expect-error - req.auth is added by @clerk/express middleware
    const clerkUserId = req.auth?.userId ?? null;
    
    return {
      prisma: tenant ? createTenantScopedPrisma(tenantId) : prisma,
      tenant,
      tenantId,
      clerkUserId,  // Clerk user ID (user_xxx) - used by auth middleware
      userId: null as string | null,  // Our internal user ID - set by auth middleware
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      req,
      res,
    };
  };
  ```

#### Task 1.6: Create Auth Middleware
- [ ] Add to `packages/server/src/trpc/middleware.ts`:
  ```typescript
  import { clerkClient } from '@clerk/backend';
  import { prisma } from '../db/prisma.js';  // Unscoped prisma for user lookups
  
  /**
   * Auth middleware - requires valid Clerk session
   * Looks up user by clerkUserId and sets ctx.userId to our internal ID
   * Provider-agnostic: Only this middleware needs to change if switching auth providers
   */
  export const authMiddleware = middleware(async ({ ctx, next }) => {
    if (!ctx.clerkUserId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }
  
    // Upsert user in DB (cached, fast)
    // Uses unscoped prisma as users are global (not tenant-specific)
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
      create: {
        clerkUserId: ctx.clerkUserId,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
        username: clerkUser.username,
        avatar: clerkUser.imageUrl,
      },
    });
  
    // Set ctx.userId to our internal ID (provider-agnostic)
    return next({
      ctx: {
        userId: user.id,  // Our internal CUID - used throughout the app
        user,  // Full user object
      },
    });
  });
  ```

#### Task 1.7: Create Authenticated Procedure
- [ ] Add to `packages/server/src/trpc/procedures.ts`:
  ```typescript
  import { authMiddleware } from './middleware.js';
  
  /**
   * Authenticated + tenant-scoped procedure
   * Requires valid Clerk session + tenant header
   */
  export const authedProcedure = baseProcedure
    .use(loggingMiddleware)
    .use(tenantMiddleware)
    .use(authMiddleware);
  ```

#### Task 1.8: Test Backend Auth
- [ ] Start backend: `npm run dev`
- [ ] Test health check (no auth): `curl http://localhost:3001/health`
- [ ] Test players.list with no auth (should work with `protectedProcedure`)
- [ ] Create test router with `authedProcedure` to verify auth rejection

### Phase 2: Frontend Setup

#### Task 2.1: Install Dependencies
```bash
cd packages/ui
npm install @clerk/clerk-react
```

#### Task 2.2: Update Environment Configuration
- [ ] Create `packages/ui/.env.local`:
  ```
  VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
  ```
- [ ] Add to `.env.example`
- [ ] Update vite.config.ts if needed (env vars starting with `VITE_` are auto-exposed)

#### Task 2.3: Wrap App with ClerkProvider
- [ ] Modify `packages/ui/src/main.tsx`:
  ```typescript
  import { ClerkProvider } from '@clerk/clerk-react';
  
  const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  
  if (!clerkPubKey) {
    throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
  }
  
  function Root() {
    // ... existing theme state
    
    return (
      <ClerkProvider publishableKey={clerkPubKey}>
        <ThemeProvider theme={theme}>
          <CssBaseline enableColorScheme />
          <App />
        </ThemeProvider>
      </ClerkProvider>
    );
  }
  ```

#### Task 2.4: Create MUI Auth Components
- [ ] Create `packages/ui/src/components/auth/SignInButton.tsx`:
  ```typescript
  import { Button } from '@mui/material';
  import { useAuth, useClerk } from '@clerk/clerk-react';
  
  export function SignInButton() {
    const { isSignedIn } = useAuth();
    const { openSignIn } = useClerk();
  
    if (isSignedIn) return null;
  
    return (
      <Button variant="contained" onClick={() => openSignIn()}>
        Sign In
      </Button>
    );
  }
  ```

- [ ] Create `packages/ui/src/components/auth/UserButton.tsx`:
  ```typescript
  import { Avatar, IconButton, Menu, MenuItem } from '@mui/material';
  import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
  import { useState } from 'react';
  
  export function UserButton() {
    const { isSignedIn } = useAuth();
    const { user } = useUser();
    const { openUserProfile, signOut } = useClerk();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
    if (!isSignedIn || !user) return null;
  
    const handleClose = () => setAnchorEl(null);
  
    return (
      <>
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
          <Avatar src={user.imageUrl} alt={user.username ?? user.primaryEmailAddress?.emailAddress} />
        </IconButton>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
          <MenuItem onClick={() => { openUserProfile(); handleClose(); }}>
            Profile
          </MenuItem>
          <MenuItem onClick={() => { signOut(); handleClose(); }}>
            Sign Out
          </MenuItem>
        </Menu>
      </>
    );
  }
  ```

- [ ] Export from `packages/ui/src/components/auth/index.ts`

#### Task 2.5: Add Auth UI to AppBar
- [ ] Update `packages/ui/src/components/Dashboard.tsx` or `DashboardPage.tsx`:
  ```typescript
  import { SignInButton, UserButton } from '../components/auth';
  
  // In AppBar's Toolbar:
  <Toolbar>
    {/* ... existing menu icon, title */}
    <Box sx={{ flexGrow: 1 }} />
    <SignInButton />
    <UserButton />
    <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
      <SettingsIcon />
    </IconButton>
  </Toolbar>
  ```

#### Task 2.6: Inject Auth Token in tRPC Client
- [ ] Modify `packages/ui/src/hooks/api/client.ts`:
  ```typescript
  import { useAuth } from '@clerk/clerk-react';
  
  // Update fetchTrpc function
  export async function fetchTrpc(
    endpoint: string,
    input?: unknown,
    getToken?: () => Promise<string | null>  // NEW: Token getter
  ): Promise<unknown> {
    const url = `${getBaseUrl()}/trpc/${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'x-tenant-id': 'trc-2025',
    };
    
    // Add auth token if available
    if (getToken) {
      const token = await getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ input }),
    });
    
    // ... rest of implementation
  }
  
  // Update usePlayers hook to use auth
  export function usePlayers() {
    const { getToken } = useAuth();
    
    return useQuery({
      queryKey: ['players'],
      queryFn: async () => {
        const data = await fetchTrpc('players.list', {}, getToken);
        return playersSchema.parse(data);
      },
    });
  }
  ```

#### Task 2.7: Route Guards (Protect All Routes Except Dashboard)
- [ ] Create `packages/ui/src/components/auth/ProtectedRoute.tsx`:
  ```typescript
  import { useAuth } from '@clerk/clerk-react';
  import { Navigate } from 'react-router-dom';
  import { ReactNode } from 'react';
  import { Box, CircularProgress } from '@mui/material';
  
  export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { isSignedIn, isLoaded } = useAuth();
  
    // Show loading state while checking auth
    if (!isLoaded) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      );
    }
    
    // Redirect to dashboard if not signed in
    if (!isSignedIn) {
      return <Navigate to="/" replace />;
    }
  
    return <>{children}</>;
  }
  ```

- [ ] Export from `packages/ui/src/components/auth/index.ts`

- [ ] Wrap protected routes in `App.tsx`:
  ```typescript
  import { ProtectedRoute } from './components/auth';
  
  // Route configuration
  <Routes>
    <Route path="/" element={<DashboardPage />} />  {/* Public - no auth required */}
    
    {/* Protected routes - require authentication */}
    <Route path="/my-team" element={
      <ProtectedRoute>
        <MyTeamPage />
      </ProtectedRoute>
    } />
    
    {/* Add ProtectedRoute wrapper to future routes: /leagues, /draft, /profile */}
  </Routes>
  ```

**Protected Routes (Require Sign-In):**
- `/my-team` - Squad management
- Future: `/leagues`, `/draft`, `/profile`, `/settings`

**Public Routes (No Auth Required):**
- `/` - Dashboard (landing page with player stats, leaderboards)

### Phase 3: Documentation & Testing

#### Task 3.1: Update Documentation
- [ ] Update `packages/server/START.md`:
  - Add Clerk setup step
  - Add environment variables to checklist
  - Add "Create Clerk account" to prerequisites
  - Remove "planned" language from auth section

- [ ] Update `ARCHITECTURE.md`:
  - Change "Auth0/Clerk/Cognito (planned)" to "Clerk (implemented)"
  - Add auth data flow diagram
  - Update Server State section to include auth

- [ ] Update `docs/SETUP.md`:
  - Add Clerk configuration to tech stack
  - Add auth setup to MVP requirements checklist
  - Remove "planned" from user authentication requirement

- [ ] Create `packages/server/docs/AUTH.md`:
  - Clerk setup guide (create account, get keys)
  - User model structure
  - Auth middleware flow
  - Testing auth endpoints
  - Migration guide (if switching providers later)

#### Task 3.2: Manual Testing Checklist
- [x] Start backend and frontend
- [x] **Public Access:** Open `/` (dashboard) without signing in → should load successfully
- [x] **Protected Routes:** Try to access `/my-team` without signing in → should redirect to `/` (dashboard)
- [x] Click "Sign In" button → redirects to Clerk hosted page
- [x] Complete sign-in → redirects back to app
- [x] Verify `UserButton` appears with avatar in AppBar
- [x] **Authenticated Access:** Navigate to `/my-team` → should load successfully
- [x] Open browser DevTools Network → verify `Authorization: Bearer` header in tRPC requests
- [x] Check backend logs → verify `userId` is set in context
- [x] Check database → verify user record created in `users` table with `clerkUserId`
- [x] Sign out → verify button changes to "Sign In"
- [x] **Post Sign-Out:** Try to access `/my-team` again → should redirect to `/` (dashboard)
- [x] Test tenant switching → verify auth persists across tenants
- [x] Test audit logs → verify userId is captured in audit trail

#### Task 3.3: E2E Testing Scenarios
- [ ] **Scenario 1: Public dashboard access**
  - Open app without signing in
  - Navigate to `/` (dashboard)
  - Verify dashboard loads with player stats and leaderboards
  - Verify `players.list` works (uses `protectedProcedure`, no auth required)
  - Try to navigate to `/my-team` → should redirect to `/`
  - Verify `SignInButton` is visible

- [ ] **Scenario 2: Sign-in flow and protected routes**
  - Click "Sign In" from dashboard
  - Complete Clerk sign-in
  - Verify redirect back to app
  - Verify `UserButton` appears (sign-in button hidden)
  - Navigate to `/my-team` → should load successfully
  - Verify user state persists on page reload
  - Sign out → redirected to `/` (dashboard)

- [ ] **Scenario 3: Multi-tenant user**
  - Sign in as user A
  - Switch tenant header (change env var or subdomain)
  - Verify same user ID across tenants
  - Navigate to `/my-team` in tenant 1 → select players
  - Switch to tenant 2 → navigate to `/my-team` → different player pool
  - Verify auth persists across tenant switches

- [ ] **Scenario 4: Token expiration**
  - Sign in and navigate to protected route
  - Wait for token to expire (or manually invalidate in Clerk dashboard)
  - Make API request from `/my-team`
  - Verify graceful re-auth or redirect (Clerk handles automatically)

- [ ] **Scenario 5: Direct URL access**
  - While signed out, paste `/my-team` URL directly in browser
  - Should redirect to `/` (dashboard)
  - Sign in
  - Manually navigate to `/my-team` again
  - Should load successfully

## Success Criteria

- [ ] **Backend:**
  - [ ] Clerk middleware verifies tokens and populates `req.auth`
  - [ ] `ctx.userId` is set from Clerk session in tRPC context
  - [ ] Auth middleware upserts users in DB on authenticated requests
  - [ ] `authedProcedure` rejects requests without valid session (401)
  - [ ] `protectedProcedure` still works without auth (tenant-only)
  - [ ] User records persisted with `clerkUserId`, email, username, avatar
  - [ ] Audit logs capture userId for all mutations

  - [ ] **Frontend:**
  - [ ] `ClerkProvider` wraps app with publishable key
  - [ ] "Sign In" button redirects to Clerk hosted page
  - [ ] "User Button" shows avatar menu with Profile/Sign Out
  - [ ] `Authorization: Bearer` header sent with all tRPC requests
  - [ ] Token automatically injected via `getToken()` in query hooks
  - [ ] UI updates on sign-in/sign-out (reactive to auth state)
  - [ ] **Route Guards:** Protected routes redirect to dashboard when signed out
  - [ ] **Public Dashboard:** `/` accessible without authentication
  - [ ] **Protected Routes:** `/my-team` and future routes require authentication

- [ ] **Multi-Tenancy:**
  - [ ] Users are global (not tenant-specific)
  - [ ] Tenant resolution independent of auth (still header-based)
  - [ ] Same user can create teams in multiple tenants
  - [ ] Tenant switching doesn't affect auth state

- [ ] **Documentation:**
  - [ ] Setup guides updated with Clerk configuration
  - [ ] Environment variables documented with examples
  - [ ] "Planned" language removed from all auth references
  - [ ] AUTH.md created with migration guide for provider changes

- [ ] **Testing:**
  - [ ] Manual testing checklist completed
  - [ ] E2E scenarios verified
  - [ ] Auth rejection tested (401 without token)
  - [ ] User persistence tested (DB record created)

## Notes

- **Provider-agnostic design**: While implementing Clerk, maintain abstraction at context/middleware level for easy provider migration (switching to Auth.js, Lucia, or Supabase should only require middleware changes)
- **Performance**: User upsert on every authenticated request may seem expensive, but it's cached by Clerk SDK and ensures user data stays fresh (email changes, avatar updates)
- **Security**: Clerk JWT verification happens in Express middleware (before tRPC), ensuring all routes are protected by default
- **Migration path**: If switching auth providers later, only update `authMiddleware` and frontend provider—core tRPC procedures remain unchanged
- **Hosted UI benefits**: No maintenance of sign-in forms, automatic security updates, passwordless/social login support, mobile-friendly by default
- **Future enhancements**: 
  - Social login (Google, GitHub, etc.)—enabled in Clerk dashboard
  - Multi-factor auth (MFA)—toggle in Clerk settings
  - Organization invites for league participation
  - Premium subscription tier with Clerk metadata

1. Add Clerk configuration and dependencies, then wire backend middleware in the server entrypoint at packages/server/src/index.ts so `req.auth` is available before tRPC.
2. Map Clerk auth to tRPC context in packages/server/src/trpc/context.ts and add an auth guard middleware in packages/server/src/trpc/middleware.ts; expose `authedProcedure` in packages/server/src/trpc/procedures.ts.
3. Persist users by adding `clerkUserId` to Prisma in packages/server/prisma/schema.prisma, then upsert the user record in the auth middleware (or context) using Clerk user data.
4. Update env config and examples to include Clerk keys in packages/server/src/config/env.ts and packages/server/.env.example; add Vite `VITE_CLERK_PUBLISHABLE_KEY` on the frontend.
5. Add `ClerkProvider` and hosted auth links to the frontend entrypoint in packages/ui/src/main.tsx, and route guards/sign-in calls in packages/ui/src/App.tsx using MUI buttons.
6. Attach Clerk tokens to tRPC requests in packages/ui/src/hooks/api/client.ts using `getToken()` and an `Authorization: Bearer` header.
7. Update docs to reflect auth setup steps and remove “planned” language in packages/server/START.md, docs/SETUP.md, and ARCHITECTURE.md.

## Verification
- Start backend and frontend; confirm Clerk sign-in redirects to hosted page and returns to app.
- Call `players.list` while signed in and verify `ctx.userId` is set plus a user row exists.
- Call `players.list` while signed out and verify auth-protected procedures reject the request.
- Confirm tenant header handling still works across requests.

## Decisions

- **Hosted Clerk pages** - Keep in-app UI MUI-only
- **Persist users in Prisma** - Add `clerkUserId` for audit and ownership
- **Provider-agnostic user IDs** - Context uses `clerkUserId` (provider-specific) and `userId` (our internal CUID). Auth middleware maps between them. If switching providers, only auth middleware changes.
- **Clerk Organizations** - Keep leagues in our DB only (simpler, more control, no Clerk org dependency)
- **User onboarding** - Not needed for MVP (defer to future iteration)
- **Session duration** - Use Clerk default (7 days)
- **Rate limiting** - Same limits for all users (no auth-based tiers for MVP)
- **Route Protection Strategy:**
  - **Public:** Dashboard (`/`) - Landing page accessible to everyone for discovery
  - **Protected:** All other routes (`/my-team`, `/test`, future routes) - Require authentication
  - **Redirect:** Unauthenticated users accessing protected routes → redirect to dashboard
  - **UX:** Users can browse dashboard, see leaderboards, then sign in to manage teams
