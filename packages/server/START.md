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

 Test Files  5 passed
      Tests  19 passed
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
