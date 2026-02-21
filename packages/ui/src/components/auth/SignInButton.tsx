import { Button } from '@mui/material';
import { useAuth, useClerk } from '@clerk/clerk-react';

/**
 * Sign In Button - Opens Clerk hosted sign-in page
 * Only shown when user is not signed in
 */
export function SignInButton() {
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();

  if (isSignedIn) return null;

  return (
    <Button variant="contained" onClick={() => openSignIn()}>
      Sign In
    </Button>
  );
}
