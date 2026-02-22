-- ============================================================
-- Row Level Security (RLS) for tenant isolation
--
-- Strategy:
--  1. Create a `spectatr_app` role used by all runtime connections.
--     The `postgres` superuser retains full access (no RLS) so seeds
--     and migrations continue to work without changes.
--  2. Enable RLS on every table that carries a `tenantId` column.
--  3. Create a PERMISSIVE policy that allows rows where `tenantId`
--     matches the session variable `app.current_tenant`.
--     The application sets this variable via `SET LOCAL` before each
--     query (see createTenantScopedPrisma in context.ts).
-- ============================================================

-- ------------------------------------------------------------
-- 1. App role
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'spectatr_app') THEN
    CREATE ROLE spectatr_app LOGIN PASSWORD 'spectatr_app';
  END IF;
END
$$;

-- Grant schema and sequence usage
GRANT USAGE ON SCHEMA public TO spectatr_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO spectatr_app;

-- Grant table-level permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO spectatr_app;

-- Ensure future tables are also covered
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO spectatr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO spectatr_app;

-- ------------------------------------------------------------
-- 2. Enable RLS on tenant-scoped tables
-- ------------------------------------------------------------
ALTER TABLE squads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE players         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds          ENABLE ROW LEVEL SECURITY;
ALTER TABLE gameweek_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE checksums       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams           ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 3. Policies — applied to spectatr_app role only
--
-- current_setting('app.current_tenant', true) returns NULL when the
-- variable is not set (second arg = true → no error).
-- The policy intentionally DENIES access when the variable is unset,
-- forcing every runtime query to go through createTenantScopedPrisma.
-- The postgres superuser bypasses RLS automatically.
-- ------------------------------------------------------------

CREATE POLICY tenant_isolation ON squads
  FOR ALL TO spectatr_app
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON players
  FOR ALL TO spectatr_app
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON tournaments
  FOR ALL TO spectatr_app
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON rounds
  FOR ALL TO spectatr_app
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON gameweek_states
  FOR ALL TO spectatr_app
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON scoring_events
  FOR ALL TO spectatr_app
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON checksums
  FOR ALL TO spectatr_app
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON leagues
  FOR ALL TO spectatr_app
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON teams
  FOR ALL TO spectatr_app
  USING ("tenantId" = current_setting('app.current_tenant', true));
