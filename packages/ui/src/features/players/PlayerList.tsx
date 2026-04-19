import { useMemo, useCallback, useEffect, type FC } from 'react';
import { List, Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, Skeleton } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { leagueRules, type Player as MockPlayer } from '@/mocks/playerData';
import { useMyTeamStore } from '@/stores';
import { FilterPanel } from './FilterPanel';
import { PlayerListItem } from './PlayerListItem';
import { PlayerListItemSkeleton } from './PlayerListItemSkeleton';
import { PLAYER_SORT_OPTIONS } from './playerSortConfig';
import { validateSquad, sportSquadConfig, type Player, type PlayerSortBy } from '@spectatr/shared-types';
import { getErrorType, getUserFriendlyError } from '@/config/validationErrors';
import { usePlayersQuery, useSquadsQuery } from '@/hooks/api';
import { VALIDATION } from '@/config/constants';

const PLAYERS_FETCH_LIMIT = 500;
const DEFAULT_BUDGET = 42_000_000;

export const PlayerList: FC = () => {
  const { filters, setFilters, getSelectedPlayers, getRemainingBudget, initializePriceRange } = useMyTeamStore();

  const { data: playersResult, isLoading: playersLoading } = usePlayersQuery({
    limit: PLAYERS_FETCH_LIMIT,
    offset: 0,
    sortBy: filters.sortBy,
  });
  const { data: squadsData, isLoading: squadsLoading } = useSquadsQuery();

  const players = useMemo(() => playersResult?.players ?? [], [playersResult?.players]);

  const squadById = useMemo(() => {
    return new Map((squadsData ?? []).map((squad) => [squad.id, squad]));
  }, [squadsData]);

  const squadNames = useMemo(() => {
    return (squadsData ?? []).map((squad) => squad.name);
  }, [squadsData]);

  const maxPlayerPrice = useMemo(() => {
    if (players.length === 0) {
      return VALIDATION.MAX_PRICE;
    }
    const maxCost = Math.max(...players.map((player) => player.cost));
    return Math.ceil(maxCost / 1_000_000);
  }, [players]);

  const minPlayerPrice = useMemo(() => {
    if (players.length === 0) {
      return VALIDATION.MIN_PRICE;
    }
    const minCost = Math.min(...players.map((player) => player.cost));
    return Math.floor(minCost / 1_000_000);
  }, [players]);

  // Sync price filter to actual player data range when data loads.
  // Only updates if the filter hasn't been user-modified.
  useEffect(() => {
    if (players.length > 0) {
      initializePriceRange(minPlayerPrice, maxPlayerPrice);
    }
  }, [players.length, minPlayerPrice, maxPlayerPrice, initializePriceRange]);
  
  const selectedPlayers = useMemo(() => getSelectedPlayers(), [getSelectedPlayers]);
  
  // Use first league rules for now (in real app, would be selected league)
  const currentLeagueRules = useMemo(() => leagueRules[0], []);
  const maxBudget = useMemo(() => currentLeagueRules?.priceCap ?? DEFAULT_BUDGET, [currentLeagueRules]);
  const remainingBudget = useMemo(() => getRemainingBudget(maxBudget), [getRemainingBudget, maxBudget]);

  // Handle sort change
  const handleSortChange = useCallback((event: SelectChangeEvent<PlayerSortBy>) => {
    setFilters({ sortBy: event.target.value as PlayerSortBy });
  }, [setFilters]);

  // Filter players
  const filteredPlayers: MockPlayer[] = useMemo(() => {
    let filtered = players;

    // Name search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.firstName.toLowerCase().includes(searchLower) ||
          p.lastName.toLowerCase().includes(searchLower)
      );
    }

    // Squad filter
    if (filters.squad) {
      filtered = filtered.filter((p) => {
        const squad = squadById.get(p.squadId);
        return squad?.name === filters.squad;
      });
    }

    // Position filter
    if (filters.position) {
      filtered = filtered.filter((p) => p.position === filters.position);
    }

    // Price range filter
    const minCost = filters.minPrice * 1_000_000;
    const maxCost = filters.maxPrice * 1_000_000;
    filtered = filtered.filter((p) => p.cost >= minCost && p.cost <= maxCost);

    // Within budget filter
    if (filters.withinBudget) {
      filtered = filtered.filter((p) => p.cost <= remainingBudget);
    }

    // Status filter
    if (filters.statuses.length > 0) {
      filtered = filtered.filter((p) => (filters.statuses as string[]).includes(p.status));
    }

    return filtered;
  }, [players, filters, remainingBudget, squadById]);

  // Validate player addition - memoized to prevent recreation on every render
  const getPlayerValidation = useCallback((player: MockPlayer) => {
    const isSelected = selectedPlayers.some(p => p.id === player.id);
    
    // For selected players, show empty tooltip (can always remove)
    if (isSelected) {
      return { isDisabled: false, error: null };
    }
    
    // Simulate adding the player and validate with Zod
    // Cast to Player type from shared-types for validation
    const potentialSquad = [...selectedPlayers, player] as Player[];
    const validation = validateSquad(potentialSquad, sportSquadConfig, currentLeagueRules);

    if (!validation.valid) {
      // Only show errors that would PREVENT adding this player
      // Don't show errors about incomplete squad (POSITION_NOT_ENOUGH, SQUAD_SIZE_INVALID)
      const blockingErrorTypes = new Set(['BUDGET_EXCEEDED', 'SQUAD_LIMIT', 'POSITION_TOO_MANY']);
      
      for (const errorMsg of validation.errors) {
        const errorType = getErrorType(errorMsg);
        if (errorType && blockingErrorTypes.has(errorType)) {
          return { isDisabled: true, error: getUserFriendlyError(errorMsg) };
        }
      }
      
      // No blocking errors found - player can be added
      return { isDisabled: false, error: null };
    }

    return { isDisabled: false, error: null };
  }, [selectedPlayers, currentLeagueRules]);

  const isLoading = playersLoading || squadsLoading;

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Sort control */}
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        {isLoading ? (
          <Skeleton variant="rounded" width={150} height={40} />
        ) : (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="sort-by-label">Sort By</InputLabel>
            <Select
              labelId="sort-by-label"
              id="sort-by-select"
              value={filters.sortBy}
              label="Sort By"
              onChange={handleSortChange}
            >
              {PLAYER_SORT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Filter panel */}
      <Box sx={{
        borderBottom: 1,
        borderBottomColor: 'divider'}}>
        <FilterPanel squadNames={squadNames} minPlayerPrice={minPlayerPrice} maxPlayerPrice={maxPlayerPrice} />
      </Box>

      {/* Player list */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE/Edge
      }}>
        {isLoading && (
          <List dense={true}>
            {Array.from({ length: 10 }, (_, i) => (
              <PlayerListItemSkeleton key={`skeleton-player-${i}`} />
            ))}
          </List>
        )}
        
        {!isLoading && filteredPlayers.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No players match your filters
            </Typography>
          </Box>
        )}
        
        {!isLoading && filteredPlayers.length > 0 && (
          <List dense={true}>
            {filteredPlayers.map((player) => {
              const validation = getPlayerValidation(player);
              return (
                <PlayerListItem
                  key={player.id}
                  player={player}
                  validationError={validation.error}
                  isDisabled={validation.isDisabled}
                  sortBy={filters.sortBy}
                />
              );
            })}
          </List>
        )}
      </Box>
    </Paper>
  );
};
