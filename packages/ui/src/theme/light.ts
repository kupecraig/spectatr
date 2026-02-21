import { ThemeOptions } from '@mui/material/styles';

export const lightTheme: ThemeOptions = {
    palette: {
        mode: 'light',
        primary: { main: '#cd1132' },
        secondary: { main: '#1bbafa' },
        background: { 
            default: '#ffffff', 
            paper: '#f5f5f5' 
        },
    },
};

export const lightThemeMetadata = {
    name: 'light',
    displayName: 'Light',
    icon: '☀️',
};
