import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { MyLeagueListItem, MyLeagueListItemSkeleton } from './MyLeagueListItem';
import type { MyLeague } from '@/hooks/api/useLeaguesQuery';

// ─── Shared mock data ─────────────────────────────────────────────────────────

const base: MyLeague = {
  id: 1,
  tenantId: 'trc-2025',
  name: 'Office League',
  creatorId: 'user_abc',
  sportType: 'rugby',
  gameMode: 'standard',
  format: 'classic',
  season: '2025',
  status: 'active',
  isPublic: false,
  inviteCode: 'ABCD1234',
  maxParticipants: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  role: 'member',
  joinedAt: '2026-01-05T00:00:00.000Z',
  memberCount: 4,
  myTeam: {
    id: 1,
    tenantId: 'trc-2025',
    leagueId: 1,
    userId: 'user_abc',
    name: "Craig's Team",
    budget: 42_000_000,
    totalCost: 38_500_000,
    points: 87,
    wins: 3,
    losses: 1,
    draws: 0,
    rank: 2,
  },
};

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Features/Leagues/MyLeagueListItem',
  component: MyLeagueListItem,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    onView: fn(),
    onSettings: fn(),
    onLeave: fn(),
  },
} satisfies Meta<typeof MyLeagueListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Member in an active standard league with a team and points. */
export const Default: Story = {
  args: {
    league: base,
  },
};

/** Creator of the league — shows Creator chip and settings icon. */
export const Creator: Story = {
  args: {
    league: {
      ...base,
      role: 'creator',
    },
  },
};

/** League is still in draft — shows draft state. */
export const DraftLeague: Story = {
  args: {
    league: {
      ...base,
      status: 'draft',
    },
  },
};

/** Member who hasn't built a team yet. */
export const NoTeam: Story = {
  args: {
    league: {
      ...base,
      myTeam: null,
    },
  },
};

/** Skeleton loading state while the list is fetching. */
export const Skeleton = {
  render: () => <MyLeagueListItemSkeleton />,
};
