# Implementation Plan: Rename Fantasy Union to Spectatr

## Overview

Comprehensive rebrand from "fantasy-union" → "spectatr" and "variable-theme" → "spectatr". This affects package names, imports, Docker containers, database, documentation, and the Git repository. We'll preserve user data with migration scripts to avoid losing localStorage preferences and Docker volumes.

**Key Decisions**:
- Project folder: `variable-theme` → `spectatr`
- Git repo: → `spectatr-app`
- npm scope: `@fantasy-union/*` → `@spectatr/*`
- App name: "Fantasy Union" → "Spectatr"
- Keep `rugby-union` as sport type (technical classification, not branding)
- Preserve all user data via migration scripts

## Architecture and Design

### High-Level Architecture

**Scope of Changes:**
- **Package System**: All npm packages in monorepo using `@fantasy-union` scope
- **Import Statements**: 17 frontend files importing from `@fantasy-union/*`
- **Build Scripts**: 9 workspace scripts in root package.json
- **Data Layer**: Docker containers, PostgreSQL database name, localStorage keys
- **Documentation**: 50+ files with branding references
- **Infrastructure**: Git repository, deployment references

**Data Preservation Strategy:**

**Frontend (localStorage):**
- Create migration utility to copy old keys → new keys
- Run on app initialization before React renders
- Keep old keys for 1 version as backup
- Keys affected: `fantasy-union-my-team`, `fantasy-union-theme`, `fantasy-union-preferences`

**Backend (Docker Volumes):**
- Create shell script to backup and migrate Docker volumes
- Preserve PostgreSQL data from `fantasy-union-db-data` → `spectatr-db-data`
- Update docker-compose.yml with new container names
- Include rollback instructions

**Database:**
- Update database name in environment config
- Developers update local `.env` files manually
- Prisma schema remains unchanged (table names are generic)

### Component Breakdown

**Migration Components:**
- `migrations.ts` - Frontend localStorage key migration utility
- `migrate-docker-volumes.sh` - Docker volume migration script
- `RENAME_GUIDE.md` - Documentation for developers

**Updated Components:**
- All `package.json` files (4 total)
- Root workspace scripts (9 references)
- Import statements (17 files)
- Configuration constants (APP_NAME, STORAGE_KEYS)
- Docker Compose services
- Database connection strings
- All documentation headers

**Preserved Components (No Changes):**
- `rugby-union` sportType (technical sport classification)
- `trc-2025` tenant ID (competition instance identifier)
- Prisma migrations (timestamped, no branding)
- Theme names referring to sport ("Rugby Field" theme)

### Data Model

**Package Structure:**
```typescript
// Before
{
  "name": "@fantasy-union/shared-types",
  "name": "@fantasy-union/frontend",
  "name": "@fantasy-union/backend"
}

// After
{
  "name": "@spectatr/shared-types",
  "name": "@spectatr/ui",
  "name": "@spectatr/server"
}
```

**LocalStorage Keys:**
```typescript
// Before
export const STORAGE_KEYS = {
  MY_TEAM: 'fantasy-union-my-team',
  THEME: 'fantasy-union-theme',
  USER_PREFERENCES: 'fantasy-union-preferences',
} as const;

// After
export const STORAGE_KEYS = {
  MY_TEAM: 'spectatr-my-team',
  THEME: 'spectatr-theme',
  USER_PREFERENCES: 'spectatr-preferences',
} as const;
```

**Docker Services:**
```yaml
# Before
services:
  postgres:
    container_name: fantasy-union-db
    environment:
      POSTGRES_DB: fantasy_union
  redis:
    container_name: fantasy-union-redis

# After
services:
  postgres:
    container_name: spectatr-db
    environment:
      POSTGRES_DB: spectatr
  redis:
    container_name: spectatr-redis
```

## Implementation Tasks

### Phase 1: Prepare Migration Scripts (No Breaking Changes Yet)

#### Task 1.1: Create LocalStorage Migration Utility
- [ ] Create `packages/ui/src/utils/migrations.ts`
- [ ] Implement `migrateLocalStorage()` function:
  ```typescript
  export function migrateLocalStorage(): void {
    const oldKeys = {
      myTeam: 'fantasy-union-my-team',
      theme: 'fantasy-union-theme',
      preferences: 'fantasy-union-preferences',
    };
    const newKeys = {
      myTeam: 'spectatr-my-team',
      theme: 'spectatr-theme',
      preferences: 'spectatr-preferences',
    };
    
    let migrated = 0;
    Object.entries(oldKeys).forEach(([key, oldKey]) => {
      const data = localStorage.getItem(oldKey);
      if (data && !localStorage.getItem(newKeys[key])) {
        localStorage.setItem(newKeys[key], data);
        migrated++;
      }
    });
    
    if (migrated > 0) {
      console.log(`✅ Migrated ${migrated} localStorage keys from fantasy-union to spectatr`);
    }
  }
  ```
