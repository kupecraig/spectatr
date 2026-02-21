import { createTheme } from '@mui/material/styles';
import { lightPalette } from '../tokens/palette';
import { typographyConfig } from '../tokens/typography';
import { shapeConfig } from '../tokens/shape';
import { spacingConfig } from '../tokens/spacing';
import { transitionsConfig } from '../tokens/transitions';
import { getAllComponents } from '../components';

/**
 * Light theme instance
 * Clean, bright aesthetic
 */
export const lightTheme = createTheme({
  palette: lightPalette,
  typography: typographyConfig,
  shape: shapeConfig,
  spacing: spacingConfig,
  transitions: transitionsConfig,
  components: getAllComponents(),
});
