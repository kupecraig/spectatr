# Implementation Plan: League Feature (Full Stack)

Full lifecycle — browse, create, join, manage, view standings — wired from DB through tRPC to React UI.
`UserLeague` join table added for proper many-to-many memberships. `season` is backend-resolved from the tenant's active `Tournament`. Joining atomically creates a `UserLeague` + blank `Team`. All league routes require auth. Rules remain a JSONB blob on `League`.

**Jira Ticket:** FSA-XXX

**UI Reference:** Review the league page screenshot before implementing any UI components — it shows the tab structure ("My Leagues" / "List of Leagues"), the "Create a League" CTA button placement, and the create form layout:
[`.github/copilot-instructions/docs/team-page-images/create-league-page.png`](../docs/team-page-images/create-league-page.png) - MUST REVIEW BEFORE IMPLEMENTATION

---

## Architecture and Design

### High-Level Architecture

```
User Action (browse / create / join / manage)
  → LeaguesPage / LeaguePage (React)
  → useLeagueStore (Zustand) ← UI state only
  → TanStack Query hooks (useLeaguesQuery, useCreateLeagueMutation, …)
  → tRPC (authedProcedure) → leagues router
  → Prisma (tenantId auto-scoped) → PostgreSQL
```

**Tenant isolation:** all league queries use `tenantId` from context (same dual-layer RLS + Prisma middleware pattern as the rest of the app).

**Auth:** every league endpoint uses `authedProcedure` — Clerk session required (except `leagues.list` which can use `protectedProcedure` for public browsing).

**Season resolution (backend):** on `leagues.create`, the server looks up the tenant's current `Tournament` and sets `season` from `tournament.season`. If no active tournament exists, the procedure throws a `BAD_REQUEST` error.

---

### Component Structure

**Pages:**
| Component | Route | Purpose |
|---|---|---|
| `LeaguesPage` | `/leagues` | "My Leagues" / "List of Leagues" tabs + Create CTA |
| `LeaguePage` | `/leagues/:id` | Standings, settings, invite |

**Feature components (`features/leagues/`):**
| Component | Purpose |
|---|---|
| `LeagueCard` / `LeagueCardSkeleton` | Card for league in list view + loading state |
| `LeagueList` / `LeagueListSkeleton` | Grid of cards + loading state |
| `StandingsTable` / `StandingsTableSkeleton` | Ranked team list inside a league |
| `CreateLeagueDialog` | Multi-step MUI Dialog wizard (3 steps) |
| `JoinLeagueDialog` | Join-by-invite-code MUI Dialog |
| `LeagueSettingsDialog` | Edit rules — creator only |
| `LeagueInvitePanel` | Display + copy invite code |

---

### Data Model

**Existing Prisma models (already migrated):** `League`, `Team`, `TeamPlayer`

**New: `UserLeague` join table (many-to-many users ↔ leagues)**

```prisma
model UserLeague {
  id       Int      @id @default(autoincrement())
  userId   String
  leagueId Int
  role     String   @default("member") // 'creator' | 'member'
  joinedAt DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id])
  league League @relation(fields: [leagueId], references: [id], onDelete: Cascade)

  @@unique([userId, leagueId])
  @@index([userId])
  @@index([leagueId])
  @@map("user_leagues")
}
```

Add back-relations:
```prisma
// On User model
leagueMembers UserLeague[]

// On League model
members UserLeague[]
```

**Zod schemas (shared-types):**

