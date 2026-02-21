# Spectatr Monorepo

Multi-sport fantasy sports platform with shared validation and type-safe development.

## Quick Start

```bash
# Install dependencies
npm install

# Start database services
docker-compose up -d

# Initialize database
cd packages/backend
npm run db:push
cd ../..

# Start development servers (frontend + backend)
npm run dev:all
```

Frontend: `http://localhost:5173` | Backend: `http://localhost:3001`

## Structure

```
spectatr/
├── packages/
│   ├── shared-types/     # Shared Zod schemas & validation
│   ├── frontend/         # React + MUI + Vite app
│   └── backend/          # Node.js + tRPC + Prisma API
├── docker-compose.yml    # PostgreSQL + Redis services
├── package.json          # Root workspace config
└── README.md             # This file
```

## Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL and Redis)
- npm 10+

## Getting Started

### Install Dependencies

```bash
npm install
```

This installs dependencies for all workspace packages.

### Development

**Run both frontend and backend:**
```bash
npm run dev:all
```

**Run frontend only:**
```bash
npm run dev
```

**Run backend only:**
```bash
npm run dev:backend
```

**Build shared types:**
```bash
npm run build:shared
```

**Build everything:**
```bash
npm run build
```

### Database Management

```bash
cd packages/backend

# Open Prisma Studio (database GUI)
npm run db:studio

# Push schema changes
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed database
npm run db:seed

# Reset database (WARNING: deletes all data)
npm run db:reset
```

### Docker Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Stop and remove volumes (deletes data)
docker-compose down -v
```

### Workspace Packages

- **@spectatr/shared-types** - Shared TypeScript types, Zod schemas, and validation
- **@spectatr/frontend** - React frontend application
- **@spectatr/backend** - Node.js backend API server

## Documentation

- [Product Vision](PRODUCT.md) - Game modes, features, multi-sport strategy
- [System Architecture](ARCHITECTURE.md) - Tech stack, patterns, validation  
- [Contributing Guidelines](CONTRIBUTING.md) - Development standards
- [Data Model](docs/DATA_MODEL.md) - Database entities and relationships
- [Setup Guide](docs/SETUP.md) - Detailed setup instructions
- [Testing Guide](packages/frontend/TESTING.md) - Testing strategy
- [Backend README](packages/backend/README.md) - Backend-specific docs

## Tech Stack

- **Frontend:** React 18, TypeScript, MUI v7, Vite
- **Backend:** Node.js 20+, tRPC, Prisma, Express
- **Database:** PostgreSQL 15, Redis 7
- **Validation:** Zod (shared between FE/BE)
- **State Management:** Zustand + TanStack Query

## Scripts

### Development
- `npm run dev` - Start frontend only
- `npm run dev:backend` - Start backend only
- `npm run dev:all` - Start both frontend and backend

### Building
- `npm run build` - Build all packages
- `npm run build:shared` - Build shared-types package only
- `npm run build:frontend` - Build frontend package only
- `npm run build:backend` - Build backend package only

### Other
- `npm run lint` - Lint all packages
- `npm run preview` - Preview frontend production build

## Environment Variables

Each package has its own `.env` file:

```bash
# Backend
cd packages/backend
cp .env.example .env
# Edit .env as needed
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

**Key Rules:**
- MUI only (no custom CSS frameworks)
- Theme tokens for all styling
- Zod schemas from shared-types
- Strict TypeScript (no `any`)
- Sport-agnostic design

## License

Private - All rights reserved
