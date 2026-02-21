# GitHub Actions Workflows

## Testing the Workflow

### Quick Test (Recommended)
1. Rename `test.yml.example` to `test.yml`
2. Create a new branch: `git checkout -b test/ci-workflow`
3. Commit: `git add test.yml && git commit -m "Test CI workflow"`
4. Push: `git push origin test/ci-workflow`
5. Check results at: https://github.com/kupecraig/spectatr/actions

### Local Testing with act
```bash
# Install act (requires Docker)
winget install nektos.act

# Run all jobs
act push

# Run specific job
act -j unit-tests
```

### Validation Only
```bash
# Install GitHub CLI
winget install GitHub.cli

# Validate syntax
gh workflow view test.yml
```

## Current Workflows

### `test.yml` - CI Testing Pipeline
- **Trigger:** Push/PR to main/develop branches
- **Jobs:**
  1. `unit-tests` - Fast unit tests (shared-types + frontend)
  2. `storybook-tests` - Component interaction tests (runs after unit tests pass)
  3. `build` - Build verification (optional)

**Execution Order:** Unit Tests → Storybook Tests & Build (parallel)

**Expected Runtime:**
- Unit tests: ~10-15 seconds
- Storybook tests: ~2-3 minutes
- Build: ~30-45 seconds

## Troubleshooting

**Workflow not appearing?**
- Ensure file is named `test.yml` (not `.example`)
- Check it's in `.github/workflows/` directory
- Verify YAML syntax is valid

**Tests failing in CI but passing locally?**
- Check Node.js version (workflow uses Node 20)
- Verify dependencies are in package.json (not just installed locally)
- Check for platform-specific issues (Windows vs Linux)

**Slow Storybook tests?**
- Playwright browser install is cached after first run
- Subsequent runs should be much faster
