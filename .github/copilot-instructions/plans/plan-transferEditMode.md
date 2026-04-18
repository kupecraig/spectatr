---
title: Transfer Edit Mode with Confirmation Flow
version: 1.0
date_created: 2026-04-19
last_updated: 2026-04-19
---
# Implementation Plan: Transfer Edit Mode with Confirmation Flow

Rework the My Team save flow to introduce an explicit edit mode. A "Make Transfers" button in the AppBar toggles to "Save Transfers" when editing. Switching leagues with unsaved changes triggers a warning dialog. Saving shows a confirmation dialog with transfer summary before persisting.

**GitHub Issue:** #23
**Depends on:** PR #22 (My Team: Save Squad) must be merged first.

## Architecture and Design

### High-Level Architecture

- **No new API endpoints** — uses existing `teams.saveSquad` mutation from PR #22
- **No new Zod schemas** — existing `saveSquadInputSchema` is sufficient
- **Store changes only** — add edit-mode state + saved-slot snapshot to `myTeamStore`
- **Three new UI components** — `TransferButton`, `ConfirmTransfersDialog`, `UnsavedChangesDialog`

### Data Flow

```
User clicks "Make Transfers"
  → myTeamStore.enterEditMode() — snapshots current slots as savedSlots
  → isEditing = true, button shows "Save Transfers"

User adds/removes players (existing flow, unchanged)
  → isDirty derived by comparing slots vs savedSlots

User clicks "Save Transfers"
  → ConfirmTransfersDialog opens — computes diff (adds/removes/budget delta) from slots vs savedSlots
  → User confirms → useSaveSquadMutation fires
  → On success → myTeamStore: savedSlots = current slots, isEditing = false
  → Snackbar feedback

User switches league while isDirty
  → UnsavedChangesDialog opens
  → "Discard" → setLeagueId (existing reset behavior)
  → "Cancel" → close dialog, no action
```

### Integration Points

- `MyTeamPage` AppBar — hosts `TransferButton` and both dialogs
- `LeaguePicker` — delegates league-switch decision to parent (MyTeamPage) when dirty
- `SquadView` — save button and Snackbar removed (moved to page level)
- `myTeamStore` — new state fields and actions

## Component Breakdown

**Main Components:**
- `TransferButton` — MUI Button that renders "Make Transfers" (outlined) or "Save Transfers" (contained) based on `isEditing`. Shows `CircularProgress` when save mutation is pending. Hidden when no league selected.
- `ConfirmTransfersDialog` — MUI Dialog showing transfer summary (players in, players out, budget impact) with Confirm and Cancel actions.
- `UnsavedChangesDialog` — MUI Dialog with warning text and Discard / Cancel actions.

**Modified Components:**
- `MyTeamPage` — orchestrates dialogs, hosts TransferButton in AppBar, owns Snackbar
- `LeaguePicker` — accepts `onBeforeChange` callback prop; calls it instead of directly calling `setLeagueId` when parent provides it
- `SquadView` — remove save button, Snackbar, and related state

## State Management

### Zustand Store Changes (`myTeamStore`)

**New State:**
```typescript
// Added to MyTeamState interface
isEditing: boolean;
savedSlots: PlayerSlots; // Snapshot of slots at last save/load

// Added actions
enterEditMode: () => void;
exitEditMode: () => void;  // Restores savedSlots, sets isEditing false
commitSave: () => void;    // Updates savedSlots to current slots, sets isEditing false

// Derived (implemented as getter function, not stored)
getIsDirty: () => boolean; // Compares slots vs savedSlots
getTransferDiff: () => { added: Player[]; removed: Player[] };
```

