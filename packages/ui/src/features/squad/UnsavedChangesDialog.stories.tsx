import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { within, userEvent, expect } from '@storybook/test';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';

const meta = {
  title: 'Features/Squad/UnsavedChangesDialog',
  component: UnsavedChangesDialog,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: {
    open: {
      description: 'Whether the dialog is open',
      control: 'boolean',
    },
    onClose: {
      description: 'Callback when Cancel is clicked',
    },
    onDiscard: {
      description: 'Callback when Discard Changes is clicked',
    },
  },
} satisfies Meta<typeof UnsavedChangesDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Default: Warning dialog with Discard and Cancel options */
export const Default: Story = {
  args: {
    open: true,
    onClose: fn(),
    onDiscard: fn(),
  },
};

/** Closed state: Dialog not visible */
export const Closed: Story = {
  args: {
    open: false,
    onClose: fn(),
    onDiscard: fn(),
  },
};

/** Interaction test: Clicking "Discard Changes" fires onDiscard callback */
export const DiscardInteraction: Story = {
  args: {
    open: true,
    onClose: fn(),
    onDiscard: fn(),
  },
  play: async ({ args }) => {
    const body = within(document.body);
    
    // Find and click the discard button
    const discardButton = body.getByRole('button', { name: /discard changes/i });
    await userEvent.click(discardButton);
    
    await expect(args.onDiscard).toHaveBeenCalledOnce();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

/** Interaction test: Clicking "Cancel" fires onClose callback */
export const CancelInteraction: Story = {
  args: {
    open: true,
    onClose: fn(),
    onDiscard: fn(),
  },
  play: async ({ args }) => {
    const body = within(document.body);
    
    // Find and click the cancel button
    const cancelButton = body.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelButton);
    
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onDiscard).not.toHaveBeenCalled();
  },
};

/** Interaction test: Clicking close icon fires onClose callback */
export const CloseIconInteraction: Story = {
  args: {
    open: true,
    onClose: fn(),
    onDiscard: fn(),
  },
  play: async ({ args }) => {
    const body = within(document.body);
    
    // Find and click the close icon
    const closeButton = body.getByRole('button', { name: /close dialog/i });
    await userEvent.click(closeButton);
    
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onDiscard).not.toHaveBeenCalled();
  },
};
