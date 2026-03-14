-- Add RLS policy for user_leagues.
-- user_leagues has no tenantId column, so the policy joins through leagues.

CREATE POLICY tenant_isolation ON user_leagues
  FOR ALL TO spectatr_app
  USING (
    "leagueId" IN (
      SELECT id FROM leagues
      WHERE "tenantId" = current_setting('app.current_tenant', true)
    )
  );
