# Implementation Plan: Configure Vitest for Unit & Integration Testing

** ticket:** FSA-7 - Configure Vitest for Unit & Integration Testing

Add a dedicated Vitest project for unit tests alongside the existing Storybook test runner, then systematically test pure functions (validation, calculations) and store logic to complement component-level story tests.

** All code must keep to constraints in C:\Users\CraigJackson\source\repos\craigj\fantasy-union\variable-theme\.github\copilot-instructions.md **

## Architecture and Design

### High-Level Architecture

**Current State:**
- Vitest installed (v4.0.18) with one test project for Storybook integration tests
- Uses `@storybook/addon-vitest/vitest-plugin` for component testing
- Browser testing via Playwright for Storybook stories
- No traditional unit tests (`.test.ts` or `.spec.ts` files)

**Target State:**
- Two Vitest test projects running in parallel:
  1. **Storybook Project** (existing) - Component tests via stories
  2. **Unit Project** (new) - Fast unit/integration tests for pure functions and store logic
- Test coverage reporting with V8 provider
- Testing Library integration for React component integration tests
- Separate test scripts for different test types (unit, storybook, all, coverage)

**Testing Strategy:**
- **Unit Tests** (Vitest + jsdom) - Pure functions, calculations, utilities
- **Integration Tests** (Vitest + Testing Library) - Store actions, validation integration
- **Component Tests** (Storybook Test Runner) - Visual rendering, interactions, accessibility
- **E2E Tests** (Playwright - future) - Complete user workflows

### Test Project Breakdown

**1. Unit Test Project** (new)
- Environment: jsdom (faster than real browser for non-visual tests)
- Test pattern: `**/*.{test,spec}.{ts,tsx}`
- Setup: Custom matchers from `@testing-library/jest-dom`
- Coverage: V8 provider with text, JSON, HTML reporters
- Excludes: `.stories.tsx`, `.d.ts`, `mocks/`

**2. Storybook Test Project** (existing)
- Environment: Browser (Chromium via Playwright)
- Test pattern: Storybook stories
- Setup: `.storybook/vitest.setup.ts`
- Coverage: Component interaction and accessibility

### Data Model

**Test File Structure:**
```typescript
// Unit test for pure function
describe('validateSquad', () => {
  it('should validate correct squad', () => {
    const result = validateSquad(validSquadData);
    expect(result.success).toBe(true);
  });
  
  it('should reject over-budget squad', () => {
    const result = validateSquad(overBudgetSquad);
    expect(result.success).toBe(false);
    expect(result.errors).toContain('BUDGET_EXCEEDED');
  });
});

// Integration test for store
describe('myTeamStore', () => {
  it('should add player to empty slot', () => {
    const store = useMyTeamStore.getState();
    const player = mockPlayers[0];
    
    store.addPlayer(player);
    
    expect(store.isPlayerSelected(player.id)).toBe(true);
    expect(store.totalCost).toBe(player.cost);
  });
});
```

## State Management

No state management needed for this configuration task. Tests themselves will test state management logic.

## Validation

No new validation schemas needed. This plan tests existing validation logic.

## Theming

Not applicable to test configuration.

## Tasks

### Setup

- [x] Research current Vitest configuration
- [x] Identify pure functions needing unit tests
- [x] Identify store logic needing integration tests
- [x] Create implementation plan

### Install Dependencies

- [x] Install `@testing-library/react` for component integration tests
- [x] Install `jsdom` for DOM environment in unit tests
- [x] Verify `@testing-library/jest-dom` is available (already bundled with Storybook)

### Configure Vitest

- [x] Create `src/test/setup.ts` with global test setup
  - Import `@testing-library/jest-dom/vitest` for custom matchers
  - Add any global mocks or utilities
  - Configure cleanup behavior

- [x] Update `vite.config.ts` to add 'unit' test project
  - Set environment to 'jsdom'
  - Configure test patterns
  - Set up coverage reporting
  - Add setupFiles reference

- [x] Add test scripts to `package.json`
  - `test` - Run unit tests in watch mode
  - `test:unit` - Run unit tests once
  - `test:storybook` - Run Storybook tests (existing)
  - `test:all` - Run both unit and Storybook tests
  - `test:coverage` - Generate coverage report

### Shared-Types Unit Tests (Keep to sport agnostic constraints)

- [x] Create `packages/shared-types/src/validation/squad-validator.test.ts`
  - Test `validateSquad` with valid squad (correct positions from config)
  - Test budget validation (over cap, under cap, exact cap)
  - Test position requirements (missing positions, too many, too few)
  - Test squad limit validation (max players from same team)
  - Test edge cases (empty squad, null values, invalid positions)

- [x] Create `packages/shared-types/src/config/sport-squad-config.test.ts`
  - Test `getSportConfig` returns correct config for 'rugby-union'
  - Test throws error for unknown sport type
  - Test `getPositionRequirement` returns correct min/max
  - Test position requirement for invalid position returns undefined

