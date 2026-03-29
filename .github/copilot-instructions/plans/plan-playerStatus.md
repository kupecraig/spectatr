---
title: Add player status indicators and status filter
version: 1.0
date_created: 2026-03-29
last_updated: 2026-03-29
---
# Implementation Plan: Player Status Indicators and Status Filter

Player status (`injured`, `uncertain`, `benched`, etc.) is a first-class concept that is currently invisible and unvalidated in the UI. The `status` field on `Player` accepts any string (`z.string()`), the `PlayerStatus` enum lives in UI mock code rather than shared-types, and seed data sets every player to `"uncertain"`. This plan covers: canonising status values in `@spectatr/shared-types`, adding icon-only status indicators to `PlayerListItem`, a separate lock icon for `isLocked`, and a multi-select status filter in `FilterPanel`.

Related issue: [#3 Add player status indicators and status filter](https://github.com/kupecraig/spectatr/issues/3)

## Architecture and Design

### High-Level Architecture

**Data flow:**
```
playerStatusSchema (shared-types)
  → playerSchema.status (type-safe)
  → tRPC players.list (filter input)
  → myTeamStore.filters.statuses (UI state)
  → FilterPanel (multi-select)
  → PlayerListItem → PlayerStatusIcon (icon render)
```

No new component hierarchy layer needed — `PlayerStatusIcon` is a small inline component co-located in `features/players/`.

### Component Breakdown

**New:**
- `PlayerStatusIcon` (`packages/ui/src/features/players/PlayerStatusIcon.tsx`) — maps `PlayerStatus` → MUI icon + colour token. Returns `null` for `available`, `selected`, `not-selected`. Props: `{ status: PlayerStatus }`.

**Modified:**
- `PlayerListItem` — render `<PlayerStatusIcon status={player.status} />` and conditionally `<LockIcon />` in the chips row alongside the position and selection % chips
- `FilterPanel` — replace any existing single status Select with a `<Select multiple>` + `<Checkbox>` pattern driven by `playerStatusSchema.options`
- `myTeamStore` — `filters.status?: PlayerStatus` (single) → `filters.statuses: PlayerStatus[]` (array, default `[]`)

### Status → Icon Mapping

| Status | MUI Icon | Import | Colour token |
|--------|----------|--------|-------------|
| `uncertain` | `HelpOutline` | `@mui/icons-material/HelpOutline` | `theme.palette.warning.main` |
| `injured` | `Healing` | `@mui/icons-material/Healing` | `theme.palette.error.main` |
| `eliminated` | `Block` | `@mui/icons-material/Block` | `theme.palette.text.disabled` |
| `benched` | `EventSeat` | `@mui/icons-material/EventSeat` | `theme.palette.text.secondary` |
| `isLocked` | `Lock` | `@mui/icons-material/Lock` | `theme.palette.text.secondary` |
| `available` / `selected` / `not-selected` | *(none)* | — | — |

All icons rendered at `fontSize: 'small'` (16px) to stay consistent with the chip row height.

## Data Model

### Zod Schema (shared-types)

```typescript
// packages/shared-types/src/schemas/player.schema.ts

export const playerStatusSchema = z.enum([
  'available',
  'selected',
  'not-selected',
  'uncertain',
  'injured',
  'eliminated',
  'benched',
]);

export type PlayerStatus = z.infer<typeof playerStatusSchema>;

// playerSchema.status changes from:
//   status: z.string(),
// to:
//   status: playerStatusSchema,
```

### Status Semantics

| Value | Meaning |
|-------|---------|
| `available` | Eligible to play, no concerns |
| `selected` | Named in real-world squad for the round |
| `not-selected` | Not named in real-world squad this round |
| `uncertain` | Fitness doubt — may or may not play |
| `injured` | Confirmed injury — unlikely to play |
| `eliminated` | Team knocked out of tournament |
| `benched` | Named in squad but not starting |

`not-selected` and `available` are distinct and must not be merged.

## State Management

### Zustand Store (`myTeamStore`) — filters change

```typescript
// Before
interface Filters {
  status?: PlayerStatus;
  // ...other filters
}

// After
interface Filters {
  statuses: PlayerStatus[];  // default []
  // ...other filters
}
```

Clearing to an empty array = no status filter applied (return all players).

### TanStack Query

No new hooks. The existing `usePlayersQuery` hook passes `filters.statuses` to the `players.list` tRPC call when the array is non-empty:

```typescript
statuses: filters.statuses.length > 0 ? filters.statuses : undefined
```

## Validation

No new validation error messages needed — status is a filter/display concern, not a squad composition validation concern. Injured/uncertain players remain selectable without warnings.

## Theming

### MUI Components

- `PlayerStatusIcon` — renders a single MUI icon from `@mui/icons-material` with `sx={{ color: ..., fontSize: 'small' }}`
- `FilterPanel` status select — `<Select multiple>` + `<MenuItem>` with `<Checkbox>` + `<ListItemText>` (standard MUI multi-select pattern)
- `Lock` icon — `<LockIcon sx={{ color: 'text.secondary', fontSize: 'small' }} />`

### Theme Tokens Used

```typescript
// All icon colours use theme tokens — no hardcoded hex values
theme.palette.warning.main    // uncertain
theme.palette.error.main      // injured
theme.palette.text.disabled   // eliminated
theme.palette.text.secondary  // benched, locked
```

### FilterPanel Multi-Select Pattern

```tsx
<Select
  multiple
  value={filters.statuses}
  onChange={(e) => setFilters({ statuses: e.target.value as PlayerStatus[] })}
  renderValue={(selected) =>
    selected.length === 0 ? 'All statuses' : selected.join(', ')
  }
  displayEmpty
  size="small"
>
  {playerStatusSchema.options.map((s) => (
    <MenuItem key={s} value={s}>
      <Checkbox checked={filters.statuses.includes(s)} size="small" />
      <ListItemText primary={s} />
    </MenuItem>
  ))}
</Select>
```

## Tasks

### Shared Types
- [ ] Add `playerStatusSchema` + `PlayerStatus` to `packages/shared-types/src/schemas/player.schema.ts`
- [ ] Update `playerSchema.status` from `z.string()` to `playerStatusSchema`
- [ ] Export `playerStatusSchema` and `PlayerStatus` from `packages/shared-types/src/schemas/index.ts`
- [ ] Write unit tests in `packages/shared-types/src/schemas/player.schema.test.ts` (see Testing Strategy)

### UI — Mocks / Types
- [ ] Remove `PlayerStatus` enum from `packages/ui/src/mocks/playerData.ts`
- [ ] Import `PlayerStatus` from `@spectatr/shared-types` in `playerData.ts` and any other files that referenced the local enum

### UI — Components
- [ ] Build `PlayerStatusIcon` component (`packages/ui/src/features/players/PlayerStatusIcon.tsx`) with the 5-status icon map (returns `null` for no-icon statuses)
- [ ] Update `PlayerListItem` to render `<PlayerStatusIcon status={player.status} />` in the chips row
- [ ] Update `PlayerListItem` to render `<LockIcon />` conditionally when `player.isLocked === true`

### UI — Store
- [ ] Update `myTeamStore` filters: rename `status?: PlayerStatus` to `statuses: PlayerStatus[]` with default `[]`
- [ ] Update any store selectors or derived state that referenced the old `status` filter field

### UI — FilterPanel
- [ ] Replace status filter in `FilterPanel` with `<Select multiple>` + `<Checkbox>` pattern
- [ ] Drive options from `playerStatusSchema.options` (sport-agnostic)
- [ ] Update active filter count logic to treat `statuses.length > 0` as an active filter

### Backend
- [ ] Add `statuses: z.array(playerStatusSchema).optional()` to `players.list` tRPC input
- [ ] Add Prisma where clause: `...(input.statuses?.length && { status: { in: input.statuses } })`

### Seed Data
- [ ] Update `packages/server/src/scripts/seed.ts` to override `status` at load time with a deterministic distribution based on player index (e.g. modulo logic): ~70% `available`, ~20% `selected`, ~5% `uncertain`, ~5% `injured`
- [ ] Do not edit `data/trc-2025/players.json` or `data/super-2026/players.json` record-by-record — apply the distribution in `seed.ts` to keep the diff manageable

### Stories
- [ ] Update `PlayerStatuses` story in `PlayerListItem.stories.tsx` to render one row per canonical status with correct icon
- [ ] Add `LockedPlayer` story with `isLocked: true`
- [ ] Add `LockedAndInjured` story with `isLocked: true` and `status: 'injured'`
- [ ] Add `StatusFilterMultiSelect` story in `FilterPanel.stories.tsx` showing multiple values selected

## Open Questions

1. **`not-selected` hyphen in enum** — Zod enums with hyphens are valid but mean TypeScript consumers must use string literals (`'not-selected'`) rather than dot notation. If a future enum object is needed for switch statements, consider `NOT_SELECTED = 'not-selected'` in a companion const. The agent should keep the hyphenated string as the canonical DB value to avoid a migration.

2. **Seed data distribution approach** — The recommended approach is to apply the status distribution in `seed.ts` programmatically rather than editing the JSON files. If the JSON files are the authoritative source for other tooling (e.g. DB resets that bypass seed.ts), the JSON files should be updated instead. The agent should check whether `data/*/players.json` is read anywhere else in the codebase before deciding.

3. **`usePlayersQuery` hook location** — The research found the `players.list` tRPC call but didn't confirm the exact hook file name. The agent should locate the hook (likely `packages/ui/src/hooks/api/usePlayersQuery.ts` or similar) and verify the filter params are passed through correctly before modifying `FilterPanel`.

## Testing Strategy

### Unit Tests (`packages/shared-types/src/schemas/player.schema.test.ts`)

```typescript
describe('playerStatusSchema', () => {
  it('accepts each canonical status value', () => {
    const values = ['available', 'selected', 'not-selected', 'uncertain', 'injured', 'eliminated', 'benched'];
    values.forEach(v => expect(() => playerStatusSchema.parse(v)).not.toThrow());
  });

  it('rejects unknown strings', () => {
    expect(() => playerStatusSchema.parse('fit')).toThrow();
    expect(() => playerStatusSchema.parse('doubt')).toThrow();
    expect(() => playerStatusSchema.parse('')).toThrow();
  });
});

describe('playerSchema', () => {
  it('parses a valid player with canonical status', () => {
    const result = playerSchema.parse({ ...validPlayerFixture, status: 'available' });
    expect(result.status).toBe('available');
  });

  it('throws when status is not in the enum', () => {
    expect(() => playerSchema.parse({ ...validPlayerFixture, status: 'fit' })).toThrow(ZodError);
  });
});
```

### Storybook Stories

| Story | File | What to verify |
|-------|------|----------------|
| `PlayerStatuses` (updated) | `PlayerListItem.stories.tsx` | All 7 statuses render correctly — injured shows red Healing icon, uncertain shows amber HelpOutline, others show no icon |
| `LockedPlayer` | `PlayerListItem.stories.tsx` | Lock icon visible, player still addable |
| `LockedAndInjured` | `PlayerListItem.stories.tsx` | Both Lock and Healing icons visible simultaneously |
| `StatusFilterMultiSelect` | `FilterPanel.stories.tsx` | Multi-select open with `uncertain` + `injured` checked |

### Integration Check

After implementation, manually verify:
- Switching tenant (`?tenant=super-2026`) still shows correct status icons (status values are sport-agnostic)
- Selecting `injured` in the status filter and confirming the player list narrows correctly via the tRPC call

## Success Criteria

- [ ] All 13 acceptance criteria checkboxes pass
- [ ] `playerStatusSchema` rejects unknown strings in unit tests
- [ ] `PlayerListItem` Storybook stories show correct icons for each status
- [ ] Multi-select filter correctly passes `statuses` array to the `players.list` tRPC endpoint
- [ ] No hardcoded hex colours in any new code
- [ ] No sport-specific logic — status values and icons are generic for soccer/cricket players too
- [ ] `PlayerStatus` is defined once (in shared-types) and imported everywhere else
