import type { PlayerSortBy } from '@spectatr/shared-types';

/**
 * Sort options configuration for player list
 * Sport-agnostic structure - labels can be adjusted per tenant if needed
 */
export interface PlayerSortOption {
  value: PlayerSortBy;
  label: string;
}

export const PLAYER_SORT_OPTIONS: PlayerSortOption[] = [
  { value: 'totalPoints', label: 'Total Points' },
  { value: 'avgPoints', label: 'Avg Points' },
  { value: 'lastRoundPoints', label: 'Last Round' },
  { value: 'cost', label: 'Price' },
  { value: 'tries', label: 'Tries' },
  { value: 'tackles', label: 'Tackles' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'metresGained', label: 'Metres' },
];

/**
 * Badge configuration for PlayerListItem based on active sortBy
 * Returns null for cost sort (no badge shown)
 */
interface StatBadgeConfig {
  label: string;
  getValue: (player: { 
    totalPoints?: number;
    avgPoints?: number;
    lastRoundPoints?: number;
    stats?: Record<string, unknown>;
  }) => string | number;
}

export const SORT_BADGE_CONFIG: Record<PlayerSortBy, StatBadgeConfig | null> = {
  totalPoints: {
    label: 'Pts',
    getValue: (p) => p.totalPoints ?? 0,
  },
  avgPoints: {
    label: 'Avg',
    getValue: (p) => (p.avgPoints ?? 0).toFixed(1),
  },
  lastRoundPoints: {
    label: 'Rnd',
    getValue: (p) => p.lastRoundPoints ?? 0,
  },
  tries: {
    label: 'T',
    getValue: (p) => (p.stats?.tries as number) ?? 0,
  },
  tackles: {
    label: 'TK',
    getValue: (p) => (p.stats?.tackles as number) ?? 0,
  },
  conversions: {
    label: 'C',
    getValue: (p) => (p.stats?.conversions as number) ?? 0,
  },
  metresGained: {
    label: 'MG',
    getValue: (p) => (p.stats?.metresGained as number) ?? 0,
  },
  cost: null, // No badge for cost sort
};