**Behavior:**
- `enterEditMode()` — sets `isEditing = true`, snapshots `savedSlots = { ...slots }`
- `exitEditMode()` — restores `slots = savedSlots`, resets `totalCost` from savedSlots, sets `isEditing = false`
- `commitSave()` — sets `savedSlots = { ...slots }`, sets `isEditing = false`
- `loadTeam()` (existing) — also sets `savedSlots` to the loaded state (so isDirty starts false)
- `setLeagueId()` (existing, unchanged) — already resets slots; also resets `savedSlots` and `isEditing`
- `addPlayer()` / `removePlayer()` (existing) — if `isEditing` is false, implicitly call `enterEditMode()` first (captures snapshot before the change)
- `getIsDirty()` — compares each slot in `slots` vs `savedSlots` by player ID (null vs non-null, or different player IDs)
- `getTransferDiff()` — returns `{ added: players in slots but not savedSlots, removed: players in savedSlots but not slots }`

**Persistence:** `savedSlots` should NOT be persisted to localStorage (it's session-level state derived from the server). Add `savedSlots` and `isEditing` to the persist `partialize` exclusion list if one exists, or to a manual exclusion.

### TanStack Query

No new hooks. Uses existing `useSaveSquadMutation` from `useTeamsQuery.ts`.

## Theming

### MUI Components Used

- `Button` — TransferButton (outlined for "Make Transfers", contained for "Save Transfers")
- `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions` — both dialogs
- `List`, `ListItem`, `ListItemAvatar`, `Avatar`, `ListItemText` — transfer summary player list in ConfirmTransfersDialog
- `Typography` — dialog text, budget summary
- `Chip` — "IN" / "OUT" indicators in transfer summary
- `Divider` — separating added/removed sections
- `CircularProgress` — save-in-progress state on TransferButton
- `Snackbar`, `Alert` — success/error feedback (moved from SquadView to MyTeamPage)

### Theme Tokens

- Button colors: `theme.palette.primary` (Save Transfers), `theme.palette.primary` outlined (Make Transfers)
- Added players: `theme.palette.success.main` for "IN" chip
- Removed players: `theme.palette.error.main` for "OUT" chip
- Budget positive delta: `theme.palette.success.main`
- Budget negative delta: `theme.palette.error.main`
- Dialog spacing: `theme.spacing(2)` padding
- Typography: `theme.typography.body1` for dialog text, `theme.typography.h6` for dialog titles, `theme.typography.subtitle2` for section headers

## Tasks

### Store Changes
- [ ] Add `isEditing`, `savedSlots` to `myTeamStore` state
- [ ] Implement `enterEditMode()`, `exitEditMode()`, `commitSave()`
- [ ] Implement `getIsDirty()` and `getTransferDiff()` derived getters
- [ ] Update `loadTeam()` to set `savedSlots`
- [ ] Update `setLeagueId()` to reset `savedSlots` and `isEditing`
- [ ] Update `addPlayer()` / `removePlayer()` to implicitly enter edit mode
- [ ] Exclude `savedSlots` and `isEditing` from persist

### New Components
- [ ] Create `TransferButton` — Make Transfers / Save Transfers toggle
- [ ] Create `ConfirmTransfersDialog` — transfer summary with confirm/cancel
- [ ] Create `UnsavedChangesDialog` — warning with discard/cancel

### Page Integration
- [ ] Add `TransferButton` to `MyTeamPage` AppBar (next to `LeaguePicker`)
- [ ] Wire `ConfirmTransfersDialog` open/close in `MyTeamPage`
- [ ] Wire `UnsavedChangesDialog` open/close in `MyTeamPage`
- [ ] Move Snackbar from `SquadView` to `MyTeamPage`
- [ ] Update `LeaguePicker` to accept `onBeforeChange` prop
- [ ] Remove save button and Snackbar from `SquadView`

### Storybook Stories
- [ ] `TransferButton.stories.tsx` — ViewMode, EditMode, Saving, NoLeague
- [ ] `ConfirmTransfersDialog.stories.tsx` — Default, NoChanges, OnlyAdds, OnlyRemoves, interaction test
- [ ] `UnsavedChangesDialog.stories.tsx` — Default, interaction tests for Discard and Cancel
- [ ] Update `LeaguePicker.stories.tsx` — story for league switch with unsaved changes

### Unit Tests
- [ ] `isDirty` returns false when slots match saved snapshot
- [ ] `isDirty` returns true after add/remove player
- [ ] `enterEditMode()` sets isEditing and snapshots slots
- [ ] `exitEditMode()` restores savedSlots
- [ ] `commitSave()` updates savedSlots and resets isEditing
- [ ] `loadTeam()` updates savedSlots
- [ ] `getTransferDiff()` correctly computes added/removed players
- [ ] Implicit edit mode entry on addPlayer/removePlayer

### Export and Cleanup
- [ ] Export new components from `features/squad/index.ts`
- [ ] Update `packages/ui/TESTING.md` coverage list

## Open Questions

1. **Implicit vs explicit edit mode entry?**
   - Current plan: addPlayer/removePlayer implicitly enter edit mode (captures snapshot before change). This means users don't *have* to click "Make Transfers" first — any squad change triggers it.
   - Alternative: require explicit click on "Make Transfers" before changes are allowed.
   - **Decision:** Implicit for now (per discussion — edit mode gating is out of scope for this iteration).

2. **LeaguePicker callback pattern?**
   - Option A: `LeaguePicker` accepts `onBeforeChange(newLeagueId): boolean | Promise<boolean>` — returns false to block the change.
   - Option B: `LeaguePicker` always calls `onLeagueChange(newLeagueId)` and the parent decides whether to call `setLeagueId` or show a dialog.
   - **Recommendation:** Option B — simpler, keeps dialog ownership in `MyTeamPage`.

3. **Snackbar ownership?**
   - Moving Snackbar to `MyTeamPage` means it can show feedback for any action (save, error, future actions).
   - Consider extracting a small `useSnackbar` hook or keeping it as local state in `MyTeamPage`.
   - **Recommendation:** Local state in `MyTeamPage` for now; extract hook if more pages need it.

## Testing Strategy

### Unit Tests

**Store logic (`myTeamStore.test.ts`):**
- All new actions (enterEditMode, exitEditMode, commitSave)
- isDirty derivation (multiple scenarios: no changes, add, remove, add then remove same player)
- getTransferDiff accuracy
- Integration: loadTeam resets dirty state, setLeagueId resets everything

### Storybook Component Tests

- `TransferButton`: renders correct label/variant per state, click fires callback
- `ConfirmTransfersDialog`: renders player lists, budget delta, confirm fires onConfirm
- `UnsavedChangesDialog`: Discard fires onDiscard, Cancel fires onClose

### Integration (Manual)

- Full flow: select league → load team → make changes → save → verify reset
- Full flow: select league → make changes → switch league → verify dialog → discard → verify new league loads
- Edge case: make changes → save fails → verify error Snackbar, edit mode preserved

## Success Criteria

- [ ] **Functionality:** All acceptance criteria from issue #23 met
- [ ] **MUI Only:** No custom CSS, only MUI components and `sx` prop
- [ ] **Theme System:** All colors/typography from theme tokens
- [ ] **Type Safety:** No `any` types, strict TypeScript
- [ ] **Tests:** All unit tests and Storybook interaction tests passing
- [ ] **Sport Agnostic:** No hardcoded position or sport-specific logic (uses `sportSquadConfig`)
- [ ] **Code Quality:** Follows CONTRIBUTING.md guidelines, no console.log

## Notes

- This builds directly on PR #22 infrastructure (teams router, saveSquad mutation, loadTeam store action)
- **Follow-up issue needed:** Transfers-per-round enforcement (transfer_log table, round-scoped counting, UI for remaining transfers). Once implemented, ConfirmTransfersDialog should display "X of Y free transfers used".
- **Future enhancement:** Edit mode gating — when not editing, field slot taps show player info instead of triggering add/remove.
