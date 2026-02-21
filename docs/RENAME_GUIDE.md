# Rename Guide: Fantasy Union → Spectatr

This guide helps developers update their local environment after the Fantasy Union → Spectatr rebrand.

## Overview

**What Changed:**
- Project name: "Fantasy Union" → "Spectatr"
- npm scope: `@fantasy-union/*` → `@spectatr/*`
- Project folder: `variable-theme` → `spectatr`
- Git repository: → `spectatr-app`
- Docker containers: `fantasy-union-*` → `spectatr-*`
- Database: `fantasy_union` → `spectatr`
- localStorage keys: `fantasy-union-*` → `spectatr-*`

**What Stayed the Same:**
- `rugby-union` sportType (technical classification)
- `trc-2025` tenant ID (competition identifier)
- All database tables and migrations
- Prisma schema structure

## Quick Start (For Existing Developers)

### 1. Pull Latest Changes

```bash
git checkout main
git pull origin main
```

### 2. Migrate Local Data

**Docker Volumes (Database):**

Windows (PowerShell):
```powershell
.\scripts\migrate-docker-volumes.ps1
```

Linux/Mac (Bash):
```bash
chmod +x scripts/migrate-docker-volumes.sh
./scripts/migrate-docker-volumes.sh
```

**localStorage (Browser):**
- Migration happens automatically when you open the app
- No manual action required
- Check browser console for migration confirmation

### 3. Update Dependencies

```bash
# Remove old dependencies
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules

# Install with new package names
npm install
```

### 4. Update Local Configuration

**Backend `.env` file:**
```bash
# packages/server/.env

# Change database name
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/spectatr"

# All other variables stay the same
```

**Frontend `.env.local` file (if exists):**
```bash
# packages/ui/.env.local

# Variables remain the same
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_TENANT_ID=trc-2025  # No change
```

### 5. Update Git Remote (After Repository Rename)

```bash
# Update remote URL
git remote set-url origin https://github.com/[username]/spectatr-app.git

# Verify
git remote -v
```

### 6. Rename Local Folder (Optional)

If you want to rename your local project folder:

```bash
# Close VSCode first
cd ..
mv variable-theme spectatr
cd spectatr
code .
```

### 7. Verify Installation

```bash
# Build all packages
npm run build

# Start development servers
npm run dev:all

# In separate terminal, verify backend
curl http://localhost:3001/health
```

Visit http://localhost:5173 - you should see "Spectatr" in the title and app bar.

## Detailed Migration Steps

### Database Migration

The database name changed from `fantasy_union` to `spectatr`. You have two options:

**Option A: Migrate Existing Data (Recommended)**

Use the Docker volume migration script (see Quick Start #2). This preserves all your local development data.

**Option B: Fresh Start**

If you don't need existing data:

```bash
# Stop containers
docker-compose down

# Remove old volumes
docker volume rm fantasy-union-db-data

# Update .env database name
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spectatr

# Update docker-compose.yml (if needed)

# Start with fresh database
docker-compose up -d
npm run db:migrate
npm run db:seed
```

### Import Statement Updates

All imports are already updated in the codebase. If you have local branches:

```bash
# Find any remaining old imports
grep -r "@fantasy-union/" packages/ui/src/

# Replace with
# @spectatr/*
```

### Package Name Updates

All `package.json` files have been updated:
- Root: `spectatr`
- Packages: `@spectatr/shared-types`, `@spectatr/ui`, `@spectatr/server`

Workspace scripts in root `package.json` now reference `@spectatr/*` scope.

## Troubleshooting

### Issue: `npm install` fails with missing packages

**Solution:**
```bash
# Delete all lockfiles and node_modules
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules

# Clean npm cache
npm cache clean --force

# Reinstall
npm install
```

### Issue: Docker containers won't start

**Problem:** Old volume names in docker-compose.yml

**Solution:**
Check `docker-compose.yml` uses new names:
```yaml
services:
  postgres:
    container_name: spectatr-db
    volumes:
      - spectatr-db-data:/var/lib/postgresql/data
  redis:
    container_name: spectatr-redis
```

### Issue: Database connection errors

**Problem:** `.env` still has old database name

**Solution:**
Update `packages/server/.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/spectatr"
```

### Issue: Frontend shows old branding

**Problem:** Browser cache

**Solution:**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or clear browser cache and localStorage

### Issue: localStorage data lost

**Problem:** Migration didn't run

**Solution:**
1. Check browser console for migration logs
2. Check `localStorage` in DevTools:
   - Old keys: `fantasy-union-*`
   - New keys: `spectatr-*`
3. If old keys exist but new don't, migration will run on next reload

### Issue: Import errors after rebuild

**Problem:** VSCode TypeScript cache

**Solution:**
1. Open Command Palette (Ctrl+Shift+P)
2. Run "TypeScript: Restart TS Server"
3. Or restart VSCode

### Issue: Git push fails with authentication error

**Problem:** Remote URL still points to old repository

**Solution:**
```bash
git remote set-url origin https://github.com/[username]/spectatr-app.git
git push
```

## Rollback Procedure

If you encounter critical issues and need to rollback:

### 1. Database Rollback

```bash
# Stop containers
docker-compose down

# Restore old docker-compose.yml from git
git checkout HEAD~1 docker-compose.yml

# Restore old .env
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fantasy_union

# Start with old volume
docker-compose up -d
```

Old volume `fantasy-union-db-data` is preserved and can be used.

### 2. Code Rollback

```bash
# Revert to previous commit
git revert HEAD
git push

# Reinstall old packages
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules
npm install
```

### 3. localStorage Rollback

Old localStorage keys (`fantasy-union-*`) are preserved as backup. No action needed.

## Verification Checklist

After migration, verify:

- [ ] `npm run build` succeeds with no errors
- [ ] `npm run dev:all` starts both frontend and backend
- [ ] Frontend shows "Spectatr" in title and app bar
- [ ] Backend health check responds: `http://localhost:3001/health`
- [ ] Database connection works (check backend logs)
- [ ] No import errors in VSCode
- [ ] Browser console shows localStorage migration success
- [ ] Theme preferences persisted
- [ ] Team selections persisted (if applicable)
- [ ] Git remote points to `spectatr-app` repository

## Getting Help

If you encounter issues not covered in this guide:

1. Check the main [README.md](../README.md) for updated setup instructions
2. Review recent commits for migration-related changes
3. Check Jira ticket FSA-25 for additional context
4. Ask in team chat with:
   - Error message
   - Steps you've tried
   - Output of `npm ls` and `docker ps`

## References

- [Main README](../README.md) - Updated setup instructions
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Updated architecture overview
- [PRODUCT.md](../PRODUCT.md) - Updated product documentation
- [Package Migration Scripts](../scripts/) - Docker migration scripts
- [LocalStorage Migration](../packages/ui/src/utils/migrations.ts) - Auto-migration logic
