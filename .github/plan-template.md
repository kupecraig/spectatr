---
title: [Short descriptive title]
version: 1.0
date_created: [YYYY-MM-DD]
last_updated: [YYYY-MM-DD]
---
# Implementation Plan: [Feature Name]

[Brief description of the requirements and goals of the feature. Include context about why this feature is needed and what problems it solves.]

## Architecture and Design

### High-Level Architecture

[Describe the overall architecture and design considerations for this feature:]

- Component structure and hierarchy
- Data flow through the system
- Integration points with existing code
- State management approach (Zustand, TanStack Query, local state)
- API endpoints (if applicable)

### Component Breakdown

**Main Components:**
- `ComponentName` - Description and responsibility
- `AnotherComponent` - Description and responsibility

**Supporting Components:**
- `HelperComponent` - Description
- `SkeletonComponent` - Loading state variant

### Data Model

[Define the TypeScript interfaces and Zod schemas needed:]

```typescript
interface MyFeature {
  id: number;
  name: string;
  // ...
}

// Zod schema in @spectatr/shared-types
const MyFeatureSchema = z.object({
  id: z.number(),
  name: z.string(),
  // ...
});
```

## State Management

### Zustand Store (if needed)

**Store Name:** `useMyFeatureStore`

**State Structure:**
```typescript
interface MyFeatureState {
  // Data State
  items: MyFeature[];
  selectedItem: MyFeature | null;
  
  // UI State
  isLoading: boolean;
  activeTab: 'VIEW1' | 'VIEW2';
  filters: FilterState;
  
  // Actions
  addItem: (item: MyFeature) => void;
  removeItem: (id: number) => void;
  setActiveTab: (tab: string) => void;
  setFilters: (filters: FilterState) => void;
}
```

**Persistence:**
- [ ] LocalStorage persistence needed
- [ ] Session-only state

### TanStack Query (if needed)

**Queries:**
- `useMyFeatureData` - Fetches feature data
- `useMyFeatureDetails` - Fetches specific item details

**Mutations:**
- `useCreateFeature` - Creates new item
- `useUpdateFeature` - Updates existing item
- `useDeleteFeature` - Deletes item

## Validation

### Zod Schemas

[List Zod schemas needed in @spectatr/shared-types:]

- `MyFeatureSchema` - Main feature validation
- `MyFeatureFilterSchema` - Filter validation
- `MyFeatureInputSchema` - User input validation

### Validation Rules

- Rule 1: Description
- Rule 2: Description
- Rule 3: Description

### Error Handling

**Error Messages (config/validationErrors.ts):**
```typescript
VALIDATION_ERRORS: {
  MY_FEATURE_INVALID: 'Error message for users',
  MY_FEATURE_REQUIRED: 'Field is required',
  // ...
}
```

**User Feedback:**
- Inline field validation (real-time)
- Form-level validation on submit
- Toast notifications for async errors
- Visual indicators (red borders, error text)

## Theming

### Theme Tokens to Use

**Colors:**
- `theme.palette.primary` - Main actions
- `theme.palette.secondary` - Secondary actions
- `theme.palette.error` - Error states
- `theme.palette.selection.available` - Available items
- `theme.palette.selection.selected` - Selected items

**Typography:**
- `theme.typography.h5` - Section headers
- `theme.typography.body1` - Main content
- `theme.typography.caption` - Helper text
- Custom variant: `theme.typography.myCustomVariant` (if needed)

**Spacing:**
- Use `theme.spacing(n)` for all spacing (8px base)
- Container padding: `theme.spacing(2)` or `theme.spacing(3)`

### MUI Components

[List MUI components to use:]

- `Dialog` - For modal interactions
- `Drawer` - For side panels
- `Card` + `CardContent` - For content grouping
- `TextField` - For text inputs
- `Select` - For dropdowns
- `Button` - For actions
- `Chip` - For tags/labels
- `Skeleton` - For loading states

### Skeleton Loading States

**Required Skeletons:**
- `MyComponentSkeleton` - Matches MyComponent dimensions
  - Circular skeleton for avatar (60x60)
  - Text skeleton for title (80% width)
  - Rectangular skeleton for content (full width, 120px height)

## Tasks

