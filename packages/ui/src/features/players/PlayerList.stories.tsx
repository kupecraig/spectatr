import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { PlayerList } from './PlayerList';
import { useMyTeamStore } from '@/stores';
import type { Player } from '@/mocks/playerData';
import playersData from '@data/trc-2025/players.json';
import squadsData from '@data/trc-2025/squads.json';
import { sportSquadConfig } from '@spectatr/shared-types';
import { storyQueryClient } from '@/test/storyQueryClient';

const players = playersData as Player[];

// Pre-seed the React Query cache so PlayerList renders without a live backend.
// Keys mirror what useTenantQuery produces: [tenantId, ...queryKey]
// PlayerList calls usePlayersQuery({ limit: 500, offset: 0, sortBy }) → cleanInput includes sortBy
function seedPlayerCache(sortBy = 'totalPoints') {
  storyQueryClient.setQueryData(
    ['trc-2025', 'players', { limit: 500, offset: 0, sortBy }],
    { players, total: players.length, limit: 500, offset: 0 },
  );
  storyQueryClient.setQueryData(['trc-2025', 'squads'], squadsData);
}

const meta = {
  title: 'Features/Players/PlayerList',
  component: PlayerList,
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
} satisfies Meta<typeof PlayerList>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default state - no filters, no selections
export const Default: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    store.resetFilters();
    
    return <PlayerList />;
  },
};

// With search filter
export const WithSearchFilter: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    store.resetFilters();
    store.setFilters({ search: 'Kolbe' });
    if (!store.filtersExpanded) store.toggleFilters();
    
    return <PlayerList />;
  },
};

// With position filter
export const WithPositionFilter: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    store.resetFilters();
    store.setFilters({ position: 'fly_half' });
    if (!store.filtersExpanded) store.toggleFilters();
    
    return <PlayerList />;
  },
};

// With budget filter
export const WithBudgetFilter: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    store.resetFilters();
    store.setFilters({ withinBudget: true });
    if (!store.filtersExpanded) store.toggleFilters();
    
    return <PlayerList />;
  },
};

// Multiple filters active
export const MultipleFilters: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    store.resetFilters();
    store.setFilters({ 
      position: 'outside_back',
      squad: 'South Africa',
      minPrice: 8,
      maxPrice: 12,
    });
    if (!store.filtersExpanded) store.toggleFilters();
    
    return <PlayerList />;
  },
};

// With some players already selected
export const WithSelections: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    store.resetFilters();
    
    // Add 5 players
    const playersToAdd = players.slice(0, 5);
    playersToAdd.forEach(player => store.addPlayer(player));
    
    return <PlayerList />;
  },
};

// Near budget limit
export const NearBudgetLimit: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    store.resetFilters();
    
    // Add expensive players to approach budget limit
    const expensivePlayers = [...players]
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 12);
    
    expensivePlayers.forEach(player => store.addPlayer(player));
    
    return <PlayerList />;
  },
};

// Loading state
export const Loading: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    store.resetFilters();
    store.setIsLoading(true);
    
    return <PlayerList />;
  },
};

// Sort by Total Points (default)
export const SortByPoints: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    store.resetFilters();
    store.setFilters({ sortBy: 'totalPoints' });
    seedPlayerCache('totalPoints');
    
    return <PlayerList />;
  },
};

// Sort by Tries
export const SortByTries: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    store.resetFilters();
    store.setFilters({ sortBy: 'tries' });
    seedPlayerCache('tries');
    
    return <PlayerList />;
  },
};

// Interaction test - Search for player
export const SearchInteraction: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    store.resetFilters();
    
    return <PlayerList />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Get a real player name from data
    const testPlayer = players[0];
    const searchTerm = testPlayer.lastName;
    
    // Open filters if collapsed - match the full button text
    const filterButton = canvas.getByRole('button', { name: /search filters/i });
    await userEvent.click(filterButton);
    
    // Wait for search input to appear
    const searchInput = await canvas.findByPlaceholderText(/search/i);
    
    // Type in search
    await userEvent.type(searchInput, searchTerm);
    
    // Verify search input has value
    await expect(searchInput).toHaveValue(searchTerm);
  },
};

// Interaction test - Select player
export const SelectPlayerInteraction: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    store.resetFilters();
    store.setIsLoading(false);
    seedPlayerCache();

    return <PlayerList />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for the first player to appear (cache is pre-seeded so this is fast)
    const firstPlayer = players[0];
    const firstPlayerName = `${firstPlayer.firstName[0]}. ${firstPlayer.lastName.toUpperCase()}`;
    await canvas.findByText(firstPlayerName, {}, { timeout: 5000 });

    // Find the first non-disabled icon-only button and click it
    const allButtons = canvas.getAllByRole('button');
    const playerButton = allButtons.find(btn => {
      const isIconButton = btn.querySelector('svg') && !btn.textContent;
      return isIconButton && !btn.hasAttribute('disabled');
    });

    if (playerButton) {
      await userEvent.click(playerButton);
    }
  },
};

// Interaction test - Remove player
export const RemovePlayerInteraction: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    store.resetFilters();
    store.setIsLoading(false);
    seedPlayerCache();

    // Pre-add a player to the squad
    const playerToRemove = players[0];
    store.addPlayer(playerToRemove);

    return <PlayerList />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for players to render
    const firstPlayer = players[0];
    const firstPlayerName = `${firstPlayer.firstName[0]}. ${firstPlayer.lastName.toUpperCase()}`;
    await canvas.findByText(firstPlayerName, {}, { timeout: 5000 });

    // The first player is already selected — its button is the remove button
    const allButtons = canvas.getAllByRole('button');
    const removeButton = allButtons.find(btn => btn.querySelector('svg') && !btn.textContent);

    if (removeButton) {
      await userEvent.click(removeButton);
    }
  },
};

// Interaction test - Filter by position
export const FilterByPositionInteraction: Story = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.clearSquad();
    store.resetFilters();
    
    return <PlayerList />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Open filters - match the full button text
    const filterButton = canvas.getByRole('button', { name: /search filters/i });
    await userEvent.click(filterButton);
    
    // Wait for filters to expand
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Find position select by its ID using canvasElement
    const positionInput = canvasElement.querySelector('#position-filter');
    
    if (positionInput) {
      await userEvent.click(positionInput);
      
      // Wait for menu to open
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get first position from sport config (sport-agnostic)
      const firstPosition = Object.values(sportSquadConfig.positions)[0];
      
      // Select the first position option
      const positionOption = await within(document.body).findByRole('option', { name: new RegExp(firstPosition.label, 'i') });
      await userEvent.click(positionOption);
    }
  },
};
