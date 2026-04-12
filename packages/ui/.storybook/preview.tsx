import type { Preview } from '@storybook/react-vite';
import type { Decorator } from '@storybook/react';
import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-react';
import { themes } from '../src/theme';
import { storyQueryClient } from '../src/test/storyQueryClient';

// Decorators wrap all stories with MUI ThemeProvider + React Query + Clerk.
// In Storybook, @clerk/clerk-react is aliased to a passthrough mock (see main.ts)
// so ClerkProvider here never validates the publishable key.
export const decorators: Decorator[] = [
  (Story, context) => {
    const themeName = context.globals.theme || 'rugby';
    const theme = themes[themeName];

    return (
      <ClerkProvider publishableKey="pk_test_mock">
        <QueryClientProvider client={storyQueryClient}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Story />
          </ThemeProvider>
        </QueryClientProvider>
      </ClerkProvider>
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