- [ ] Add error handling and validation
- [ ] Export from `packages/ui/src/utils/index.ts`

#### Task 1.2: Create Docker Volume Migration Script
- [ ] Create `scripts/migrate-docker-volumes.sh`
- [ ] Implement migration logic:
  ```bash
  #!/bin/bash
  echo "🐳 Migrating Docker volumes: fantasy-union → spectatr"
  
  # Stop existing containers
  docker-compose down
  
  # Create new volumes and copy data
  docker run --rm \
    -v fantasy-union-db-data:/from \
    -v spectatr-db-data:/to \
    alpine sh -c "cp -av /from/. /to"
  
  echo "✅ Volume migration complete"
  echo "⚠️  Old volume 'fantasy-union-db-data' preserved for rollback"
  ```
- [ ] Add Windows PowerShell equivalent for cross-platform support
- [ ] Make script executable: `chmod +x scripts/migrate-docker-volumes.sh`
- [ ] Add rollback instructions in comments

#### Task 1.3: Create Rename Documentation
- [ ] Create `docs/RENAME_GUIDE.md`
- [ ] Document step-by-step process for developers:
  - Backing up local data
  - Running migration scripts
  - Updating local `.env` files
  - Updating Git remote URL
  - Renaming local project folder
  - Verifying installation
- [ ] Include troubleshooting section
- [ ] Add rollback procedures if issues occur

### Phase 2: Update Package Names & Dependencies (Breaking Changes)

#### Task 2.1: Update Package Names
- [ ] Update `package.json` (root): `"name": "fantasy-union"` → `"name": "spectatr"`
- [ ] Update `packages/shared-types/package.json`: `"name": "@fantasy-union/shared-types"` → `"name": "@spectatr/shared-types"`
- [ ] Update `packages/ui/package.json`: `"name": "@fantasy-union/frontend"` → `"name": "@spectatr/ui"`
- [ ] Update `packages/server/package.json`: `"name": "@fantasy-union/backend"` → `"name": "@spectatr/server"`

#### Task 2.2: Update Root Workspace Scripts
- [ ] Update `package.json` scripts (9 references):
  - `"dev": "npm run dev --workspace=@spectatr/ui"`
  - `"dev:backend": "npm run dev --workspace=@spectatr/server"`
  - `"dev:all": "concurrently \"npm run dev --workspace=@spectatr/server\" \"npm run dev --workspace=@spectatr/ui\""`
  - `"build": "npm run build --workspace=@spectatr/shared-types && npm run build --workspace=@spectatr/ui && npm run build --workspace=@spectatr/server"`
  - `"test": "npm run test --workspace=@spectatr/shared-types && npm run test --workspace=@spectatr/ui"`
  - `"lint": "npm run lint --workspace=@spectatr/ui && npm run lint --workspace=@spectatr/server"`
  - `"storybook": "npm run storybook --workspace=@spectatr/ui"`
  - `"db:migrate": "npm run db:migrate --workspace=@spectatr/server"`
  - `"db:seed": "npm run db:seed --workspace=@spectatr/server"`

#### Task 2.3: Update Import Statements
- [ ] Update `packages/ui/src/stores/myTeamStore.test.ts`
- [ ] Update `packages/ui/src/features/squad/SquadView.tsx`
- [ ] Update `packages/ui/src/features/squad/SquadView.stories.tsx`
- [ ] Update `packages/ui/src/features/squad/FieldView.stories.tsx`
- [ ] Update `packages/ui/src/features/players/PlayerList.tsx`
- [ ] Update `packages/ui/src/features/players/PlayerList.stories.tsx`
- [ ] Update `packages/ui/src/features/players/FilterPanel.tsx`
- [ ] Update `packages/ui/src/config/validationErrors.test.ts`
- [ ] Update all other files identified in research (9 more documentation files)
- [ ] Find/replace: `@fantasy-union/` → `@spectatr/` across all affected files

#### Task 2.4: Regenerate Dependencies
- [ ] Delete `node_modules/` in root and all packages
- [ ] Delete `package-lock.json` in root
- [ ] Run `npm install` from root
- [ ] Verify all packages linked correctly with `npm ls`
- [ ] Check for any peer dependency warnings

