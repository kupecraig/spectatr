# Theme System Documentation

## Overview

The Fantasy Union theme system provides a modular, extensible architecture for multi-sport instances. Each sport can have its own complete theme with custom colors, typography, and component styling.

## Architecture

```
theme/
  tokens/              # Design tokens (palette, typography, etc.)
    palette.ts         # Color palettes with sport-specific tokens
    typography.ts      # Custom typography variants
    spacing.ts         # Spacing configuration
    shape.ts           # Border radius configs
    transitions.ts     # Transition settings
  components/          # Component-specific overrides
    buttons.ts         # Button variants
    chips.ts           # Chip variants (position, stat)
    lists.ts           # List item variants
    index.ts           # Export all component overrides
  instances/           # Complete theme instances
    light.ts           # Light mode theme
    dark.ts            # Dark mode theme
    rugby.ts           # Rugby-specific theme
  base.ts              # Shared typography and component defaults
  index.ts             # Theme registry and exports
```

## Custom Palette Tokens

### Positions
Sport-specific position colors used for chips, badges, and visual distinction.

### Field
Visual styling for field/pitch backgrounds including player label backgrounds.

### Player States
Player availability and status indicators.

### Selection States
UI state colors for player selection and validation.

### Navigation
Sidebar/menu styling for selected, hover, and active states.

### Stats
Metric display colors for trends and highlights.

## Custom Typography Variants

- **playerLabel** - Small centered label for player names on field view (0.75rem, bold)
- **fieldLabel** - Uppercase label for field positions (0.75rem, uppercase)
- **emptySlotLabel** - Compact label for empty position slots (0.65rem, tight line height)
- **statValue** - Large display for statistics and metrics (1.5rem, tabular numbers)

## Themed Components

### PlayerSlot
Displays a player in field or list view with position-specific colors.

### EmptySlot
Empty position placeholder with selection states.

## Usage Guidelines

### ✅ DO

- Use theme tokens: `theme.palette.positions.outside_back`
- Use typography variants: `<Typography variant="playerLabel">`
- Use themed components: `<PlayerSlot />`

### ❌ DON'T

- Hardcode colors: `color: '#1976d2'`
- Inline font sizes: `fontSize: '0.75rem'`
- Skip theme lookups

## Adding New Sport Themes

See the architecture section above for complete implementation details. New sports should define their own palette tokens in `theme/tokens/palette.ts` and create a theme instance in `theme/instances/`.

## Development Mode

Theme switching is available in dev mode only via Settings dialog. Production deployments use a single theme per instance.

