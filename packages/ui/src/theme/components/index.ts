import type { Components, Theme } from '@mui/material/styles';
import { chipComponents } from './chips';
import { buttonComponents } from './buttons';
import { listComponents } from './lists';

/**
 * Export all component overrides
 */
export * from './chips';
export * from './buttons';
export * from './lists';

/**
 * Merge all component overrides into single object
 */
export const getAllComponents = (): Components<Theme> => {
  return {
    ...chipComponents,
    ...buttonComponents,
    ...listComponents,
  };
};
