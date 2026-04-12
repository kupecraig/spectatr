import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import path from 'node:path';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@': '/src',
          // Mock Clerk in Storybook — the real ClerkProvider throws when given
          // a placeholder publishable key (e.g. in CI). The mock provides
          // passthrough components and stub hooks so stories render without auth.
          '@clerk/clerk-react': path.resolve(__dirname, '../src/test/clerkMock.tsx'),
        },
      },
    });
  },
};

export default config;