import { useAuth } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { Box, CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  readonly children: ReactNode;
}

/**
 * ProtectedRoute - Route guard for authenticated-only pages
 * 
 * Redirects to dashboard (/) if user is not signed in.
 * Shows loading state while auth status is being determined.
 * 
 * @example
 * ```tsx
 * <Route path="/my-team" element={
 *   <ProtectedRoute>
 *     <MyTeamPage />
 *   </ProtectedRoute>
 * } />
 * ```
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded } = useAuth();

  // Show loading state while checking auth
  if (!isLoaded) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to dashboard if not signed in
  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
