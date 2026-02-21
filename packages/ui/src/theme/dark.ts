import { ThemeOptions } from '@mui/material/styles';

export const darkTheme: ThemeOptions = {
    palette: {
        mode: 'dark',
        primary: { main: '#cd1132' },
        secondary: { main: '#1bbafa' },
        background: { 
            default: '#121212', 
            paper: '#1e1e1e' 
        },
    },
};

export const darkThemeMetadata = {
    name: 'dark',
    displayName: 'Dark',
    icon: '🌙',
};
