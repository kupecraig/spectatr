import type { Meta, StoryObj } from '@storybook/react';
import { PlayerSlot } from './PlayerSlot';
import type { Player } from '@/mocks/playerData';
import playersData from '@data/trc-2025/players.json';

const players = playersData as Player[];

const meta = {
  title: 'Components/PlayerSlot',
  component: PlayerSlot,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    player: {
      description: 'Player data object',
    },
    onRemoveClick: {
      description: 'Callback when remove button clicked',
    },
  },
} satisfies Meta<typeof PlayerSlot>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default player slot
export const Default: Story = {
  args: {
    player: players[0],
    onRemoveClick: () => alert('Remove clicked'),
  },
};

// Without remove button
export const WithoutRemoveButton: Story = {
  args: {
    player: players[0],
  },
};

// All positions
export const AllPositions = {
  render: () => {
    // Get unique positions from actual player data (sport-agnostic)
    const uniquePositions = Array.from(new Set(players.map(p => p.position)));
    
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '16px',
        padding: '16px',
      }}>
        {uniquePositions.map((position) => {
          const player = players.find(p => p.position === position);
          return player ? (
            <PlayerSlot
              key={player.id}
              player={player}
              onRemoveClick={() => console.log('Remove', player.id)}
            />
          ) : null;
        })}
      </div>
    );
  },
};

// Player states
export const PlayerStates = {
  render: () => {
    const player = players[0];
    return (
      <div style={{ display: 'flex', gap: '16px', padding: '16px' }}>
        <div>
          <h4 style={{ margin: '0 0 8px 0', textAlign: 'center' }}>Uncertain</h4>
          <PlayerSlot
            player={{ ...player, status: 'uncertain' }}
            onRemoveClick={() => console.log('Remove')}
          />
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px 0', textAlign: 'center' }}>Locked</h4>
          <PlayerSlot
            player={{ ...player, isLocked: true }}
            onRemoveClick={() => console.log('Remove')}
          />
        </div>
      </div>
    );
  },
};
