-- Add UserLeague join table for many-to-many users <-> leagues membership
-- Also adds onDelete: Cascade to Team -> League relation

CREATE TABLE "user_leagues" (
    "id"       SERIAL       NOT NULL,
    "userId"   TEXT         NOT NULL,
    "leagueId" INTEGER      NOT NULL,
    "role"     TEXT         NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_leagues_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "user_leagues_userId_leagueId_key" ON "user_leagues"("userId", "leagueId");
CREATE INDEX "user_leagues_userId_idx"   ON "user_leagues"("userId");
CREATE INDEX "user_leagues_leagueId_idx" ON "user_leagues"("leagueId");

-- Foreign keys
ALTER TABLE "user_leagues" ADD CONSTRAINT "user_leagues_userId_fkey"
    FOREIGN KEY ("userId")   REFERENCES "users"("id")   ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_leagues" ADD CONSTRAINT "user_leagues_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE  ON UPDATE CASCADE;

-- Add onDelete: Cascade to Team -> League (was missing)
ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_leagueId_fkey";
ALTER TABLE "teams" ADD CONSTRAINT "teams_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Grant permissions to spectatr_app role (RLS pattern — matches existing migrations)
GRANT SELECT, INSERT, UPDATE, DELETE ON "user_leagues" TO spectatr_app;
GRANT USAGE, SELECT ON SEQUENCE "user_leagues_id_seq" TO spectatr_app;

-- Enable RLS on user_leagues (tenant isolation via leagues table; no direct tenantId column)
ALTER TABLE "user_leagues" ENABLE ROW LEVEL SECURITY;