- [x] Create `packages/shared-types/src/schemas/player.schema.test.ts`
  - Test PlayerSchema parsing with valid data
  - Test PlayerSchema rejects invalid data (missing fields, wrong types)
  - Test PlayerStatsSchema parsing

- [x] Create `packages/shared-types/src/schemas/league.schema.test.ts`
  - Test LeagueRulesSchema with various rule combinations
  - Test DraftSettingsSchema parsing

### Frontend Utility Tests

- [x] Create `packages/ui/src/mocks/playerData.test.ts` (25 tests)
  - Test `getSquadById` finds correct squad
  - Test `getSquadById` returns undefined for invalid ID
  - Test `getSquadName` returns correct name
  - Test `getSquadAbbreviation` returns correct abbreviation
  - Test `getPlayerProfileImage` formats path correctly
  - Test `getPlayerPitchImage` formats path correctly
  - Test `getPositionDisplayName` converts position to label
  - Test `findMaxPlayerCost` returns highest cost from dataset

- [x] Create `packages/ui/src/config/fieldLayouts.test.ts` (34 tests)
  - Test `getAllPositions` flattens all positions from rows
  - Test `countTotalPositions` returns correct count (15 for rugby)
  - Test `getPositionById` finds correct position
  - Test `getPositionById` returns undefined for invalid ID
  - Test `getPositionsByType` filters positions correctly

- [x] Create `packages/ui/src/config/validationErrors.test.ts` (47 tests)
  - Test `formatValidationError` replaces placeholders with values
  - Test `parseErrorType` extracts error type from message
  - Test `getReadableError` converts technical error to user-friendly message

### Store Unit Tests

- [x] Create `packages/ui/src/stores/myTeamStore.test.ts` (45 tests)

**Pure Helper Functions:**
- [x] Test `createEmptySlots` creates correct number of slots
- [x] Test `createEmptySlots` assigns correct position IDs
- [x] Test `findEmptySlot` finds first empty slot for position
- [x] Test `findEmptySlot` returns null when no empty slots
- [x] Test `calculateTotalCost` sums player costs correctly
- [x] Test `calculateTotalCost` handles empty slots (null)
- [x] Test `isPlayerInSlots` returns true when player exists
- [x] Test `isPlayerInSlots` returns false when player doesn't exist
- [x] Test `getSelectedPlayers` returns only non-null players
- [x] Test `getSelectedPlayers` returns empty array when no players
- [x] Test `findSlotIdForPlayer` returns correct slot ID
- [x] Test `findSlotIdForPlayer` returns null when player not found

**Store Actions (Integration):**
- [x] Test `addPlayer` adds player to correct position slot
- [x] Test `addPlayer` updates totalCost correctly
- [x] Test `addPlayer` handles player already selected
- [x] Test `removePlayer` removes player from slot
- [x] Test `removePlayer` updates totalCost correctly
- [x] Test `removePlayer` doesn't error when player not found
- [x] Test `clearSquad` removes all players and resets cost
- [x] Test `setFilters` updates filter state
- [x] Test `setActiveTab` switches between LIST and SQUAD views

### Integration Tests (Store + Validation)

- [x] Create integration test suite in `myTeamStore.test.ts` (5 tests)
  - [x] Test building valid squad within budget
  - [x] Test budget cap enforcement
  - [x] Test squad limit tracking
  - [x] Test totalCost consistency across operations
  - [x] Test duplicate player prevention

### Testing

- [ ] Run all unit tests and verify they pass
- [ ] Generate coverage report and review coverage percentages
  -x] Run all unit tests and verify they pass ✅ **240 tests passing**
  - Shared-types: 89 tests
  - Frontend utilities: 106 tests  
  - Store tests: 45 tests
- [x] Generate coverage report and review coverage percentages
  - ✅ Shared-types validation: High coverage achieved
  - ✅ Stores: All actions and helpers tested
  - ✅ Utilities: Comprehensive test coverage
