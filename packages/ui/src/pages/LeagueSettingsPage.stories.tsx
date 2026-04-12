import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LeagueSettingsPage } from './LeagueSettingsPage';
import { storyQueryClient } from '@/test/storyQueryClient';
import type { LeagueDetail, LeagueMember } from '@/hooks/api/useLeaguesQuery';
import type { LeagueRules } from '@spectatr/shared-types';

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

const defaultRules: LeagueRules = {
  draftMode: false,
  pricingModel: 'fixed',
  priceCap: 42_000_000,
  positionMatching: false,
  squadLimitPerTeam: 3,
  sharedPool: false,
  transfersPerRound: 3,
  wildcardRounds: [7, 14],
  tripleCaptainRounds: [8],
  benchBoostRounds: [9],
  draftSettings: undefined,
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
  isPublic: true,
  inviteCode: 'ABCD1234',
  maxParticipants: 10,
  rules: defaultRules,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  members: [creatorMembership, memberMembership],
  teams: [],
};

const draftLeague: LeagueDetail = {
  ...baseLeague,
  status: 'draft',
  myMembership: creatorMembership,
};

const activeLeague: LeagueDetail = {
  ...baseLeague,
  status: 'active',
  myMembership: creatorMembership,
};

const activeLeagueAsMember: LeagueDetail = {
  ...baseLeague,
  status: 'active',
  myMembership: memberMembership,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_KEY = ['trc-2025', 'leagues', 'detail', 1] as const;

function renderWithRouter(detail: LeagueDetail) {
  storyQueryClient.setQueryData(CACHE_KEY, detail);
  return (
    <MemoryRouter initialEntries={['/leagues/1/settings']}>
      <Routes>
        <Route path="/leagues/:leagueId/settings" element={<LeagueSettingsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Pages/LeagueSettingsPage',
  component: LeagueSettingsPage,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  beforeEach: () => {
    storyQueryClient.removeQueries({ queryKey: CACHE_KEY });
  },
} satisfies Meta<typeof LeagueSettingsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─────────────────────────────────────────────────────────────────────────────
// Stories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creator view — league is in draft.
 * All rules are editable and the "Start League" card is visible at the bottom.
 */
export const DraftCreator: Story = {
  render: () => renderWithRouter(draftLeague),
};

/**
 * Creator view — league is active.
 * Rules are locked (info banner shown). Creator can still increase the participant cap.
 */
export const ActiveCreator: Story = {
  render: () => renderWithRouter(activeLeague),
};

/**
 * Member view — read-only.
 * All inputs are disabled. No "Start League" card shown.
 */
export const NonCreatorMember: Story = {
  render: () => renderWithRouter(activeLeagueAsMember),
};

/**
 * Skeleton loading state.
 * Shown when the league detail is not yet in cache.
 */
export const Loading: Story = {
  render: () => {
    // Cache cleared in beforeEach — query will be pending/error → skeleton shown
    return (
      <MemoryRouter initialEntries={['/leagues/1/settings']}>
        <Routes>
          <Route path="/leagues/:leagueId/settings" element={<LeagueSettingsPage />} />
        </Routes>
      </MemoryRouter>
    );
  },
};

/**
 * Interaction: editing the league name marks the form dirty and enables Save.
 * Also verifies the "Start League" CTA is present for a draft creator.
 */
export const DraftCreatorCanSave: Story = {
  render: () => renderWithRouter(draftLeague),
  play: async () => {
    const body = within(document.body);

    // "Start League" CTA visible — league is still in draft
    await expect(body.getByRole('button', { name: /start league/i })).toBeVisible();

    // Save initially disabled — form not yet dirty
    const saveBtn = body.getByRole('button', { name: /^save$/i });
    await expect(saveBtn).toBeDisabled();

    // Edit the league name → form becomes dirty
    const nameInput = await body.findByDisplayValue('Office League 2026');
    await userEvent.click(nameInput);
    await userEvent.type(nameInput, ' Updated');

    // Save should now be enabled
    await expect(saveBtn).not.toBeDisabled();
  },
};
