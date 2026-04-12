import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player, PlayerPosition, PlayerStats } from '../mocks/playerData';
import { VALIDATION, STORAGE_KEYS } from '../config/constants';
import { getPositionsByType, getAllPositions } from '../config/fieldLayouts';
import { getActiveTenantId } from '../utils/tenant';
import type { PlayerStatus, TeamWithPlayers } from '@spectatr/shared-types';

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
}

export interface MyTeamState {
  // === Squad Data (Slot-based) ===
  slots: PlayerSlots;
  totalCost: number;

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
          };
        }),

      setLeagueId: (leagueId) =>
        set(() => ({
          slots: initializeSlots(),
          totalCost: 0,
          selectedLeagueId: leagueId,
          teamId: null,
          teamName: '',
        })),

      setTeamName: (name) =>
        set({ teamName: name }),

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
        return {
          ...current,
          ...p,
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