```typescript
// Refactored rules shape — remove DB-admin fields (id, leagueId, name, createdAt, updatedAt)
export const leagueRulesSchema = z.object({
  draftMode:           z.boolean().default(false),
  pricingModel:        z.enum(['fixed', 'dynamic']).default('fixed'),
  priceCapEnabled:     z.boolean().default(true),
  priceCap:            z.number().nullable().default(null),
  positionMatching:    z.boolean().default(false),
  squadLimitPerTeam:   z.number().nullable().default(null),
  sharedPool:          z.boolean().default(false),
  transfersPerRound:   z.number().int().min(0).default(3),
  wildcardRounds:      z.array(z.number()).default([]),
  tripleCaptainRounds: z.array(z.number()).default([]),
  benchBoostRounds:    z.array(z.number()).default([]),
  draftSettings:       draftSettingsSchema,
});

// User-facing create input — no season (backend-resolved from Tournament)
export const createLeagueSchema = z.object({
  name:            z.string().min(3).max(60),
  gameMode:        z.enum(['standard', 'round-robin', 'ranked']),
  isPublic:        z.boolean().default(false),
  maxParticipants: z.number().int().min(2).max(100).default(10),
  startDate:       z.string().datetime(),
  endDate:         z.string().datetime().optional(),
  rules:           leagueRulesSchema.default({}),
});

export const updateLeagueSchema = createLeagueSchema.partial().extend({
  id: z.number(),
});

// inviteCode is exactly 8 chars (nanoid(8)); includes teamName for UX
export const joinLeagueByCodeSchema = z.object({
  inviteCode: z.string().length(8),
  teamName:   z.string().min(1).max(50),
});

export const leagueSchema = z.object({
  id:              z.number(),
  tenantId:        z.string(),
  name:            z.string(),
  creatorId:       z.string(),
  sportType:       z.string(),
  gameMode:        z.enum(['standard', 'round-robin', 'ranked']),
  season:          z.string(),
  status:          z.enum(['draft', 'active', 'completed']),
  isPublic:        z.boolean(),
  inviteCode:      z.string().optional(),
  maxParticipants: z.number().optional(),
  startDate:       z.string(),
  endDate:         z.string().optional(),
  rules:           leagueRulesSchema.optional(),
  createdAt:       z.string(),
  updatedAt:       z.string(),
});

export const teamSchema = z.object({
  id:        z.number(),
  tenantId:  z.string(),
  userId:    z.string(),
  leagueId:  z.number(),
  name:      z.string(),
  budget:    z.number(),
  totalCost: z.number(),
  points:    z.number(),
  rank:      z.number().optional(),
  wins:      z.number(),
  losses:    z.number(),
  draws:     z.number(),
});
```

---

## State Management

### Zustand Store — `useLeagueStore`

```typescript
interface LeagueUIState {
  // UI State
  createDialogOpen:   boolean;
  joinDialogOpen:     boolean;
  settingsDialogOpen: boolean;
  activeTab:          'MY_LEAGUES' | 'LIST_OF_LEAGUES';
  selectedGameModeFilter: string | null;

  // Actions
  openCreateDialog:    () => void;
  closeCreateDialog:   () => void;
  openJoinDialog:      () => void;
  closeJoinDialog:     () => void;
  openSettingsDialog:  () => void;
  closeSettingsDialog: () => void;
  setActiveTab:        (tab: 'MY_LEAGUES' | 'LIST_OF_LEAGUES') => void;
  setGameModeFilter:   (mode: string | null) => void;
}
```

No persistence — UI state only. Server state owned by TanStack Query.

### TanStack Query Hooks (`hooks/api/`)

| Hook | Type | tRPC Endpoint |
|---|---|---|
| `useLeaguesQuery(filters?)` | query | `leagues.list` |
| `useMyLeaguesQuery()` | query | `leagues.myLeagues` |
| `useLeagueQuery(id)` | query | `leagues.getById` |
| `useLeagueStandingsQuery(id)` | query | `leagues.standings` |
| `useCreateLeagueMutation()` | mutation | `leagues.create` |
| `useJoinLeagueMutation()` | mutation | `leagues.join` |
| `useLeaveLeagueMutation()` | mutation | `leagues.leave` |
| `useUpdateLeagueMutation()` | mutation | `leagues.update` |
| `useDeleteLeagueMutation()` | mutation | `leagues.delete` |

All use `useTenantQuery` for cache key scoping by tenant.

---

## Validation

### Error constants — add `LEAGUE` block to `config/constants.ts`

