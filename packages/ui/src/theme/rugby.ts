import { ThemeOptions } from '@mui/material/styles';

export const rugbyTheme: ThemeOptions = {
    palette: {
        mode: 'light',
        primary: { main: '#006400' },
        secondary: { main: '#8b4513' },
        background: { 
            default: '#e8f5e9', 
            paper: '#ffffff' 
        },
        text: { 
            primary: '#1b5e20' 
        },
    },
};

export const rugbyThemeMetadata = {
    name: 'rugby',
    displayName: 'Rugby Field',
    icon: '🏉',
};
