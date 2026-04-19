import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player, PlayerPosition, PlayerStats } from '../mocks/playerData';
import { VALIDATION, STORAGE_KEYS } from '../config/constants';
import { getPositionsByType, getAllPositions } from '../config/fieldLayouts';
import { getActiveTenantId } from '../utils/tenant';
import type { PlayerStatus, TeamWithPlayers, PlayerSortBy } from '@spectatr/shared-types';

// Slot-based player storage: maps field slot ID to player (or null if vacant)
export type PlayerSlots = Record<string, Player | null>;

export interface PlayerFilters {
  search: string;
  position: string | null;
  squad: string | null;
  minPrice: number;
  maxPrice: number;
  withinBudget: boolean;
  statuses: PlayerStatus[];
  sortBy: PlayerSortBy;
}

/**
 * Represents the diff between saved and current squad state.
 */
export interface TransferDiff {
  /** Players added since last save */
  added: Player[];
  /** Players removed since last save */
  removed: Player[];
}

export interface MyTeamState {
  // === Squad Data (Slot-based) ===
  slots: PlayerSlots;
  totalCost: number;

  // === Edit Mode State ===
  isEditing: boolean;
  savedSlots: PlayerSlots; // Snapshot of slots at last save/load
  savedTotalCost: number; // Snapshot of totalCost at last save/load

  // === League / Team Context ===
  selectedLeagueId: number | null;
  teamId: number | null;
  teamName: string;

  // === Squad Actions ===
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: number) => void;
  clearSquad: () => void;
  isPlayerSelected: (playerId: number) => boolean;
  getRemainingBudget: (maxBudget: number) => number;
  getSelectedPlayers: () => Player[]; // Helper to get array of players
  getPlayerSlot: (playerId: number) => string | null; // Get slot ID for a player
  loadTeam: (team: TeamWithPlayers) => void;
  setLeagueId: (leagueId: number | null) => void;
  setTeamName: (name: string) => void;

  // === Edit Mode Actions ===
  enterEditMode: () => void;
  exitEditMode: () => void; // Restores savedSlots, sets isEditing false
  commitSave: () => void; // Updates savedSlots to current slots, sets isEditing false

  // === Edit Mode Derived Getters ===
  getIsDirty: () => boolean; // Compares slots vs savedSlots
  getTransferDiff: () => TransferDiff; // Returns added/removed players

  // === UI State ===
  filters: PlayerFilters;
  priceRange: { min: number; max: number }; // Data-driven price range for reset/init
  activeTab: 'LIST' | 'SQUAD';
  comparisonModalOpen: boolean;
  comparisonPlayers: number[];
  filtersExpanded: boolean;
  selectedSlotId: string | null; // Currently selected field slot for player assignment
  isLoading: boolean; // For demonstrating skeleton states (will be replaced by TanStack Query)

  // === UI Actions ===
  setFilters: (filters: Partial<PlayerFilters>) => void;
  resetFilters: () => void;
  initializePriceRange: (min: number, max: number) => void;
  setActiveTab: (tab: 'LIST' | 'SQUAD') => void;
  openComparisonModal: (playerIds: number[]) => void;
  closeComparisonModal: () => void;
  toggleFilters: () => void;
  setSelectedSlot: (slotId: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
}

const defaultFilters: PlayerFilters = {
  search: '',
  position: null,
  squad: null,
  minPrice: VALIDATION.MIN_PRICE,
  maxPrice: VALIDATION.MAX_PRICE,
  withinBudget: false,
  statuses: [],
  sortBy: 'totalPoints',
};

/**
 * Initialize empty slots for all field positions
 */
function initializeSlots(): PlayerSlots {
  const slots: PlayerSlots = {};
  getAllPositions().forEach((position) => {
    slots[position.id] = null;
  });
  return slots;
}

/**
 * Find first available (empty) slot for a position type
 */
function findAvailableSlot(slots: PlayerSlots, positionType: string): string | null {
  const positionsOfType = getPositionsByType(positionType);
  for (const position of positionsOfType) {
    if (slots[position.id] === null) {
      return position.id;
    }
  }
  return null;
}

