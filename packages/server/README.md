# Spectatr Backend

Backend API server for Spectatr providing type-safe endpoints for player data, squad information, rounds, and gameweek state.

## Tech Stack

- **TypeScript** - Type-safe development
- **tRPC** - End-to-end type safety with zero boilerplate
- **Prisma** - Type-safe ORM for PostgreSQL
- **Express** - HTTP server
- **Redis** - Caching and rate limiting
- **Zod** - Runtime validation using shared schemas

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (via Docker Compose)
- Redis 7+ (via Docker Compose)
- Clerk account (https://dashboard.clerk.com) for authentication

### Installation

```bash
# Install dependencies (from monorepo root)
npm install

# Navigate to backend package
cd packages/backend

# Copy environment variables
cp .env.example .env

# Start database services (Docker Compose - FSA-15)
docker-compose up -d

# Generate Prisma client (FSA-17)
npm run db:generate

# Run database migrations (FSA-17)
npm run db:migrate

# Seed database with mock data (FSA-17)
npm run db:seed
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Run from monorepo root
npm run dev:backend
```

The server will start at `http://localhost:3000`

**Endpoints:**
- `GET /health` - Health check
- `GET /checksum.json` - Data checksums for polling
- `POST /api/trpc/*` - tRPC API routes (FSA-14)

### Database Commands

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Create and run migrations for schema changes
npm run db:migrate

# Create and run migrations
npm run db:migrate

# Seed database with mock data
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio
```

**Migration policy:** Do not use `db:push` for shared or reviewed changes. Use `db:migrate` and update seeds when schema changes affect seeded data.

### Building for Production

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm run start
```

## Project Structure

```
packages/backend/
├── src/
│   ├── index.ts              # Server entry point
│   ├── config/
│   │   └── env.ts            # Environment configuration
│   ├── utils/
│   │   └── logger.ts         # Logging utility
│   ├── trpc/                 # tRPC configuration (FSA-14)
│   ├── prisma/               # Prisma schema and migrations (FSA-17)
│   ├── jobs/                 # Background jobs (FSA-21)
│   └── scripts/
│       └── seed.ts           # Database seeding (FSA-17)
├── package.json
├── tsconfig.json
└── .env.example
```

## Environment Variables

See `.env.example` for all available configuration options.

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `CLERK_PUBLISHABLE_KEY` - Clerk publishable key (get from https://dashboard.clerk.com)
- `CLERK_SECRET_KEY` - Clerk secret key (get from https://dashboard.clerk.com)

**Optional:**
- `NODE_ENV` - Environment (development/production/test)
- `PORT` - Server port (default: 3000)
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:5173)

### Clerk Setup

1. Create a Clerk account at https://dashboard.clerk.com
2. Create a new application
3. Copy the publishable key (starts with `pk_`) and secret key (starts with `sk_`)
4. Add to `.env` file:
   ```
   CLERK_PUBLISHABLE_KEY=pk_test_xxx
   CLERK_SECRET_KEY=sk_test_xxx
   ```
5. Clerk will handle JWT verification and provide user authentication

## Multi-Instance Architecture

The backend supports multiple sport instances (rugby, soccer, cricket) using a single database with `instanceId` column on all sport-specific tables.

**Instance Detection:**
- Subdomain: `rugby.domain.com` → instanceId = 'rugby'
- Header: `X-Instance-Id: soccer` → instanceId = 'soccer'
- Default: 'rugby' if not specified

All queries are automatically filtered by the current instance via tRPC middleware.

## Checksum Polling Strategy

The backend uses checksum-based polling for efficient change detection:

1. **Frontend polls** `GET /checksum.json` every 30-60s
2. **Backend returns** MD5 hashes per data partition
3. **Frontend compares** hashes to detect changes
4. **Frontend refetches** only changed data

**Benefits:**
- 95%+ CDN cache hit rate
- Sub-100ms latency globally
- Battery-efficient (no persistent WebSocket)
- Scales to millions of users

See [plan-backendApiSetup.prompt.md](../../.github/copilot-instructions/plans/plan-backendApiSetup.prompt.md) for detailed architecture.

## Implementation Status

- ✅ **FSA-20** - Backend package structure
- ⏳ **FSA-15** - PostgreSQL + Docker Compose setup
- ⏳ **FSA-16** - Checksum tracking with DB triggers
- ⏳ **FSA-14** - Core tRPC endpoints
- ⏳ **FSA-17** - Prisma schema and seeding
- ⏳ **FSA-18** - Gameweek state management
- ⏳ **FSA-19** - Audit trail
- ⏳ **FSA-21** - Auto-lock background job
- ⏳ **FSA-22** - CORS, rate limiting, dev server
- ⏳ **FSA-23** - Frontend integration

## Testing

```bash
# Run unit tests (future)
npm test

# Run integration tests (future)
npm run test:integration
```

## Contributing

Follow the guidelines in [CONTRIBUTING.md](../../CONTRIBUTING.md).

**Key Rules:**
- Strict TypeScript (no `any`)
- Use Zod schemas from `@spectatr/shared-types`
- Pure functions for business logic
- JSDoc comments for public APIs

## Related Documentation

- [Product Vision](../../PRODUCT.md)
- [System Architecture](../../ARCHITECTURE.md)
- [Backend Setup Plan](../../.github/copilot-instructions/plans/plan-backendApiSetup.prompt.md)
