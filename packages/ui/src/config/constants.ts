/**
 * Application-wide constants
 */

// App metadata
export const APP_NAME = 'Spectatr';
export const APP_VERSION = '1.0.0';

// LocalStorage keys
export const STORAGE_KEYS = {
  MY_TEAM: 'spectatr-my-team',
  THEME: 'spectatr-theme',
  USER_PREFERENCES: 'spectatr-preferences',
} as const;

// API configuration (will use env variables when backend is ready)
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  TIMEOUT: 30000,
} as const;

// Validation constants - for UI, not for squad validation
export const VALIDATION = {
  MIN_PRICE: 3,
  MAX_PRICE: 25,
  MAX_COMPARISON_PLAYERS: 3,
} as const;

// League error messages — mirrors server TRPCError messages for UI display
export const LEAGUE_ERRORS = {
  NO_ACTIVE_TOURNAMENT: 'No active tournament found for this competition.',
  INVITE_CODE_NOT_FOUND: 'Invite code not found or expired.',
  LEAGUE_FULL: 'This league has reached its participant limit.',
  ALREADY_MEMBER: 'You are already a member of this league.',
  NOT_MEMBER: 'You are not a member of this league.',
  CREATOR_CANNOT_LEAVE: 'League creators cannot leave. Delete the league instead.',
  NOT_CREATOR: 'Only the league creator can edit settings.',
  NOT_FOUND: 'League not found.',
  // Client-side form validation
  NAME_TOO_SHORT: 'League name must be at least 3 characters.',
  NAME_TOO_LONG: 'League name must be 60 characters or fewer.',
  INVALID_GAME_MODE: 'Please select a valid game mode.',
  INVALID_PARTICIPANTS: 'Participants must be between 2 and 100.',
} as const;
