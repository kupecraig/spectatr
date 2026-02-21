import type { Components, Theme } from '@mui/material/styles';

/**
 * List component overrides
 * Includes selectable variant for navigation and player lists
 */
export const listComponents: Components<Theme> = {
  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        transition: theme.transitions.create(['background-color', 'border-color'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&.Mui-selected': {
          backgroundColor: theme.palette.navigation.selected,
          '&:hover': {
            backgroundColor: theme.palette.navigation.active,
          },
        },
        '&:hover': {
          backgroundColor: theme.palette.navigation.hover,
        },
      }),
    },
  },
  MuiListItem: {
    styleOverrides: {
      root: {
        // Additional customization can be added here
      },
    },
  },
};