```typescript
export const LEAGUE_CREATE_ERRORS = {
  NAME_TOO_SHORT:       'League name must be at least 3 characters.',
  NAME_TOO_LONG:        'League name must be 60 characters or fewer.',
  INVALID_GAME_MODE:    'Please select a valid game mode.',
  INVALID_INVITE_CODE:  'Invite code not found or expired.',
  ALREADY_MEMBER:       'You are already a member of this league.',
  LEAGUE_FULL:          'This league has reached its participant limit.',
  NOT_CREATOR:          'Only the league creator can edit settings.',
  NO_ACTIVE_TOURNAMENT: 'No active tournament found for this competition.',
  TEAM_NAME_REQUIRED:   'Team name is required.',
} as const;
```

### Validation rules

- League name: 3–60 characters (required)
- Team name on join: 1–50 characters (required)
- `maxParticipants`: 2–100 (optional, default 10)
- `@@unique([userId, leagueId])` enforced at DB level — catch Prisma unique constraint and return `ALREADY_MEMBER`
- Delete/update guard: only `creatorId === ctx.userId` may delete or update
- Leave guard: creator cannot leave — must delete the league

---

## Theming

### MUI Components

- `Tabs` / `Tab` — "My Leagues" / "List of Leagues" tabs on `LeaguesPage`; "Create a League" as a prominent `Button` (not a tab)
- `Card` + `CardContent` + `CardActions` + `CardActionArea` — `LeagueCard`
- `Dialog` + `DialogTitle` + `DialogContent` + `DialogActions` — Create, Join, Settings (`fullScreen` below `sm` breakpoint)
- `Stepper` + `Step` + `StepLabel` — multi-step Create wizard
- `TextField` — name, invite code, team name
- `Select` + `MenuItem` — gameMode, pricing model
- `Switch` — boolean rule toggles (draftMode, positionMatching, sharedPool)
- `Chip` — status badge, gameMode label, isPublic indicator
- `Table` + `TableBody` + `TableRow` + `TableCell` — Standings
- `Skeleton` — all loading states
- `Snackbar` + `Alert` — success / error feedback
- `Tooltip` + `IconButton` + `ContentCopyIcon` — invite code copy
- `Button color="error"` — delete league destructive action
- `Grid` — `xs=12 sm=6 md=4` responsive card layout in `LeagueList`

### Theme tokens

- `theme.palette.primary` — Create/Join CTAs
- `theme.palette.error` — Delete/Leave destructive actions
- `theme.palette.text.secondary` — metadata captions
- `theme.palette.selection.available` / `.selected` — status badges
- `theme.typography.h5` — league name headers
- `theme.typography.body2` — metadata
- `theme.typography.caption` — participant count, dates
- `theme.typography.statValue` (custom) — points/rank in standings

### Skeleton shapes

- `LeagueCardSkeleton` — rectangular ~220px height matching card; title (60% width), subtitle (80%), two small chip skeletons
- `LeagueListSkeleton` — renders 4× `LeagueCardSkeleton` in grid
- `StandingsTableSkeleton` — 5 rows of text + rectangular skeletons matching table row height

---

## Tasks

### Phase 1 — Database

- [ ] Add `UserLeague` model to `packages/server/prisma/schema.prisma` (see Data Model above)
- [ ] Add `leagueMembers UserLeague[]` back-relation to `User` model
- [ ] Add `members UserLeague[]` back-relation to `League` model
- [ ] Verify `Team → League` and `TeamPlayer → Team` have `onDelete: Cascade`; add if missing
- [ ] Run `npm run db:migrate -- --name add_user_league_memberships` from `packages/server`

### Phase 2 — Shared-Types

- [ ] Refactor `leagueRulesSchema` — remove DB-admin fields, add `.default()` to all fields
- [ ] Add `createLeagueSchema` (no `season` field)
- [ ] Add `updateLeagueSchema`
- [ ] Add `joinLeagueByCodeSchema` (includes `teamName`)
- [ ] Add `leagueSchema` (full response shape)
- [ ] Add `teamSchema`
- [ ] Export all from `packages/shared-types/src/schemas/index.ts` and root `src/index.ts`
- [ ] Add/update unit tests in `league.schema.test.ts`