- [x] Run Storybook tests to ensure no regression (existing stories still work)
- [xIntegration

- [x] Update `.github/copilot-instructions.md` to reference Vitest for unit tests (be concise)
- [x] Update `packages/ui/TESTING.md` to document (be concise):
  - Unit test strategy
  - How to run different test types
  - Test file naming conventions
  - Example test patterns
- [x] Add CI workflow examples for running tests (`.github/workflows/test.yml.example`)

### Polish

- [x] Code review checklist verification
- [x] Remove any console.log statements from tests
- [x] Add JSDoc comments to test helper functions
- [x] Ensure all tests have descriptive names
- [x] Group related tests with describe blocks

## Open Questions

1. **✅ RESOLVED: Use jsdom for unit tests**
   - Decision: jsdom (safer, more compatible, industry standard)
   - Rationale: Better compatibility with React Testing Library, more stable, widely adopted

2. **✅ RESOLVED: Coverage thresholds for CI**
   - Decision: Different thresholds per package/directory based on criticality
   - Thresholds:
     - 80%+ for shared-types validation (critical business logic)
     - 70%+ for stores (state management)
     - 60%+ for utilities (helper functions)

3. **✅ RESOLVED: Unit tests run before Storybook tests in CI**
   - Decision: Sequential execution with unit tests first
   - Rationale: Unit tests are faster (seconds) and catch issues early, allowing fast feedback before slower Storybook tests (minutes) run
   - CI Pipeline: Unit tests → Storybook tests (fail fast on unit test failures)

## Testing Strategy

### Unit Tests (Vitest + jsdom)

**Shared-Types Pure Functions:**
- `validateSquad` - All validation paths (success, budget, positions, squad limits)
- `isValidPosition` - Valid and invalid position strings
- `validateSquadLimit` - Edge cases around team limits
- `getSportSquadConfig` - Config retrieval and error cases
- `getPositionRequirement` - Position lookup logic

**Frontend Utilities:**
- `playerData.ts` - All lookup and formatting functions
- `fieldLayouts.ts` - Position flattening, counting, filtering
- `validationErrors.ts` - Error formatting and parsing

**Store Helpers:**
- `createEmptySlots` - Slot initialization logic
- `findEmptySlot` - Slot finding algorithm
- `calculateTotalCost` - Cost calculation
- `getSelectedPlayers` - Player filtering
- All other pure helper functions

### Integration Tests (Vitest + Testing Library)

**Store Actions:**
- `addPlayer` - Adding players with validation
- `removePlayer` - Removing players and updating state
- `movePlayer` - Swapping players between slots
- Filter and tab management
- Export/import state functionality

**Validation Integration:**
- Squad completion validation
- Budget cap enforcement
- Squad limit enforcement
- Position matching with league rules

### Component Tests (Storybook - Already Configured)

**All components have stories:**
- PlayerListItem (10+ stories)
- PlayerSlot (8+ stories)
- EmptySlot (3 stories)
- FieldView (5 stories)
- FilterPanel (10 stories)
- All stories include interaction tests
x] **Vitest Configuration:** Two test projects running in parallel (unit + storybook) ✅
- [x] **Dependencies:** All testing dependencies installed (@testing-library/react, jsdom) ✅
- [x] **Test Setup:** Setup file with jest-dom matchers and globals ✅
- [x] **Test Scripts:** All test scripts added to package.json and working ✅
- [x] **Shared-Types Tests:** Validation and config functions have 80%+ coverage ✅ (89 tests)
- [x] **Frontend Utility Tests:** Pure functions have 60%+ coverage ✅ (106 tests)
- [x] **Store Tests:** Helper functions and actions have 70%+ coverage ✅ (45 tests)
- [x] **Integration Tests:** Store + validation integration tested ✅
- [x] **All Tests Passing:** No failing tests, clean test output ✅ **240/240 passing**
- [x] **Coverage Reports:** Coverage reports generated with V8 ✅
- [x] **Documentation:** TESTING.md updated with unit test strategy ✅
- [x] **CI Ready:** Tests can run in CI environment ✅
- [x] **No Regression:** Storybook tests still passing after changes ✅
- [x] **Fast Execution:** Unit tests complete in under 5 seconds ✅ (~1.5s total)egy
- [ ] **CI Ready:** Tests can run in CI environment
- [ ] **No Regression:** Storybook tests still passing after changes
- [ ] **Fast Execution:** Unit tests complete in under 5 seconds

## Notes

### Test File Naming Convention
- Use `.test.ts` or `.test.tsx` for test files
- Co-locate tests with source files or in `__tests__` directory
- Pattern: `{module}.test.ts` (e.g., `squad-validator.test.ts`)

### Vitest Projects Pattern
```typescript
test: {
  projects: [
    { 
      name: 'storybook', 
      // Existing Storybook configuration
    },
    { 
      name: 'unit',
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        include: ['**/*.{test,spec}.{ts,tsx}'],
        coverage: { /* config */ }
      }
    }
  ]
}
```

### Running Tests
```bash
npm test                 # Watch mode (unit tests only)
npm run test:unit        # Run unit tests once
npm run test:storybook   # Run Storybook tests
npm run test:all         # Run all test projects
npm run test:coverage    # Generate coverage report
```

### Coverage Configuration
- Provider: V8 (faster than istanbul)
- Reporters: text (console), json (CI), html (local viewing)
- Include: `src/**/*.{ts,tsx}`
- Exclude: `**/*.stories.tsx`, `**/*.d.ts`, `**/mocks/**`

### Related Documentation
- [TESTING.md](../packages/ui/TESTING.md) - Current Storybook testing guide
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Development guidelines

### Jira Ticket
FSA-10 - Configure Vitest for unit and integration testing
