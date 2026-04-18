---
title: Scoring — Player list points display, stat badges, and sort controls
version: 1.0
date_created: 2026-04-19
last_updated: 2026-04-19
---
# Implementation Plan: Scoring — Player List Display

Extends the player list to surface scoring data via sort controls and stat badges on `PlayerListItem`.

**GitHub Issue:** #27
**Depends on:** Issue #30 (scoring infrastructure — Player.totalPoints/avgPoints/lastRoundPoints must exist)

## Architecture and Design

### Backend Sort Strategy

- **Native column sorts** (`totalPoints`, `avgPoints`, `lastRoundPoints`, `cost`): Prisma `orderBy` — fast, indexed
- **JSONB stat sorts** (`tries`, `tackles`, `conversions`, `metresGained`): `$queryRaw` with `(stats->>'fieldName')::numeric DESC NULLS LAST`
- Default sort: `totalPoints` DESC (cost is ASC)

### Badge Display Logic

One badge per player on `PlayerListItem`, determined by active `sortBy`. Uses existing MUI `Chip` pattern.

```typescript
const SORT_BADGE_CONFIG: Record<string, { label: string; getValue: (p: Player) => string | number } | null> = {
  totalPoints:     { label: 'Pts',  getValue: (p) => p.totalPoints },
  avgPoints:       { label: 'Avg',  getValue: (p) => p.avgPoints.toFixed(1) },
  lastRoundPoints: { label: 'Rnd',  getValue: (p) => p.lastRoundPoints },
  tries:           { label: 'T',    getValue: (p) => p.stats?.tries ?? 0 },
  tackles:         { label: 'TK',   getValue: (p) => p.stats?.tackles ?? 0 },
  conversions:     { label: 'C',    getValue: (p) => p.stats?.conversions ?? 0 },
  metresGained:    { label: 'MG',   getValue: (p) => p.stats?.metresGained ?? 0 },
  cost:            null,  // no badge for cost sort
};
```

Badge colour: `theme.palette.stats` tokens — no hardcoded colours.

## Component Breakdown

### Backend: `players.ts` router

Extended input:
```typescript
sortBy: z.enum([
  'totalPoints', 'avgPoints', 'lastRoundPoints', 'cost',
  'tries', 'tackles', 'conversions', 'metresGained'
]).default('totalPoints')
```

Sort routing:
- `cost`: Prisma `orderBy: { cost: 'asc' }`
- `totalPoints | avgPoints | lastRoundPoints`: Prisma `orderBy: { [sortBy]: 'desc' }`
- `tries | tackles | conversions | metresGained`: `$queryRaw` with `(stats->>'field')::numeric DESC NULLS LAST`

### Frontend: Sort Select

MUI `Select` + `FormControl` in `PlayerList` header. Compact size. Sort options from config, not inline strings.

```typescript
export const PLAYER_SORT_OPTIONS = [
  { value: 'totalPoints',     label: 'Total Points' },
  { value: 'avgPoints',       label: 'Avg Points' },
  { value: 'lastRoundPoints', label: 'Last Round' },
  { value: 'cost',            label: 'Price' },
  { value: 'tries',           label: 'Tries' },
  { value: 'tackles',         label: 'Tackles' },
  { value: 'conversions',     label: 'Conversions' },
  { value: 'metresGained',    label: 'Metres' },
] as const;
```

### Frontend: `PlayerListItem` badge

Small `Chip` on each player row. When `value = 0`, render badge (do not hide). When `sortBy = 'cost'`, no badge.

### Store: `myTeamStore`

Add `sortBy: 'totalPoints'` to `filters`, persisted with other filters.

## Data Model

No new tables or columns. Relies on `Player.totalPoints`, `avgPoints`, `lastRoundPoints` from Issue #30.

### Zod Schema Updates

```typescript
// playerListItemSchema — add:
totalPoints:     z.number().int().default(0),
avgPoints:       z.number().default(0),
lastRoundPoints: z.number().int().default(0),

// New in shared-types:
export const PlayerSortBySchema = z.enum([
  'totalPoints', 'avgPoints', 'lastRoundPoints', 'cost',
  'tries', 'tackles', 'conversions', 'metresGained',
]);
export type PlayerSortBy = z.infer<typeof PlayerSortBySchema>;
```

## Tasks

- [ ] Add `PlayerSortBySchema` to shared-types, export from index
- [ ] Add `totalPoints`, `avgPoints`, `lastRoundPoints` to `playerListItemSchema`
- [ ] Add `sortBy` input to `players.list` router
- [ ] Implement native column sort (Prisma orderBy)
- [ ] Implement JSONB stat sort ($queryRaw)
- [ ] Add `sortBy` to `myTeamStore.filters` with default `totalPoints`
- [ ] Add `PLAYER_SORT_OPTIONS` config (co-locate with PlayerList feature)
- [ ] Add MUI `Select` to `PlayerList` header wired to store + refetch
- [ ] Add `totalPoints`, `avgPoints`, `lastRoundPoints`, `sortBy` props to `PlayerListItem`
- [ ] Render stat badge using MUI `Chip` + `theme.palette.stats` token
- [ ] Update `usePlayersQuery` to pass `sortBy` from store filters
- [ ] `players.test.ts` — 2 sort tests
- [ ] `PlayerListItem.stories.tsx` — 5 stories
- [ ] `PlayerList.stories.tsx` — 2 sort stories

## Success Criteria

- [ ] Sort Select visible in PlayerList header
- [ ] Changing sort triggers refetch with correct order
- [ ] Stat badge reflects active sort selection
- [ ] 0-point badges render cleanly
- [ ] No hardcoded sport-specific sort labels
- [ ] All stories pass
