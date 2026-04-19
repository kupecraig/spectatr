# Backend Startup Guide

## 🚀 First Time Setup

```powershell
docker compose up -d
npm run db:migrate --workspace=@spectatr/server
npm run db:seed --workspace=@spectatr/server
```

## ✅ Starting the Server

### 1. Start Docker
```powershell
docker compose up -d
```

### 2. Start the Server
```powershell
# Server only
npm run dev:server

# Or full stack (shared-types + server + ui)
npm run dev
```

**Expected output:**
```
🚀 Server running at http://localhost:3001
📡 tRPC endpoint: http://localhost:3001/trpc
📊 Checksum endpoint: http://localhost:3001/checksum.json
🏥 Health check: http://localhost:3001/health
🌍 Environment: development
🔗 CORS enabled for: http://localhost:5173
🛡️  Rate limiting enabled (Redis-backed)
⏰ Background jobs started
```

## 🧪 Running Integration Tests

Integration tests run against a real PostgreSQL instance. They call tRPC procedures directly via `createCallerFactory` (no HTTP layer), using real Prisma queries.

### Prerequisites
1. Docker containers running (`docker compose up -d`)
2. Migrations applied (`npm run db:migrate:deploy` in packages/server)
3. `.env.test` file created from `.env.test.example`

### Setup
```powershell
# Copy test env file
cp env/.env.test.example env/.env.test

# Edit env/.env.test if needed (default uses postgres superuser)
```

### Running Tests
```powershell
# Run tests once
npm run test:integration

# Watch mode (re-runs on file changes)
npm run test:integration:watch

# With coverage report
npm run test:coverage
```

**Expected output:**
```
 ✓ src/trpc/routers/players.test.ts (6 tests)
 ✓ src/trpc/routers/squads.test.ts (2 tests)
 ✓ src/trpc/routers/rounds.test.ts (3 tests)
 ✓ src/trpc/routers/gameweek.test.ts (2 tests)
 ✓ src/trpc/routers/leagues.test.ts (6 tests)
 ✓ src/trpc/procedures.test.ts (5 tests)

 Test Files  6 passed
      Tests  24 passed
```

### Writing New Tests
See existing test files in `src/trpc/routers/*.test.ts` for patterns:
- Use `createTestTenant()` to create isolated test data
- Use `createTestContext()` for public/protected procedures
- Use `createAuthedTestContext()` for authenticated procedures
- Always clean up test data in `afterAll`

## 🧪 Test Endpoints

### Health Check
```powershell
curl http://localhost:3001/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### Checksum
```powershell
curl http://localhost:3001/checksum.json
```

Expected: `{"players":"...","rounds":"..."}`

### Players List (tRPC)
```powershell
curl -X POST http://localhost:3001/trpc/players.list `
  -H "Content-Type: application/json" `
  -d '{}'
```

## 🐛 Troubleshooting

### Docker not starting?
```powershell
docker compose down
docker compose up -d
```

### Database connection errors?
```powershell
# Check containers
docker ps

# Check logs
docker logs spectatr-db
docker logs spectatr-redis
```

### Integration tests failing with connection errors?
```powershell
# Ensure PostgreSQL is healthy
docker compose ps

# Verify migrations are applied
npm run db:migrate:deploy

# Check your .env.test file has correct DATABASE_URL
```

## 👤 Granting Admin Access

Admin access is required for features like round finalisation, scoring rule management, and other administrative tasks. The `isAdmin` flag is a boolean on the `User` model.

> **Note:** This is a temporary manual process until the Admin UI is built (Phase 2).

### Option 1: Using Prisma Studio (GUI)

```powershell
# Start Prisma Studio
npm run db:studio

# Navigate to the 'User' table
# Find your user by email
# Set 'isAdmin' to true
# Click 'Save 1 change'
```

### Option 2: Using SQL (psql)

```sql
-- Connect to the database
psql -h localhost -U postgres -d spectatr

-- Find your user
SELECT id, email, "isAdmin" FROM users WHERE email = 'your@email.com';

-- Grant admin access
UPDATE users SET "isAdmin" = true WHERE email = 'your@email.com';

-- Verify
SELECT id, email, "isAdmin" FROM users WHERE email = 'your@email.com';
```

### Verifying Admin Access

Once `isAdmin` is set, the user can access admin-only tRPC procedures (like `gameweek.finaliseRound`). The admin check happens on every request by querying the database — it does not rely on JWT claims.

## Scoring System

### Fetch Round Stats Script

The `fetchRoundStats.ts` script fetches per-round player statistics from the playfantasyrugby.com API and writes them to `data/{tenantId}/player_round_stats.json`.

```bash
# Fetch stats for super-2026 tenant
npx tsx packages/server/src/scripts/fetchRoundStats.ts --tenant super-2026
```

**Note:** The script requires the database to be seeded first (to get player feedIds). It adds a 100ms delay between requests to avoid rate limiting.

### Seed with Scoring Events

When seeding `super-2026`, the seed script:
1. Reads `data/super-2026/player_round_stats.json`
2. Creates `ScoringEvent` rows for each player × round × stat
3. Calls `calculateRoundPoints` for each complete round to update team and player point totals

```bash
# Seed super-2026 with scoring data
npm run db:seed -- --tenant super-2026
```

### Admin Procedures for Round Management

Two admin-only tRPC procedures are available for round management:

- **`gameweek.finaliseRound({ roundId })`** — Marks a round as complete and calculates points
- **`gameweek.recalculateLive({ roundId })`** — Recalculates points without changing round status (for live updates)

Both require `User.isAdmin = true` and return `{ roundId, teamsUpdated, playersUpdated }`.

### Scoring Rules

The scoring rules for `super-2026` are defined in `SUPER_2026_SCORING_RULES` in `packages/server/src/utils/scoring.ts`:

| Stat | Points | Description |
|------|--------|-------------|
| T | 15 | Try |
| TA | 9 | Try Assist |
| C | 2 | Conversion |
| CM | -1 | Conversion Missed |
| PG | 3 | Penalty Goal |
| PGM | -1 | Penalty Goal Missed |
| DG | 3 | Drop Goal |
| DGM | -1 | Drop Goal Missed |
| K_50_22 | 10 | 50/22 Kick |
| YC | -5 | Yellow Card |
| RC | -10 | Red Card |
| TW | 4 | Turnover Won |
| I | 5 | Interception |
| LT | 1 | Lineout Won |
| LS | 5 | Lineout Stolen |
| LE | -2 | Lineout Lost |
| TK | 1 | Tackle |
| MT | -1 | Missed Tackle |
| TB | 2 | Tackle Break |
| O | 2 | Offload |
| LB | 7 | Linebreak |
| LC | 5 | Linebreak Assist |
| MG_per10 | 1 | Metres Gained (per 10m) |
| PC | -1 | Penalty Conceded |
| E | -1 | Error |
| SW | 3 | Scrum Won |
