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
-- 1. Create team_player_snapshots table with foreign keys
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
  CONSTRAINT "team_player_snapshots_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "team_player_snapshots_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "teams"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "team_player_snapshots_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "team_player_snapshots_roundId_fkey"
    FOREIGN KEY ("roundId") REFERENCES "rounds"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "team_player_snapshots_playerId_fkey"
    FOREIGN KEY ("playerId") REFERENCES "players"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE ("tenantId", "teamId", "roundId", "playerId")
);

-- Create indexes for expected scoring and snapshot lookup patterns
CREATE INDEX "team_player_snapshots_tenantId_teamId_roundId_idx"
  ON "team_player_snapshots" ("tenantId", "teamId", "roundId");

CREATE INDEX "team_player_snapshots_tenantId_roundId_idx"
  ON "team_player_snapshots" ("tenantId", "roundId");

CREATE INDEX "team_player_snapshots_tenantId_playerId_roundId_idx"
  ON "team_player_snapshots" ("tenantId", "playerId", "roundId");

CREATE INDEX "team_player_snapshots_tenantId_leagueId_roundId_idx"
  ON "team_player_snapshots" ("tenantId", "leagueId", "roundId");

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
