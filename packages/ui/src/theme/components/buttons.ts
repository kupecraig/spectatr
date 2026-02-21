import type { Components, Theme } from '@mui/material/styles';

/**
 * Button component overrides
 * Standardizes button styling across all themes
 */
export const buttonComponents: Components<Theme> = {
  MuiButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        textTransform: 'none', // Remove uppercase
        fontWeight: 500,
        transition: theme.transitions.create(
          ['background-color', 'box-shadow', 'border-color', 'color'],
          {
            duration: theme.transitions.duration.short,
          }
        ),
      }),
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        transition: theme.transitions.create(['background-color', 'color'], {
          duration: theme.transitions.duration.shorter,
        }),
      }),
    },
  },
};
