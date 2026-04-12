import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { LeaguePicker } from './LeaguePicker';
import { useMyTeamStore } from '@/stores';
import { storyQueryClient } from '@/test/storyQueryClient';
import type { MyLeague } from '@/hooks/api/useLeaguesQuery';

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockLeagues: MyLeague[] = [
  {
    id: 1,
    tenantId: 'trc-2025',
    name: 'Office League 2025',
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
    role: 'creator',
    joinedAt: '2026-01-01T00:00:00.000Z',
    myTeam: null,
    memberCount: 3,
  },
  {
    id: 2,
    tenantId: 'trc-2025',
    name: 'Friday Night Rugby',
    creatorId: 'user_xyz',
    sportType: 'rugby',
    gameMode: 'standard',
    format: 'classic',
    season: '2025',
    status: 'active',
    isPublic: true,
    inviteCode: 'XYZ45678',
    maxParticipants: 8,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    role: 'member',
    joinedAt: '2026-01-02T00:00:00.000Z',
    myTeam: null,
    memberCount: 5,
  },
];

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Features/Squad/LeaguePicker',
  component: LeaguePicker,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '16px', minWidth: '300px' }}>
        <Story />
      </div>
    ),
  ],
  beforeEach: () => {
    // Reset league selection so each story starts clean
    useMyTeamStore.getState().setLeagueId(null);
    // Seed the React Query cache so the dropdown shows mock leagues
    storyQueryClient.setQueryData(['trc-2025', 'leagues', 'my'], mockLeagues);
  },
} satisfies Meta<typeof LeaguePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** No league selected — shows placeholder "Select League". */
export const Default: Story = {};

/** Pre-selected league (Office League 2025). */
export const PreSelected: Story = {
  render: () => {
    useMyTeamStore.getState().setLeagueId(1);
    return <LeaguePicker />;
  },
};

/** User opens the dropdown and selects a league. */
export const SelectsLeague: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Open the select dropdown
    const combobox = canvas.getByRole('combobox');
    await userEvent.click(combobox);

    // Pick "Friday Night Rugby" from the dropdown (rendered in a portal)
    const option = within(document.body).getByText('Friday Night Rugby');
    await userEvent.click(option);

    // Verify the store updated
    await expect(useMyTeamStore.getState().selectedLeagueId).toBe(2);
  },
};

/** Loading state — no leagues in the cache yet (skeleton shown). */
export const Loading: Story = {
  render: () => {
    storyQueryClient.removeQueries({ queryKey: ['trc-2025', 'leagues', 'my'] });
    return <LeaguePicker />;
  },
};