export const useMyTeamStore = create<MyTeamState>()(
  persist(
    (set, get) => ({
      // === Initial Squad Data ===
      slots: initializeSlots(),
      totalCost: 0,

      // === Edit Mode State ===
      isEditing: false,
      savedSlots: initializeSlots(),
      savedTotalCost: 0,

      // === League / Team Context ===
      selectedLeagueId: null,
      teamId: null,
      teamName: '',

      // === Squad Actions ===
      addPlayer: (player) =>
        set((state) => {
          // Check if player already selected
          if (Object.values(state.slots).some((p) => p?.id === player.id)) {
            return state;
          }

          // Implicitly enter edit mode if not already editing
          // Capture snapshot BEFORE the change if this is the first change
          const shouldEnterEditMode = !state.isEditing;
          const savedSlots = shouldEnterEditMode ? { ...state.slots } : state.savedSlots;
          const savedTotalCost = shouldEnterEditMode ? state.totalCost : state.savedTotalCost;

          // If a slot is selected, try to use it (if it matches position and is empty)
          if (state.selectedSlotId) {
            const selectedPosition = getAllPositions().find(p => p.id === state.selectedSlotId);
            
            // Check if selected slot matches player position and is empty
            if (selectedPosition && 
                selectedPosition.type === player.position && 
                state.slots[state.selectedSlotId] === null) {
              return {
                slots: {
                  ...state.slots,
                  [state.selectedSlotId]: player,
                },
                totalCost: state.totalCost + player.cost,
                selectedSlotId: null, // Clear selection after adding
                isEditing: true,
                savedSlots,
                savedTotalCost,
              };
            }
          }

          // Otherwise, find first available slot for this player's position
          const availableSlot = findAvailableSlot(state.slots, player.position);
          if (!availableSlot) {
            console.warn(`No available slot for position: ${player.position}`);
            return state;
          }

          return {
            slots: {
              ...state.slots,
              [availableSlot]: player,
            },
            totalCost: state.totalCost + player.cost,
            selectedSlotId: null, // Clear selection after adding
            isEditing: true,
            savedSlots,
            savedTotalCost,
          };
        }),

      removePlayer: (playerId) =>
        set((state) => {
          // Find which slot contains this player
          const slotId = Object.keys(state.slots).find(
            (slotId) => state.slots[slotId]?.id === playerId
          );

          if (!slotId) return state;

          const player = state.slots[slotId];
          if (!player) return state;

          // Implicitly enter edit mode if not already editing
          // Capture snapshot BEFORE the change if this is the first change
          const shouldEnterEditMode = !state.isEditing;
          const savedSlots = shouldEnterEditMode ? { ...state.slots } : state.savedSlots;
          const savedTotalCost = shouldEnterEditMode ? state.totalCost : state.savedTotalCost;

          return {
            slots: {
              ...state.slots,
              [slotId]: null, // Vacate the slot
            },
            totalCost: state.totalCost - player.cost,
            isEditing: true,
            savedSlots,
            savedTotalCost,
          };
        }),

      clearSquad: () =>
        set((state) => {
          // Implicitly enter edit mode if not already editing
          const shouldEnterEditMode = !state.isEditing;
          const savedSlots = shouldEnterEditMode ? { ...state.slots } : state.savedSlots;
          const savedTotalCost = shouldEnterEditMode ? state.totalCost : state.savedTotalCost;

          return {
            slots: initializeSlots(),
            totalCost: 0,
            isEditing: true,
            savedSlots,
            savedTotalCost,
          };
        }),

      isPlayerSelected: (playerId) => {
        return Object.values(get().slots).some((p) => p?.id === playerId);
      },

      getRemainingBudget: (maxBudget) => {
        return maxBudget - get().totalCost;
      },

      getSelectedPlayers: () => {
        return Object.values(get().slots).filter((p): p is Player => p !== null);
      },

      getPlayerSlot: (playerId) => {
        const slots = get().slots;
        const slotId = Object.keys(slots).find((slotId) => slots[slotId]?.id === playerId);
        return slotId || null;
      },

      loadTeam: (team) =>
        set(() => {
          const newSlots = initializeSlots();
          let newTotalCost = 0;

          for (const tp of team.teamPlayers) {
            const slotId = findAvailableSlot(newSlots, tp.position);
            if (!slotId) {
              console.warn(
                `loadTeam: no available slot for position "${tp.position}" (playerId: ${tp.playerId}). Player skipped.`
              );
              continue;
            }
            // Map server player shape to UI Player shape
            // tp.player.stats and tp.player.selected are Prisma Json (unknown at compile time)
            const rawStats = tp.player.stats as Record<string, unknown>;
            // tp.player.selected is a Prisma Json JSONB blob; the server always stores `{ percentage: number }`
            const rawSelected = tp.player.selected as Record<string, number>;
            const stats: PlayerStats = {
              totalPoints: typeof rawStats.totalPoints === 'number' ? rawStats.totalPoints : null,
              avgPoints: typeof rawStats.avgPoints === 'number' ? rawStats.avgPoints : null,
              lastRoundPoints: typeof rawStats.lastRoundPoints === 'number' ? rawStats.lastRoundPoints : null,
              positionRank: typeof rawStats.positionRank === 'number' ? rawStats.positionRank : null,
              nextFixture: typeof rawStats.nextFixture === 'number' ? rawStats.nextFixture : null,
              scores: rawStats.scores ?? null,
            };
            const player: Player = {
              id: tp.player.id,
              feedId: tp.player.feedId,
              squadId: tp.player.squadId,
              firstName: tp.player.firstName,
              lastName: tp.player.lastName,
              position: tp.player.position as PlayerPosition,
              cost: tp.player.cost,
              status: tp.player.status as PlayerStatus,
              isLocked: tp.player.isLocked,
              stats,
              selected: rawSelected,
              imagePitch: tp.player.imagePitch ?? '',
              imageProfile: tp.player.imageProfile ?? '',
            };
            newSlots[slotId] = player;
            newTotalCost += player.cost;
          }

          return {
            slots: newSlots,
            totalCost: newTotalCost,
            teamId: team.id,
            teamName: team.name,
            selectedLeagueId: team.leagueId,
            // Reset edit mode and snapshot to loaded state
            isEditing: false,
            savedSlots: { ...newSlots },
            savedTotalCost: newTotalCost,
          };
        }),

      setLeagueId: (leagueId) =>
        set(() => {
          const emptySlots = initializeSlots();
          return {
            slots: emptySlots,
            totalCost: 0,
            selectedLeagueId: leagueId,
            teamId: null,
            teamName: '',
            // Reset edit mode and snapshot
            isEditing: false,
            savedSlots: { ...emptySlots },
            savedTotalCost: 0,
          };
        }),

      setTeamName: (name) =>
        set({ teamName: name }),

      // === Edit Mode Actions ===
      enterEditMode: () =>
        set((state) => {
          if (state.isEditing) return state; // Already editing
          return {
            isEditing: true,
            savedSlots: { ...state.slots },
            savedTotalCost: state.totalCost,
          };
        }),

      exitEditMode: () =>
        set((state) => ({
          // Restore saved state
          slots: { ...state.savedSlots },
          totalCost: state.savedTotalCost,
          isEditing: false,
        })),

      commitSave: () =>
        set((state) => ({
          // Update snapshot to current state
          savedSlots: { ...state.slots },
          savedTotalCost: state.totalCost,
          isEditing: false,
        })),

      // === Edit Mode Derived Getters ===
      getIsDirty: () => {
        const state = get();
        const { slots, savedSlots } = state;
        
        // Compare each slot by player ID
        for (const slotId of Object.keys(slots)) {
          const currentPlayer = slots[slotId];
          const savedPlayer = savedSlots[slotId];
          
          // Both null - no change
          if (currentPlayer === null && savedPlayer === null) continue;
          
          // One is null, other isn't - change detected
          if (currentPlayer === null || savedPlayer === null) return true;
          
          // Different player IDs - change detected
          if (currentPlayer.id !== savedPlayer.id) return true;
        }
        
        return false;
      },

      getTransferDiff: () => {
        const state = get();
        const { slots, savedSlots } = state;
        
        // Collect all player IDs from current and saved states
        const currentPlayerIds = new Set<number>();
        const savedPlayerIds = new Set<number>();
        const currentPlayersMap = new Map<number, Player>();
        const savedPlayersMap = new Map<number, Player>();
        
        for (const player of Object.values(slots)) {
          if (player !== null) {
            currentPlayerIds.add(player.id);
            currentPlayersMap.set(player.id, player);
          }
        }
        
        for (const player of Object.values(savedSlots)) {
          if (player !== null) {
            savedPlayerIds.add(player.id);
            savedPlayersMap.set(player.id, player);
          }
        }
        
        // Added: in current but not in saved
        const added: Player[] = [];
        for (const id of currentPlayerIds) {
          if (!savedPlayerIds.has(id)) {
            const player = currentPlayersMap.get(id);
            if (player) added.push(player);
          }
        }
        
        // Removed: in saved but not in current
        const removed: Player[] = [];
        for (const id of savedPlayerIds) {
          if (!currentPlayerIds.has(id)) {
            const player = savedPlayersMap.get(id);
            if (player) removed.push(player);
          }
        }
        
        return { added, removed };
      },

      // === Initial UI State ===
      filters: defaultFilters,
      priceRange: { min: VALIDATION.MIN_PRICE, max: VALIDATION.MAX_PRICE },
      activeTab: 'LIST',
      comparisonModalOpen: false,
      comparisonPlayers: [],
      filtersExpanded: false,
      selectedSlotId: null,
      isLoading: false,

      // === UI Actions ===
      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),

      resetFilters: () =>
        set((state) => ({
          filters: {
            ...defaultFilters,
            minPrice: state.priceRange.min,
            maxPrice: state.priceRange.max,
          },
        })),

      initializePriceRange: (min, max) =>
        set((state) => {
          // Only update if the price filter hasn't been modified from the current data range.
          // Safe to call on every player data load.
          if (
            state.filters.minPrice === state.priceRange.min &&
            state.filters.maxPrice === state.priceRange.max
          ) {
            return {
              filters: { ...state.filters, minPrice: min, maxPrice: max },
              priceRange: { min, max },
            };
          }
          return {};
        }),

      setActiveTab: (tab) =>
        set({
          activeTab: tab,
        }),

      openComparisonModal: (playerIds) =>
        set({
          comparisonModalOpen: true,
          comparisonPlayers: playerIds.slice(0, VALIDATION.MAX_COMPARISON_PLAYERS),
        }),

      closeComparisonModal: () =>
        set({
          comparisonModalOpen: false,
          comparisonPlayers: [],
        }),

      toggleFilters: () =>
        set((state) => ({
          filtersExpanded: !state.filtersExpanded,
        })),

      setSelectedSlot: (slotId) =>
        set({
          selectedSlotId: slotId,
        }),

      setIsLoading: (isLoading: boolean) =>
        set({
          isLoading,
        }),
    }),
    {
      // Scope the persistence key to the active tenant so each tenant
      // (trc-2025, super-2026, …) maintains an independent squad.
      name: `${STORAGE_KEYS.MY_TEAM}:${getActiveTenantId()}`,
      // Merge persisted state onto current initial state so that any new fields
      // added to the store are always present, even for users with old localStorage.
      // This avoids needing explicit version migrations when adding new filter fields.
      merge: (persisted, current) => {
        const p = persisted as Partial<MyTeamState>;
        // Initialize savedSlots/savedTotalCost from persisted slots/totalCost
        // so that getIsDirty() returns false on cold load (no false-positive dirty state)
        const slots = p.slots ?? current.slots;
        const totalCost = p.totalCost ?? current.totalCost;
        return {
          ...current,
          ...p,
          slots,
          totalCost,
          savedSlots: slots,
          savedTotalCost: totalCost,
          isEditing: false, // Always start in view mode on cold load
          filters: { ...current.filters, ...p.filters },
          priceRange: p.priceRange ?? current.priceRange,
        };
      },
      partialize: (state) => ({
        slots: state.slots,
        totalCost: state.totalCost,
        filters: state.filters,
        activeTab: state.activeTab,
        priceRange: state.priceRange,
        selectedLeagueId: state.selectedLeagueId,
        teamName: state.teamName,
      }),
    }
  )
);
