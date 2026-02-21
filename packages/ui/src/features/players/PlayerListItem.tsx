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
import { Player, getPositionDisplayName } from '@/mocks/playerData';
import { useMyTeamStore } from '@/stores';

interface PlayerListItemProps {
  player: Player;
  validationError?: string | null;
  isDisabled?: boolean;
}

export const PlayerListItem: FC<PlayerListItemProps> = ({
  player,
  validationError,
  isDisabled,
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
          <Box sx={{ display: 'flex', gap: 0.5 }}>
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
