import type { PaletteOptions } from '@mui/material/styles';

// Module augmentation for custom palette tokens
declare module '@mui/material/styles' {
  interface Palette {
    positions: {
      outside_back: string;
      center: string;
      fly_half: string;
      scrum_half: string;
      loose_forward: string;
      lock: string;
      prop: string;
      hooker: string;
    };
    field: {
      background: string;
      backgroundFallback: string;
      lines: string;
      border: string;
      playerLabelBg: string;
    };
    player: {
      uncertain: string;
      injured: string;
      selected: string;
      locked: string;
      available: string;
      unavailable: string;
    };
    selection: {
      available: string;
      selected: string;
      disabled: string;
      error: string;
      warning: string;
    };
    navigation: {
      selected: string;
      hover: string;
      active: string;
    };
    stats: {
      positive: string;
      negative: string;
      neutral: string;
      highlight: string;
    };
  }

  interface PaletteOptions {
    positions?: Partial<Palette['positions']>;
    field?: Partial<Palette['field']>;
    player?: Partial<Palette['player']>;
    selection?: Partial<Palette['selection']>;
    navigation?: Partial<Palette['navigation']>;
    stats?: Partial<Palette['stats']>;
  }
}

/**
 * Rugby theme palette - green field aesthetic
 */
export const rugbyPalette: PaletteOptions = {
  mode: 'light',
  primary: {
    main: '#1976d2',
    dark: '#1565c0',
    light: '#42a5f5',
  },
  secondary: {
    main: '#9c27b0',
    dark: '#7b1fa2',
    light: '#ba68c8',
  },
  success: {
    main: '#2e7d32',
  },
  info: {
    main: '#0288d1',
  },
  warning: {
    main: '#ed6c02',
  },
  error: {
    main: '#d32f2f',
  },
  // Sport-specific position colors
  positions: {
    outside_back: '#1976d2',    // primary.main (blue)
    center: '#9c27b0',          // secondary.main (purple)
    fly_half: '#2e7d32',        // success.main (green)
    scrum_half: '#0288d1',      // info.main (light blue)
    loose_forward: '#ed6c02',   // warning.main (orange)
    lock: '#d32f2f',            // error.main (red)
    prop: '#1565c0',            // primary.dark (dark blue)
    hooker: '#7b1fa2',          // secondary.dark (dark purple)
  },
  // Field colors (rugby green theme)
  field: {
    background: 'url(/fields/rugby.svg)',
    backgroundFallback: '#006400',  // Dark green
    lines: '#ffffff',
    border: 'rgba(0, 0, 0, 0.12)',
    playerLabelBg: '#ffffff',       // White label for light mode
  },
  // Player state colors
  player: {
    uncertain: '#ff9800',       // orange
    injured: '#f44336',         // red
    selected: '#4caf50',        // green
    locked: '#9e9e9e',          // grey
    available: '#2196f3',       // blue
    unavailable: '#bdbdbd',     // light grey
  },
  // Selection state colors
  selection: {
    available: '#1976d2',       // primary.main
    selected: 'transparent',    // no border when selected
    disabled: '#bdbdbd',        // grey
    error: '#d32f2f',           // red
    warning: '#ff9800',         // orange
  },
  // Navigation colors
  navigation: {
    selected: 'rgba(25, 118, 210, 0.12)',  // primary with alpha
    hover: 'rgba(0, 0, 0, 0.04)',
    active: 'rgba(25, 118, 210, 0.08)',
  },
  // Stats/metrics colors
  stats: {
    positive: '#4caf50',        // green
    negative: '#f44336',        // red
    neutral: '#9e9e9e',         // grey
    highlight: '#ff9800',       // orange
  },
};

/**
 * Light theme palette - clean, bright aesthetic
 */
export const lightPalette: PaletteOptions = {
  mode: 'light',
  primary: {
    main: '#1976d2',
    dark: '#1565c0',
    light: '#42a5f5',
  },
  secondary: {
    main: '#dc004e',
    dark: '#c51162',
    light: '#f50057',
  },
  // Reuse rugby position colors (works well in light mode)
  positions: rugbyPalette.positions,
  // Light mode field (no background image)
  field: {
    background: 'none',
    backgroundFallback: '#f5f5f5',  // Light grey
    lines: '#e0e0e0',
    playerLabelBg: '#ffffff',       // White label for light mode
    border: 'rgba(0, 0, 0, 0.12)',
  },
  // Reuse player states
  player: rugbyPalette.player,
  selection: rugbyPalette.selection,
  navigation: rugbyPalette.navigation,
  stats: rugbyPalette.stats,
};

/**
 * Dark theme palette - dark mode aesthetic
 */
export const darkPalette: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: '#90caf9',
    dark: '#42a5f5',
    light: '#e3f2fd',
  },
  secondary: {
    main: '#f48fb1',
    dark: '#f06292',
    light: '#fce4ec',
  },
  // Lighter position colors for dark mode visibility
  positions: {
    outside_back: '#90caf9',    // lighter blue
    center: '#ce93d8',          // lighter purple
    fly_half: '#81c784',        // lighter green
    scrum_half: '#4fc3f7',      // lighter cyan
    loose_forward: '#ffb74d',   // lighter orange
    lock: '#e57373',            // lighter red
    prop: '#64b5f6',            // light blue
    hooker: '#ba68c8',          // light purple
  },
  // Dark mode field
  field: {
    background: 'none',
    backgroundFallback: '#121212',  // Dark grey
    lines: '#424242',
    playerLabelBg: '#1e1e1e',       // Very dark grey for contrast
    border: 'rgba(255, 255, 255, 0.12)',
  },
  // Lighter player states for dark mode
  player: {
    uncertain: '#ffb74d',       // lighter orange
    injured: '#e57373',         // lighter red
    selected: '#81c784',        // lighter green
    locked: '#757575',          // medium grey
    available: '#64b5f6',       // lighter blue
    unavailable: '#616161',     // dark grey
  },
  // Dark mode selection states
  selection: {
    available: '#90caf9',       // primary.main
    selected: 'transparent',
    disabled: '#616161',
    error: '#e57373',
    warning: '#ffb74d',
  },
  // Dark mode navigation
  navigation: {
    selected: 'rgba(144, 202, 249, 0.16)',  // primary with alpha
    hover: 'rgba(255, 255, 255, 0.08)',
    active: 'rgba(144, 202, 249, 0.12)',
  },
  // Dark mode stats
  stats: {
    positive: '#81c784',
    negative: '#e57373',
    neutral: '#757575',
    highlight: '#ffb74d',
  },
};
