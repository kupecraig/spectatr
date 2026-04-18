---
title: Scoring Infrastructure — TenantConfig, TeamPlayerSnapshot, ScoringEvent seed, round calculation
version: 1.0
date_created: 2026-04-19
last_updated: 2026-04-19
---
# Implementation Plan: Scoring Infrastructure

The full scoring system foundation: per-round fantasy point calculation from real player stats. Covers TenantConfig schema restructure, TeamPlayerSnapshot table, fetch script for playfantasyrugby.com API, seed updates, scoring utility, and admin gameweek procedures.

**GitHub Issue:** #30
**Depends on:** Issue #29 (admin foundation — `adminProcedure`)

## Architecture and Design

### Data Flow

```
playfantasyrugby.com API
  → fetchRoundStats.ts script (run manually by maintainer)
  → data/super-2026/player_round_stats.json (committed to repo)
  → seed.ts (converts stats → ScoringEvent rows using Tenant.config.scoring.rules)
  → calculateRoundPoints(prisma, tenantId, roundId)
  → Team.points (cumulative season total)
  → Player.totalPoints / avgPoints / lastRoundPoints
```

### Scoring Calculation Pattern

**Event-sourced:** Points are derived from `ScoringEvent` rows, never stored as a running tally. `calculateRoundPoints` always recalculates from scratch across all completed rounds. This means:
- Correcting a ScoringEvent and re-running is safe — no stale accumulation
- Historical accuracy is preserved per round via `TeamPlayerSnapshot`
- `Team.points` is a **derived cache** — always equal to SUM(calculateRoundPoints for all complete rounds)

### TeamPlayerSnapshot

