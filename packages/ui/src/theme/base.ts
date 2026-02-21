import { ThemeOptions } from '@mui/material/styles';

/**
 * Base theme configuration shared across all themes
 * Individual themes only need to override palette colors
 */
export const baseThemeConfig: ThemeOptions = {
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h4: { fontWeight: 600 },
        h6: { fontWeight: 500 },
    },
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: 'none',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRight: '1px solid rgba(0, 0, 0, 0.12)',
                },
            },
        },
    },
};
