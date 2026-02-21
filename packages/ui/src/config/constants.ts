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