### Phase 3: Update Configuration & Infrastructure

#### Task 3.1: Update Frontend Constants
- [ ] Update `packages/ui/src/config/constants.ts`:
  - Change `APP_NAME = 'Fantasy Union'` → `'Spectatr'`
  - Update `STORAGE_KEYS.MY_TEAM` → `'spectatr-my-team'`
  - Update `STORAGE_KEYS.THEME` → `'spectatr-theme'`
  - Update `STORAGE_KEYS.USER_PREFERENCES` → `'spectatr-preferences'`

#### Task 3.2: Integrate LocalStorage Migration
- [ ] Update `packages/ui/src/main.tsx`:
  - Import `migrateLocalStorage` from utils
  - Call migration function before React render
  - Add console log for migration status
- [ ] Test migration with existing localStorage data

#### Task 3.3: Update Docker Configuration
- [ ] Update `docker-compose.yml`:
  - Container names: `fantasy-union-db` → `spectatr-db`
  - Container names: `fantasy-union-redis` → `spectatr-redis`
  - Volume names: `fantasy-union-db-data` → `spectatr-db-data`
- [ ] Keep service names generic (`postgres`, `redis`)
- [ ] Run migration script before applying changes

#### Task 3.4: Update Database Configuration
- [ ] Update `packages/server/.env.example`:
  - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spectatr`
- [ ] Update `packages/server/src/config/env.ts` if example strings present
- [ ] Add note in RENAME_GUIDE.md for developers to update local `.env`

#### Task 3.5: Update UI Branding
- [ ] Update `packages/ui/index.html`:
  - `<title>Variable Theme - MUI Dashboard</title>` → `<title>Spectatr</title>`
- [ ] Update `packages/ui/src/pages/DashboardPage.tsx`:
  - AppBar title: `Fantasy Sports Dashboard` → `Spectatr` (or keep generic if preferred)

### Phase 4: Update Documentation (No Breaking Changes)

#### Task 4.1: Update Main Documentation
- [ ] Update `README.md`:
  - Header: `# Fantasy Union Monorepo` → `# Spectatr Monorepo`
  - Replace all "Fantasy Union" references with "Spectatr"
  - Update package descriptions
  - Update installation instructions
- [ ] Update `PRODUCT.md`:
  - Header: `# Fantasy Union - Product Vision` → `# Spectatr - Product Vision`
  - Replace branding throughout
- [ ] Update `ARCHITECTURE.md`:
  - Header: `# Fantasy Union - System Architecture` → `# Spectatr - System Architecture`
  - Update import examples
  - Replace branding references
- [ ] Update `CONTRIBUTING.md`:
  - Header: `# Fantasy Union - Contributing Guidelines` → `# Spectatr - Contributing Guidelines`
  - Update examples and references
- [ ] Update `docs/DATA_MODEL.md`:
  - Header: `# Fantasy Union - Data Model` → `# Spectatr - Data Model`
  - Replace branding throughout

#### Task 4.2: Update Package READMEs
- [ ] Update `packages/ui/README.md`:
  - Remove "Variable Theme" references
  - Remove "pixel-union" outdated references
  - Replace with "Spectatr"
  - Update installation examples
- [ ] Update `packages/server/README.md`:
  - Replace branding
  - Update API examples
- [ ] Update `packages/shared-types/README.md`:
  - Update import examples from `@fantasy-union/*` → `@spectatr/*`
  - Replace branding

#### Task 4.3: Update Backend Documentation
- [ ] Update `packages/server/docs/AUTH.md`:
  - Replace "Fantasy Union uses Clerk..." → "Spectatr uses Clerk..."
  - Update all branding references
- [ ] Update `packages/server/docs/SECURITY.md`:
  - Replace branding throughout
- [ ] Update `packages/server/START.md`:
  - Update setup instructions
  - Replace branding

#### Task 4.4: Update Setup Documentation
- [ ] Update `docs/SETUP.md`:
  - Replace "Fantasy Sports Dashboard" with "Spectatr"
  - Update all references and examples
  - Remove "Variable Theme" legacy name

#### Task 4.5: Update Copilot Instructions
- [ ] Update `.github/copilot-instructions.md`:
  - Header: `# Fantasy Union - Copilot Guidelines` → `# Spectatr - Copilot Guidelines`
  - Replace all branding references
  - Update import examples
  - Update Jira project link if needed
- [ ] Update all plan files in `.github/copilot-instructions/plans/`:
  - Search/replace "Fantasy Union" → "Spectatr"
  - Update `@fantasy-union/*` → `@spectatr/*` references
  - Update domain examples

