import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient for Storybook.
 * Single module instance shared between preview.tsx and story files,
 * so cache seeded in a story's render() is visible to the component under test.
 *
 * Retries disabled so errors surface immediately in the interactions panel.
 */
export const storyQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
    mutations: { retry: false },
  },
});
