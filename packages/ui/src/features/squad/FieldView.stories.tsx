import type { Meta } from '@storybook/react';
import { FieldView } from './FieldView';
import { useMyTeamStore } from '@/stores';
import type { Player } from '@/mocks/playerData';
import playersData from '@data/trc-2025/players.json';
import { sportSquadConfig, type PositionRequirement } from '@spectatr/shared-types';

const players = playersData as Player[];

const meta = {
  title: 'Features/Squad/FieldView',
  component: FieldView,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '800px', height: '700px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FieldView>;

export default meta;

// Empty squad - no players selected
export const EmptySquad = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    
    return <FieldView />;
  },
};

// Partial squad - 5 players in various positions
export const PartialSquad = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    
    // Add 5 players across different positions
    const fullback = players.find(p => p.position === 'outside_back');
    const center = players.find(p => p.position === 'center');
    const flyHalf = players.find(p => p.position === 'fly_half');
    const lock = players.find(p => p.position === 'lock');
    const prop = players.find(p => p.position === 'prop');
    
    [fullback, center, flyHalf, lock, prop].forEach(player => {
      if (player) store.addPlayer(player);
    });
    
    return <FieldView />;
  },
};

// Full squad - all 15 positions filled
export const FullSquad = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    
    // Get position counts from sport config (sport-agnostic)
    const positionCounts = Object.entries(sportSquadConfig.positions).reduce(
      (acc, [position, config]) => ({ 
        ...acc, 
        [position]: (config as PositionRequirement).required 
      }),
      {} as Record<string, number>
    );
    
    Object.entries(positionCounts).forEach(([position, count]) => {
      const positionPlayers = players.filter(p => p.position === position).slice(0, count);
      positionPlayers.forEach(player => store.addPlayer(player));
    });
    
    return <FieldView />;
  },
};

// Loading state
export const Loading = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.setIsLoading(true);
    
    return <FieldView />;
  },
};
