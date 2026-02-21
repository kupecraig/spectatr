# Testing Guide

## Overview

This project uses a multi-layered testing strategy:

1. **Unit Tests** (Vitest + jsdom) - Pure functions, utilities, store logic
2. **Component Tests** (Storybook) - Visual rendering, interactions, accessibility
3. **E2E Tests** (Future: Playwright) - Complete user workflows

## Running Tests

### Unit Tests (Fast)
```bash
npm test                 # Watch mode
npm run test:unit        # Run once
npm run test:coverage    # Generate coverage report
```

### Storybook Tests (Component)
```bash
# Start Storybook first in one terminal
npm run storybook

# Run tests in another terminal
npm run test-storybook
```

### All Tests
```bash
npm run test:all         # Run both unit and Storybook tests
```

### CI Mode
```bash
npm run test-storybook:ci  # Builds Storybook and runs tests
```

## Unit Testing Strategy

### What Gets Tested

**Shared-Types (Business Logic):**
- ✅ Validation functions (`validateSquad`, `validatePosition`)
- ✅ Sport config utilities
- ✅ Zod schema parsing

**Frontend Utilities:**
- ✅ Player data helpers (`getSquadById`, `getPositionDisplayName`)
- ✅ Field layout functions
- ✅ Validation error formatting

**Zustand Stores:**
- ✅ Pure helper functions
- ✅ Store actions and state updates
- ✅ Integration with validation logic

### Test File Naming

- Pattern: `{module}.test.ts` or `{module}.test.tsx`
- Co-located with source files
- Example: `squad-validator.test.ts` next to `squad-validator.ts`

### Example Unit Test

```typescript
import { describe, it, expect } from 'vitest';
import { validateSquad } from './squad-validator';
import { sportSquadConfig } from '../config/sport-squad-config';

describe('validateSquad', () => {
  it('should validate correct squad', () => {
    const validSquad = createValidSquadFromConfig();
    const result = validateSquad(validSquad);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should reject over-budget squad', () => {
    const expensiveSquad = createValidSquadFromConfig(10000000);
    const leagueRules = { priceCap: 42000000, priceCapEnabled: true };
    
    const result = validateSquad(expensiveSquad, sportSquadConfig, leagueRules);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Budget exceeded'))).toBe(true);
  });
});
```

## Storybook Component Testing

### What Gets Tested

1. **Rendering** - Each story renders without errors
2. **Snapshots** - Visual regression testing (optional)
3. **Accessibility** - Basic a11y checks via @storybook/addon-a11y
4. **Interactions** - Play functions that simulate user interactions

## Writing Testable Stories

### Basic Story (Auto-tested)
```typescript
export const Default: Story = {
  args: {
    label: 'Click me',
    onClick: fn(),
  },
};
```

### Story with Interaction Tests
```typescript
import { userEvent, within, expect } from '@storybook/test';

export const ClickInteraction: Story = {
  args: {
    label: 'Click me',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Find button and click it
    const button = canvas.getByRole('button');
    await userEvent.click(button);
    
    // Assert expected behavior
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  },
};
```

## Configuration Files

- **`.storybook/test-runner.ts`** - Test runner configuration
- **`playwright.config.ts`** - Playwright test configuration
- **`package.json`** - Test scripts

## Coverage

Stories provide excellent coverage for:
- ✅ Component rendering in different states
- ✅ Theme switching and responsive design
- ✅ User interactions (clicks, typing, navigation)
- ✅ Accessibility compliance

## Debugging Failed Tests

1. **Run in headed mode:**
   ```bash
   npm run test-storybook -- --headed
   ```

2. **Debug specific story:**
   ```bash
   npm run test-storybook -- --grep "StoryName"
   ```

3. **View test report:**
   - Open `playwright-report/index.html` after test run

## Best Practices

1. **Keep stories simple** - One concern per story
2. **Use play functions** for complex interactions
3. **Test different states** - Create stories for all component states
4. **Add accessibility parameters** - Use a11y addon parameters
5. **Mock data** - Use consistent mock data across stories

## Current Test Coverage

All components have stories:
- ✅ PlayerListItem - 10+ stories (all states, positions, statuses)
- ✅ PlayerSlot - 8+ stories (variants, positions, skeletons)
- ✅ EmptySlot - 3 stories (selected/unselected, formation layout)
- ✅ FieldView - 5 stories (empty/partial/full squads, loading)
- ✅ FilterPanel - 10 stories (all filter combinations)
- ✅ ThemeShowcase - Theme token validation

## Continuous Integration

In CI pipelines:
```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run Storybook tests
  run: npm run test-storybook:ci
```

## Learn More

- [Storybook Test Runner Docs](https://storybook.js.org/docs/writing-tests/test-runner)
- [Storybook Interactions](https://storybook.js.org/docs/writing-tests/interaction-testing)
- [Playwright Documentation](https://playwright.dev)
