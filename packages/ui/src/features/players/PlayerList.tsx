import { useMemo, useCallback, type FC } from 'react';
import { List, Box, Typography, Paper } from '@mui/material';
import { leagueRules, type Player as MockPlayer } from '@/mocks/playerData';
import { useMyTeamStore } from '@/stores';
import { FilterPanel } from './FilterPanel';
import { PlayerListItem } from './PlayerListItem';
import { PlayerListItemSkeleton } from './PlayerListItemSkeleton';
import { validateSquad, sportSquadConfig, type Player } from '@spectatr/shared-types';
import { getErrorType, getUserFriendlyError } from '@/config/validationErrors';
import { usePlayersQuery, useSquadsQuery } from '@/hooks/api';
import { VALIDATION } from '@/config/constants';

const PLAYERS_FETCH_LIMIT = 500;
const DEFAULT_BUDGET = 42_000_000;

export const PlayerList: FC = () => {
  const { filters, getSelectedPlayers, getRemainingBudget } = useMyTeamStore();

  const { data: playersResult, isLoading: playersLoading } = usePlayersQuery({
    limit: PLAYERS_FETCH_LIMIT,
    offset: 0,
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
  
  const selectedPlayers = useMemo(() => getSelectedPlayers(), [getSelectedPlayers]);
  
  // Use first league rules for now (in real app, would be selected league)
  const currentLeagueRules = useMemo(() => leagueRules[0], []);
  const maxBudget = useMemo(() => currentLeagueRules?.priceCap ?? DEFAULT_BUDGET, [currentLeagueRules]);
  const remainingBudget = useMemo(() => getRemainingBudget(maxBudget), [getRemainingBudget, maxBudget]);

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

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Filter panel */}
      <Box sx={{
        borderBottom: 1,
        borderBottomColor: 'divider'}}>
        <FilterPanel squadNames={squadNames} maxPlayerPrice={maxPlayerPrice} />
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
        {(playersLoading || squadsLoading) && (
          <List dense={true}>
            {Array.from({ length: 10 }, (_, i) => (
              <PlayerListItemSkeleton key={`skeleton-player-${i}`} />
            ))}
          </List>
        )}
        
        {!playersLoading && !squadsLoading && filteredPlayers.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No players match your filters
            </Typography>
          </Box>
        )}
        
        {!playersLoading && !squadsLoading && filteredPlayers.length > 0 && (
          <List dense={true}>
            {filteredPlayers.map((player) => {
              const validation = getPlayerValidation(player);
              return (
                <PlayerListItem
                  key={player.id}
                  player={player}
                  validationError={validation.error}
                  isDisabled={validation.isDisabled}
                />
              );
            })}
          </List>
        )}
      </Box>
    </Paper>
  );
};