#### Task 4.6: Update Code Comments
- [ ] Update `packages/server/src/index.ts`:
  - JSDoc: `* Fantasy Union Backend API Server` → `* Spectatr Backend API Server`
- [ ] Update `packages/ui/src/mocks/playerData.ts`:
  - Migration note comments: Update package references
- [ ] Update `packages/ui/src/config/fieldLayouts.ts`:
  - Update any branding comments
- [ ] Review other files for inline comments with branding

#### Task 4.7: Update URL Examples
- [ ] Update `ARCHITECTURE.md`:
  - Replace `trc-2025.fantasy-union.com` → `trc-2025.spectatr.com`
- [ ] Update `.github/copilot-instructions/plans/` files:
  - Update domain examples in tenant configuration plan
  - Update API endpoint examples
- [ ] Add note that these are examples only (no actual DNS changes yet)

### Phase 5: Git Repository Rename

#### Task 5.1: Rename GitHub Repository
- [ ] Navigate to GitHub repository Settings
- [ ] Change repository name to `spectatr-app`
- [ ] Verify GitHub creates automatic redirects from old URL
- [ ] Update repository description if needed

#### Task 5.2: Update Local Git Configuration
- [ ] Get new repository URL from GitHub
- [ ] Update local remote: `git remote set-url origin https://github.com/[username]/spectatr-app.git`
- [ ] Verify with `git remote -v`
- [ ] Test fetch/pull from new URL

#### Task 5.3: Update CI/CD References
- [ ] Check `.github/workflows/` directory (if exists)
- [ ] Update any workflow files with repository references
- [ ] Update deployment scripts with new repo name
- [ ] Update any external integrations (Vercel, Netlify, etc.)

#### Task 5.4: Rename Local Project Folder
- [ ] Close VSCode completely
- [ ] Navigate to parent directory
- [ ] Rename folder: `variable-theme` → `spectatr`
- [ ] Open VSCode at new path: `code spectatr`
- [ ] Verify workspace opens correctly

### Phase 6: Testing & Cleanup

#### Task 6.1: Verify Build System
- [ ] Run `npm install` - verify no errors
- [ ] Run `npm run build` - check all packages build successfully
- [ ] Run `npm run dev` - start frontend, verify it loads
- [ ] Run `npm run dev:backend` - start backend, verify it connects
- [ ] Check browser console for import errors
- [ ] Verify no 404s for assets or API calls

#### Task 6.2: Test Data Migration
- [ ] Clear browser cache but keep localStorage
- [ ] Add test data to old localStorage keys manually
- [ ] Reload app
- [ ] Verify migration script runs and logs success
- [ ] Check new localStorage keys have copied data
- [ ] Verify theme persists after reload
- [ ] Verify team selections intact

#### Task 6.3: Test Docker Migration
- [ ] Run `docker-compose down` to stop old containers
- [ ] Run migration script: `./scripts/migrate-docker-volumes.sh`
- [ ] Verify volume created with `docker volume ls`
- [ ] Run `docker-compose up -d` with new config
- [ ] Check containers running: `docker ps`
- [ ] Connect to database: `psql -U postgres -d spectatr`
- [ ] Verify tables exist: `\dt`
- [ ] Check data integrity: `SELECT COUNT(*) FROM users;`

#### Task 6.4: Test Package Linking
- [ ] Run `npm ls @spectatr/shared-types`
- [ ] Verify no broken symlinks
- [ ] Run `npm ls` to check all dependencies
- [ ] Verify no duplicate packages
- [ ] Check for peer dependency warnings

#### Task 6.5: End-to-End Testing
- [ ] Start full stack: `npm run dev:all`
- [ ] Navigate to `http://localhost:5173`
- [ ] Verify app title shows "Spectatr"
- [ ] Test theme switching
- [ ] Test player list loading
- [ ] Test squad building
- [ ] Verify API requests work (check Network tab)
- [ ] Test authentication flow (if implemented)

#### Task 6.6: Verify Search Results
- [ ] Search workspace for `@fantasy-union` (case-insensitive)
- [ ] Verify only migration scripts and changelog entries remain
- [ ] Search for `fantasy-union` (hyphenated)
- [ ] Verify only appropriate references remain
- [ ] Search for `Fantasy Union` (two words)
- [ ] Verify only changelog/migration docs remain
- [ ] Search for `variable-theme`
- [ ] Verify no results except changelog

