# Spectatr - Project Setup Instructions

## Overview

Multi-sport fantasy sports platform with Material-UI theming, shared validation, and type-safe development.

## Requirements

### Tech Stack

-   React
-   Material UI v7.2.0
-   Vite
-   TypeScript
-   State loading for testing/debugging/development

### Core Features

1. **Dashboard Layout**

    - App Bar with title and settings icon
    - Drawer/Sidebar for navigation
    - Main content area for fantasy sports data
    - Responsive design

2. **Theme Switcher**

    - Settings dialog/drawer with theme mode selector
    - Three options: Light, Dark, System (see [screenshot](./image.png))
    - Persistent theme selection using localStorage
    - Smooth transitions between themes

3. **State Management for Testing**
    - Ability to load predefined UI states
    - URL parameters or dev tools to inject test data
    - Mock data for player stats, teams, leagues

### MVP Requirements

1. Responsive design
2. Team management interface
3. Player drafting system
4. Live scoring updates
5. Basic league management tools
6. Player statistics and profiles
7. Business logic for scoring and player performance
8. Rules and league settings management plus configuration
9. User authentication and authorization (Clerk implemented)
10. State loading for testing, debugging, and development

## Implementation Guide

### 1. Project Structure

```
variable-theme/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx          # Main dashboard layout
│   │   └── SettingsDialog.tsx      # Settings modal with theme switcher
│   ├── theme/
│   │   ├── base.ts                 # Shared theme configuration
│   │   ├── light.ts                # Light theme palette
│   │   ├── dark.ts                 # Dark theme palette
│   │   ├── rugby.ts                # Rugby theme palette
│   │   ├── index.ts                # Theme registry and loader
│   │   └── README.md               # Theme system documentation
│   ├── mocks/
│   │   ├── playerData.ts           # Player interfaces and utilities
│   │   ├── players.json            # Mock player data
│   │   └── squads.json             # Mock squad/team data
│   ├── App.tsx
│   └── main.tsx                    # App entry point with theme provider
```

### 2. Theme Setup with Modular Architecture

**File: `src/theme/base.ts`**

```typescript
import { ThemeOptions } from '@mui/material/styles';

/**
 * Base theme configuration shared across all themes
 * Individual themes only need to override palette colors
 */
export const baseThemeConfig: ThemeOptions = {
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h4: { fontWeight: 600 },
        h6: { fontWeight: 500 },
    },
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: 'none',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRight: '1px solid rgba(0, 0, 0, 0.12)',
                },
            },
        },
    },
};
```

**File: `src/theme/light.ts`** (Example theme)

```typescript
import { ThemeOptions } from '@mui/material/styles';

export const lightTheme: ThemeOptions = {
    palette: {
        mode: 'light',
        primary: { main: '#cd1132' },
        secondary: { main: '#1bbafa' },
        background: { 
            default: '#ffffff', 
            paper: '#f5f5f5' 
        },
    },
};

export const lightThemeMetadata = {
    name: 'light',
    displayName: 'Light',
    icon: '☀️',
};
```

**File: `src/theme/index.ts`** (Theme Registry)

```typescript
import { ThemeOptions } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';
import { baseThemeConfig } from './base';
import { lightTheme, lightThemeMetadata } from './light';
import { darkTheme, darkThemeMetadata } from './dark';
import { rugbyTheme, rugbyThemeMetadata } from './rugby';

export interface ThemeConfig {
    name: string;
    displayName: string;
    icon?: string;
    config: ThemeOptions;
}

export const themes: ThemeConfig[] = [
    {
        name: lightThemeMetadata.name,
        displayName: lightThemeMetadata.displayName,
        icon: lightThemeMetadata.icon,
        config: deepmerge(baseThemeConfig, lightTheme),
    },
    {
        name: darkThemeMetadata.name,
        displayName: darkThemeMetadata.displayName,
        icon: darkThemeMetadata.icon,
        config: deepmerge(baseThemeConfig, darkTheme),
    },
    {
        name: rugbyThemeMetadata.name,
        displayName: rugbyThemeMetadata.displayName,
        icon: rugbyThemeMetadata.icon,
        config: deepmerge(baseThemeConfig, rugbyTheme),
    },
];

export const themeMap = themes.reduce((acc, theme) => {
    acc[theme.name] = theme.config;
    return acc;
}, {} as Record<string, ThemeOptions>);

export const getDefaultTheme = (): string => {
    const savedTheme = localStorage.getItem('theme-mode');
    return savedTheme && themeMap[savedTheme] ? savedTheme : themes[0].name;
};
```

