import type { Meta, StoryObj } from '@storybook/react';
import { LeaguePicker } from './LeaguePicker';

const meta = {
  title: 'Features/Squad/LeaguePicker',
  component: LeaguePicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '16px', minWidth: '300px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LeaguePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state — no league selected.
 * Requires a real API or MSW mock to show leagues.
 */
export const Default: Story = {};