#### Task 6.7: Update Development Environment
- [ ] Update `VITE_TENANT_ID` in `packages/ui/.env` (if needed)
- [ ] Update database connection in `packages/server/.env`
- [ ] Update Clerk configuration if app name changed
- [ ] Verify all environment variables loaded correctly
- [ ] Restart all services to pick up new config

## Success Criteria

- [ ] **Build Success**: `npm install && npm run build` completes with no errors
- [ ] **Import Test**: Workspace search for `@fantasy-union` returns 0 results (except migration code/docs)
- [ ] **Package Test**: `npm ls` shows all `@spectatr/*` packages correctly linked with no errors
- [ ] **App Test**: Frontend loads at `http://localhost:5173`, displays "Spectatr" branding
- [ ] **Theme Test**: Theme switching works, preferences persist across reloads
- [ ] **Data Test**: Team selections preserved after migration, no data loss
- [ ] **Docker Test**: `docker ps` shows `spectatr-db` and `spectatr-redis` containers running
- [ ] **Database Test**: Connect to database, verify all tables and data intact
- [ ] **API Test**: Backend responds to requests, tRPC endpoints work correctly
- [ ] **Git Test**: `git remote -v` shows new repository URL `spectatr-app`
- [ ] **Folder Test**: Project folder renamed to `spectatr`, VSCode workspace valid
- [ ] **Documentation Test**: All READMEs, guides use "Spectatr" branding consistently
- [ ] **Search Test**: No remaining "fantasy-union" references except in migration/changelog files
- [ ] **Dev Tools Test**: No console errors, warnings, or 404s during normal usage

## Open Questions

1. **App Bar Title - Generic or Branded?**
   - Context: Dashboard currently shows "Fantasy Sports Dashboard" (generic)
   - Options: 
     - Keep generic "Fantasy Sports Dashboard"
     - Change to "Spectatr" (branded)
     - Change to "Spectatr Dashboard" (hybrid)
   - Decision needed: Which provides better UX for multi-sport platform?

2. **Migration Timing - Keep Old Keys How Long?**
   - Context: localStorage migration keeps old keys as backup
   - Options:
     - Remove in next version (1 release cycle)
     - Remove after 3 months
     - Keep indefinitely (adds 3 extra localStorage keys)
   - Decision needed: Balance between safety and cleanliness

3. **Jira Project Rename?**
   - Context: Current project is "FSA" (Fantasy Sports App)
   - Options:
     - Keep "FSA" (no work required, still accurate)
     - Rename to "SPEC" or "SPT" (requires Jira admin)
     - Update in documentation only
   - Decision needed: Is Jira rename worth the administrative effort?

## Notes

**Sport Type Preservation:**
- `rugby-union` is a **technical sport classification** (Rugby Union vs Rugby League)
- Similar to how we'd use `soccer`, `cricket`, `basketball` as sport types
- This is NOT project branding, it's a domain model identifier
- Keeping as-is ensures no confusion between sport variants

**Tenant ID Preservation:**
- `trc-2025` stands for "The Rugby Championship 2025" (competition instance)
- This is tenant-specific data, not project branding
- Future tenants will have different IDs (`svns`, `nba`, etc.)
- No need to rename existing competition identifiers

**Git Repository Name:**
- Chose `spectatr-app` over just `spectatr` for clarity
- Leaves room for future packages (mobile app, admin panel, marketing site)
- Common pattern for app repositories vs organization names

**Migration Safety:**
- Created migration scripts **before** making breaking changes
- Dual-read strategy allows rollback if issues found
- Old Docker volumes preserved (can be manually cleaned up later)
- All changes are reversible within first version

**Package Scope Rationale:**
- `@spectatr/*` follows npm scoped package convention
- Prevents naming conflicts with other packages
- Maintains monorepo structure benefits
- Allows future public npm publishing if desired

**Total Impact:**
- **~85 files** will be modified
- **~25 files** have breaking changes (require rebuild)
- **~50 files** are documentation updates (no functionality change)
- **3 new files** created (migration scripts + guide)
- No circular dependencies or technical blockers identified

**Rollback Plan (if needed):**
1. Restore old `package.json` files from Git
2. Run `npm install` to regenerate package-lock.json
3. Revert localStorage keys in constants.ts
4. Restore old docker-compose.yml
5. Rename Git remote back to old URL
6. Old data preserved in backup keys/volumes

**Future Considerations:**
- Domain name acquisition: `spectatr.com` or `spectatr.app`
- Trademark search for "Spectatr" name
- Logo and visual identity design
- Marketing materials update
- App store listings (if mobile app developed)
- Social media handle consistency (@spectatr)