Break down the implementation into smaller, manageable tasks:

### Setup
- [ ] Create feature directory structure
- [ ] Set up test files
- [ ] Define TypeScript interfaces

### Zod Schemas (shared-types)
- [ ] Create MyFeatureSchema in shared-types
- [ ] Export schema from shared-types index
- [ ] Add validation error constants to frontend

### Components
- [ ] Implement MyComponent with MUI components
- [ ] Implement MyComponentSkeleton
- [ ] Implement SupportingComponent
- [ ] Add theme token usage (colors, typography, spacing)
- [ ] Add responsive design (mobile/desktop layouts)
- [ ] Add accessibility (ARIA labels, keyboard navigation)

### State Management
- [ ] Create Zustand store (if needed)
- [ ] Implement store actions
- [ ] Add persistence (if needed)
- [ ] Set up TanStack Query hooks (if needed)

### Validation
- [ ] Integrate Zod validation
- [ ] Add inline field validation
- [ ] Add form-level validation
- [ ] Implement error feedback UI

### Testing
- [ ] Write unit tests for business logic
- [ ] Write component tests
- [ ] Write integration tests
- [ ] Test responsive design
- [ ] Test accessibility

### Integration
- [ ] Integrate with existing components
- [ ] Update navigation (if needed)
- [ ] Test with existing data/state
- [ ] Update documentation

### Polish
- [ ] Code review checklist verification
- [ ] Remove console.log statements
- [ ] Add JSDoc comments
- [ ] Update README (if needed)

## Open Questions

[Outline 1-3 open questions or uncertainties that need to be clarified:]

1. **Question 1?**
   - Context: Why this is uncertain
   - Options: Possible approaches
   - Decision needed: What needs to be decided

2. **Question 2?**
   - Context: Why this is uncertain
   - Options: Possible approaches
   - Decision needed: What needs to be decided

3. **Question 3?**
   - Context: Why this is uncertain
   - Options: Possible approaches
   - Decision needed: What needs to be decided

## Testing Strategy

### Unit Tests

**Business Logic:**
- Test pure functions (validation, calculations, transformations)
- Test store actions (Zustand)
- Test utility functions
- Edge cases and error conditions

### Component Tests

**MyComponent.test.tsx:**
- Renders correctly with required props
- Handles user interactions (clicks, typing, etc.)
- Applies theme tokens correctly
- Shows skeleton state when loading
- Displays validation errors
- Keyboard navigation works
- Accessible (ARIA labels present)

### Integration Tests

**Feature Flow:**
- User can complete main workflow
- Validation works end-to-end
- State updates correctly across components
- Error handling works correctly

### Responsive Design Tests

- Mobile view (320px - 767px)
- Tablet view (768px - 1023px)
- Desktop view (1024px+)

### Accessibility Tests

- Screen reader support (ARIA labels)
- Keyboard navigation (Tab, Enter, Escape)
- Focus indicators visible
- Color contrast meets WCAG standards

## Success Criteria

[Define acceptance criteria for completion:]

- [ ] **Functionality:** All planned tasks completed and working
- [ ] **MUI Only:** No custom CSS frameworks, only MUI components used
- [ ] **Theme System:** All colors/typography from theme tokens
- [ ] **Validation:** Zod schemas from shared-types, error messages in config
- [ ] **Skeleton States:** Loading states match content dimensions
- [ ] **Type Safety:** No `any` types, strict TypeScript passing
- [ ] **Tests:** All unit, component, and integration tests passing
- [ ] **Responsive:** Works on mobile, tablet, and desktop
- [ ] **Accessibility:** ARIA labels, keyboard navigation, color contrast
- [ ] **Sport Agnostic:** No hardcoded rugby-specific logic
- [ ] **Code Quality:** Follows CONTRIBUTING.md guidelines
- [ ] **Documentation:** Code comments and README updated
- [ ] **Performance:** No unnecessary re-renders, optimized images
- [ ] **Error Handling:** User-friendly error messages and feedback

## Notes

[Any additional notes, considerations, or references:]

- Link to related Jira ticket: FSA-XXX
- Link to design mockups (if applicable)
- Link to related features or dependencies
- Performance considerations
- Security considerations
- Future enhancements to consider
