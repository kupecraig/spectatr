---
title: Scoring — Standings round selector and per-round team points
version: 1.0
date_created: 2026-04-19
last_updated: 2026-04-19
---
# Implementation Plan: Scoring — Standings Round Selector

Adds a round selector to the `StandingsTable` so users can view per-round points in addition to the season total.

**GitHub Issue:** #28
**Depends on:** Issue #30 (scoring infrastructure — TeamPlayerSnapshot and ScoringEvent tables)

## Architecture and Design

### Backend Query Strategy

**All Rounds (default, no `roundId`):**
- Returns existing `Team.points` column — no change to current query

**Specific Round (`roundId` provided):**
```sql
SELECT
  t.id as "teamId",
  t.name as "teamName",
  t."userId",
  COALESCE(SUM(se.points), 0) as points
FROM teams t
LEFT JOIN team_player_snapshots tps
  ON tps."teamId" = t.id
  AND tps."roundId" = $roundId
  AND tps."tenantId" = $tenantId
LEFT JOIN scoring_events se
  ON se."playerId" = tps."playerId"
  AND se."roundId" = $roundId
  AND se."tenantId" = $tenantId
WHERE t."leagueId" = $leagueId
  AND t."tenantId" = $tenantId
GROUP BY t.id, t.name, t."userId"
ORDER BY points DESC
```

Rank is assigned by row position after ORDER BY (not from `Team.rank` column).

### Round Selector Population

Rounds come from `useRoundsQuery` (already exists). Only rounds with `status = 'active' | 'complete'` are shown. "All Rounds" is always the default option.

The `LeaguePage` component fetches rounds and passes them to `StandingsTable`. No new hooks needed.

## Component Breakdown

### Backend: `leagues.standings`

Extended input:
```typescript
input: z.object({
  leagueId: z.number().int().positive(),
  roundId: z.number().int().positive().optional(),
})
```

Logic:
- If `roundId` absent → existing `Team.points` query (unchanged)
- If `roundId` present → raw SQL join across `team_player_snapshots` + `scoring_events`

### Frontend: `StandingsTable`

New props:
```typescript
interface StandingsTableProps {
  standings: LeagueStanding[];
  rounds: Round[];              // from useRoundsQuery
  selectedRoundId?: number;     // undefined = All Rounds
  onRoundChange: (roundId: number | undefined) => void;
  isLoading?: boolean;
}
```

Round selector UI:
- MUI `Select` above the table
- Options: `<MenuItem value="">All Rounds</MenuItem>` + rounds sorted by `roundNumber` ascending
- Only shows rounds with `status === 'active' || status === 'complete'`
- While refetching (after round change): table rows show `<Skeleton>`, selector stays interactive

### Frontend: `LeaguePage`

- Add `useState<number | undefined>(undefined)` for `selectedRoundId`
- Pass `selectedRoundId` to `useLeagueStandingsQuery`
- Pass `rounds` from `useRoundsQuery` and `onRoundChange` to `StandingsTable`

### Query hook update: `useLeagueStandingsQuery`

```typescript
function useLeagueStandingsQuery(leagueId: number, roundId?: number) {
  return useTenantQuery({
    queryKey: ['league', leagueId, 'standings', roundId ?? 'all'],
    queryFn: () => trpc.leagues.standings.query({ leagueId, roundId }),
  });
}
```

Cache key includes `roundId` so switching rounds triggers a fresh fetch (not stale data).

## Data Model

No schema changes. Relies entirely on `TeamPlayerSnapshot` and `ScoringEvent` added by Issue #30.

### Zod Schema Update (`league.schema.ts`)

```typescript
export const leagueStandingsInputSchema = z.object({
  leagueId: z.number().int().positive(),
  roundId: z.number().int().positive().optional(),
});
```

## Tasks

### shared-types
- [ ] Add `roundId` optional field to `leagueStandingsInputSchema`

### Backend
- [ ] Update `leagues.standings` input to accept optional `roundId`
- [ ] Add per-round raw SQL query path
- [ ] Per-round response assigns `rank` from row position (not `Team.rank`)
- [ ] Teams with no snapshot for the round return `points: 0`

### Frontend: StandingsTable
- [ ] Add `rounds`, `selectedRoundId`, `onRoundChange` props
- [ ] Add round MUI `Select` above table
- [ ] Filter rounds to `active | complete` only
- [ ] Table rows show `<Skeleton>` during refetch (keep existing skeleton pattern)

### Frontend: LeaguePage
- [ ] Add `selectedRoundId` state
- [ ] Pass to `useLeagueStandingsQuery`
- [ ] Pass `rounds` from `useRoundsQuery` to `StandingsTable`

### Query hook
- [ ] `useLeagueStandingsQuery` accepts optional `roundId`
- [ ] Cache key includes `roundId` value

### Tests & Stories
- [ ] `leagues.test.ts` — standings no roundId returns Team.points; with roundId returns ScoringEvent sums; team with no snapshot returns 0; per-round rank reflects per-round ordering
- [ ] `StandingsTable.stories.tsx` — `AllRoundsDefault`, `RoundSelected`, `RoundSelectLoading`, `NoScoringData`

## Success Criteria

- [ ] Round selector visible above standings table
- [ ] "All Rounds" shows Team.points (season total)
- [ ] Selecting a round shows per-round points correctly
- [ ] Team with no snapshot for selected round shows 0 (not an error)
- [ ] Skeleton shown during refetch after round change
- [ ] All stories pass
