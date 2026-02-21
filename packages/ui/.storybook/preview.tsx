import type { Preview } from '@storybook/react-vite';
import type { Decorator } from '@storybook/react';
import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { themes } from '../src/theme';

// Decorators wrap all stories with MUI ThemeProvider
export const decorators: Decorator[] = [
  (Story, context) => {
    const themeName = context.globals.theme || 'rugby';
    const theme = themes[themeName];
    
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    );
  },
];

// Global toolbar for theme switching
export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'Global theme for components',
    defaultValue: 'rugby',
    toolbar: {
      icon: 'paintbrush',
      title: 'Theme',
      items: [
        { value: 'rugby', title: 'Rugby Instance', icon: 'circle' },
        { value: 'light', title: 'Light Mode', icon: 'circle' },
        { value: 'dark', title: 'Dark Mode', icon: 'circle' },
      ],
      dynamicTitle: true,
    },
  },
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true, // Use MUI theme backgrounds instead
    },
  },
};

export default preview;