### Phase 3 — Backend tRPC Router

- [ ] Install `nanoid` in `packages/server`: `npm install nanoid`
- [ ] Create `packages/server/src/trpc/routers/leagues.ts`
  - [ ] `leagues.list` (`protectedProcedure`) — tenant-scoped public leagues, optional `gameMode` filter, cursor pagination
  - [ ] `leagues.myLeagues` (`authedProcedure`) — leagues where `UserLeague.userId === ctx.userId`; include member count and current user's `Team`
  - [ ] `leagues.getById` (`authedProcedure`) — include `members` (with user info), `teams` (with points), current user membership status
  - [ ] `leagues.standings` (`authedProcedure`) — teams ordered by `points desc`; include user avatar/username
  - [ ] `leagues.create` (`authedProcedure`) — resolve `season` from active `Tournament` (throw `BAD_REQUEST` if none); generate `nanoid(8)` invite code; create `League` + `UserLeague (role='creator')` + blank `Team` in `$transaction`
  - [ ] `leagues.join` (`authedProcedure`) — lookup by `inviteCode`; check capacity and existing membership; create `UserLeague` + `Team (name = input.teamName)` in `$transaction`
  - [ ] `leagues.leave` (`authedProcedure`) — remove `UserLeague`; throw `BAD_REQUEST` if `role === 'creator'`
  - [ ] `leagues.update` (`authedProcedure`) — guard `creatorId === ctx.userId`; always replace full `rules` blob
  - [ ] `leagues.delete` (`authedProcedure`) — guard `creatorId === ctx.userId`; Prisma cascade handles members/teams
- [ ] Register `leagues: leaguesRouter` in `packages/server/src/trpc/routers/_app.ts`

### Phase 4 — Frontend: Constants + Store

- [ ] Add `LEAGUE_CREATE_ERRORS` constants to `packages/ui/src/config/constants.ts`
- [ ] Create `packages/ui/src/stores/leagueStore.ts` (UI state only, no persistence)
- [ ] Export `useLeagueStore` from `packages/ui/src/stores/index.ts`

### Phase 5 — Frontend: TanStack Query Hooks

- [ ] Create `packages/ui/src/hooks/api/useLeaguesQuery.ts`
- [ ] Create `packages/ui/src/hooks/api/useMyLeaguesQuery.ts`
- [ ] Create `packages/ui/src/hooks/api/useLeagueQuery.ts`
- [ ] Create `packages/ui/src/hooks/api/useLeagueStandingsQuery.ts`
- [ ] Create `packages/ui/src/hooks/api/useLeagueMutations.ts` (create / join / leave / update / delete)
- [ ] Export all from `packages/ui/src/hooks/api/index.ts`

### Phase 6 — Feature Components

- [ ] Create `packages/ui/src/features/leagues/` directory
- [ ] `LeagueCard.tsx` + `LeagueCardSkeleton.tsx`
- [ ] `LeagueList.tsx` + `LeagueListSkeleton.tsx` (responsive `Grid`, empty state variant)
- [ ] `CreateLeagueDialog.tsx` (3-step `Stepper`; `fullScreen` below `sm`; per-step validation)
- [ ] `JoinLeagueDialog.tsx` (`inviteCode` + `teamName` fields; `fullScreen` below `sm`)
- [ ] `LeagueSettingsDialog.tsx` (pre-filled edit form; delete with confirmation; creator-only)
- [ ] `LeagueInvitePanel.tsx` (display + clipboard copy; `Snackbar` "Copied!" feedback)
- [ ] `StandingsTable.tsx` + `StandingsTableSkeleton.tsx`
- [ ] `packages/ui/src/features/leagues/index.ts` barrel export

### Phase 7 — Pages & Routing

