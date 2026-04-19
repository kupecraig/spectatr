import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { within, userEvent, expect } from '@storybook/test';
import { ConfirmTransfersDialog } from './ConfirmTransfersDialog';
import type { Player } from '@/mocks/playerData';
import playersData from '@data/trc-2025/players.json';

const players = playersData as Player[];

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockAddedPlayers: Player[] = [
  players.find(p => p.position === 'fly_half')!,
  players.find(p => p.position === 'center')!,
];

const mockRemovedPlayers: Player[] = [
  players.find(p => p.position === 'scrum_half')!,
];

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Features/Squad/ConfirmTransfersDialog',
  component: ConfirmTransfersDialog,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: {
    open: {
      description: 'Whether the dialog is open',
      control: 'boolean',
    },
    isSaving: {
      description: 'Whether save is in progress',
      control: 'boolean',
    },
    budgetDelta: {
      description: 'Budget impact (positive = saved, negative = spent)',
      control: 'number',
    },
  },
} satisfies Meta<typeof ConfirmTransfersDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Default: Shows both added and removed players with budget impact */
export const Default: Story = {
  args: {
    open: true,
    onClose: fn(),
    onConfirm: fn(),
    transferDiff: {
      added: mockAddedPlayers,
      removed: mockRemovedPlayers,
    },
    budgetDelta: -500000, // Spent 0.5M
    isSaving: false,
  },
};

/** No changes: Empty transfer diff */
export const NoChanges: Story = {
  args: {
    open: true,
    onClose: fn(),
    onConfirm: fn(),
    transferDiff: {
      added: [],
      removed: [],
    },
    budgetDelta: 0,
    isSaving: false,
  },
};

/** Only adds: Players added, none removed */
export const OnlyAdds: Story = {
  args: {
    open: true,
    onClose: fn(),
    onConfirm: fn(),
    transferDiff: {
      added: mockAddedPlayers,
      removed: [],
    },
    budgetDelta: -2000000, // Spent 2M
    isSaving: false,
  },
};

/** Only removes: Players removed, none added */
export const OnlyRemoves: Story = {
  args: {
    open: true,
    onClose: fn(),
    onConfirm: fn(),
    transferDiff: {
      added: [],
      removed: mockRemovedPlayers,
    },
    budgetDelta: 1500000, // Saved 1.5M
    isSaving: false,
  },
};

/** Positive budget: Net savings (removed more expensive players) */
export const PositiveBudget: Story = {
  args: {
    open: true,
    onClose: fn(),
    onConfirm: fn(),
    transferDiff: {
      added: [players.find(p => p.position === 'hooker')!],
      removed: mockAddedPlayers,
    },
    budgetDelta: 2000000, // Saved 2M
    isSaving: false,
  },
};

/** Saving state: Shows spinner on confirm button */
export const Saving: Story = {
  args: {
    open: true,
    onClose: fn(),
    onConfirm: fn(),
    transferDiff: {
      added: mockAddedPlayers,
      removed: mockRemovedPlayers,
    },
    budgetDelta: -500000,
    isSaving: true,
  },
};

/** Interaction test: Clicking confirm fires onConfirm callback */
export const ConfirmInteraction: Story = {
  args: {
    open: true,
    onClose: fn(),
    onConfirm: fn(),
    transferDiff: {
      added: mockAddedPlayers,
      removed: mockRemovedPlayers,
    },
    budgetDelta: -500000,
    isSaving: false,
  },
  play: async ({ args }) => {
    const body = within(document.body);
    
    // Find and click the confirm button
    const confirmButton = body.getByRole('button', { name: /confirm transfers/i });
    await userEvent.click(confirmButton);
    
    await expect(args.onConfirm).toHaveBeenCalledOnce();
  },
};

/** Interaction test: Clicking cancel fires onClose callback */
export const CancelInteraction: Story = {
  args: {
    open: true,
    onClose: fn(),
    onConfirm: fn(),
    transferDiff: {
      added: mockAddedPlayers,
      removed: mockRemovedPlayers,
    },
    budgetDelta: -500000,
    isSaving: false,
  },
  play: async ({ args }) => {
    const body = within(document.body);
    
    // Find and click the cancel button
    const cancelButton = body.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelButton);
    
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};

/** Interaction test: Clicking close icon fires onClose callback */
export const CloseIconInteraction: Story = {
  args: {
    open: true,
    onClose: fn(),
    onConfirm: fn(),
    transferDiff: {
      added: mockAddedPlayers,
      removed: mockRemovedPlayers,
    },
    budgetDelta: -500000,
    isSaving: false,
  },
  play: async ({ args }) => {
    const body = within(document.body);
    
    // Find and click the close icon
    const closeButton = body.getByRole('button', { name: /close dialog/i });
    await userEvent.click(closeButton);
    
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};

/** Closed state: Dialog not visible */
export const Closed: Story = {
  args: {
    open: false,
    onClose: fn(),
    onConfirm: fn(),
    transferDiff: {
      added: mockAddedPlayers,
      removed: mockRemovedPlayers,
    },
    budgetDelta: -500000,
    isSaving: false,
  },
};
