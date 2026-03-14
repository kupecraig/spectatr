# Implementation Plan: Initial Backend API Setup for Fantasy Union

**Jira:** [FSA-13](https://webheaddigital.atlassian.net/browse/FSA-13)

A minimal but extensible Node.js backend to replace frontend mocks with live API endpoints. Uses checksum-based polling for efficient change detection instead of WebSockets - simpler, more scalable, and sufficient for fantasy sports update frequency. Focuses on player/squad data with dynamic updates for matches in progress.

## Steps

1. ✅ **[FSA-20](https://webheaddigital.atlassian.net/browse/FSA-20) - Create backend package structure** in `packages/server/` with TypeScript, tRPC (for end-to-end type safety), and Prisma ORM - initialize with package.json, tsconfig, and basic server entry point

2. ✅ **[FSA-15](https://webheaddigital.atlassian.net/browse/FSA-15) - Set up PostgreSQL database with Prisma ORM**:
   - Single database for all tenants (brands/competitions)
   - Tenant table: id, name, slug, sportType, isActive, branding (logo, colors, theme), config
   - Tenant isolation via tenantId column on sport-specific tables
   - Examples: 'trc-2025' (The Rugby Championship), 'hsbc-svns' (HSBC Sevens), 'nrl-2025' (NRL)
   - Use JSONB columns for flexible player stats (performance data, form, scoring breakdown)
   - Docker Compose configuration with PostgreSQL + Redis services
   - Local volumes for data persistence during development

3. ✅ **[FSA-17](https://webheaddigital.atlassian.net/browse/FSA-17) - Database seeding with mock data**:
   - Seed script migrates mock data with tenantId = 'trc-2025':
     - Create 'trc-2025' tenant (The Rugby Championship 2025, sportType: 'rugby-union')
     - `packages/ui/src/mocks/players.json` → players table
     - `packages/ui/src/mocks/squads.json` → squads table
     - `packages/ui/src/mocks/rounds.json` → rounds/tournaments tables
     - Initialize gameweek_state for trc-2025 tenant
   - Prisma generates TypeScript types from schema for end-to-end safety
   - **Why now:** Need real data in database before building endpoints

4. ✅ **[FSA-22](https://webheaddigital.atlassian.net/browse/FSA-22) - Basic server setup** at `http://localhost:3001`:
   - Simple Express server for tRPC endpoints
   - Tenant detection middleware:
     - Development default: 'trc-2025' (localhost)
     - Extracts tenantId from X-Tenant-Id header for API clients
     - Production: subdomain detection (trc.fantasysports.com → 'trc-2025')
   - Tenant validation from in-memory cache (zero DB queries)
   - tRPC context includes tenantId and full tenant object for all requests
   - All queries auto-filtered by tenantId (prevents cross-tenant data leakage)
   - CORS enabled for localhost:5173
   - Hot-reload, error handling, request logging
   - **Why now:** Need server running to test endpoints

5. ✅ **[FSA-14](https://webheaddigital.atlassian.net/browse/FSA-14) - Implement core tRPC endpoints**:
   - `players.list` (filtering: position, squad, price, search)
   - `players.getById` (single player details)
   - `squads.list` (static data, long cache TTL)
   - `rounds.list` (includes current round, match status, scores)
   - Use Zod schemas from `@spectatr/shared-types` for validation
   - Set appropriate cache headers based on data volatility:
     - players.list: 60s TTL
     - squads.list: 24h TTL (static for season)
   - **Why now:** Data is seeded, server is running, can build and test endpoints

6. ✅ **[FSA-23](https://webheaddigital.atlassian.net/browse/FSA-23) - Wire frontend to backend**:
   - Create `packages/ui/src/hooks/api/` with TanStack Query hooks
   - `usePlayersQuery()` - HTTP fetch for player data
   - `useRoundsQuery()` - Current round/match data
   - `useSquadsQuery()` - Squad/team data
   - Replace mock data in PlayerList.tsx with real queries
   - **Why now:** Endpoints work, can connect frontend to live data

7. ✅ **[FSA-18](https://webheaddigital.atlassian.net/browse/FSA-18) - Implement gameweek state management**:
   - Gameweek state already exists in schema (unique on tenantId)
   - Create endpoint: `gameweek.current` (returns gameweek_state singleton - cached aggressively)
   - Status enum: 'pre_round', 'active', 'locked', 'processing', 'complete'
   - Each tenant has independent gameweek state (trc-2025 round 5, hsbc-svns round 3)
   - **Why now:** Basic endpoints work, can add state management features

8. ✅ **[FSA-16](https://webheaddigital.atlassian.net/browse/FSA-16) - Implement checksum tracking** (optimization):
   - Add checksum endpoint: `GET /checksum.json` - Calculate MD5 hashes on-demand
   - Returns MD5 hashes per tenant: `{ "rounds": "...", "players": "..." }`
   - Checksums partitioned by tenant (each tenant's checksums are independent)
   - Frontend polling: `useChecksumPoller()` - Adaptive polling with industry-standard intervals:
     - 60s base (no activity)
     - 30s during transfer windows/before matches
     - 10s during live matches
     - Exponential backoff on errors
   - **Optional later:** Database triggers to auto-update checksums (performance optimization)
   - **Why now:** System works, adding performance optimization

9. ✅ **[FSA-19](https://webheaddigital.atlassian.net/browse/FSA-19) - Implement audit trail** (compliance):
   - Audit log table already exists in schema
   - Create logging middleware for tRPC mutations
   - Log: user_id, action, before_state, after_state, ip_address, user_agent, timestamp
   - Log triggers on: player selection/removal, squad updates, transfers
   - Index on (team_id, created_at DESC) for efficient lookups
   - Retention: 90 days minimum for dispute resolution and bot detection
   - Use for: "User claims they selected X", suspicious activity detection, support tickets
   - **Why now:** Core features stable, adding compliance and debugging

10. ✅ **[FSA-21](https://webheaddigital.atlassian.net/browse/FSA-21) - Implement auto-lock background job** (automation):
   - Scheduled task runs every minute checking match start times
   - Auto-locks players when their match begins (based on `rounds.start_date`)
   - SQL UPDATE sets `player.is_locked = true` for players in starting lineups
   - Invalidate players checksum after lock via `invalidatePlayersChecksum()`
   - Frontend detects change via checksum poll and refetches
   - Atomic batch updates wrapped in transaction for consistency
   - Simple setInterval scheduler (can upgrade to BullMQ for distributed workers)
   - **Why now:** All core features done, adding automation

11. ✅ **[FSA-24](https://webheaddigital.atlassian.net/browse/FSA-24) - Add rate limiting and production hardening** (production-ready):
   - Rate limiting middleware (Redis-backed sliding window):
     - `/checksum.json`: 120 req/min per IP
     - `/api/players`: 60 req/min
     - `/api/rounds`: 60 req/min
   - Return 429 with Retry-After header when limits exceeded
   - Production: CDN integration for checksum.json (10s TTL)
   - **Why now:** System ready for production traffic

## Backend Project Structure

**Recommended tRPC Organization:**
```
packages/server/src/
├── trpc/
│   ├── index.ts              # tRPC initialization (router, procedure exports)
│   ├── context.ts            # Request context (prisma, tenantId, user)
│   ├── middleware.ts         # Reusable middleware (logging, auth, tenant validation)
│   ├── procedures.ts         # Base procedures (baseProcedure, protectedProcedure)
│   └── routers/
│       ├── _app.ts           # Root router (combines all feature routers)
│       ├── players.ts        # Player endpoints (list, getById, scoringBreakdown)
│       ├── squads.ts         # Squad endpoints (list)
│       ├── rounds.ts         # Round endpoints (list, current)
│       ├── gameweek.ts       # Gameweek state (current)
│       └── admin.ts          # Admin endpoints (future: force refresh, manual updates)
├── config/
│   └── env.ts                # Environment config with Zod validation
├── utils/
│   └── logger.ts             # Pino logger utility
├── scripts/
│   └── seed.ts               # Database seeding script
└── index.ts                  # Express server entry point
```

**Key Principles:**
- **Feature-based routers** - One router per domain (players, squads, rounds)
- **Shared middleware** - Logging, tenant validation, auth in middleware.ts
- **Type-safe context** - All DB access and tenant info via context
- **Procedure composition** - Build on baseProcedure (includes logging + validation)
- **Root router pattern** - _app.ts combines all routers, exports AppRouter type

## Technology Decisions

**Framework: tRPC** (chosen for end-to-end type safety with zero boilerplate)
- Automatic TypeScript types flow from server to client
- Uses existing Zod schemas from `@spectatr/shared-types`
- Native TanStack Query integration (already in use)
- Perfect for monorepo architecture
- Rapid development with compile-time safety

**Database: Docker Compose** (PostgreSQL + Redis locally)
- Full control over database configuration and versions
- Consistent dev environment across team members
- Easy to add additional services (Redis, background workers)
- Data persists via Docker volumes
- Simple commands: `docker-compose up` / `docker-compose down`
- Production: Can migrate to managed services (RDS, Supabase) with minimal changes

**Player Stats Storage: JSONB** (flexible schema for evolving data)
- JSONB columns for player stats (totalPoints, avgPoints, form, scoring breakdown)
- Fast enough at current scale (~200 players, 100K+ users supported)
- GIN indexes on JSONB fields enable efficient filtering/sorting
- Easy to add new stats without schema migrations
- Can normalize hot columns later if query performance degrades (unlikely for years)
- Keeps stats structure flexible as scoring rules evolve

**Polling Strategy: Adaptive Checksum Polling** (industry standard, not WebSockets)
- 60s base rate (no matches, nothing happening)
- 30s before matches/during transfer windows (users actively managing squads)
- 10s during live matches (standard across FPL, ESPN, Yahoo)
- Exponential backoff on errors (10s → 20s → 40s → max 60s)
- Matches FPL architecture (11M concurrent users, 95% CDN cache hit rate)
- WebSockets deferred for specific features only (draft rooms, live chat)
- Simpler infrastructure, better scaling, battery-efficient, works with CDNs

**Checksum Delivery: Direct from API** (MVP simplicity, easy CDN upgrade path)
- Serve checksum.json directly from Node.js server for MVP
- Simpler initial setup (no CDN configuration needed)
- Still fast enough with in-memory checksum cache
- Production: Easy migration to CDN with 10s TTL (one config change)
- ETags + 304 responses keep bandwidth minimal even without CDN

**Data Ingestion: Manual Admin Endpoint** (MVP simplicity, sports API later)
- For MVP, manually trigger stat updates via admin endpoint
- Simpler initial setup without API integrations/webhooks
- Production: Integrate with sports data API (OptaStats, StatsPerform)
- Auto-update player stats during matches via scheduled polling or webhooks

**Authentication: Scaffolded for Clerk** (provider-agnostic, easy migration)
- Add User table to schema now (id, email, username, created_at)
- Provider-agnostic design works with Clerk, Lucia, Auth.js, or Supabase
- Planned provider: Clerk (15 min setup, generous free tier, official tRPC support)
- Migration-ready: Change provider by swapping middleware only
- Auth implementation deferred until user features needed

**Multi-Tenant Architecture: Brand/Competition Model** (flexible for both single-tenant and multi-tenant deployments)
- Single database with tenantId column on all sport-specific tables
- Each tenant represents a **brand/competition** (not just sport type)
  - Examples: 'trc-2025' (The Rugby Championship), 'hsbc-svns' (HSBC Sevens), 'nrl-2025' (National Rugby League)
  - Multiple tenants can share same sport (TRC and HSBC Sevens both use rugby-union)
- Tenant table stores: id, name, sportType, branding (logo, colors, theme), config
- tRPC middleware auto-filters all queries by tenantId (from subdomain/header)
- Users shared across tenants (single login for all brands/competitions)
- Separate frontend deployments per tenant (trc.fantasysports.com, hsbc-svns.fantasysports.com)
- Tenant validation cached in-memory (startup preload) for zero-latency lookups
- **Deployment flexibility:**
  - Multi-tenant SaaS: All tenants in one deployment (you manage everything)
  - Single-tenant: One tenant per deployment (they manage their own)
  - Same codebase supports both models
- Production migration path: Split to separate databases per tenant when needed
- Cost savings: ~70% cheaper than separate databases initially

**Tenant Caching Strategy:**
- Load all active tenants at server startup into in-memory Map
- Zero database queries during request validation (sub-millisecond performance)
- Admin endpoint to refresh cache when tenants are created/updated (rare event)
- Scales to 10,000+ req/s with no performance degradation

## Checksum Pattern Best Practices

### Cache Strategy with ETags
- Serve checksum.json with ETag header (use hash as ETag value)
- Frontend includes `If-None-Match` header on polls
- Server returns 304 Not Modified when unchanged → zero bandwidth
- Only full response (200 OK) when checksum actually changes
- Example: 1000 users polling = 1000 tiny 304 responses instead of 1000 full player payloads

### Granular Checksums for Bandwidth Optimization
Instead of single checksum, partition by data volatility:
```json
{
  "squads": "abc123",           // Changes: never (entire season)
  "playersStatic": "def456",    // Changes: rarely (injuries, transfers)
  "playersStats": "ghi789",     // Changes: often (match stats)
  "roundsSchedule": "jkl012",   // Changes: rarely (fixture updates)
  "roundsLive": "mno345"        // Changes: frequently (live scores)
}
```
Benefits:
- Frontend can refetch only changed partitions
- User browsing squad page doesn't need to refetch static player names/images
- Only live stats update during matches
- Reduces bandwidth by 80-90% vs full refresh

### Adaptive Polling with Backoff
Frontend adjusts poll frequency based on context:
```typescript
// Aggressive when activity expected
if (matchesInProgress) poll every 10s
else if (matchStartsWithin30Min) poll every 20s
else if (transferWindowOpen) poll every 30s
else poll every 60s

// Exponential backoff on errors
if (error) double interval (10s → 20s → 40s → max 60s)
```

### Optimistic UI Updates
Don't wait for checksum poll to reflect user actions:
- User selects player → Update UI immediately (optimistic)
- Background: Save to server, poll checksum
- If checksum matches expectation → committed
- If conflict detected → show conflict resolution UI
- Provides instant feedback while maintaining consistency

### Data Versioning with Checksums
Include version metadata for conflict detection:
```json
{
  "version": "1234567890",
  "checksums": { ... },
  "lastUpdated": "2026-02-09T14:30:00Z",
  "activeRound": 1
}
```
Use for:
- Detecting if user's cache is stale
- Showing "New data available, refresh?" toast
- Preventing write conflicts (e.g., user editing old squad data)

### Server-Side Checksum Generation
Compute checksums efficiently:
```typescript
// In-memory cache of current checksums
let currentChecksums = { players: "...", rounds: "..." };

// Invalidate specific checksum when data changes
function onPlayerUpdate() {
  currentChecksums.players = generateHash(await Player.find());
}

// Checksum endpoint is pure read from memory
app.get('/checksum.json', (req, res) => {
  res.json(currentChecksums); // No DB query
});
```
Benefits: Checksum endpoint handles 10,000+ req/s with zero DB load

### Progressive Enhancement Pattern
Layer data freshness requirements:
1. **Critical data** (user's own squad): Fetch immediately, validate with checksum
2. **Important data** (player prices): Checksum poll, lazy fetch on change
3. **Nice-to-have data** (league standings): Background fetch, update when idle
4. **Static data** (squad badges): Fetch once, cache forever

### Admin Tools for Checksum Debugging
Build admin endpoints for development/monitoring:
- `GET /admin/checksums/history` - Last 100 checksum changes with timestamps
- `GET /admin/checksums/force-regenerate` - Manually trigger recalculation
- `GET /admin/checksums/compare?v1=abc&v2=def` - Diff between two versions
- Helps debug "why isn't my data updating?" issues

### CDN + Origin Strategy
Production architecture:
```
User → CDN (checksum.json, 10s TTL)
     → Origin Server (player/round data, 60s-300s TTL based on volatility)
     → MongoDB (only when cache miss)
```
Result: 95%+ requests served from edge, sub-50ms latency globally

### Monitoring and Observability
Track these metrics:
- Checksum poll frequency (users per second)
- Cache hit rate on checksum endpoint (should be >80%)
- Time between checksum changes (alerts if too frequent = runaway updates)
- 304 vs 200 ratio on data endpoints (should be high = effective caching)
- Full refetch events per user session (should be low = stable data)

### Error Handling and Fallbacks
Graceful degradation:
```typescript
// If checksum fetch fails
→ Retry with exponential backoff
→ After 3 failures, fall back to direct data fetch
→ Show warning banner "Live updates paused"

// If checksum changes but data fetch fails
→ Keep polling checksum
→ Retry data fetch separately
→ Don't block UI on stale but valid data
```

### Rate Limiting Strategy
Protect checksum endpoint from abuse:
- Per-IP limit: 120 requests/minute (1 every 500ms)
- Authenticated users: Higher limit (300/min)
- Return 429 with Retry-After header
- Frontend respects 429 and backs off automatically

### Testing Strategy
Validate checksum behavior:
```typescript
// Unit tests
- Checksum changes when player stats update
- Checksum unchanged when unrelated data changes
- Checksums are deterministic (same data = same hash)

// Integration tests
- Poll endpoint 100 times → only first returns 200, rest 304
- Update player → next poll returns 200 with new checksum
- Concurrent updates don't create race conditions

// Load tests
- 10,000 concurrent checksum polls → <100ms p95 latency
- CDN serves 99% from edge cache
```