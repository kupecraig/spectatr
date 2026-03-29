import type { Meta, StoryObj } from '@storybook/react';
import { PlayerListItem } from './PlayerListItem';
import type { Player } from '@/mocks/playerData';
import playersData from '@data/trc-2025/players.json';

const players = playersData as Player[];

const meta = {
  title: 'Features/Players/PlayerListItem',
  component: PlayerListItem,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    player: {
      description: 'Player data object',
    },
    validationError: {
      control: 'text',
      description: 'Validation error message (e.g., "Over budget")',
    },
    isDisabled: {
      control: 'boolean',
      description: 'Whether player can be added to squad',
    },
  },
} satisfies Meta<typeof PlayerListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default state - available player
export const Default: Story = {
  args: {
    player: players[0],
    isDisabled: false,
  },
};

// Disabled state (e.g., over budget)
export const Disabled: Story = {
  args: {
    player: players[0],
    isDisabled: true,
    validationError: 'Over budget',
  },
};

// With validation error
export const ValidationError: Story = {
  args: {
    player: players[0],
    isDisabled: true,
    validationError: 'Squad full - max 3 players from same team',
  },
};

// All positions showcase
export const AllPositions = {
  render: () => {
    // Get unique positions from actual player data (sport-agnostic)
    const uniquePositions = Array.from(new Set(players.map(p => p.position)));
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
        {uniquePositions.map((position) => {
          const player = players.find(p => p.position === position);
          return player ? (
            <PlayerListItem
              key={player.id}
              player={player}
              isDisabled={false}
            />
          ) : null;
        })}
      </div>
    );
  },
};

// Player statuses
export const PlayerStatuses = {
  render: () => {
    const player = players[0];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h4 style={{ margin: '0 0 8px 0' }}>Available (no icon)</h4>
          <PlayerListItem
            player={{ ...player, status: 'available' }}
            isDisabled={false}
          />
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px 0' }}>Selected (no icon)</h4>
          <PlayerListItem
            player={{ ...player, status: 'selected' }}
            isDisabled={false}
          />
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px 0' }}>Not Selected (no icon)</h4>
          <PlayerListItem
            player={{ ...player, status: 'not-selected' }}
            isDisabled={false}
          />
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px 0' }}>Uncertain (amber HelpOutline icon)</h4>
          <PlayerListItem
            player={{ ...player, status: 'uncertain' }}
            isDisabled={false}
          />
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px 0' }}>Injured (red Healing icon)</h4>
          <PlayerListItem
            player={{ ...player, status: 'injured' }}
            isDisabled={false}
          />
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px 0' }}>Eliminated (disabled Block icon)</h4>
          <PlayerListItem
            player={{ ...player, status: 'eliminated' }}
            isDisabled={false}
          />
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px 0' }}>Benched (secondary EventSeat icon)</h4>
          <PlayerListItem
            player={{ ...player, status: 'benched' }}
            isDisabled={false}
          />
        </div>
      </div>
    );
  },
};

// Locked player
export const LockedPlayer = {
  render: () => {
    const player = players[0];
    return (
      <PlayerListItem
        player={{ ...player, isLocked: true, status: 'available' }}
        isDisabled={false}
      />
    );
  },
};

// Locked and injured player (both icons visible simultaneously)
export const LockedAndInjured = {
  render: () => {
    const player = players[0];
    return (
      <PlayerListItem
        player={{ ...player, isLocked: true, status: 'injured' }}
        isDisabled={false}
      />
    );
  },
};

// High vs low selection percentage
export const SelectionPercentages = {
  render: () => {
    const basePlayer = players[0];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
        <PlayerListItem
          player={{ 
            ...basePlayer, 
            selected: { '1': 95.2, percent: 95.2 },
            firstName: 'Popular',
            lastName: 'Player',
          }}
          isDisabled={false}
        />
        <PlayerListItem
          player={{ 
            ...basePlayer, 
            id: 999,
            selected: { '1': 2.5, percent: 2.5 },
            firstName: 'Differential',
            lastName: 'Pick',
          }}
          isDisabled={false}
        />
      </div>
    );
  },
};

// Different price ranges
export const PriceRanges = {
  render: () => {
    const basePlayer = players[0];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
        <PlayerListItem
          player={{ 
            ...basePlayer, 
            cost: 12000000,
            firstName: 'Premium',
            lastName: 'Star',
          }}
          isDisabled={false}
        />
        <PlayerListItem
          player={{ 
            ...basePlayer, 
            id: 998,
            cost: 7500000,
            firstName: 'Mid-Price',
            lastName: 'Option',
          }}
          isDisabled={false}
        />
        <PlayerListItem
          player={{ 
            ...basePlayer, 
            id: 997,
            cost: 4000000,
            firstName: 'Budget',
            lastName: 'Enabler',
          }}
          isDisabled={false}
        />
      </div>
    );
  },
};
