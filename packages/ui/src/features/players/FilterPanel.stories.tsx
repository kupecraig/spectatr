import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { FilterPanel } from './FilterPanel';
import { useMyTeamStore } from '@/stores';

const meta = {
  title: 'Features/Players/FilterPanel',
  component: FilterPanel,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FilterPanel>;

export default meta;

const defaultProps = {
  squadNames: ['Argentina', 'Australia', 'New Zealand', 'South Africa'],
  maxPlayerPrice: 15,
};

// Default state - collapsed
export const Collapsed = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.resetFilters();
    store.toggleFilters(); // Close it
    
    return <FilterPanel {...defaultProps} />;
  },
};

// Expanded - no filters active
export const ExpandedEmpty = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.resetFilters();
    if (!store.filtersExpanded) store.toggleFilters();
    
    return <FilterPanel {...defaultProps} />;
  },
};

// Search filter active
export const WithSearchFilter = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.resetFilters();
    store.setFilters({ search: 'Jordan' });
    if (!store.filtersExpanded) store.toggleFilters();
    
    return <FilterPanel {...defaultProps} />;
  },
};

// Position filter active
export const WithPositionFilter = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.resetFilters();
    store.setFilters({ position: 'outside_back' });
    if (!store.filtersExpanded) store.toggleFilters();
    
    return <FilterPanel {...defaultProps} />;
  },
};

// Squad filter active
export const WithSquadFilter = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.resetFilters();
    store.setFilters({ squad: 'South Africa' });
    if (!store.filtersExpanded) store.toggleFilters();
    
    return <FilterPanel {...defaultProps} />;
  },
};

// Price range filter active
export const WithPriceFilter = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.resetFilters();
    store.setFilters({ minPrice: 6, maxPrice: 10 });
    if (!store.filtersExpanded) store.toggleFilters();
    
    return <FilterPanel {...defaultProps} />;
  },
};

// Budget filter active
export const WithBudgetFilter = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.resetFilters();
    store.setFilters({ withinBudget: true });
    if (!store.filtersExpanded) store.toggleFilters();
    
    return <FilterPanel {...defaultProps} />;
  },
};

// Multiple filters active
export const MultipleFiltersActive = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.resetFilters();
    store.setFilters({ 
      search: 'Jordan',
      position: 'outside_back',
      squad: 'New Zealand',
      withinBudget: true,
    });
    if (!store.filtersExpanded) store.toggleFilters();
    
    return <FilterPanel {...defaultProps} />;
  },
};

// All filters active - shows badge count
export const AllFiltersActive = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.resetFilters();
    store.setFilters({ 
      search: 'Kolbe',
      position: 'outside_back',
      squad: 'South Africa',
      minPrice: 8,
      maxPrice: 12,
      withinBudget: true,
    });
    if (!store.filtersExpanded) store.toggleFilters();
    
    return <FilterPanel {...defaultProps} />;
  },
};

// Collapsed with active filters (shows badge)
export const CollapsedWithActiveFilters = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.resetFilters();
    store.setFilters({ 
      position: 'fly_half',
      squad: 'Australia',
      withinBudget: true,
    });
    if (store.filtersExpanded) store.toggleFilters();
    
    return <FilterPanel {...defaultProps} />;
  },
};

// Interaction test - Toggle filters
export const ToggleFiltersInteraction: StoryObj<typeof FilterPanel> = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.resetFilters();
    if (store.filtersExpanded) store.toggleFilters(); // Start collapsed
    
    return <FilterPanel {...defaultProps} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Find and click the filter button
    const filterButton = canvas.getByRole('button', { name: /filter/i });
    await userEvent.click(filterButton);
    
    // Verify filters are now visible (search input should appear)
    const searchInput = await canvas.findByPlaceholderText(/search/i);
    await expect(searchInput).toBeVisible();
  },
};

// Interaction test - Type in search
export const SearchTypingInteraction: StoryObj<typeof FilterPanel> = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.resetFilters();
    if (!store.filtersExpanded) store.toggleFilters();
    
    return <FilterPanel {...defaultProps} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Find search input
    const searchInput = canvas.getByPlaceholderText(/search/i);
    
    // Type player name
    await userEvent.type(searchInput, 'Cheslin Kolbe');
    
    // Verify value
    await expect(searchInput).toHaveValue('Cheslin Kolbe');
  },
};

// Interaction test - Clear filters
export const ClearFiltersInteraction: StoryObj<typeof FilterPanel> = {
  render: () => {
    const store = useMyTeamStore.getState();
    store.resetFilters();
    store.setFilters({ 
      search: 'Test',
      position: 'fly_half',
      squad: 'New Zealand',
    });
    if (!store.filtersExpanded) store.toggleFilters();
    
    return <FilterPanel {...defaultProps} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Find and click clear button
    const clearButton = canvas.getByRole('button', { name: /clear/i });
    await userEvent.click(clearButton);
    
    // Verify search input is cleared
    const searchInput = canvas.getByPlaceholderText(/search/i);
    await expect(searchInput).toHaveValue('');
  },
};
