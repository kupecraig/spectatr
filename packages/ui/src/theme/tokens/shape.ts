import type { ThemeOptions } from '@mui/material/styles';

/**
 * Shape configuration for border radius
 * Default: 4px
 */
export const shapeConfig: ThemeOptions['shape'] = {
  borderRadius: 4,
};

/**
 * Rugby-specific shape overrides
 * Slightly more rounded for organic field aesthetic
 */
export const rugbyShapeConfig: ThemeOptions['shape'] = {
  borderRadius: 8,
};
