import type { Components, Theme } from '@mui/material/styles';

/**
 * MuiChip component overrides
 * Includes position and stat variants
 */
export const chipComponents: Components<Theme> = {
  MuiChip: {
    styleOverrides: {
      root: ({ theme, ownerState }) => ({
        variants: [
          {
            props: { variant: 'filled' as const },
            style: {
              // Position variant - uses theme.palette.positions
              ...(ownerState.color === undefined && {
                backgroundColor: theme.palette.grey[300],
                color: theme.palette.text.primary,
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 20,
              }),
            },
          },
        ],
      }),
    },
  },
};

// Module augmentation for Chip variants
declare module '@mui/material/Chip' {
  interface ChipPropsColorOverrides {
    position: true;
    stat: true;
  }
}
