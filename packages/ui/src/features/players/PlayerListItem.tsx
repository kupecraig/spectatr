import type { FC } from 'react';
import {
  ListItem,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
} from '@mui/material';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import LockIcon from '@mui/icons-material/Lock';
import { Player, getPositionDisplayName } from '@/mocks/playerData';
import { useMyTeamStore } from '@/stores';
import { PlayerStatusIcon } from './PlayerStatusIcon';
import { SORT_BADGE_CONFIG } from './playerSortConfig';
import type { PlayerSortBy } from '@spectatr/shared-types';

interface PlayerListItemProps {
  player: Player;
  validationError?: string | null;
  isDisabled?: boolean;
  sortBy?: PlayerSortBy;
}

export const PlayerListItem: FC<PlayerListItemProps> = ({
  player,
  validationError,
  isDisabled,
  sortBy = 'totalPoints',
}) => {
  const { isPlayerSelected, addPlayer, removePlayer } = useMyTeamStore();
  const selected = isPlayerSelected(player.id);

  const handleTogglePlayer = () => {
    if (selected) {
      removePlayer(player.id);
    } else if (!isDisabled) {
      addPlayer(player);
    }
  };

  const costInMillions = (player.cost / 1_000_000).toFixed(1);
  const selectedPercent = player.selected?.percent || 0;
  
  // Calculate opacity for content and button
  const contentOpacity = (selected || isDisabled) ? 0.5 : 1;
  const buttonOpacity = isDisabled ? 0.5 : 1; // Only invalid players get reduced button opacity

  // Get badge config for current sort option
  const badgeConfig = SORT_BADGE_CONFIG[sortBy];

  // Create player data object for badge value computation
  // Handle both server response (flat) and mock data (nested stats)
  const playerForBadge = {
    totalPoints: (player as unknown as { totalPoints?: number }).totalPoints ?? player.stats?.totalPoints ?? 0,
    avgPoints: (player as unknown as { avgPoints?: number }).avgPoints ?? player.stats?.avgPoints ?? 0,
    lastRoundPoints: (player as unknown as { lastRoundPoints?: number }).lastRoundPoints ?? player.stats?.lastRoundPoints ?? 0,
    stats: player.stats as unknown as Record<string, unknown> | undefined,
  };

  return (
    <ListItem
      sx={{
        borderLeft: 3,
        borderColor: (!selected && !isDisabled) 
          ? (theme) => theme.palette.selection.available 
          : 'transparent',
        borderBottom: 1,
        borderBottomColor: 'divider',
        p: 1,
        transition: (theme) => theme.transitions.create(['background-color', 'border-color'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
    >
      {/* Columns 1 & 2: Player info + Price */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        flex: 1, 
        opacity: contentOpacity, 
        transition: (theme) => theme.transitions.create('opacity', {
          duration: theme.transitions.duration.shorter,
        }),
      }}>
        {/* Column 1: Player info */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="body1" fontWeight="bold">
            {player.firstName[0]}. {player.lastName.toUpperCase()}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Chip
              label={getPositionDisplayName(player.position).toUpperCase()}
              size="small"
              sx={{
                bgcolor: (theme) => theme.palette.positions?.[player.position] || theme.palette.grey[700],
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.7rem',
                height: 20,
              }}
            />
            <Chip
              label={`👤 ${selectedPercent}%`}
              size="small"
              sx={{
                bgcolor: (theme) => theme.palette.stats.neutral,
                color: 'text.secondary',
                fontSize: '0.7rem',
                height: 20,
              }}
            />
            {/* Stat badge based on active sort */}
            {badgeConfig && (
              <Chip
                label={`${badgeConfig.label}: ${badgeConfig.getValue(playerForBadge)}`}
                size="small"
                sx={{
                  bgcolor: (theme) => theme.palette.stats.highlight,
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                  height: 20,
                }}
              />
            )}
            <PlayerStatusIcon status={player.status} />
            {player.isLocked && (
              <LockIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            )}
          </Box>
        </Box>

        {/* Column 2: Price */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 2 }}>
          <Typography variant="body1" fontWeight="bold">
            {costInMillions}M
          </Typography>
        </Box>
      </Box>

      {/* Column 3: Action button */}
      <Tooltip title={validationError || ''} arrow>
        <span>
          <IconButton
            onClick={handleTogglePlayer}
            disabled={isDisabled && !selected}
            sx={{
              border: 1,
              borderColor: selected ? 'error.main' : 'text.secondary',
              borderRadius: '50%',
              opacity: buttonOpacity,
              transition: (theme) => theme.transitions.create('opacity', {
                duration: theme.transitions.duration.shorter,
              }),
            }}
          >
            {selected ? <PersonRemoveIcon fontSize="small" sx={{ color: 'error.main' }} /> : <PersonAddAltIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
    </ListItem>
  );
};
