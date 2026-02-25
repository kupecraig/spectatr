## Plan: Backend Strategy for Fantasy Union

The backend must support multi-league fantasy games with live scoring, drafts, and configurable rules while staying flexible for additional sports.

### Goals
- Scalable API with real-time capabilities (draft rooms, live scoring)
- Clear separation between ingestion, business logic, and client-facing services
- Type-safe integration with the React frontend
- Easy-to-test rules engine with versioned configurations

### Architecture Overview
1. **API Layer (TypeScript/NestJS or tRPC)**
   - Expose REST/GraphQL for the app
   - Handle authentication/authorization
   - Orchestrate league/team/fixture CRUD
2. **Scoring & Rules Service**
   - Shared library for calculating points, enforcing caps, validating rosters
   - Runs inside workers (for ingestion) and API (for validation)
3. **Data Ingestion Pipeline**
   - Scheduled jobs/queues to ingest official match data
   - Normalizes events into internal format, triggers scoring updates
4. **Real-time Gateway**
   - WebSocket/SSE service for draft picks, live score pushes, chat
   - Uses Redis Pub/Sub or similar for fan-out across nodes
5. **Storage**
   - PostgreSQL (relational data, JSONB configs)
   - Redis (caching, queues, session storage)
   - Optional object storage (player images, assets)

### Technology Choices
- **Runtime**: Node.js 20+, TypeScript
- **Framework**: NestJS (modular) or tRPC (end-to-end typing)
- **ORM**: Prisma for PostgreSQL
- **Queues**: BullMQ (Redis-backed)
- **Realtime**: Socket.io or native ws with Redis adapter
- **Auth**: Auth0/Clerk/Cognito for user federation
- **Deployment**: Containers on Fly.io/Render/ECS with separate workers

### Key Workstreams
1. **Domain Modeling**
   - Leagues, seasons, fixtures, drafts, rosters, transactions, scoring events
   - Support multi-tenancy (league_id everywhere)
2. **Rules Engine**
   - Versioned configs per league (JSON stored in DB)
   - Pure functions for scoring & validation for deterministic testing
3. **Data Ingestion**
   - Provider adapters, retry logic, historical backfill scripts
   - Event sourcing so new rules can reprocess past matches
4. **Realtime Draft & Scoring**
   - WebSocket channels per league/draft
   - Optimistic locking for simultaneous picks
5. **Observability & Dev Experience**
   - Pino logging, OpenTelemetry traces, Health probes
   - Seed scripts + fixtures for FE test modes
