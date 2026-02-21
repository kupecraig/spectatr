import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import { themes, defaultTheme, type ThemeName } from './theme'
import { migrateLocalStorage } from './utils/migrations'

// Run localStorage migration before app initialization
const migrationResult = migrateLocalStorage();
if (migrationResult.migrated > 0) {
  console.log(`✅ Migrated ${migrationResult.migrated} localStorage key(s) to Spectatr format`);
}

// Clerk Configuration
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable');
}

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Helper to get saved theme from localStorage
const getSavedTheme = (): ThemeName => {
  if (import.meta.env.DEV) {
    const saved = localStorage.getItem('theme-name');
    if (saved && saved in themes) {
      return saved;
    }
  }
  return defaultTheme;
};

function Root() {
  const [themeName, setThemeName] = useState<ThemeName>(getSavedTheme());

  useEffect(() => {
    // Only listen for theme changes in dev mode
    if (!import.meta.env.DEV) return;

    const handleThemeChange = (event: CustomEvent<ThemeName>) => {
      setThemeName(event.detail);
      localStorage.setItem('theme-name', event.detail);
    };

    globalThis.addEventListener('theme-change', handleThemeChange as EventListener);
    return () => {
      globalThis.removeEventListener('theme-change', handleThemeChange as EventListener);
    };
  }, []);

  const theme = themes[themeName];

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
