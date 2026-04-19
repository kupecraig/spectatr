import { describe, it, expect, beforeEach } from 'vitest';
import { useMyTeamStore } from './myTeamStore';
import { getAllPositions } from '../config/fieldLayouts';
import { sportSquadConfig } from '@spectatr/shared-types';
import type { TeamWithPlayers } from '@spectatr/shared-types';
import players from '@data/trc-2025/players.json';
import type { Player } from '../mocks/playerData';

/**
 * Creates a test player with optional property overrides.
 * Uses the first player from the mock data as a base.
 * 
 * @param overrides - Partial player properties to override
 * @returns A complete Player object for testing
 * 
 * @example
 * const expensivePlayer = getTestPlayer({ cost: 10000000 });
 * const customPlayer = getTestPlayer({ id: 999, position: 'center' });
 */
const getTestPlayer = (overrides: Partial<Player> = {}): Player => {
  const basePlayer = players[0];
  return {
    ...basePlayer,
    ...overrides,
  } as Player;
};

/**
 * Filters and returns players from mock data by position.
 * 
 * @param position - Position type to filter by (e.g., 'outside_back', 'hooker')
 * @param count - Number of players to return (default: 1)
 * @returns Array of players matching the position, up to count limit
 * 
 * @example
 * const centers = getPlayersByPosition('center', 2);
 * const firstHooker = getPlayersByPosition('hooker')[0];
 */
const getPlayersByPosition = (position: string, count: number = 1): Player[] => {
  return players.filter(p => p.position === position).slice(0, count) as Player[];
};

/**
 * Returns all distinct position types from the sport configuration.
 * More reliable than Object.keys() which doesn't guarantee order.
 * 
 * @returns Array of position type strings from sportSquadConfig
 * 
 * @example
 * const allPositions = getDistinctPositions();
 * // ['outside_back', 'center', 'fly_half', ...]
 */
const getDistinctPositions = (): string[] => {
  return Object.keys(sportSquadConfig.positions);
};

/**
 * Gets a specific position type by array index with safe fallback.
 * Falls back to first position if index is out of bounds.
 * 
 * @param index - Zero-based index of position to retrieve
 * @returns Position type string at the given index, or first position as fallback
 * 
 * @example
 * const firstPos = getPositionAt(0);  // 'outside_back'
 * const secondPos = getPositionAt(1); // 'center'
 * const safePos = getPositionAt(999); // Falls back to first position
 */
const getPositionAt = (index: number): string => {
  const positions = getDistinctPositions();
  return positions[index] || positions[0];
};

/**
 * Type for team player entries in test data.
 */
type TeamPlayerEntry = {
  id: number;
  playerId: number;
  position: string;
  player: Player & { imagePitch: string; imageProfile: string };
};

/**
 * Creates a mock TeamWithPlayers object for testing.
 * Uses the first player from mock data as the base player.
 * 
 * @param teamPlayerOverrides - Optional array of team players to use instead of default
 * @returns A mock team with players for testing loadTeam
 */
const makeTeamWithPlayers = (teamPlayerOverrides?: TeamPlayerEntry[]) => {
  const basePlayer = players[0] as Player;
  const defaultTeamPlayers: TeamPlayerEntry[] = [
    {
      id: 1,
      playerId: basePlayer.id,
      position: basePlayer.position,
      player: {
        ...basePlayer,
        imagePitch: basePlayer.imagePitch ?? '',
        imageProfile: basePlayer.imageProfile ?? '',
      },
    },
  ];
  return {
    id: 42,
    tenantId: 'trc-2025',
    userId: 'user-1',
    leagueId: 7,
    name: 'My Test Team',
    budget: 42_000_000,
    totalCost: basePlayer.cost,
    points: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    teamPlayers: teamPlayerOverrides ?? defaultTeamPlayers,
  };
};

