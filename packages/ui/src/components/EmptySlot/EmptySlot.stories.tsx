import type { Meta, StoryObj } from '@storybook/react';
import { EmptySlot } from './EmptySlot';
import { fieldLayout } from '@/config/fieldLayouts';

const meta = {
  title: 'Components/EmptySlot',
  component: EmptySlot,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Position label',
    },
    onClick: {
      description: 'Callback when slot clicked',
    },
  },
} satisfies Meta<typeof EmptySlot>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default empty slot
export const Default: Story = {
  args: {
    label: fieldLayout.rows[0].positions[0].label,
    onClick: () => alert('Slot clicked'),
  },
};

// All positions from config
export const AllPositions = {
  render: () => {
    const allPositions = fieldLayout.rows.flatMap(row => row.positions);
    
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 1fr)', 
        gap: '16px',
        padding: '16px',
      }}>
        {allPositions.map((pos) => (
          <EmptySlot
            key={pos.id}
            label={pos.label}
            onClick={() => console.log(`Select ${pos.label}`)}
          />
        ))}
      </div>
    );
  },
};

// Formation layout - complete 15-player rugby formation
export const FormationLayout = {
  render: () => (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '16px',
      padding: '24px',
      backgroundColor: '#1a472a',
      borderRadius: '8px',
      minWidth: '600px',
    }}>
      {fieldLayout.rows.map((row) => (
        <div 
          key={row.id}
          style={{ 
            display: 'flex', 
            gap: `${row.spacing * 8}px`,
            justifyContent: row.justifyContent,
          }}
        >
          {row.positions.map((pos) => (
            <EmptySlot
              key={pos.id}
              label={pos.label}
              onClick={() => console.log(`Select ${pos.label} (${pos.id})`)}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};