### 3. Theme Provider with Dynamic Loading

**File: `src/main.tsx`**

```typescript
import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App'
import { themeMap, getDefaultTheme } from './theme'

function Root() {
  const [themeName, setThemeName] = useState<string>(getDefaultTheme());

  useEffect(() => {
    const savedTheme = getDefaultTheme();
    setThemeName(savedTheme);

    const handleThemeChange = (event: CustomEvent) => {
      setThemeName(event.detail);
    };

    window.addEventListener('theme-change', handleThemeChange as EventListener);
    return () => {
      window.removeEventListener('theme-change', handleThemeChange as EventListener);
    };
  }, []);

  const theme = createTheme(themeMap[themeName] || themeMap[getDefaultTheme()]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <App />
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
```

**File: `src/App.tsx`**

```typescript
import Dashboard from './components/Dashboard'

function App() {
  return <Dashboard />
}

export default App
```

### 4. Settings Dialog with Dynamic Theme Selector

**File: `src/components/SettingsDialog.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { themes, getDefaultTheme } from '../theme';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [currentTheme, setCurrentTheme] = useState<string>(getDefaultTheme());

  useEffect(() => {
    const savedTheme = getDefaultTheme();
    setCurrentTheme(savedTheme);
  }, []);

  const applyTheme = (themeName: string) => {
    localStorage.setItem('theme-mode', themeName);
    window.dispatchEvent(new CustomEvent('theme-change', { detail: themeName }));
  };

  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTheme = event.target.value;
    setCurrentTheme(newTheme);
    applyTheme(newTheme);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Settings
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
          <FormLabel component="legend">Theme</FormLabel>
          <RadioGroup value={currentTheme} onChange={handleModeChange}>
            {themes.map((theme) => (
              <FormControlLabel
                key={theme.name}
                value={theme.name}
                control={<Radio />}
                label={theme.icon ? `${theme.icon} ${theme.displayName}` : theme.displayName}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </DialogContent>
    </Dialog>
  );
}
```

### 5. Dashboard with Player Data Table

**File: `src/components/Dashboard.tsx`**

```typescript
import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Container,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import HomeIcon from '@mui/icons-material/Home';
import SportsIcon from '@mui/icons-material/Sports';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import SettingsDialog from './SettingsDialog';
import players from '../mocks/players.json';
import { getPositionDisplayName, getSquadName } from '../mocks/playerData';

const drawerWidth = 240;

export default function Dashboard() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const menuItems = [
    { text: 'Home', icon: <HomeIcon /> },
    { text: 'My Squad', icon: <SportsIcon /> },
    { text: 'Leaderboard', icon: <LeaderboardIcon /> },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={toggleDrawer}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Fantasy Sports Dashboard
          </Typography>
          <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={toggleDrawer}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Container maxWidth="lg">
          <Typography variant="h4" gutterBottom>
            Top Players
          </Typography>
          <Card>
            <CardContent>
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Player</TableCell>
                      <TableCell>Team</TableCell>
                      <TableCell>Position</TableCell>
                      <TableCell>Cost</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Points</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {players.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell>{`${player.firstName} ${player.lastName}`}</TableCell>
                        <TableCell>{getSquadName(player.squadId)}</TableCell>
                        <TableCell>{getPositionDisplayName(player.position)}</TableCell>
                        <TableCell>${(player.cost / 1000000).toFixed(1)}M</TableCell>
                        <TableCell>{player.status}</TableCell>
                        <TableCell align="right">{player.stats.totalPoints ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Container>
      </Box>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  );
}
```

### 6. Data Models and Mock Data

**File: `src/mocks/playerData.ts`**

