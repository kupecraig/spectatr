-- ============================================================
-- Team Player Snapshots and Player Point Columns
--
-- Adds infrastructure for scoring:
--  1. TeamPlayerSnapshot table - captures squad composition per round
--  2. Player point columns - totalPoints, avgPoints, lastRoundPoints
--  3. RLS policy for team_player_snapshots table
--
-- This migration touches RLS and grants, so it must be run with:
--   npm run db:migrate:superuser
-- ============================================================

-- ------------------------------------------------------------
-- 1. Create team_player_snapshots table
-- ------------------------------------------------------------
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

-- Create index for efficient lookup
CREATE INDEX "team_player_snapshots_tenantId_teamId_roundId_idx" 
  ON "team_player_snapshots" ("tenantId", "teamId", "roundId");

-- ------------------------------------------------------------
-- 2. Add point columns to players table
-- ------------------------------------------------------------
ALTER TABLE "players"
  ADD COLUMN "totalPoints" INT NOT NULL DEFAULT 0,
  ADD COLUMN "avgPoints" FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN "lastRoundPoints" INT NOT NULL DEFAULT 0;

-- ------------------------------------------------------------
-- 3. Enable RLS and create policy for team_player_snapshots
-- ------------------------------------------------------------
ALTER TABLE "team_player_snapshots" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "team_player_snapshots"
  FOR ALL TO spectatr_app
  USING ("tenantId" = current_setting('app.current_tenant', true));

-- ------------------------------------------------------------
-- 4. Grant permissions to spectatr_app role
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON "team_player_snapshots" TO spectatr_app;
GRANT USAGE, SELECT ON "team_player_snapshots_id_seq" TO spectatr_app;
