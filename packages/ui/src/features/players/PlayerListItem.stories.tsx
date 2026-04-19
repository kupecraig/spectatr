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
    sortBy: {
      control: 'select',
      options: ['totalPoints', 'avgPoints', 'lastRoundPoints', 'cost', 'tries', 'tackles', 'conversions', 'metresGained'],
      description: 'Current sort option - determines which stat badge to display',
    },
  },
} satisfies Meta<typeof PlayerListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper to create player with scoring data
const createPlayerWithPoints = (
  basePlayer: Player,
  overrides: { totalPoints?: number; avgPoints?: number; lastRoundPoints?: number; stats?: Record<string, unknown> }
): Player & { totalPoints: number; avgPoints: number; lastRoundPoints: number } => ({
  ...basePlayer,
  totalPoints: overrides.totalPoints ?? 0,
  avgPoints: overrides.avgPoints ?? 0,
  lastRoundPoints: overrides.lastRoundPoints ?? 0,
  stats: { ...basePlayer.stats, ...overrides.stats },
} as Player & { totalPoints: number; avgPoints: number; lastRoundPoints: number });

// Default state - available player with total points badge
export const Default: Story = {
  args: {
    player: createPlayerWithPoints(players[0], { totalPoints: 125, avgPoints: 12.5, lastRoundPoints: 18 }),
    isDisabled: false,
    sortBy: 'totalPoints',
  },
};

// With Total Points badge (sortBy: totalPoints)
export const WithTotalPoints: Story = {
  args: {
    player: createPlayerWithPoints(players[0], { totalPoints: 150, avgPoints: 15.0, lastRoundPoints: 22 }),
    isDisabled: false,
    sortBy: 'totalPoints',
  },
};

// With Avg Points badge (sortBy: avgPoints)
export const WithAvgPoints: Story = {
  args: {
    player: createPlayerWithPoints(players[0], { totalPoints: 150, avgPoints: 15.0, lastRoundPoints: 22 }),
    isDisabled: false,
    sortBy: 'avgPoints',
  },
};

// Sorted by Tries - shows tries badge
export const SortedByTries: Story = {
  args: {
    player: createPlayerWithPoints(players[0], { 
      totalPoints: 120,
      avgPoints: 12.0,
      lastRoundPoints: 15,
      stats: { tries: 8 },
    }),
    isDisabled: false,
    sortBy: 'tries',
  },
};

// Sorted by Tackles - shows tackles badge
export const SortedByTackles: Story = {
  args: {
    player: createPlayerWithPoints(players[0], { 
      totalPoints: 100,
      avgPoints: 10.0,
      lastRoundPoints: 12,
      stats: { tackles: 45 },
    }),
    isDisabled: false,
    sortBy: 'tackles',
  },
};

// Zero Points - shows 0 gracefully
export const ZeroPoints: Story = {
  args: {
    player: createPlayerWithPoints(players[0], { totalPoints: 0, avgPoints: 0, lastRoundPoints: 0 }),
    isDisabled: false,
    sortBy: 'totalPoints',
  },
};

// Sorted by Cost - no badge shown
export const SortedByCost: Story = {
  args: {
    player: createPlayerWithPoints(players[0], { totalPoints: 100, avgPoints: 10.0, lastRoundPoints: 12 }),
    isDisabled: false,
    sortBy: 'cost',
  },
};

// Disabled state (e.g., over budget)
export const Disabled: Story = {
  args: {
    player: createPlayerWithPoints(players[0], { totalPoints: 125, avgPoints: 12.5, lastRoundPoints: 18 }),
    isDisabled: true,
    validationError: 'Over budget',
    sortBy: 'totalPoints',
  },
};

// With validation error
export const ValidationError: Story = {
  args: {
    player: createPlayerWithPoints(players[0], { totalPoints: 125, avgPoints: 12.5, lastRoundPoints: 18 }),
    isDisabled: true,
    validationError: 'Squad full - max 3 players from same team',
    sortBy: 'totalPoints',
  },
};