```typescript
import squadsData from './squads.json';

export interface PlayerSquad {
    id: number;
    name: string;
    abbreviation: string;
    badge: string | null;
    backgroundColor: string;
}

export const squads: PlayerSquad[] = squadsData;

export function getSquadById(squadId: number): PlayerSquad | undefined {
    return squads.find(squad => squad.id === squadId);
}

export function getSquadName(squadId: number): string {
    return getSquadById(squadId)?.name || 'Unknown';
}

export function getSquadAbbreviation(squadId: number): string {
    return getSquadById(squadId)?.abbreviation || 'N/A';
}

// Image path helpers - images are served from the public folder
export function getPlayerProfileImage(player: Player): string {
    return `/${player.imageProfile}`;
}

export function getPlayerPitchImage(player: Player): string {
    return `/${player.imagePitch}`;
}

export const STATUS_COLOR_VAR: Record<string, string> = {
    selected: 'var(--color-status-selected)',
    injured: 'var(--color-status-injured)',
    benched: 'var(--color-status-benched)',
    eliminated: 'var(--color-status-eliminated)',
};

export enum PlayerPosition {
    OUTSIDE_BACK = 'outside_back',
    FLY_HALF = 'fly_half',
    SCRUM_HALF = 'scrum_half',
    HOOKER = 'hooker',
    PROP = 'prop',
    LOCK = 'lock',
    LOOSE_FORWARD = 'loose_forward',
    CENTER = 'center',
}

export const POSITION_LABELS: Record<PlayerPosition, string> = {
    [PlayerPosition.OUTSIDE_BACK]: 'Outside Back',
    [PlayerPosition.FLY_HALF]: 'Fly Half',
    [PlayerPosition.SCRUM_HALF]: 'Scrum Half',
    [PlayerPosition.HOOKER]: 'Hooker',
    [PlayerPosition.PROP]: 'Prop',
    [PlayerPosition.LOCK]: 'Lock',
    [PlayerPosition.LOOSE_FORWARD]: 'Loose Forward',
    [PlayerPosition.CENTER]: 'Center',
};

export function getPositionDisplayName(position: string): string {
    return POSITION_LABELS[position as PlayerPosition] || position;
}

export interface Position {
    readonly id: number;
    readonly position: PlayerPosition;
    readonly label: string;
    readonly row: number;
    readonly index: number;
    readonly x: number;
    readonly y: number;
}

export enum PlayerStatus {
    SELECTED = 'selected',
    INJURED = 'injured',
    NOTSELECTED = 'not-selected',
    ELIMINATED = 'eliminated',
    BENCHED = 'benched',
}

export interface PlayerStats {
    totalPoints: number | null;
    avgPoints: number | null;
    lastRoundPoints: number | null;
    positionRank: number | null;
    nextFixture: number | null;
    scores: any;
}

export interface PlayerSelected {
    [key: string]: number;
}

export interface Player {
    id: number;
    feedId: number;
    squadId: number; // the players team
    firstName: string;
    lastName: string;
    position: string;
    cost: number;
    status: string;
    isLocked: boolean;
    stats: PlayerStats;
    selected: PlayerSelected;
    imagePitch: string;
    imageProfile: string;
}
```

**File: `src/mocks/squads.json`**

```json
[
    {
        "id": 1,
        "name": "South Africa",
        "abbreviation": "SA",
        "badge": null,
        "backgroundColor": ""
    },
    {
        "id": 2,
        "name": "Australia",
        "abbreviation": "AUS",
        "badge": null,
        "backgroundColor": ""
    },
    {
        "id": 3,
        "name": "Argentina",
        "abbreviation": "ARG",
        "badge": null,
        "backgroundColor": ""
    },
    {
        "id": 4,
        "name": "New Zealand",
        "abbreviation": "NZ",
        "badge": null,
        "backgroundColor": ""
    }
]
```

**File: `src/mocks/players.json`** contains full player data with structure matching the Player interface above.

### 7. Installation Steps

1. **Install Dependencies:**

```bash
cd variable-theme
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material
npm install @mui/utils  # Required for deepmerge utility
```

