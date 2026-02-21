import type { Theme } from '@mui/material/styles';
import { rugbyTheme } from './instances/rugby';
import { lightTheme } from './instances/light';
import { darkTheme } from './instances/dark';

// Re-export module augmentations
export * from './tokens/palette';
export * from './tokens/typography';

/**
 * Theme registry
 * Maps theme names to complete theme instances
 */
export const themes: Record<string, Theme> = {
  rugby: rugbyTheme,
  light: lightTheme,
  dark: darkTheme,
};

export type ThemeName = keyof typeof themes;

/**
 * Default theme
 * For production, this would be determined by instance deployment
 * For dev, can be overridden via environment variable
 */
export const defaultTheme: ThemeName = 'rugby';

/**
 * Get theme by name with fallback to default
 */
export const getTheme = (name?: string): Theme => {
  if (name && name in themes) {
    return themes[name];
  }
  return themes[defaultTheme];
};