// All positions showcase
export const AllPositions = {
  render: () => {
    // Get unique positions from actual player data (sport-agnostic)
    const uniquePositions = Array.from(new Set(players.map(p => p.position)));
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
        {uniquePositions.map((position, index) => {
          const player = players.find(p => p.position === position);
          return player ? (
            <PlayerListItem
              key={player.id}
              player={createPlayerWithPoints(player, { 
                totalPoints: 100 + index * 10,
                avgPoints: 10 + index,
                lastRoundPoints: 15 + index * 2,
              })}
              isDisabled={false}
              sortBy="totalPoints"
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
    const player = createPlayerWithPoints(players[0], { totalPoints: 100, avgPoints: 10.0, lastRoundPoints: 15 });
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h4 style={{ margin: '0 0 8px 0' }}>Available (no icon)</h4>
          <PlayerListItem
            player={{ ...player, status: 'available' }}
            isDisabled={false}
            sortBy="totalPoints"
          />
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px 0' }}>Selected (no icon)</h4>
          <PlayerListItem
            player={{ ...player, status: 'selected' }}
            isDisabled={false}
            sortBy="totalPoints"
          />
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px 0' }}>Not Selected (no icon)</h4>
          <PlayerListItem
            player={{ ...player, status: 'not-selected' }}
            isDisabled={false}
            sortBy="totalPoints"
          />
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px 0' }}>Uncertain (amber HelpOutline icon)</h4>
          <PlayerListItem
            player={{ ...player, status: 'uncertain' }}
            isDisabled={false}
            sortBy="totalPoints"
          />
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px 0' }}>Injured (red Healing icon)</h4>
          <PlayerListItem
            player={{ ...player, status: 'injured' }}
            isDisabled={false}
            sortBy="totalPoints"
          />
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px 0' }}>Eliminated (disabled Block icon)</h4>
          <PlayerListItem
            player={{ ...player, status: 'eliminated' }}
            isDisabled={false}
            sortBy="totalPoints"
          />
        </div>
        <div>
          <h4 style={{ margin: '0 0 8px 0' }}>Benched (secondary EventSeat icon)</h4>
          <PlayerListItem
            player={{ ...player, status: 'benched' }}
            isDisabled={false}
            sortBy="totalPoints"
          />
        </div>
      </div>
    );
  },
};

// Locked player
export const LockedPlayer = {
  render: () => {
    const player = createPlayerWithPoints(players[0], { totalPoints: 100, avgPoints: 10.0, lastRoundPoints: 15 });
    return (
      <PlayerListItem
        player={{ ...player, isLocked: true, status: 'available' }}
        isDisabled={false}
        sortBy="totalPoints"
      />
    );
  },
};

// Locked and injured player (both icons visible simultaneously)
export const LockedAndInjured = {
  render: () => {
    const player = createPlayerWithPoints(players[0], { totalPoints: 100, avgPoints: 10.0, lastRoundPoints: 15 });
    return (
      <PlayerListItem
        player={{ ...player, isLocked: true, status: 'injured' }}
        isDisabled={false}
        sortBy="totalPoints"
      />
    );
  },
};

// High vs low selection percentage
export const SelectionPercentages = {
  render: () => {
    const basePlayer = createPlayerWithPoints(players[0], { totalPoints: 100, avgPoints: 10.0, lastRoundPoints: 15 });
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
          sortBy="totalPoints"
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
          sortBy="totalPoints"
        />
      </div>
    );
  },
};

// Different price ranges
export const PriceRanges = {
  render: () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
        <PlayerListItem
          player={createPlayerWithPoints({ 
            ...players[0], 
            cost: 12000000,
            firstName: 'Premium',
            lastName: 'Star',
          }, { totalPoints: 150, avgPoints: 15.0, lastRoundPoints: 20 })}
          isDisabled={false}
          sortBy="totalPoints"
        />
        <PlayerListItem
          player={createPlayerWithPoints({ 
            ...players[0], 
            id: 998,
            cost: 7500000,
            firstName: 'Mid-Price',
            lastName: 'Option',
          }, { totalPoints: 100, avgPoints: 10.0, lastRoundPoints: 12 })}
          isDisabled={false}
          sortBy="totalPoints"
        />
        <PlayerListItem
          player={createPlayerWithPoints({ 
            ...players[0], 
            id: 997,
            cost: 4000000,
            firstName: 'Budget',
            lastName: 'Enabler',
          }, { totalPoints: 60, avgPoints: 6.0, lastRoundPoints: 8 })}
          isDisabled={false}
          sortBy="totalPoints"
        />
      </div>
    );
  },
};
