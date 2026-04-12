/**
 * Mock for @clerk/clerk-react used in Storybook.
 * Provides passthrough components and stub hooks so stories render
 * without a real Clerk publishable key.
 */
import React from 'react';

export const ClerkProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

export const useAuth = () => ({
  isLoaded: true,
  isSignedIn: false,
  userId: null as string | null,
  getToken: async () => null as string | null,
});

export const useUser = () => ({
  isLoaded: true,
  isSignedIn: false,
  user: null,
});

export const useClerk = () => ({
  signOut: async () => {},
});

export const SignedIn = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

export const SignedOut = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

export const SignInButton = ({ children }: { children?: React.ReactNode }) => (
  <>{children}</>
);

export const UserButton = () => null;
