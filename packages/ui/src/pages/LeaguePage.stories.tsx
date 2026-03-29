import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LeaguePage } from './LeaguePage';
import { storyQueryClient } from '@/test/storyQueryClient';
import type { LeagueDetail, LeagueMember, LeagueStanding } from '@/hooks/api/useLeaguesQuery';

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────

const creatorMembership: LeagueMember = {
  userId: 'user_creator_123',
  leagueId: 1,
  role: 'creator',
  joinedAt: '2026-01-01T00:00:00.000Z',
  user: {
    id: 'user_creator_123',
    username: 'craig_j',
    firstName: 'Craig',
    lastName: 'Jackson',
    email: 'craig@example.com',
    avatar: null,
  },
};

const memberMembership: LeagueMember = {
  userId: 'user_member_456',
  leagueId: 1,
  role: 'member',
  joinedAt: '2026-01-05T00:00:00.000Z',
  user: {
    id: 'user_member_456',
    username: 'alex_s',
    firstName: 'Alex',
    lastName: 'Smith',
    email: 'alex@example.com',
    avatar: null,
  },
};

const baseLeague = {
  id: 1,
  tenantId: 'trc-2025',
  name: 'Office League 2026',
  creatorId: 'user_creator_123',
  sportType: 'rugby',
  format: 'classic' as const,
  gameMode: 'standard' as const,
  season: '2025',
  isPublic: false,
  inviteCode: 'ABCD1234',
  maxParticipants: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const memberView: LeagueDetail = {
  ...baseLeague,
  status: 'active',
  myMembership: memberMembership,
  members: [creatorMembership, memberMembership],
  teams: [],
};

const creatorView: LeagueDetail = {
  ...baseLeague,
  status: 'active',
  myMembership: creatorMembership,
  members: [creatorMembership, memberMembership],
  teams: [],
};

const emptyStandingsView: LeagueDetail = {
  ...baseLeague,
  status: 'active',
  myMembership: memberMembership,
  members: [creatorMembership, memberMembership],
  teams: [],
};

const standings: LeagueStanding[] = [
  {
    id: 1,
    tenantId: 'trc-2025',
    leagueId: 1,
    userId: 'user_creator_123',
    name: "Craig's Team",
    budget: 42_000_000,
    totalCost: 38_500_000,
    points: 112,
    wins: 4,
    losses: 0,
    draws: 1,
    rank: 1,
    user: {
      id: 'user_creator_123',
      username: 'craig_j',
      firstName: 'Craig',
      lastName: 'Jackson',
      email: 'craig@example.com',
      avatar: null,
    },
  },
  {
    id: 2,
    tenantId: 'trc-2025',
    leagueId: 1,
    userId: 'user_member_456',
    name: "Alex's Team",
    budget: 42_000_000,
    totalCost: 40_000_000,
    points: 87,
    wins: 3,
    losses: 1,
    draws: 1,
    rank: 2,
    user: {
      id: 'user_member_456',
      username: 'alex_s',
      firstName: 'Alex',
      lastName: 'Smith',
      email: 'alex@example.com',
      avatar: null,
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Cache keys (must match useTenantQuery prefix — tenant is 'trc-2025' in stories)
// ─────────────────────────────────────────────────────────────────────────────

const DETAIL_CACHE_KEY = ['trc-2025', 'leagues', 'detail', 1] as const;
const STANDINGS_CACHE_KEY = ['trc-2025', 'leagues', 'standings', 1] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function renderWithRouter(detail: LeagueDetail, standingsData: LeagueStanding[] = []) {
  storyQueryClient.setQueryData(DETAIL_CACHE_KEY, detail);
  storyQueryClient.setQueryData(STANDINGS_CACHE_KEY, standingsData);
  return (
    <MemoryRouter initialEntries={['/leagues/1']}>
      <Routes>
        <Route path="/leagues/:leagueId" element={<LeaguePage />} />
      </Routes>
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Pages/LeaguePage',
  component: LeaguePage,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  beforeEach: () => {
    storyQueryClient.removeQueries({ queryKey: DETAIL_CACHE_KEY });
    storyQueryClient.removeQueries({ queryKey: STANDINGS_CACHE_KEY });
  },
} satisfies Meta<typeof LeaguePage>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─────────────────────────────────────────────────────────────────────────────
// Stories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logged-in member (not creator) — active league with standings and invite panel visible.
 * Leave button is shown since the user is not the creator.
 */
export const MemberView: Story = {
  render: () => renderWithRouter(memberView, standings),
};

/**
 * Creator of the league — settings icon visible, leave button hidden.
 */
export const CreatorView: Story = {
  render: () => renderWithRouter(creatorView, standings),
};

/**
 * Active league with no teams yet — standings table is empty.
 */
export const EmptyStandings: Story = {
  render: () => renderWithRouter(emptyStandingsView, []),
};

/**
 * Skeleton loading state — shown when league detail is not yet in cache.
 */
export const Loading: Story = {
  render: () => {
    // Cache cleared in beforeEach — query will be pending → skeleton shown
    return (
      <MemoryRouter initialEntries={['/leagues/1']}>
        <Routes>
          <Route path="/leagues/:leagueId" element={<LeaguePage />} />
        </Routes>
      </MemoryRouter>
    );
  },
};
