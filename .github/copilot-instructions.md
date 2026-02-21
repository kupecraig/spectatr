# Spectatr - Copilot Guidelines

**Jira Project:** https://webheaddigital.atlassian.net/jira/software/projects/FSA/boards/2

**All documentation must follow the *Context engineering flow* outlined here: https://code.visualstudio.com/docs/copilot/guides/context-engineering-guide (MUST READ)**

## Project Overview

Spectatr is a multi-sport fantasy sports platform, initially focused on rugby union with extensibility to soccer, cricket, and other field sports. The platform supports multiple game modes, customizable leagues with configurable rules, and real-time scoring.

**Tenant vs League Hierarchy:**
- **Tenant** = Sport competition instance (trc-2025, svns, a-league, nba, nfl) - Separate data, branding, themes
- **League** = User-created group within a tenant (family-league, office-league) - Compete within same player pool

**Multi-Sport Architecture:**
- Sport-agnostic design with JSON-configured field layouts
- Each tenant instance has different themes, rules, and squad configurations
- Easy extension to new sports without code changes

**Currently:** Rugby Union (15 players, 8 positions)  
**Planned:** Soccer, Cricket, American Football, Basketball

## Key Documentation

Review these documents for detailed context:

* [Product Vision](../PRODUCT.md) - Game modes, league rules, squad composition, multi-sport strategy
* [System Architecture](../ARCHITECTURE.md) - Monorepo structure, tech stack, state management, validation
* [Contributing Guidelines](../CONTRIBUTING.md) - Development guidelines, MUI usage, component patterns, coding standards

## Critical Rules

### 1. MUI Only (REQUIRED)
**Use Material-UI for ALL UI elements** - see [mui.md](copilot-instructions/mui.md) for detailed guidelines:
- NO custom CSS or other component libraries
- Styling via MUI `sx` prop and theme system only
- Follow existing patterns (Dashboard, SettingsDialog)

### 2. Theme System (REQUIRED)
**All styling via MUI theme tokens:**
- Colors: `theme.palette` (positions, field, player, selection, navigation, stats)
- Typography: Custom variants (playerLabel, fieldLabel, emptySlotLabel, statValue)
- Components: Theme-based component overrides
- NO direct CSS or inline styles outside theme system

### 3. Shared Validation (REQUIRED)
**Use Zod schemas from @spectatr/shared-types:**
- Validation runs on both frontend (user feedback) and backend (security)
- Pure functions for deterministic testing
- TypeScript types inferred from Zod schemas
- Example: `import { validateSquad } from '@spectatr/shared-types'`

### 4. Type Safety (REQUIRED)
**Strict TypeScript throughout:**
- No `any` types
- Interfaces for all data structures
- Type inference from Zod schemas

### 5. Skeleton Loading States (REQUIRED)
**Use MUI Skeleton components for all loading states:**
- Match shape/size of actual content
- Better UX than spinners for content-heavy views
- Zero layout shift when content loads

### 6. Storybook for Component Development (REQUIRED)
**Create stories for all new components:**
- Place `.stories.tsx` files next to components or in feature folders
- Include multiple states (default, loading, error, edge cases)
- Add interaction tests with `play` functions for user flows
- Use `@storybook/test` utilities (`userEvent`, `within`, `expect`)
- Stories must be **sport-agnostic** - use `sportSquadConfig` for positions/rules
- See [TESTING.md](../packages/ui/TESTING.md) for guidelines

### 7. Unit Tests with Vitest (REQUIRED)
**Write unit tests for business logic:**
- Test validation functions, utilities, and store logic
- Use `describe`/`it` blocks with clear test names
- Co-locate `.test.ts` files with source files
- Run: `npm test` (watch), `npm run test:unit` (once), `npm run test:coverage`
- Example: `squad-validator.test.ts` tests all validation paths
- See [TESTING.md](../packages/ui/TESTING.md) for patterns

### 8. Sport-Agnostic Design (CRITICAL)
**ALL features must work for multiple sports - NEVER hardcode sport-specific logic:**

✅ **DO:**
- Load positions from `sportSquadConfig.positions`
- Use `Object.entries(sportSquadConfig.positions)` to iterate positions
- Reference position labels via config: `sportSquadConfig.positions[position].label`
- Design UI components to adapt to varying squad sizes and positions
- Use config-driven field layouts from `fieldLayouts.json`

❌ **DON'T:**
- Hardcode position arrays: `['fly_half', 'scrum_half', 'hooker']`
- Hardcode position labels: `'Fly Half'`, `'Scrum Half'`
- Assume fixed squad size (15 for rugby, but 11 for soccer)
- Create rugby-specific logic that won't translate to other sports

**Example:**
```typescript
// ❌ WRONG - Rugby-specific hardcoding
const positions = ['fly_half', 'scrum_half'];
const squadSize = 15;

// ✅ CORRECT - Sport-agnostic from config
import { sportSquadConfig } from '@spectatr/shared-types';
const positions = Object.keys(sportSquadConfig.positions);
const squadSize = sportSquadConfig.maxSquadSize;
```

### 9. Database Changes via Migrations (REQUIRED)
**All database schema changes must be done with Prisma migrations.**
- Create and apply migrations with `npm run db:migrate`
- Do not use `db:push` for shared or reviewed changes
- Update seeds when schema changes affect seeded data

## Project Structure