- [ ] Create `packages/ui/src/pages/LeaguesPage.tsx` ("My Leagues" / "List of Leagues" `Tabs`; prominent "Create a League" `Button` CTA separate from tabs; "Join by code" secondary button; `LeagueList` per tab)
- [ ] Create `packages/ui/src/pages/LeaguePage.tsx` (league header, `LeagueInvitePanel`, `StandingsTable`, creator settings button, Leave button)
- [ ] Export both from `packages/ui/src/pages/index.ts`
- [ ] Add `/leagues` protected route to `packages/ui/src/App.tsx`
- [ ] Add `/leagues/:id` protected route to `packages/ui/src/App.tsx`
- [ ] Add `{ text: 'Leagues', icon: <EmojiEventsIcon />, path: '/leagues' }` to `menuItems` in `packages/ui/src/pages/DashboardPage.tsx` (after "My Team")

### Phase 8 — Storybook Stories

- [ ] `LeagueCard.stories.tsx` — default, public/private, skeleton, all gameMode variants, near-full capacity
- [ ] `LeagueList.stories.tsx` — empty state, loading (4× skeleton), populated
- [ ] `CreateLeagueDialog.stories.tsx` — each step, validation errors, submit interaction (`play` function)
- [ ] `JoinLeagueDialog.stories.tsx` — empty, invalid code error, already-member error, success
- [ ] `LeagueSettingsDialog.stories.tsx` — pre-filled, delete confirmation step
- [ ] `StandingsTable.stories.tsx` — empty, partial, full (5+ teams), loading

### Phase 9 — Unit Tests

- [ ] `league.schema.test.ts` — valid create (no season), missing name, invalid gameMode, name length bounds, rules defaults, `inviteCode` length=8, `teamName` min/max
- [ ] `leagueStore.test.ts` — dialog open/close state, tab switching, game mode filter set/clear

### Phase 10 — Polish

- [ ] Run `tsc --noEmit` across all packages — no `any` types, no type errors
- [ ] Remove all `console.log` statements from new files
- [ ] Add JSDoc to all exported functions and component props interfaces

---

## Decisions

- **`UserLeague` junction** — `Team.@@unique([userId, leagueId])` already enforces one-team-per-user-per-league at DB level, but `UserLeague` is still needed for the member list, roles (`creator`/`member`), and `myLeagues` query
- **`season` backend-resolved** — derived from `Tournament.season` (model exists in schema); removed from create form to avoid user error and data drift
- **`nanoid(8)` invite code** — shorter than Plan 1's 10-char; `z.string().length(8)` validates exactly
- **`teamName` in join** — better UX than auto-naming; stored as `Team.name`
- **`StandingsTable` + `leave`** — needed for a useful league detail page; not deferred
- **`leagueRulesSchema` cleaned** — client schema must not include DB-admin fields (`id`, `leagueId`, `name`, `createdAt`, `updatedAt`)
- **Tab labels from UI reference** — "My Leagues" / "List of Leagues" (not "Browse"); "Create a League" is a prominent CTA button separate from the tab bar, matching the reference UI
- **"Invite Friends" tab** — shown in the reference UI as a top-level tab; deferred to a future plan as it overlaps with `LeagueInvitePanel` on the detail page; revisit once league creation and joining are stable
- **`EmojiEventsIcon`** — better semantic fit for a leagues/competitions nav item than `GroupsIcon`
- **Responsive grid + `fullScreen` dialogs** — `xs=12 sm=6 md=4` grid; `fullScreen` below `sm` on all dialogs
- **Rules update strategy** — always send the full `rules` blob on update (no deep-merge)
- **No "leave league" for creator** — creator must delete; produces clearer UX and avoids orphaned leagues
- **`/my-team` stays decoupled** — league-to-team linkage on the squad builder is a future plan

---

## Verification

- `npm run db:migrate` applies cleanly; `user_leagues` table visible in Postgres
- `npm run dev` (server + UI) — navigate to `/leagues`, create a league, verify it appears in My Leagues tab with correctly resolved `season`
- Join from a second user session using the 8-char invite code with a team name; confirm `UserLeague` + `Team` rows created atomically
- Confirm creator cannot leave (blocked); can delete (cascades to teams/members)
- `tsc --noEmit` passes across all packages
- `npm run test:unit` passes in `shared-types` and `ui`
- `npm run test-storybook` passes all story interaction tests
