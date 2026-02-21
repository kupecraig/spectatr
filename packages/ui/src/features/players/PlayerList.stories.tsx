import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { PlayerList } from './PlayerList';
import { useMyTeamStore } from '@/stores';
import type { Player } from '@/mocks/playerData';
import playersData from '@data/trc-2025/players.json';
import { sportSquadConfig } from '@spectatr/shared-types';

const players = playersData as Player[];

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
    store.setIsLoading(false); // Ensure not in loading state
    
    return <PlayerList />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Wait for players to load - look for first player's name
    const firstPlayer = players[0];
    const firstPlayerName = `${firstPlayer.firstName[0]}. ${firstPlayer.lastName.toUpperCase()}`;
    
    await canvas.findByText(firstPlayerName, {}, { timeout: 3000 });
    
    // Find the first IconButton that's NOT disabled
    const allButtons = canvas.getAllByRole('button');
    const playerButton = allButtons.find(btn => {
      // Look for icon buttons (round, with border) that aren't the filter/clear buttons
      const isIconButton = btn.querySelector('svg') && !btn.textContent;
      return isIconButton && !btn.hasAttribute('disabled');
    });
    
    // Click the button if found
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
    
    // Pre-add a player to the squad
    const playerToRemove = players[0];
    store.addPlayer(playerToRemove);
    
    return <PlayerList />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Wait for players to load
    const firstPlayer = players[0];
    const firstPlayerName = `${firstPlayer.firstName[0]}. ${firstPlayer.lastName.toUpperCase()}`;
    
    await canvas.findByText(firstPlayerName, {}, { timeout: 3000 });
    
    // Find all icon buttons
    const allButtons = canvas.getAllByRole('button');
    
    // Find the remove button (player is already selected, so it should be a remove button)
    const removeButton = allButtons.find(btn => {
      // Look for icon buttons with remove icon (PersonRemoveIcon)
      const hasRemoveIcon = btn.querySelector('svg') && !btn.textContent;
      return hasRemoveIcon;
    });
    
    // Click the remove button if found
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