```
spectatr/
├── packages/
│   ├── shared-types/          # Zod schemas, validation, sport configs
│   │   ├── schemas/           # Player, squad, league schemas
│   │   ├── validation/        # Pure validation functions
│   │   └── config/            # Sport configs, field layouts
│   ├── ui/                    # React + MUI + Vite
│   │   ├── env/               # Environment files (.env, .env.example)
│   │   └── src/
│   │       ├── components/    # React components
│   │       ├── theme/         # MUI theme system (tokens, components, instances)
│   │       ├── stores/        # Zustand stores (feature-based)
│   │       ├── pages/         # Page components
│   │       ├── features/      # Feature-specific components
│   │       ├── mocks/         # UI mock data (leagues, leagueRules)
│   │       └── config/        # Config files (field layouts, validation errors)
│   └── server/                # tRPC API + Prisma + PostgreSQL
│       └── env/               # Environment files (.env, .env.example)
├── data/
│   └── trc-2025/              # Seed data (players.json, squads.json, rounds.json)
```

## Tech Stack

**Frontend:**
- React 18.3 + TypeScript 5.6
- Material-UI (MUI) v7.2.0 + Icons
- Vite 6.0 (build tool)
- Zustand (client state) + TanStack Query (server state)
- React Router v6
- Zod (validation)
- Emotion (MUI's CSS-in-JS)
- **Storybook 10.2.7** (component development & testing)

**Backend:**
- tRPC (end-to-end type safety)
- PostgreSQL with Prisma ORM
- Redis + BullMQ (background jobs)
- Rate limiting, audit trail, multi-tenancy
- See [Backend API Guide](copilot-instructions/backend-api.md)

## State Management Strategy

**Zustand (Client State):**
- Feature-based stores (one per feature/page)
- Combines data + UI state for that feature
- Example: `useMyTeamStore` has squad data + My Team UI state

**TanStack Query (Server State):**
- Authentication
- Player data with caching
- Live scores
- Draft WebSocket integration

**React Hook Form:**
- Complex forms paired with TanStack Query mutations

## Validation Architecture

**Two-Layer Validation:**
1. **SportSquadConfig** - Sport structure (positions, max players, budget) - not league-specific
2. **League Rules** - League-specific constraints layered on top

All validation uses Zod schemas from `@spectatr/shared-types` package.

## Important Constraints

1. **MUI Only** - No other UI libraries or custom CSS frameworks
2. **Shared Validation** - FE and BE must use same Zod schemas
3. **Sport Agnostic** - All features must work for multiple sports
4. **Type Safety** - Strict TypeScript throughout
5. **Theme System** - All styling via MUI theme tokens
6. **Responsive** - Mobile and desktop support required

## Current Implementation Status

**Completed:**
- ✅ **Backend API with tRPC** - See [Backend API Guide](copilot-instructions/backend-api.md)
  - Multi-tenant architecture, Prisma ORM, PostgreSQL
  - Rate limiting (Redis), audit trail, background jobs
  - Checksum-based polling system
- ✅ **Clerk Authentication** - See [Auth Setup Plan](copilot-instructions/plans/plan-clerkAuthSetup.prompt.md)
  - Hosted sign-in pages (MUI-only app UI)
  - JWT verification in Express middleware
  - User persistence with provider-agnostic IDs
  - Route guards (public dashboard, protected routes)
  - Auth + tenant middleware composition
- ✅ Monorepo structure with shared-types package
- ✅ Theme system with 3 themes (rugby, light, dark) and custom tokens
- ✅ Custom themed components (PlayerSlot, EmptySlot)
- ✅ Dashboard with table view (public access)
- ✅ React Router navigation with route protection
- ✅ Player list with filtering (FilterPanel, PlayerListItem, PlayerList)
- ✅ Field layout configuration system
- ✅ Zustand store (myTeamStore) with validation integration
- ✅ Storybook component testing (replaces test page)
- ✅ Vitest unit testing

**In Progress:**
- Field visualization view
- Squad building functionality
- Frontend-backend integration
- Draft system planning

## Quick Reference

**Documentation:**
- [Product Documentation](../PRODUCT.md)
- [System Architecture](../ARCHITECTURE.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [MUI Usage Guidelines](copilot-instructions/mui.md)
- [Backend API Guide](copilot-instructions/backend-api.md) - tRPC patterns, multi-tenancy
- [Theme System Documentation](../packages/ui/src/theme/README.md)
- [Testing & Storybook Guidelines](../packages/ui/TESTING.md)
- [Project Setup Guide](../docs/SETUP.md)
- [Data Model Overview](../docs/DATA_MODEL.md)

**Implementation Plans:**
- [Backend Setup Plan](copilot-instructions/plans/plan-backendSetup.md) - ✅ Complete
- [State Management Plan](copilot-instructions/plans/plan-stateManagement.md)
- Use the [plan template](plan-template.md) for new implementation plans

**Mock Data:**
- `data/trc-2025/players.json` - Full player dataset
- `data/trc-2025/squads.json` - Real-world team data
- `data/trc-2025/rounds.json` - Round/fixture data
- `packages/ui/src/mocks/leagues.json` - Sample leagues
- `packages/ui/src/mocks/leagueRules.json` - League rule configurations

## Guidelines for AI Agents

**When implementing features:**
1. Always use MUI components (no custom CSS or other libraries)
2. Use theme tokens for all styling (colors, typography, spacing)
3. Create skeleton loading states matching actual content
4. Use Zod schemas from shared-types for validation
5. Follow feature-based Zustand store pattern
6. Maintain strict TypeScript typing (no `any`)
7. **Create Storybook stories for all new components** with multiple states and interaction tests
8. **NEVER hardcode sport-specific logic** - always use `sportSquadConfig` for positions, squad size, rules

**When planning features:**
- Reference PRODUCT.md for game rules and business logic
- Reference ARCHITECTURE.md for technical patterns
- Reference CONTRIBUTING.md for development standards
- Use the plan template in `.github/plan-template.md`

---

**Suggest updates to these documents if you find incomplete or conflicting information during your work.**
