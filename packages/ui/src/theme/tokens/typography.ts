import type { ThemeOptions } from '@mui/material/styles';

// Module augmentation for custom typography variants
declare module '@mui/material/styles' {
  interface TypographyVariants {
    playerLabel: React.CSSProperties;
    fieldLabel: React.CSSProperties;
    statValue: React.CSSProperties;
    emptySlotLabel: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    playerLabel?: React.CSSProperties;
    fieldLabel?: React.CSSProperties;
    statValue?: React.CSSProperties;
    emptySlotLabel?: React.CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    playerLabel: true;
    fieldLabel: true;
    statValue: true;
    emptySlotLabel: true;
  }
}

/**
 * Typography configuration for all themes
 * Defines standard variants and custom sport-specific variants
 */
export const typographyConfig: ThemeOptions['typography'] = {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  
  // Standard MUI variants with customization
  h4: {
    fontWeight: 600,
    fontSize: '2.125rem',
    lineHeight: 1.235,
  },
  h6: {
    fontWeight: 500,
    fontSize: '1.25rem',
    lineHeight: 1.6,
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.43,
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.66,
  },
  button: {
    fontWeight: 500,
    fontSize: '0.875rem',
    lineHeight: 1.75,
    textTransform: 'none', // Remove uppercase transform
  },
  
  // Custom variants for sport-specific text
  playerLabel: {
    fontWeight: 700,
    fontSize: '0.75rem',
    textAlign: 'center',
    letterSpacing: '0.02em',
    lineHeight: 1.2,
  },
  fieldLabel: {
    fontWeight: 700,
    fontSize: '0.75rem',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    lineHeight: 1.2,
  },
  emptySlotLabel: {
    fontWeight: 700,
    fontSize: '0.65rem',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    lineHeight: 1.1,
  },
  statValue: {
    fontWeight: 600,
    fontSize: '1.5rem',
    lineHeight: 1.2,
    fontFeatureSettings: '"tnum"', // Tabular numbers for better alignment
  },
};
