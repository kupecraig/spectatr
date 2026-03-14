import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { CreateLeagueDialog } from './CreateLeagueDialog';
import { useLeagueStore } from '@/stores/leagueStore';

const meta = {
  title: 'Features/Leagues/CreateLeagueDialog',
  component: CreateLeagueDialog,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  // Reset store before every story so dialog state is clean
  beforeEach: () => {
    useLeagueStore.getState().closeDialog();
  },
} satisfies Meta<typeof CreateLeagueDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Helper to open the dialog ────────────────────────────────────────────────

function openCreate() {
  useLeagueStore.getState().openCreateDialog();
}

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Dialog in its empty initial state. */
export const Empty: Story = {
  render: () => {
    openCreate();
    return <CreateLeagueDialog />;
  },
};

/** Validation errors shown after the user starts typing invalid values. */
export const WithValidationErrors: Story = {
  render: () => {
    useLeagueStore.getState().openCreateDialog({
      name: 'Ab',       // too short — will show inline error
      teamName: '',
    });
    return <CreateLeagueDialog />;
  },
  play: async () => {
    // MUI Dialog renders in a portal outside #storybook-root — use document.body
    const body = within(document.body);

    // Touch the name field to reveal validation
    const nameInput = body.getByLabelText(/league name/i);
    await userEvent.click(nameInput);
    await userEvent.tab(); // blur to trigger error

    // The submit button should remain disabled
    const submit = body.getByRole('button', { name: /create league/i });
    await expect(submit).toBeDisabled();
  },
};

/** Submit button enabled when all required fields are filled in correctly. */
export const ReadyToSubmit: Story = {
  render: () => {
    useLeagueStore.getState().openCreateDialog({
      name: 'Office League 2026',
      teamName: 'The Thunderbolts',
    });
    return <CreateLeagueDialog />;
  },
  play: async () => {
    const submit = within(document.body).getByRole('button', { name: /create league/i });
    await expect(submit).not.toBeDisabled();
  },
};

/** Full interaction — user types a league name, team name, then can submit. */
export const UserTypesForm: Story = {
  render: () => {
    openCreate();
    return <CreateLeagueDialog />;
  },
  play: async () => {
    const body = within(document.body);

    // Type league name
    const nameInput = body.getByLabelText(/league name/i);
    await userEvent.type(nameInput, 'Friday Night Rugby');

    // Type team name
    const teamInput = body.getByLabelText(/your team name/i);
    await userEvent.type(teamInput, 'Midnight Scrummers');

    // Submit should now be enabled
    const submit = body.getByRole('button', { name: /create league/i });
    await expect(submit).not.toBeDisabled();
  },
};

/** Closed state — dialog not visible (dialogMode is null). */
export const Closed: Story = {
  render: () => {
    useLeagueStore.getState().closeDialog();
    return <CreateLeagueDialog />;
  },
};
