import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Box } from '@mui/material';
import { LeagueCard, LeagueCardSkeleton } from './LeagueCard';
import type { LeagueWithCount } from '@/hooks/api/useLeaguesQuery';

// ─── Shared mock data ─────────────────────────────────────────────────────────

const base: LeagueWithCount = {
  id: 1,
  tenantId: 'trc-2025',
  name: 'Office League',
  creatorId: 'user_abc123',
  sportType: 'rugby',
  gameMode: 'standard',
  format: 'classic',
  season: '2025',
  status: 'active',
  isPublic: true,
  inviteCode: 'ABCD1234',
  maxParticipants: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  _count: { members: 4 },
};

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Features/Leagues/LeagueCard',
  component: LeagueCard,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    onJoin: fn(),
    onView: fn(),
  },
} satisfies Meta<typeof LeagueCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Public league — user is not yet a member, can join or view details. */
export const BrowsablePublic: Story = {
  args: {
    league: base,
    isMember: false,
  },
};

/** User is already a member — shows "View League" action only. */
export const Member: Story = {
  args: {
    league: base,
    isMember: true,
  },
};

/** Private league (lock icon instead of globe). */
export const Private: Story = {
  args: {
    league: { ...base, isPublic: false },
    isMember: false,
  },
};

/** League is at capacity — Join button is disabled. */
export const Full: Story = {
  args: {
    league: { ...base, _count: { members: 10 }, maxParticipants: 10 },
    isMember: false,
  },
};

/** No participant cap set (unlimited). */
export const UnlimitedParticipants: Story = {
  args: {
    league: { ...base, maxParticipants: undefined, _count: { members: 7 } },
    isMember: false,
  },
};

/** Draft-format league (Phase 2 label). */
export const DraftFormat: Story = {
  args: {
    league: { ...base, format: 'draft', gameMode: 'round-robin' },
    isMember: false,
  },
};

/** Skeleton loading state while the list is fetching. */
export const Skeleton = {
  render: () => <LeagueCardSkeleton />,
};

/** Four cards in a responsive grid matching the LeagueList layout. */
export const GridLayout = {
  render: () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
      <LeagueCard league={base}                                          isMember={false} onJoin={fn()} onView={fn()} />
      <LeagueCard league={{ ...base, id: 2, name: 'Family League', isPublic: false, _count: { members: 3 } }} isMember={true}  onJoin={fn()} onView={fn()} />
      <LeagueCard league={{ ...base, id: 3, name: 'Mates Draft',   format: 'draft', _count: { members: 10 }, maxParticipants: 10 }} isMember={false} onJoin={fn()} onView={fn()} />
    </Box>
  ),
};
