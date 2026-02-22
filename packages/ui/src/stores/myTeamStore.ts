import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player } from '../mocks/playerData';
import { getMaxPlayerCost } from '../mocks/playerData';
import { VALIDATION, STORAGE_KEYS } from '../config/constants';
import { getPositionsByType, getAllPositions } from '../config/fieldLayouts';
import { getActiveTenantId } from '../utils/tenant';

// Calculate max price from actual player data
const MAX_PLAYER_PRICE = Math.ceil(getMaxPlayerCost() / 1_000_000);

// Slot-based player storage: maps field slot ID to player (or null if vacant)
export type PlayerSlots = Record<string, Player | null>;

export interface PlayerFilters {
  search: string;
  position: string | null;
  squad: string | null;
  minPrice: number;
  maxPrice: number;
  withinBudget: boolean;
}

export interface MyTeamState {
  // === Squad Data (Slot-based) ===
  slots: PlayerSlots;
  totalCost: number;

  // === Squad Actions ===
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: number) => void;
  clearSquad: () => void;
  isPlayerSelected: (playerId: number) => boolean;
  getRemainingBudget: (maxBudget: number) => number;
  getSelectedPlayers: () => Player[]; // Helper to get array of players
  getPlayerSlot: (playerId: number) => string | null; // Get slot ID for a player

  // === UI State ===
  filters: PlayerFilters;
  activeTab: 'LIST' | 'SQUAD';
  comparisonModalOpen: boolean;
  comparisonPlayers: number[];
  filtersExpanded: boolean;
  selectedSlotId: string | null; // Currently selected field slot for player assignment
  isLoading: boolean; // For demonstrating skeleton states (will be replaced by TanStack Query)

  // === UI Actions ===
  setFilters: (filters: Partial<PlayerFilters>) => void;
  resetFilters: () => void;
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
  maxPrice: MAX_PLAYER_PRICE,
  withinBudget: false,
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

      // === Squad Actions ===
      addPlayer: (player) =>
        set((state) => {
          // Check if player already selected
          if (Object.values(state.slots).some((p) => p?.id === player.id)) {
            return state;
          }

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

          return {
            slots: {
              ...state.slots,
              [slotId]: null, // Vacate the slot
            },
            totalCost: state.totalCost - player.cost,
          };
        }),

      clearSquad: () =>
        set({
          slots: initializeSlots(),
          totalCost: 0,
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

      // === Initial UI State ===
      filters: defaultFilters,
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
        set({
          filters: defaultFilters,
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
      partialize: (state) => ({
        slots: state.slots,
        totalCost: state.totalCost,
        filters: state.filters,
        activeTab: state.activeTab,
      }),
    }
  )
);
