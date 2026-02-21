# Spectatr - Contributing Guidelines

## Critical Development Rules

### 1. MUI Only (REQUIRED)
Use Material-UI for ALL UI elements. NO custom CSS or other component libraries. Styling via MUI `sx` prop and theme system only.

**Why:** UI consistency, accessibility, theming flexibility.

See [.github/copilot-instructions/mui.md](.github/copilot-instructions/mui.md) for details.

### 2. Theme System (REQUIRED)
All styling via MUI theme tokens:

**Colors:** `theme.palette.positions` (sport-specific), `theme.palette.field`, `theme.palette.player`, `theme.palette.selection`, `theme.palette.navigation`, `theme.palette.stats`

**Typography:** `playerLabel` (0.75rem bold), `fieldLabel` (0.75rem uppercase), `emptySlotLabel` (0.65rem tight), `statValue` (1.5rem tabular)

**Rules:** NO direct CSS or inline styles outside theme system. All new components must support theming.

```typescript
// ✅ Correct
<Box sx={{ color: theme.palette.positions.outsideBack }}>

// ❌ Wrong
<Box sx={{ color: '#4CAF50' }}>
```

### 3. Skeleton Loading States (REQUIRED)
Use MUI Skeleton for all loading states. Match content shape/size (zero layout shift). Variants: `circular`, `rectangular`, `text`.

**Required:** Player list, field view, dashboard, draft room, profile/team loading.

```typescript
<Skeleton variant="circular" width={60} height={60} />
<Skeleton variant="text" width="80%" />
```

### 4. Shared Validation (REQUIRED)
Use Zod schemas from `@spectatr/shared-types`. Validation runs on both frontend (UX) and backend (security).

```typescript
import { validateSquad } from '@spectatr/shared-types';
const result = validateSquad(squadData);
```

### 5. Type Safety (REQUIRED)
Strict TypeScript. No `any` types (use `unknown` if needed). Explicit interfaces and return types. Type inference from Zod schemas.

```typescript
// ✅ Correct
function getPlayer(id: number): Player | null { }

// ❌ Wrong
function getPlayer(id: any): any { }
```

### 6. Database Migrations (REQUIRED)
All database schema changes must be done with Prisma migrations.

```typescript
// ✅ Correct (schema change + migration)
// 1) Update prisma/schema.prisma
// 2) npm run db:migrate

// ❌ Wrong (bypasses migrations)
// npm run db:push
```

## Component Patterns

**Dialog:** MUI Dialog with `open`/`onClose`, IconButton close (see `SettingsDialog`)

**Drawer:** Temporary MUI Drawer, Zustand/useState management, icon menu

**Layout:** Fixed AppBar + Container maxWidth="lg" + Card/CardContent

## State Management

### Feature-Based Zustand Stores
One store per feature/page combining data + UI state. Co-located for performance.

```typescript
export const useMyTeamStore = create<MyTeamState>()(
  persist((set) => ({
    selectedPlayers: [], // data
    activeTab: 'LIST',   // UI
    addPlayer: (player) => set(...),
  }), { name: 'feature-name' })
);
```

### TanStack Query
For auth, player data, live scores, league/team data.

### Local State
Use `useState` for dialog open/close, temp inputs, UI toggles.

## File Organization

```
src/
  components/      # PlayerSlot/, EmptySlot/, SettingsDialog.tsx, index.ts
  features/        # players/, squad/
  pages/           # DashboardPage, MyTeamPage, index.ts
  stores/          # myTeamStore.ts, index.ts
  theme/           # MUI theme system
  config/          # Configuration files
  mocks/           # Mock data
```

**Barrel Exports:** Use `index.ts` to export all from directory: `import { PlayerSlot } from '@/components'`

## Coding Standards

**TypeScript:** Strict typing, no `any`, explicit return types, Zod schema type inference

**Pure Functions:** Business logic and validation as pure, deterministic, testable functions

**Responsive:** Mobile-first, MUI breakpoints `theme.breakpoints.up('md')`

**Accessibility:** Semantic HTML, ARIA labels, keyboard navigation

**State Export/Import:** Support for testing/debugging:
```typescript
window.exportState();               // Downloads JSON
window.importState(stateObject);
window.saveStateSlot('scenario');
```

## Sport-Agnostic Development (CRITICAL)

Design for multiple sports. Field layouts are JSON-configured, positions vary by sport, squad sizes differ. Avoid hardcoding rugby-specific logic.

```typescript
// ✅ Correct
const positions = sportConfig.positions;

// ❌ Wrong
const positions = ['hooker', 'prop', 'lock'];
```

## Git Workflow

**Branches:** `main` (production), `develop` (integration), `feature/FSA-123-desc`, `bugfix/FSA-456-desc`

**Commits:** Descriptive messages, reference Jira ticket: `FSA-123: Add filter panel`

**Pull Requests:** Link Jira ticket, describe changes, include screenshots for UI, request review

## Code Review Checklist

- [ ] MUI-only (no custom CSS frameworks)
- [ ] Theme tokens for colors/typography
- [ ] Skeleton loading states
- [ ] TypeScript strict (no `any`)
- [ ] Zod validation from shared-types
- [ ] Component patterns followed
- [ ] Feature-based store if needed
- [ ] Responsive (mobile/desktop tested)
- [ ] No console.log
- [ ] Accessibility checks passed
- [ ] Comments on complex logic
- [ ] Documentation updated

## Documentation

**Code Comments:** JSDoc for public functions/components. Explain WHY, not WHAT.

**README Updates:** Keep installation/setup current, document env vars/config.

**Plan Documents:** Use `.github/plan-template.md`, archive completed plans in `.github/plans/`.

## Questions?

- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
- [PRODUCT.md](PRODUCT.md) - Product requirements
- [.github/copilot-instructions/mui.md](.github/copilot-instructions/mui.md) - MUI guidelines
- Team chat or Jira ticket

---

**Remember:** Follow existing patterns. When in doubt, consistency > cleverness.