Captures the exact squad composition at the time of each round. This enables:
1. Correct historical scoring (squad changes don't retroactively affect past rounds)
2. Future feature: let league members see opponents' current round team selection

**Snapshot lifecycle:**
- Created/updated by `teams.saveSquad` when `GameweekState.status` is `pre_round` or `active`
- Frozen (no writes) when status is `locked`, `processing`, or `complete`
- Bootstrapped by seed from existing `TeamPlayer` records for `GameweekState.currentRound`

### TenantConfig Restructure

Current flat shape becomes nested:
```typescript
// Before (flat, existing usage in Issue #9)
{ priceCap?: number, transfersPerRound?: number, ... }

// After (nested)
{
  defaults?: {
    priceCap?: number | null,
    squadLimitPerTeamMax?: number,
    defaultTransfersPerRound?: number,
  },
  scoring?: {
    rules: Record<string, number>,  // e.g. { T: 15, TK: 1, LB: 7, ... }
  },
}
```
Issue #9 must update to use `defaults.*` paths before merging.

### Scoring Rules (super-2026)

```json
{
  "T": 15, "TA": 9, "C": 2, "CM": -1,
  "PG": 3, "PGM": -1, "DG": 3, "DGM": -1,
  "K_50_22": 10, "YC": -5, "RC": -10,
  "TW": 4, "I": 5, "LT": 1, "LS": 5, "LE": -2,
  "TK": 1, "MT": -1, "TB": 2, "O": 2,
  "LB": 7, "LC": 5, "MG_per10": 1,
  "PC": -1, "E": -1, "SW": 3
}
```

The stat field names in `data/super-2026/player_round_stats.json` use camelCase (`tries`, `assists`, `conversions`, `tackles`, `linebreaks`, `linebreakAssists`, `turnovers`, `interceptions`, `defendersBeaten`, `lineoutsWon`, `scrumsWon`, `metresGained`, `penaltiesConceded`, `errors`, `yellowCards`, `redCards`, `offloads`, `kick5022`). The seed must map these to scoring rule keys (e.g. `tries → T`, `kick5022 → K_50_22`). Include a field-to-key mapping constant in the seed or scoring utils.

## Component Breakdown

### `fetchRoundStats.ts` (new script)

CLI: `npx tsx packages/server/src/scripts/fetchRoundStats.ts --tenant super-2026`

Reads player feedIds from DB for tenant, fetches:
`https://playfantasyrugby.com/json/fantasy/player_stats/{feedId}.json`
100ms delay between requests. Writes `data/{tenantId}/player_round_stats.json`.

Output format:
```json
[
  {
    "feedId": 141,
    "rounds": [
      { "roundId": 1, "stats": { "tries": 1, "tackles": 8, "metresGained": 69 } },
      { "roundId": 2, "stats": { "tries": 0, "tackles": 12 } }
    ]
  }
]
```

### `scoring.ts` utility

```typescript
export async function calculateRoundPoints(
  prisma: PrismaClient,
  tenantId: string,
  roundId: number
): Promise<{ teamsUpdated: number; playersUpdated: number }>
```

Algorithm:
1. Load `TeamPlayerSnapshot` rows for `(tenantId, roundId)` grouped by `teamId`
2. For each team: sum `ScoringEvent.points WHERE playerId IN (snapshot playerIds) AND roundId = ?`
3. Update `Team.points` = recalculate season total by summing across ALL complete rounds
4. Update `Player.totalPoints`, `lastRoundPoints`, `avgPoints` for affected players
5. All writes in a single `$transaction`

### `gameweek` router additions

```
gameweek.finaliseRound — adminProcedure
  Input:  { roundId: number }
  Throws: NOT_FOUND (round not in tenant), BAD_REQUEST (already complete)
  - Sets Round.status = 'complete'
  - Calls calculateRoundPoints
  - Returns { roundId, teamsUpdated, playersUpdated }

gameweek.recalculateLive — adminProcedure
  Input:  { roundId: number }
  - Calls calculateRoundPoints WITHOUT changing Round.status
  - Returns { roundId, teamsUpdated, playersUpdated }
```

## Data Model

### New: `TeamPlayerSnapshot`
```prisma
model TeamPlayerSnapshot {
  id        Int      @id @default(autoincrement())
  tenantId  String
  teamId    Int
  leagueId  Int
  roundId   Int
  playerId  Int
  position  String
  createdAt DateTime @default(now())

  @@unique([tenantId, teamId, roundId, playerId])
  @@index([tenantId, teamId, roundId])
  @@map("team_player_snapshots")
}
```

### Updated: `Player`
```prisma
totalPoints     Int   @default(0)
avgPoints       Float @default(0)
lastRoundPoints Int   @default(0)
```

## DB Migration (superuser)

```sql
CREATE TABLE "team_player_snapshots" (
  "id" SERIAL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "teamId" INTEGER NOT NULL,
  "leagueId" INTEGER NOT NULL,
  "roundId" INTEGER NOT NULL,
  "playerId" INTEGER NOT NULL,
  "position" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("tenantId", "teamId", "roundId", "playerId")
);

ALTER TABLE "team_player_snapshots" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "team_player_snapshots"
  FOR ALL TO spectatr_app
  USING ("tenantId" = current_setting('app.current_tenant', true));

ALTER TABLE "players"
  ADD COLUMN "totalPoints" INT NOT NULL DEFAULT 0,
  ADD COLUMN "avgPoints" FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN "lastRoundPoints" INT NOT NULL DEFAULT 0;
```

Apply with: `npm run db:migrate:superuser`
Then: `npm run db:generate`
Add `teamPlayerSnapshot` to `TENANT_SCOPED_MODELS` in `context.ts`.

## Tasks

- [ ] Confirm Issue #29 merged (adminProcedure available)
- [ ] Restructure `TenantConfigSchema` in shared-types to nested form
- [ ] Update flat config references in server code
- [ ] Write migration SQL manually (manual workflow — see db-migrations.md)
- [ ] Run `npm run db:migrate:superuser`
- [ ] Run `npm run db:generate`
- [ ] Add `teamPlayerSnapshot` to `TENANT_SCOPED_MODELS`
- [ ] Implement `fetchRoundStats.ts` script
- [ ] Run script, commit `data/super-2026/player_round_stats.json`
- [ ] Update seed: read stats file, create ScoringEvents, handle MG_per10
- [ ] Seed bootstraps TeamPlayerSnapshot from existing TeamPlayer records
- [ ] Seed calls `calculateRoundPoints` after events created
- [ ] Make seed idempotent (delete before re-insert)
- [ ] Seed `Tenant.config.scoring.rules` for super-2026
- [ ] Implement `packages/server/src/utils/scoring.ts`
- [ ] Implement `scoring.test.ts` (3 tests)
- [ ] Add `gameweek.finaliseRound` (adminProcedure)
- [ ] Add `gameweek.recalculateLive` (adminProcedure)
- [ ] Add `gameweek.test.ts` tests (3)
- [ ] Update `teams.saveSquad` to upsert TeamPlayerSnapshot
- [ ] Update `packages/server/START.md`
- [ ] Update `docs/DATA_MODEL.md`

## Success Criteria

- [ ] `npm run db:seed -- --tenant super-2026` creates ScoringEvents and populates Team.points and Player point columns
- [ ] `calculateRoundPoints` unit tests pass
- [ ] `gameweek.finaliseRound` works for admin, throws FORBIDDEN for non-admin
- [ ] `teams.saveSquad` creates TeamPlayerSnapshot for current round
- [ ] `docs/DATA_MODEL.md` updated
