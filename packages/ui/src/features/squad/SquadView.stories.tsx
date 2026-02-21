import type { Meta, StoryObj } from '@storybook/react';
import { SquadView } from './SquadView';
import { useMyTeamStore } from '@/stores';
import type { Player } from '@/mocks/playerData';
import playersData from '@data/trc-2025/players.json';
import { sportSquadConfig, type PositionRequirement } from '@spectatr/shared-types';

const players = playersData as Player[];

const meta = {
  title: 'Features/Squad/SquadView',
  component: SquadView,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SquadView>;

export default meta;
type Story = StoryObj<typeof meta>;

// Empty squad - no players selected
export const EmptySquad: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    
    return <SquadView />;
  },
};

// Partial squad - some positions filled
export const PartialSquad: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    
    // Add 8 players across different positions
    const positions = ['outside_back', 'center', 'fly_half', 'scrum_half', 'loose_forward', 'lock', 'prop', 'hooker'];
    positions.forEach((position) => {
      const player = players.find(p => p.position === position);
      if (player) store.addPlayer(player);
    });
    
    return <SquadView />;
  },
};

// Full squad - all 15 positions filled
export const FullSquad: Story = {
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
    
    return <SquadView />;
  },
};

// Squad with high-value players (budget constraint)
export const HighValueSquad: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    
    // Add expensive players
    const expensivePlayers = [...players]
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
    
    expensivePlayers.forEach(player => store.addPlayer(player));
    
    return <SquadView />;
  },
};

// Squad from same team (testing squad limit validation)
export const SameTeamPlayers: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    
    // Add multiple players from South Africa (squadId: 1)
    const southAfricaPlayers = players
      .filter(p => p.squadId === 1)
      .slice(0, 8);
    
    southAfricaPlayers.forEach(player => store.addPlayer(player));
    
    return <SquadView />;
  },
};

// Loading state
export const Loading: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.setIsLoading(true);
    
    return <SquadView />;
  },
};
