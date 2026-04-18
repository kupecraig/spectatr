import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { within, userEvent, expect } from '@storybook/test';
import { TransferButton } from './TransferButton';

const meta = {
  title: 'Features/Squad/TransferButton',
  component: TransferButton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    isEditing: {
      description: 'Whether user is in edit mode (has unsaved changes)',
      control: 'boolean',
    },
    isSaving: {
      description: 'Whether a save operation is in progress',
      control: 'boolean',
    },
    hasLeague: {
      description: 'Whether a league is selected',
      control: 'boolean',
    },
    onMakeTransfers: {
      description: 'Callback when "Make Transfers" is clicked',
    },
    onSaveTransfers: {
      description: 'Callback when "Save Transfers" is clicked',
    },
  },
} satisfies Meta<typeof TransferButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** View mode — Shows "Make Transfers" button (outlined) */
export const ViewMode: Story = {
  args: {
    isEditing: false,
    isSaving: false,
    hasLeague: true,
    onMakeTransfers: fn(),
    onSaveTransfers: fn(),
  },
};

/** Edit mode — Shows "Save Transfers" button (contained) */
export const EditMode: Story = {
  args: {
    isEditing: true,
    isSaving: false,
    hasLeague: true,
    onMakeTransfers: fn(),
    onSaveTransfers: fn(),
  },
};

/** Saving state — Shows spinner and disabled button */
export const Saving: Story = {
  args: {
    isEditing: true,
    isSaving: true,
    hasLeague: true,
    onMakeTransfers: fn(),
    onSaveTransfers: fn(),
  },
};

/** No league selected — Button is hidden */
export const NoLeague: Story = {
  args: {
    isEditing: false,
    isSaving: false,
    hasLeague: false,
    onMakeTransfers: fn(),
    onSaveTransfers: fn(),
  },
};

/** Interaction test: Click "Make Transfers" fires callback */
export const ClickMakeTransfers: Story = {
  args: {
    isEditing: false,
    isSaving: false,
    hasLeague: true,
    onMakeTransfers: fn(),
    onSaveTransfers: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /make transfers/i });
    
    await userEvent.click(button);
    
    await expect(args.onMakeTransfers).toHaveBeenCalledOnce();
    await expect(args.onSaveTransfers).not.toHaveBeenCalled();
  },
};

/** Interaction test: Click "Save Transfers" fires callback */
export const ClickSaveTransfers: Story = {
  args: {
    isEditing: true,
    isSaving: false,
    hasLeague: true,
    onMakeTransfers: fn(),
    onSaveTransfers: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /save transfers/i });
    
    await userEvent.click(button);
    
    await expect(args.onSaveTransfers).toHaveBeenCalledOnce();
    await expect(args.onMakeTransfers).not.toHaveBeenCalled();
  },
};

/** Saving mode: Button is disabled and cannot be clicked */
export const SavingDisabled: Story = {
  args: {
    isEditing: true,
    isSaving: true,
    hasLeague: true,
    onMakeTransfers: fn(),
    onSaveTransfers: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /saving/i });
    
    await expect(button).toBeDisabled();
    await expect(args.onSaveTransfers).not.toHaveBeenCalled();
  },
};
