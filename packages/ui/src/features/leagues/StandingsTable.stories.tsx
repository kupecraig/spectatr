import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StandingsTable, StandingsTableSkeleton } from './StandingsTable';
import type { LeagueStanding } from '@/hooks/api/useLeaguesQuery';
import type { Round } from '@/hooks/api/useRoundsQuery';

// ─── Mock data ────────────────────────────────────────────────────────────────

const makeStanding = (
  overrides: Partial<LeagueStanding> & { name: string; points: number; rank: number }
): LeagueStanding => ({
  id: overrides.rank,
  tenantId: 'trc-2025',
  userId: `user_${overrides.rank}`,
  leagueId: 1,
  budget: 42_000_000,
  totalCost: 38_000_000,
  wins: 0,
  losses: 0,
  draws: 0,
  user: {
    id: `user_${overrides.rank}`,
    username: null,
    firstName: null,
    lastName: null,
    email: `player${overrides.rank}@example.com`,
    avatar: null,
  },
  ...overrides,
});

const standings: LeagueStanding[] = [
  makeStanding({ rank: 1, name: 'The Thunderbolts',  points: 142, wins: 5, losses: 1, draws: 0,
    user: { id: 'u1', username: 'craigj',   firstName: 'Craig',  lastName: 'Jackson', email: 'craig@example.com',  avatar: null } }),
  makeStanding({ rank: 2, name: 'Barbarian FC',       points: 131, wins: 4, losses: 2, draws: 0,
    user: { id: 'u2', username: null,        firstName: 'Sarah',  lastName: 'Jones',   email: 'sarah@example.com',  avatar: null } }),
  makeStanding({ rank: 3, name: 'Dream XV',           points: 120, wins: 3, losses: 2, draws: 1,
    user: { id: 'u3', username: 'mateo_r',   firstName: null,     lastName: null,      email: 'mateo@example.com',  avatar: null } }),
  makeStanding({ rank: 4, name: 'Scrum Kings',        points: 98,  wins: 2, losses: 3, draws: 1,
    user: { id: 'u4', username: null,        firstName: null,     lastName: null,      email: 'anon@example.com',   avatar: null } }),
  makeStanding({ rank: 5, name: 'Last Minute Heroes', points: 74,  wins: 1, losses: 5, draws: 0,
    user: { id: 'u5', username: 'jake99',    firstName: 'Jake',   lastName: 'Smith',   email: 'jake@example.com',   avatar: null } }),
];

// Per-round standings — different order and points
const round1Standings: LeagueStanding[] = [
  makeStanding({ rank: 1, name: 'Barbarian FC',       points: 32, wins: 1, losses: 0, draws: 0,
    user: { id: 'u2', username: null,        firstName: 'Sarah',  lastName: 'Jones',   email: 'sarah@example.com',  avatar: null } }),
  makeStanding({ rank: 2, name: 'The Thunderbolts',  points: 28, wins: 1, losses: 0, draws: 0,
    user: { id: 'u1', username: 'craigj',   firstName: 'Craig',  lastName: 'Jackson', email: 'craig@example.com',  avatar: null } }),
  makeStanding({ rank: 3, name: 'Dream XV',           points: 25, wins: 0, losses: 0, draws: 1,
    user: { id: 'u3', username: 'mateo_r',   firstName: null,     lastName: null,      email: 'mateo@example.com',  avatar: null } }),
  makeStanding({ rank: 4, name: 'Last Minute Heroes', points: 18, wins: 0, losses: 1, draws: 0,
    user: { id: 'u5', username: 'jake99',    firstName: 'Jake',   lastName: 'Smith',   email: 'jake@example.com',   avatar: null } }),
  makeStanding({ rank: 5, name: 'Scrum Kings',        points: 12, wins: 0, losses: 1, draws: 0,
    user: { id: 'u4', username: null,        firstName: null,     lastName: null,      email: 'anon@example.com',   avatar: null } }),
];

const makeRound = (roundNumber: number, status: string): Round => ({
  id: roundNumber,
  tenantId: 'trc-2025',
  tournamentId: 1,
  roundNumber,
  name: `Round ${roundNumber}`,
  startDate: '2026-06-01T00:00:00.000Z',
  endDate: '2026-06-07T00:00:00.000Z',
  status,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  isCurrent: status === 'active',
});

const rounds: Round[] = [
  makeRound(1, 'complete'),
  makeRound(2, 'complete'),
  makeRound(3, 'active'),
  makeRound(4, 'upcoming'), // Should not appear in selector
  makeRound(5, 'upcoming'), // Should not appear in selector
];

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Features/Leagues/StandingsTable',
  component: StandingsTable,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof StandingsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Full standings (5 teams) with mixed manager display names. */
export const Default: Story = {
  args: { standings },
};

/** Only two teams — early-season / small league. */
export const FewTeams: Story = {
  args: { standings: standings.slice(0, 2) },
};

/** No teams joined yet — shows the empty call-to-action message. */
export const Empty: Story = {
  args: { standings: [] },
};

/** Skeleton loading state — 5 row placeholders. */
export const Loading = {
  render: () => <StandingsTableSkeleton />,
};

/**
 * "All Rounds" selected (default) — shows season totals.
 * Round selector is visible above the table.
 */
export const AllRoundsDefault: Story = {
  args: {
    standings,
    rounds,
    selectedRoundId: undefined,
    onRoundChange: () => {},
    isLoading: false,
  },
};

/**
 * Specific round selected — shows per-round points and rankings.
 * Notice different ordering than season totals.
 */
export const RoundSelected: Story = {
  args: {
    standings: round1Standings,
    rounds,
    selectedRoundId: 1,
    onRoundChange: () => {},
    isLoading: false,
  },
};

/**
 * Loading state after round change — table rows show skeletons while
 * the selector remains interactive.
 */
export const RoundSelectLoading: Story = {
  args: {
    standings: [], // Empty while loading
    rounds,
    selectedRoundId: 2,
    onRoundChange: () => {},
    isLoading: true,
  },
};

/**
 * No scoring data available for the selected round.
 * All teams show 0 points.
 */
export const NoScoringData: Story = {
  args: {
    standings: standings.map((s, i) => ({ ...s, points: 0, rank: i + 1 })),
    rounds,
    selectedRoundId: 3,
    onRoundChange: () => {},
    isLoading: false,
  },
};

/**
 * Interactive story demonstrating round selection.
 */
export const Interactive = {
  render: function InteractiveStandingsTable() {
    const [selectedRoundId, setSelectedRoundId] = useState<number | undefined>(undefined);

    // Simulate different standings based on round selection
    const currentStandings = selectedRoundId === 1 ? round1Standings : standings;

    return (
      <StandingsTable
        standings={currentStandings}
        rounds={rounds}
        selectedRoundId={selectedRoundId}
        onRoundChange={setSelectedRoundId}
        isLoading={false}
      />
    );
  },
};