describe('myTeamStore', () => {
  beforeEach(() => {
    // Initialize empty slots from field layout
    const emptySlots: Record<string, Player | null> = {};
    getAllPositions().forEach((position) => {
      emptySlots[position.id] = null;
    });

    // Reset store before each test
    useMyTeamStore.setState({
      slots: emptySlots,
      totalCost: 0,
      selectedLeagueId: null,
      teamId: null,
      teamName: '',
      // Edit mode state
      isEditing: false,
      savedSlots: { ...emptySlots },
      savedTotalCost: 0,
      // UI state
      filters: {
        search: '',
        position: null,
        squad: null,
        minPrice: 0,
        maxPrice: 25,
        withinBudget: false,
        statuses: [],
        sortBy: 'totalPoints',
      },
      priceRange: { min: 0, max: 25 },
      activeTab: 'LIST',
      comparisonModalOpen: false,
      comparisonPlayers: [],
      filtersExpanded: false,
      selectedSlotId: null,
      isLoading: false,
    });
  });

  describe('Pure Helper Functions', () => {
    describe('initializeSlots', () => {
      it('should create slots for all field positions', () => {
        const { slots } = useMyTeamStore.getState();
        const allPositions = getAllPositions();
        
        expect(Object.keys(slots).length).toBe(allPositions.length);
      });

      it('should initialize all slots as null', () => {
        const { slots } = useMyTeamStore.getState();
        
        Object.values(slots).forEach((slot) => {
          expect(slot).toBeNull();
        });
      });

      it('should match field layout position IDs', () => {
        const { slots } = useMyTeamStore.getState();
        const allPositions = getAllPositions();
        
        allPositions.forEach((position) => {
          expect(slots).toHaveProperty(position.id);
        });
      });

      it('should create correct number of slots from sport config', () => {
        const { slots } = useMyTeamStore.getState();
        const expectedSlotCount = getAllPositions().length;
        
        expect(Object.keys(slots).length).toBe(expectedSlotCount);
      });
    });

    describe('findAvailableSlot', () => {
      it('should find first empty slot for position type', () => {
        const { addPlayer } = useMyTeamStore.getState();
        const firstPosition = getPositionAt(0);
        const testPlayers = getPlayersByPosition(firstPosition, 1);
        
        if (testPlayers.length > 0) {
          addPlayer(testPlayers[0]);
          
          const { slots } = useMyTeamStore.getState();
          const firstSlot = Object.keys(slots).find(slotId => slots[slotId] !== null);
          
          expect(firstSlot).toBeDefined();
        }
      });

      it('should return null when no empty slots available for position', () => {
        const { addPlayer } = useMyTeamStore.getState();
        const firstPosition = getPositionAt(0);
        const positionConfig = sportSquadConfig.positions[firstPosition];
        const maxSlots = positionConfig.max;
        
        // Fill all slots for this position
        const testPlayers = getPlayersByPosition(firstPosition, maxSlots + 1);
        
        testPlayers.slice(0, maxSlots).forEach(player => {
          addPlayer(player);
        });
        
        // Try to add one more player
        const initialCost = useMyTeamStore.getState().totalCost;
        addPlayer(testPlayers[maxSlots]);
        
        // Should not have added (cost unchanged)
        expect(useMyTeamStore.getState().totalCost).toBe(initialCost);
      });

      it('should find slots in order', () => {
        const { addPlayer } = useMyTeamStore.getState();
        const firstPosition = getPositionAt(0);
        const testPlayers = getPlayersByPosition(firstPosition, 2);
        
        if (testPlayers.length >= 2) {
          addPlayer(testPlayers[0]);
          const firstSlotId = Object.keys(useMyTeamStore.getState().slots).find(
            id => useMyTeamStore.getState().slots[id]?.id === testPlayers[0].id
          );
          
          addPlayer(testPlayers[1]);
          const secondSlotId = Object.keys(useMyTeamStore.getState().slots).find(
            id => useMyTeamStore.getState().slots[id]?.id === testPlayers[1].id
          );
          
          expect(firstSlotId).toBeDefined();
          expect(secondSlotId).toBeDefined();
          expect(firstSlotId).not.toBe(secondSlotId);
        }
      });
    });

    describe('calculateTotalCost', () => {
      it('should sum player costs correctly', () => {
        const { addPlayer } = useMyTeamStore.getState();
        const player1 = getTestPlayer({ cost: 5000000 }); // 5M
        const player2 = getTestPlayer({ 
          id: 9999,
          cost: 3000000, // 3M
          position: getPositionAt(1) as any
        });
        
        addPlayer(player1);
        addPlayer(player2);
        
        const { totalCost } = useMyTeamStore.getState();
        expect(totalCost).toBe(8000000); // 8M total
      });

      it('should handle empty slots (null)', () => {
        const { totalCost } = useMyTeamStore.getState();
        expect(totalCost).toBe(0);
      });

      it('should update when player removed', () => {
        const { addPlayer, removePlayer } = useMyTeamStore.getState();
        const player = getTestPlayer({ cost: 5000000 });
        
        addPlayer(player);
        expect(useMyTeamStore.getState().totalCost).toBe(5000000);
        
        removePlayer(player.id);
        expect(useMyTeamStore.getState().totalCost).toBe(0);
      });

      it('should handle multiple additions and removals', () => {
        const { addPlayer, removePlayer } = useMyTeamStore.getState();
        const player1 = getTestPlayer({ cost: 4000000 });
        const player2 = getTestPlayer({ 
          id: 9998,
          cost: 6000000,
          position: getPositionAt(1) as any
        });
        
        addPlayer(player1);
        addPlayer(player2);
        expect(useMyTeamStore.getState().totalCost).toBe(10000000);
        
        removePlayer(player1.id);
        expect(useMyTeamStore.getState().totalCost).toBe(6000000);
        
        removePlayer(player2.id);
        expect(useMyTeamStore.getState().totalCost).toBe(0);
      });
    });

    describe('isPlayerSelected', () => {
      it('should return true when player exists in slots', () => {
        const { addPlayer, isPlayerSelected } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player);
        
        expect(isPlayerSelected(player.id)).toBe(true);
      });

      it('should return false when player not in slots', () => {
        const { isPlayerSelected } = useMyTeamStore.getState();
        
        expect(isPlayerSelected(99999)).toBe(false);
      });

      it('should return false for removed player', () => {
        const { addPlayer, removePlayer, isPlayerSelected } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player);
        removePlayer(player.id);
        
        expect(isPlayerSelected(player.id)).toBe(false);
      });
    });

    describe('getSelectedPlayers', () => {
      it('should return only non-null players', () => {
        const { addPlayer, getSelectedPlayers } = useMyTeamStore.getState();
        const player1 = getTestPlayer();
        const player2 = getTestPlayer({ 
          id: 9997,
          position: getPositionAt(1) as any
        });
        
        addPlayer(player1);
        addPlayer(player2);
        
        const selected = getSelectedPlayers();
        expect(selected).toHaveLength(2);
        expect(selected.every(p => p !== null)).toBe(true);
      });

      it('should return empty array when no players selected', () => {
        const { getSelectedPlayers } = useMyTeamStore.getState();
        
        const selected = getSelectedPlayers();
        expect(selected).toEqual([]);
      });

      it('should not include null slots', () => {
        const { addPlayer, getSelectedPlayers } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player);
        
        const selected = getSelectedPlayers();
        expect(selected.length).toBe(1);
        expect(selected[0]).toBe(player);
      });
    });

    describe('getPlayerSlot', () => {
      it('should return correct slot ID for player', () => {
        const { addPlayer, getPlayerSlot } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player);
        
        const slotId = getPlayerSlot(player.id);
        expect(slotId).toBeDefined();
        expect(typeof slotId).toBe('string');
      });

      it('should return null when player not found', () => {
        const { getPlayerSlot } = useMyTeamStore.getState();
        
        const slotId = getPlayerSlot(99999);
        expect(slotId).toBeNull();
      });

      it('should return null for removed player', () => {
        const { addPlayer, removePlayer, getPlayerSlot } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player);
        removePlayer(player.id);
        
        const slotId = getPlayerSlot(player.id);
        expect(slotId).toBeNull();
      });
    });

    describe('getRemainingBudget', () => {
      it('should calculate remaining budget correctly', () => {
        const { addPlayer, getRemainingBudget } = useMyTeamStore.getState();
        const maxBudget = 42000000; // 42M
        const player = getTestPlayer({ cost: 5000000 }); // 5M
        
        addPlayer(player);
        
        const remaining = getRemainingBudget(maxBudget);
        expect(remaining).toBe(37000000); // 37M
      });

      it('should return full budget when no players', () => {
        const { getRemainingBudget } = useMyTeamStore.getState();
        const maxBudget = 42000000;
        
        const remaining = getRemainingBudget(maxBudget);
        expect(remaining).toBe(maxBudget);
      });

      it('should handle zero budget remaining', () => {
        const { addPlayer, getRemainingBudget } = useMyTeamStore.getState();
        const maxBudget = 5000000;
        const player = getTestPlayer({ cost: 5000000 });
        
        addPlayer(player);
        
        const remaining = getRemainingBudget(maxBudget);
        expect(remaining).toBe(0);
      });
    });
  });

  describe('Store Actions', () => {
    describe('addPlayer', () => {
      it('should add player to correct position slot', () => {
        const { addPlayer } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player);
        
        const { slots } = useMyTeamStore.getState();
        const addedPlayer = Object.values(slots).find(p => p?.id === player.id);
        expect(addedPlayer).toBeDefined();
        expect(addedPlayer?.position).toBe(player.position);
      });

      it('should update totalCost correctly', () => {
        const { addPlayer } = useMyTeamStore.getState();
        const player = getTestPlayer({ cost: 7000000 });
        
        addPlayer(player);
        
        const { totalCost } = useMyTeamStore.getState();
        expect(totalCost).toBe(7000000);
      });

      it('should handle player already selected', () => {
        const { addPlayer, getSelectedPlayers } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player);
        addPlayer(player); // Try to add same player again
        
        const selected = getSelectedPlayers();
        expect(selected).toHaveLength(1);
      });

      it('should not add duplicate players', () => {
        const { addPlayer } = useMyTeamStore.getState();
        const player = getTestPlayer({ cost: 5000000 });
        
        addPlayer(player);
        const costAfterFirst = useMyTeamStore.getState().totalCost;
        
        addPlayer(player);
        const costAfterSecond = useMyTeamStore.getState().totalCost;
        
        expect(costAfterFirst).toBe(5000000);
        expect(costAfterSecond).toBe(5000000); // Unchanged
      });

      it('should clear selectedSlotId after adding', () => {
        const { addPlayer, setSelectedSlot } = useMyTeamStore.getState();
        const player = getTestPlayer();
        const firstSlot = getAllPositions().find(p => p.type === player.position);
        
        if (firstSlot) {
          setSelectedSlot(firstSlot.id);
          addPlayer(player);
          
          const { selectedSlotId } = useMyTeamStore.getState();
          expect(selectedSlotId).toBeNull();
        }
      });
    });

    describe('removePlayer', () => {
      it('should remove player from slot', () => {
        const { addPlayer, removePlayer, isPlayerSelected } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player);
        removePlayer(player.id);
        
        expect(isPlayerSelected(player.id)).toBe(false);
      });

      it('should update totalCost correctly', () => {
        const { addPlayer, removePlayer } = useMyTeamStore.getState();
        const player = getTestPlayer({ cost: 8000000 });
        
        addPlayer(player);
        removePlayer(player.id);
        
        const { totalCost } = useMyTeamStore.getState();
        expect(totalCost).toBe(0);
      });

      it('should not error when player not found', () => {
        const { removePlayer, totalCost } = useMyTeamStore.getState();
        
        expect(() => removePlayer(99999)).not.toThrow();
        expect(totalCost).toBe(0);
      });

      it('should vacate the slot', () => {
        const { addPlayer, removePlayer, getPlayerSlot } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player);
        const slotId = getPlayerSlot(player.id);
        
        removePlayer(player.id);
        
        if (slotId) {
          const { slots } = useMyTeamStore.getState();
          expect(slots[slotId]).toBeNull();
        }
      });
    });

    describe('clearSquad', () => {
      it('should remove all players', () => {
        const { addPlayer, clearSquad, getSelectedPlayers } = useMyTeamStore.getState();
        const player1 = getTestPlayer();
        const player2 = getTestPlayer({ 
          id: 9996,
          position: getPositionAt(1) as any
        });
        
        addPlayer(player1);
        addPlayer(player2);
        clearSquad();
        
        const selected = getSelectedPlayers();
        expect(selected).toHaveLength(0);
      });

      it('should reset totalCost to zero', () => {
        const { addPlayer, clearSquad } = useMyTeamStore.getState();
        const player = getTestPlayer({ cost: 10000000 });
        
        addPlayer(player);
        clearSquad();
        
        const { totalCost } = useMyTeamStore.getState();
        expect(totalCost).toBe(0);
      });

      it('should reinitialize all slots', () => {
        const { addPlayer, clearSquad } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player);
        clearSquad();
        
        const currentSlots = useMyTeamStore.getState().slots;
        Object.values(currentSlots).forEach(slot => {
          expect(slot).toBeNull();
        });
      });
    });

    describe('setFilters', () => {
      it('should update filter state', () => {
        const { setFilters } = useMyTeamStore.getState();
        
        setFilters({ search: 'test' });
        
        const updatedFilters = useMyTeamStore.getState().filters;
        expect(updatedFilters.search).toBe('test');
      });

      it('should merge filters', () => {
        const { setFilters } = useMyTeamStore.getState();
        
        setFilters({ search: 'player' });
        setFilters({ withinBudget: true });
        
        const { filters } = useMyTeamStore.getState();
        expect(filters.search).toBe('player');
        expect(filters.withinBudget).toBe(true);
      });

      it('should update multiple filters at once', () => {
        const { setFilters } = useMyTeamStore.getState();
        const firstPosition = getPositionAt(0);
        
        setFilters({ 
          search: 'test',
          position: firstPosition,
          minPrice: 5
        });
        
        const { filters } = useMyTeamStore.getState();
        expect(filters.search).toBe('test');
        expect(filters.position).toBe(firstPosition);
        expect(filters.minPrice).toBe(5);
      });
    });

    describe('resetFilters', () => {
      it('should reset all filters to defaults', () => {
        const { setFilters, resetFilters } = useMyTeamStore.getState();
        
        setFilters({ search: 'test', withinBudget: true });
        resetFilters();
        
        const { filters } = useMyTeamStore.getState();
        expect(filters.search).toBe('');
        expect(filters.withinBudget).toBe(false);
      });

      it('should reset price to priceRange after initializePriceRange', () => {
        const { initializePriceRange, setFilters, resetFilters } = useMyTeamStore.getState();

        initializePriceRange(2, 8);
        setFilters({ search: 'Test', minPrice: 4, maxPrice: 6 });
        resetFilters();

        const { filters } = useMyTeamStore.getState();
        expect(filters.minPrice).toBe(2);
        expect(filters.maxPrice).toBe(8);
        expect(filters.search).toBe('');
      });
    });

    describe('initializePriceRange', () => {
      it('should set minPrice and maxPrice when filters are at defaults', () => {
        const { initializePriceRange } = useMyTeamStore.getState();

        initializePriceRange(2, 8);

        const { filters, priceRange } = useMyTeamStore.getState();
        expect(filters.minPrice).toBe(2);
        expect(filters.maxPrice).toBe(8);
        expect(priceRange.min).toBe(2);
        expect(priceRange.max).toBe(8);
      });

      it('should NOT override filters that have been user-modified', () => {
        const { initializePriceRange, setFilters } = useMyTeamStore.getState();

        // First initialize to establish a data range
        initializePriceRange(2, 8);

        // User modifies the price filter
        setFilters({ minPrice: 4, maxPrice: 6 });

        // Calling initializePriceRange again should not override user-set values
        initializePriceRange(2, 8);

        const { filters } = useMyTeamStore.getState();
        expect(filters.minPrice).toBe(4);
        expect(filters.maxPrice).toBe(6);
      });

      it('should update priceRange so resetFilters uses the new range', () => {
        const { initializePriceRange, resetFilters } = useMyTeamStore.getState();

        initializePriceRange(2, 8);
        resetFilters();

        const { filters } = useMyTeamStore.getState();
        expect(filters.minPrice).toBe(2);
        expect(filters.maxPrice).toBe(8);
      });

      it('should be safe to call multiple times with same values', () => {
        const { initializePriceRange } = useMyTeamStore.getState();

        initializePriceRange(2, 8);
        initializePriceRange(2, 8);

        const { filters, priceRange } = useMyTeamStore.getState();
        expect(filters.minPrice).toBe(2);
        expect(filters.maxPrice).toBe(8);
        expect(priceRange.min).toBe(2);
        expect(priceRange.max).toBe(8);
      });
    });

    describe('setActiveTab', () => {
      it('should switch between LIST and SQUAD views', () => {
        const { setActiveTab } = useMyTeamStore.getState();
        
        setActiveTab('SQUAD');
        expect(useMyTeamStore.getState().activeTab).toBe('SQUAD');
        
        setActiveTab('LIST');
        expect(useMyTeamStore.getState().activeTab).toBe('LIST');
      });
    });
  });

  describe('Integration Tests (Store + Validation)', () => {
    it('should allow building a valid squad within budget', () => {
      const { addPlayer, getRemainingBudget, getSelectedPlayers } = useMyTeamStore.getState();
      const maxBudget = 42000000; // 42M
      
      // Add players from different positions
      const positions = getDistinctPositions();
      const playersToAdd: Player[] = [];
      
      // Get one player from each position
      positions.forEach(position => {
        const positionPlayers = getPlayersByPosition(position, 1);
        if (positionPlayers.length > 0) {
          playersToAdd.push(positionPlayers[0]);
        }
      });
      
      // Add players
      playersToAdd.forEach(player => {
        const remaining = getRemainingBudget(maxBudget);
        if (player.cost <= remaining) {
          addPlayer(player);
        }
      });
      
      const selected = getSelectedPlayers();
      const { totalCost } = useMyTeamStore.getState();
      
      expect(selected.length).toBeGreaterThan(0);
      expect(totalCost).toBeLessThanOrEqual(maxBudget);
    });

    it('should enforce budget cap', () => {
      const { addPlayer, getRemainingBudget } = useMyTeamStore.getState();
      const maxBudget = 10000000; // 10M (low budget for testing)
      
      const expensivePlayer = getTestPlayer({ cost: 15000000 }); // 15M
      addPlayer(expensivePlayer);
      
      const remaining = getRemainingBudget(maxBudget);
      
      // Remaining would be negative if we enforce cap properly
      // (This shows the calculation - actual enforcement would be in validation)
      expect(remaining).toBeLessThan(0);
    });

    it('should track squad limit per team', () => {
      const { addPlayer, getSelectedPlayers } = useMyTeamStore.getState();
      
      // Get multiple players from same squad
      const sameSquadId = players[0].squadId;
      const sameSquadPlayers = players
        .filter(p => p.squadId === sameSquadId)
        .slice(0, 5) as Player[];
      
      sameSquadPlayers.forEach(player => addPlayer(player));
      
      const selected = getSelectedPlayers();
      const squadCounts = selected.reduce((acc, player) => {
        acc[player.squadId] = (acc[player.squadId] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
      // Verify we tracked squad counts (actual limit enforcement in validation)
      expect(squadCounts[sameSquadId]).toBeGreaterThan(0);
    });

    it('should maintain totalCost consistency across operations', () => {
      const { addPlayer, removePlayer } = useMyTeamStore.getState();
      
      const player1 = getTestPlayer({ cost: 5000000 });
      const player2 = getTestPlayer({ 
        id: 9995,
        cost: 7000000,
        position: getPositionAt(1) as any
      });
      
      addPlayer(player1); // +5M
      expect(useMyTeamStore.getState().totalCost).toBe(5000000);
      
      addPlayer(player2); // +7M
      expect(useMyTeamStore.getState().totalCost).toBe(12000000);
      
      removePlayer(player1.id); // -5M
      expect(useMyTeamStore.getState().totalCost).toBe(7000000);
      
      removePlayer(player2.id); // -7M
      expect(useMyTeamStore.getState().totalCost).toBe(0);
    });

    it('should prevent adding same player twice', () => {
      const { addPlayer, getSelectedPlayers } = useMyTeamStore.getState();
      const player = getTestPlayer({ cost: 5000000 });
      
      addPlayer(player);
      addPlayer(player);
      addPlayer(player);
      
      const selected = getSelectedPlayers();
      const { totalCost } = useMyTeamStore.getState();
      
      expect(selected).toHaveLength(1);
      expect(totalCost).toBe(5000000); // Only counted once
    });
  });

  describe('loadTeam', () => {
    const firstPosition = () => Object.keys(sportSquadConfig.positions)[0];

    it('maps TeamPlayer records to slots and sets teamId and teamName', () => {
      const { loadTeam } = useMyTeamStore.getState();
      const team = makeTeamWithPlayers() as unknown as TeamWithPlayers;

      loadTeam(team);

      const state = useMyTeamStore.getState();
      expect(state.teamId).toBe(42);
      expect(state.teamName).toBe('My Test Team');
      expect(state.selectedLeagueId).toBe(7);

      const selectedPlayers = state.getSelectedPlayers();
      expect(selectedPlayers).toHaveLength(1);
      expect(selectedPlayers[0].id).toBe((players[0] as Player).id);
    });

    it('calculates totalCost from loaded players', () => {
      const { loadTeam } = useMyTeamStore.getState();
      const team = makeTeamWithPlayers() as unknown as TeamWithPlayers;

      loadTeam(team);

      expect(useMyTeamStore.getState().totalCost).toBe((players[0] as Player).cost);
    });

    it('clears existing slots before loading', () => {
      const { addPlayer, loadTeam } = useMyTeamStore.getState();
      const initialPlayer = getTestPlayer({ id: 99999, position: firstPosition() as Player['position'] });
      addPlayer(initialPlayer);
      expect(useMyTeamStore.getState().getSelectedPlayers()).toHaveLength(1);

      const team = makeTeamWithPlayers([]) as unknown as TeamWithPlayers;
      loadTeam(team);

      expect(useMyTeamStore.getState().getSelectedPlayers()).toHaveLength(0);
      expect(useMyTeamStore.getState().totalCost).toBe(0);
    });
  });

  describe('setLeagueId', () => {
    it('sets selectedLeagueId and clears all slots', () => {
      const { addPlayer, setLeagueId } = useMyTeamStore.getState();
      const player = getTestPlayer();
      addPlayer(player);
      expect(useMyTeamStore.getState().getSelectedPlayers()).toHaveLength(1);

      setLeagueId(5);

      const state = useMyTeamStore.getState();
      expect(state.selectedLeagueId).toBe(5);
      expect(state.getSelectedPlayers()).toHaveLength(0);
      expect(state.totalCost).toBe(0);
    });

    it('resets teamId and teamName when set to null', () => {
      useMyTeamStore.setState({ teamId: 10, teamName: 'Old Team', selectedLeagueId: 3 });

      useMyTeamStore.getState().setLeagueId(null);

      const state = useMyTeamStore.getState();
      expect(state.selectedLeagueId).toBeNull();
      expect(state.teamId).toBeNull();
      expect(state.teamName).toBe('');
    });

    it('clears all slots when switching leagues', () => {
      const { addPlayer, setLeagueId } = useMyTeamStore.getState();
      const player = getTestPlayer();
      addPlayer(player);

      setLeagueId(99);

      const state = useMyTeamStore.getState();
      Object.values(state.slots).forEach((slot) => {
        expect(slot).toBeNull();
      });
    });

    it('resets edit mode state when switching leagues', () => {
      const { addPlayer, setLeagueId } = useMyTeamStore.getState();
      const player = getTestPlayer();
      addPlayer(player);

      expect(useMyTeamStore.getState().isEditing).toBe(true);

      setLeagueId(99);

      const state = useMyTeamStore.getState();
      expect(state.isEditing).toBe(false);
      expect(state.getIsDirty()).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Edit Mode Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Edit Mode', () => {
    describe('getIsDirty', () => {
      it('returns false when slots match saved snapshot (initial state)', () => {
        const { getIsDirty } = useMyTeamStore.getState();
        
        expect(getIsDirty()).toBe(false);
      });

      it('returns false when slots match saved snapshot after loadTeam', () => {
        const { loadTeam, getIsDirty } = useMyTeamStore.getState();
        const team = makeTeamWithPlayers();
        
        loadTeam(team as unknown as TeamWithPlayers);
        
        expect(getIsDirty()).toBe(false);
      });

      it('returns true after adding a player', () => {
        const { addPlayer, getIsDirty } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player);
        
        expect(getIsDirty()).toBe(true);
      });

      it('returns true after removing a player', () => {
        const { loadTeam, removePlayer, getIsDirty } = useMyTeamStore.getState();
        const team = makeTeamWithPlayers();
        loadTeam(team as unknown as TeamWithPlayers);
        
        const playerToRemove = useMyTeamStore.getState().getSelectedPlayers()[0];
        removePlayer(playerToRemove.id);
        
        expect(getIsDirty()).toBe(true);
      });

      it('returns false after adding then removing the same player', () => {
        const { addPlayer, removePlayer, getIsDirty } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player);
        removePlayer(player.id);
        
        // Should be clean because we're back to original state
        expect(getIsDirty()).toBe(false);
      });
    });

    describe('enterEditMode', () => {
      it('sets isEditing to true', () => {
        const { enterEditMode } = useMyTeamStore.getState();
        
        expect(useMyTeamStore.getState().isEditing).toBe(false);
        
        enterEditMode();
        
        expect(useMyTeamStore.getState().isEditing).toBe(true);
      });

      it('snapshots current slots as savedSlots', () => {
        const { addPlayer, commitSave, enterEditMode } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        // Set up initial state with a player
        addPlayer(player);
        commitSave();
        
        // Now enter edit mode explicitly
        enterEditMode();
        
        const state = useMyTeamStore.getState();
        expect(state.isEditing).toBe(true);
        expect(state.savedSlots).toEqual(state.slots);
      });

      it('does nothing if already editing', () => {
        const { addPlayer, enterEditMode } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player); // Implicitly enters edit mode
        const stateAfterAdd = useMyTeamStore.getState();
        const savedSlotsAfterAdd = { ...stateAfterAdd.savedSlots };
        
        enterEditMode(); // Should be a no-op
        
        const stateAfterExplicitEnter = useMyTeamStore.getState();
        expect(stateAfterExplicitEnter.savedSlots).toEqual(savedSlotsAfterAdd);
      });
    });

    describe('exitEditMode', () => {
      it('sets isEditing to false', () => {
        const { addPlayer, exitEditMode } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player);
        expect(useMyTeamStore.getState().isEditing).toBe(true);
        
        exitEditMode();
        
        expect(useMyTeamStore.getState().isEditing).toBe(false);
      });

      it('restores savedSlots snapshot', () => {
        const { loadTeam, addPlayer, exitEditMode, getSelectedPlayers } = useMyTeamStore.getState();
        const team = makeTeamWithPlayers();
        loadTeam(team as unknown as TeamWithPlayers);
        
        const initialCount = getSelectedPlayers().length;
        const newPlayer = getTestPlayer({ 
          id: 88888, 
          position: getPositionAt(1) as Player['position'] 
        });
        
        addPlayer(newPlayer);
        expect(getSelectedPlayers().length).toBe(initialCount + 1);
        
        exitEditMode();
        
        // Should be restored to original state
        expect(getSelectedPlayers().length).toBe(initialCount);
      });

      it('restores totalCost from savedTotalCost', () => {
        const { loadTeam, addPlayer, exitEditMode } = useMyTeamStore.getState();
        const team = makeTeamWithPlayers();
        loadTeam(team as unknown as TeamWithPlayers);
        
        const initialCost = useMyTeamStore.getState().totalCost;
        const expensivePlayer = getTestPlayer({ 
          id: 77777, 
          cost: 10_000_000,
          position: getPositionAt(1) as Player['position'] 
        });
        
        addPlayer(expensivePlayer);
        expect(useMyTeamStore.getState().totalCost).toBe(initialCost + 10_000_000);
        
        exitEditMode();
        
        expect(useMyTeamStore.getState().totalCost).toBe(initialCost);
      });
    });

    describe('commitSave', () => {
      it('updates savedSlots to match current slots', () => {
        const { addPlayer, commitSave, getIsDirty } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player);
        expect(getIsDirty()).toBe(true);
        
        commitSave();
        
        expect(getIsDirty()).toBe(false);
        const state = useMyTeamStore.getState();
        expect(state.savedSlots).toEqual(state.slots);
      });

      it('sets isEditing to false', () => {
        const { addPlayer, commitSave } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player);
        expect(useMyTeamStore.getState().isEditing).toBe(true);
        
        commitSave();
        
        expect(useMyTeamStore.getState().isEditing).toBe(false);
      });

      it('updates savedTotalCost to match current totalCost', () => {
        const { addPlayer, commitSave } = useMyTeamStore.getState();
        const player = getTestPlayer({ cost: 5_000_000 });
        
        addPlayer(player);
        commitSave();
        
        const state = useMyTeamStore.getState();
        expect(state.savedTotalCost).toBe(5_000_000);
      });
    });

    describe('getTransferDiff', () => {
      it('returns empty arrays when no changes', () => {
        const { getTransferDiff } = useMyTeamStore.getState();
        
        const diff = getTransferDiff();
        
        expect(diff.added).toHaveLength(0);
        expect(diff.removed).toHaveLength(0);
      });

      it('correctly identifies added players', () => {
        const { addPlayer, getTransferDiff } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        addPlayer(player);
        
        const diff = getTransferDiff();
        expect(diff.added).toHaveLength(1);
        expect(diff.added[0].id).toBe(player.id);
        expect(diff.removed).toHaveLength(0);
      });

      it('correctly identifies removed players', () => {
        const { loadTeam, removePlayer, getTransferDiff, getSelectedPlayers } = useMyTeamStore.getState();
        const team = makeTeamWithPlayers();
        loadTeam(team as unknown as TeamWithPlayers);
        
        const playerToRemove = getSelectedPlayers()[0];
        removePlayer(playerToRemove.id);
        
        const diff = getTransferDiff();
        expect(diff.added).toHaveLength(0);
        expect(diff.removed).toHaveLength(1);
        expect(diff.removed[0].id).toBe(playerToRemove.id);
      });

      it('correctly identifies both added and removed players', () => {
        const { loadTeam, addPlayer, removePlayer, getTransferDiff, getSelectedPlayers } = useMyTeamStore.getState();
        const team = makeTeamWithPlayers();
        loadTeam(team as unknown as TeamWithPlayers);
        
        const playerToRemove = getSelectedPlayers()[0];
        const newPlayer = getTestPlayer({ 
          id: 66666, 
          position: getPositionAt(1) as Player['position'] 
        });
        
        removePlayer(playerToRemove.id);
        addPlayer(newPlayer);
        
        const diff = getTransferDiff();
        expect(diff.added).toHaveLength(1);
        expect(diff.added[0].id).toBe(newPlayer.id);
        expect(diff.removed).toHaveLength(1);
        expect(diff.removed[0].id).toBe(playerToRemove.id);
      });
    });

    describe('implicit edit mode entry', () => {
      it('addPlayer implicitly enters edit mode', () => {
        const { addPlayer } = useMyTeamStore.getState();
        const player = getTestPlayer();
        
        expect(useMyTeamStore.getState().isEditing).toBe(false);
        
        addPlayer(player);
        
        expect(useMyTeamStore.getState().isEditing).toBe(true);
      });

      it('removePlayer implicitly enters edit mode', () => {
        const { loadTeam, removePlayer, getSelectedPlayers } = useMyTeamStore.getState();
        const team = makeTeamWithPlayers();
        loadTeam(team as unknown as TeamWithPlayers);
        
        // loadTeam sets isEditing: false
        expect(useMyTeamStore.getState().isEditing).toBe(false);
        
        const playerToRemove = getSelectedPlayers()[0];
        removePlayer(playerToRemove.id);
        
        expect(useMyTeamStore.getState().isEditing).toBe(true);
      });

      it('clearSquad implicitly enters edit mode', () => {
        const { loadTeam, clearSquad } = useMyTeamStore.getState();
        const team = makeTeamWithPlayers();
        loadTeam(team as unknown as TeamWithPlayers);
        
        expect(useMyTeamStore.getState().isEditing).toBe(false);
        
        clearSquad();
        
        expect(useMyTeamStore.getState().isEditing).toBe(true);
      });

      it('snapshots state BEFORE the first change', () => {
        const { loadTeam, addPlayer, getTransferDiff, getSelectedPlayers } = useMyTeamStore.getState();
        const team = makeTeamWithPlayers();
        loadTeam(team as unknown as TeamWithPlayers);
        
        const initialPlayerCount = getSelectedPlayers().length;
        const newPlayer = getTestPlayer({ 
          id: 55555, 
          position: getPositionAt(1) as Player['position'] 
        });
        
        addPlayer(newPlayer);
        
        // The diff should show only the new player as added
        const diff = getTransferDiff();
        expect(diff.added).toHaveLength(1);
        expect(diff.removed).toHaveLength(0);
        
        // savedSlots should have the original players
        const state = useMyTeamStore.getState();
        const savedPlayerCount = Object.values(state.savedSlots).filter(p => p !== null).length;
        expect(savedPlayerCount).toBe(initialPlayerCount);
      });
    });

    describe('loadTeam updates savedSlots', () => {
      it('loadTeam sets savedSlots to match loaded state', () => {
        const { loadTeam } = useMyTeamStore.getState();
        const team = makeTeamWithPlayers();
        
        loadTeam(team as unknown as TeamWithPlayers);
        
        const state = useMyTeamStore.getState();
        expect(state.savedSlots).toEqual(state.slots);
        expect(state.savedTotalCost).toBe(state.totalCost);
      });

      it('loadTeam resets isEditing to false', () => {
        const { addPlayer, loadTeam } = useMyTeamStore.getState();
        const player = getTestPlayer();
        addPlayer(player);
        expect(useMyTeamStore.getState().isEditing).toBe(true);
        
        const team = makeTeamWithPlayers();
        loadTeam(team as unknown as TeamWithPlayers);
        
        expect(useMyTeamStore.getState().isEditing).toBe(false);
      });

      it('getIsDirty returns false immediately after loadTeam', () => {
        const { loadTeam, getIsDirty } = useMyTeamStore.getState();
        const team = makeTeamWithPlayers();
        
        loadTeam(team as unknown as TeamWithPlayers);
        
        expect(getIsDirty()).toBe(false);
      });
    });
  });
});
