import { createTheme } from '@mui/material/styles';
import { darkPalette } from '../tokens/palette';
import { typographyConfig } from '../tokens/typography';
import { shapeConfig } from '../tokens/shape';
import { spacingConfig } from '../tokens/spacing';
import { transitionsConfig } from '../tokens/transitions';
import { getAllComponents } from '../components';

/**
 * Dark theme instance
 * Dark mode aesthetic with adjusted colors for visibility
 */
export const darkTheme = createTheme({
  palette: darkPalette,
  typography: typographyConfig,
  shape: shapeConfig,
  spacing: spacingConfig,
  transitions: transitionsConfig,
  components: getAllComponents(),
});
