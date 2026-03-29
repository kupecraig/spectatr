import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect, waitFor } from '@storybook/test';
import { LeagueInvitePanel } from './LeagueInvitePanel';

const meta = {
  title: 'Features/Leagues/LeagueInvitePanel',
  component: LeagueInvitePanel,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof LeagueInvitePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default state — code displayed, copy button ready. */
export const Default: Story = {
  args: { inviteCode: 'ABCD1234' },
};

/** Short code showing monospace letter-spacing. */
export const AlphanumericCode: Story = {
  args: { inviteCode: 'X4Q9RZ7W' },
};

/**
 * Interaction test — clicking Copy shows the "Copied!" snackbar.
 * navigator.clipboard is mocked in the test environment.
 */
export const CopyInteraction: Story = {
  args: { inviteCode: 'ABCD1234' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Mock clipboard API — navigator.clipboard is read-only so use defineProperty
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.resolve() },
    });

    const copyButton = canvas.getByRole('button', { name: /copy/i });
    await userEvent.click(copyButton);

    // MUI Snackbar animates in — use waitFor so the assertion retries until visible
    await waitFor(async () => {
      const snackbar = await within(document.body).findByText('Invite code copied!');
      expect(snackbar).toBeVisible();
    });
  },
};
