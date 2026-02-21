import { createTheme } from '@mui/material/styles';
import { rugbyPalette } from '../tokens/palette';
import { typographyConfig } from '../tokens/typography';
import { rugbyShapeConfig } from '../tokens/shape';
import { spacingConfig } from '../tokens/spacing';
import { transitionsConfig } from '../tokens/transitions';
import { getAllComponents } from '../components';

/**
 * Rugby instance theme
 * Green field aesthetic with sport-specific styling
 */
export const rugbyTheme = createTheme({
  palette: rugbyPalette,
  typography: typographyConfig,
  shape: rugbyShapeConfig,
  spacing: spacingConfig,
  transitions: transitionsConfig,
  components: getAllComponents(),
});