2. **Create Theme Files:**

   - Create `src/theme/` directory
   - Add `base.ts` with shared configuration
   - Add individual theme files (light.ts, dark.ts, etc.)
   - Create `index.ts` to register all themes
   - See `src/theme/README.md` for detailed instructions

3. **Add Mock Data:**

   - Place `players.json` and `squads.json` in `src/mocks/`
   - Create `playerData.ts` with interfaces and helper functions
   - Copy player images to `public/image/trc/profile/` and `public/image/trc/pitch/`

4. **Run Development Server:**

```bash
npm run dev
```

## Adding New Themes

The theme system is designed for easy extensibility:

1. **Create theme file** in `src/theme/` (e.g., `ocean.ts`):

```typescript
import { ThemeOptions } from '@mui/material/styles';

export const oceanTheme: ThemeOptions = {
    palette: {
        mode: 'dark',
        primary: { main: '#0077be' },
        secondary: { main: '#00a8cc' },
        background: { 
            default: '#001f3f', 
            paper: '#003d5c' 
        },
    },
};

export const oceanThemeMetadata = {
    name: 'ocean',
    displayName: 'Ocean',
    icon: '🌊',
};
```

2. **Register theme** in `src/theme/index.ts`:

```typescript
import { oceanTheme, oceanThemeMetadata } from './ocean';

// Add to themes array:
{
    name: oceanThemeMetadata.name,
    displayName: oceanThemeMetadata.displayName,
    icon: oceanThemeMetadata.icon,
    config: deepmerge(baseThemeConfig, oceanTheme),
}
```

3. **Theme appears automatically** in settings dropdown with its icon!

No need to modify `SettingsDialog.tsx` or any other components.

## Testing the Theme Switcher

1. Open the app
2. Click the Settings icon in the app bar
3. See the settings dialog with theme options (Light ☀️, Dark 🌙, Rugby Field 🏉)
4. Select each option and observe instant theme changes
5. Theme preference persists across page reloads via localStorage
6. Themes are automatically loaded from the theme registry

## Current Available Themes

- **Light** (☀️) - Default light theme with red/blue color scheme
- **Dark** (🌙) - Dark mode with same color scheme
- **Rugby Field** (🏉) - Green field themed with brown accents

## Additional Features to Consider

1. **Player Cards** - Display player stats in Material-UI Cards
2. **Data Tables** - Use MUI Table or DataGrid for player/league listings
3. **Charts** - Add MUI X Charts for stats visualization
4. **Responsive Design** - Test on mobile/tablet/desktop
5. **Loading States** - Add Skeleton components while data loads

## State Management Plan

For this complex fantasy sports platform with live scoring, draft systems, and business logic, **TanStack Query + Zustand** cleanly separate responsibilities. TanStack Query manages server state such as authentication, players, leagues, and real-time scores, while Zustand keeps client-only concerns like UI chrome, squad building, and the rules engine localized and testable.

### Steps

1. Install `@tanstack/react-query` and `zustand` for complementary state handling.
2. Use **TanStack Query** for all server operations: authentication, player data with caching, live score updates, and draft WebSocket integration.
3. Use **Zustand** for client-only concerns: UI state (drawer/modals), local squad composition before save, and business logic (rules engine, price cap validation, scoring calculations).
4. Integrate React Hook Form for complex forms (team management, league settings) paired with TanStack Query mutations.

### Further Considerations

1. **Alternative: Redux Toolkit + RTK Query** — more comprehensive but heavier boilerplate. Choose if you need time-travel debugging or already rely on Redux patterns.
2. **Real-time strategy** — TanStack Query supports WebSocket subscriptions natively. Plan polling intervals for live scores (for example, 30 seconds) and WebSocket channels for draft coordination.
3. **Rules engine design** — implement scoring and validation logic as pure functions inside Zustand stores. This keeps calculations deterministic, easy to test, and reusable between client and server contexts.

## Resources

-   [MUI Dark Mode Documentation](https://mui.com/material-ui/customization/dark-mode/)
-   [MUI Theming Guide](https://mui.com/material-ui/customization/theming/)
-   [MUI App Bar Examples](https://mui.com/material-ui/react-app-bar/)
-   [MUI Drawer Examples](https://mui.com/material-ui/react-drawer/)
