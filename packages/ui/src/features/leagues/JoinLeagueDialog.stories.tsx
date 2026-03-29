import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { JoinLeagueDialog } from './JoinLeagueDialog';
import { useLeagueStore } from '@/stores/leagueStore';

const meta = {
  title: 'Features/Leagues/JoinLeagueDialog',
  component: JoinLeagueDialog,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  beforeEach: () => {
    useLeagueStore.getState().closeDialog();
  },
} satisfies Meta<typeof JoinLeagueDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Helper ───────────────────────────────────────────────────────────────────

function openJoin(inviteCode = '') {
  useLeagueStore.getState().openJoinDialog(inviteCode);
}

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Dialog in empty initial state — both fields blank. */
export const Empty: Story = {
  render: () => {
    openJoin();
    return <JoinLeagueDialog />;
  },
};

/** Invite code pre-filled (e.g. user arrived via a shared link). */
export const PrefilledCode: Story = {
  render: () => {
    openJoin('ABCD1234');
    return <JoinLeagueDialog />;
  },
};

/** Inline validation error when the invite code is not exactly 8 characters. */
export const InvalidCodeLength: Story = {
  render: () => {
    openJoin('SHORT');
    return <JoinLeagueDialog />;
  },
  play: async () => {
    const body = within(document.body);

    // Blur the code field to surface validation
    const codeInput = body.getByLabelText(/invite code/i);
    await userEvent.click(codeInput);
    await userEvent.tab();

    const submit = body.getByRole('button', { name: /join league/i });
    await expect(submit).toBeDisabled();
  },
};

/** Both fields filled correctly — submit button is enabled. */
export const ReadyToSubmit: Story = {
  render: () => {
    const store = useLeagueStore.getState();
    store.openJoinDialog('ABCD1234');
    store.setJoinTeamName('The Thunderbolts');
    return <JoinLeagueDialog />;
  },
  play: async () => {
    const submit = within(document.body).getByRole('button', { name: /join league/i });
    await expect(submit).not.toBeDisabled();
  },
};

/** Full interaction — user types both fields from scratch. */
export const UserTypesForm: Story = {
  render: () => {
    openJoin();
    return <JoinLeagueDialog />;
  },
  play: async () => {
    const body = within(document.body);

    const codeInput = body.getByLabelText(/invite code/i);
    await userEvent.type(codeInput, 'ABCD1234');

    const teamInput = body.getByLabelText(/your team name/i);
    await userEvent.type(teamInput, 'Midnight Scrummers');

    const submit = body.getByRole('button', { name: /join league/i });
    await expect(submit).not.toBeDisabled();
  },
};

/** Closed — dialog not rendered (dialogMode is null). */
export const Closed: Story = {
  render: () => {
    useLeagueStore.getState().closeDialog();
    return <JoinLeagueDialog />;
  },
};
