import type { FC } from 'react';
import { Box, Avatar, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { Player } from '@/mocks/playerData';
import { getPlayerPitchImage } from '@/mocks/playerData';

export interface PlayerSlotProps {
  player: Player;
  variant?: 'field' | 'list';
  onRemoveClick?: () => void;
}

/**
 * PlayerSlot component
 * Displays a player in either field or list view with theme-aware styling
 * Uses theme.palette.positions for position-specific colors
 */
export const PlayerSlot: FC<PlayerSlotProps> = ({
  player,
  variant = 'field',
  onRemoveClick,
}) => {
  const isFieldVariant = variant === 'field';

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: isFieldVariant ? 'column' : 'row',
        alignItems: 'center',
        gap: isFieldVariant ? 0.5 : 1,
        padding: isFieldVariant ? 0 : 1,
      }}
    >
      {/* Player Avatar */}
      <Avatar
        src={getPlayerPitchImage(player)}
        alt={`${player.firstName} ${player.lastName}`}
        sx={{
          width: isFieldVariant ? 80 : 40,
          height: isFieldVariant ? 80 : 40,
          border: 2,
          borderColor: (theme) => theme.palette.positions?.[player.position] || theme.palette.primary.main,
          bgcolor: 'background.paper',
        }}
      >
        {player.firstName[0]}
        {player.lastName[0]}
      </Avatar>

      {/* Player Info */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isFieldVariant ? 'center' : 'flex-start',
          flex: isFieldVariant ? 0 : 1,
        }}
      >
        <Typography
          variant={isFieldVariant ? 'playerLabel' : 'body2'}
          sx={{
            color: 'text.primary',
            maxWidth: isFieldVariant ? 100 : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            ...(isFieldVariant && {
              backgroundColor: (theme) => theme.palette.field?.playerLabelBg || 'background.paper',
              mt: -0.75,
              px: 1,
              pt: 0.5,
              pb: 0.25,
              borderRadius: 1,
              boxShadow: 1,
            }),
          }}
        >
          {isFieldVariant ? `${player.firstName[0]}. ${player.lastName}` : player.lastName}
        </Typography>
        {!isFieldVariant && (
          <Typography variant="caption" color="text.secondary">
            {(player.cost / 1_000_000).toFixed(1)}M
          </Typography>
        )}
      </Box>

      {/* Remove Button */}
      {onRemoveClick && (
        <IconButton
          size="small"
          onClick={onRemoveClick}
          sx={{
            position: isFieldVariant ? 'absolute' : 'relative',
            top: isFieldVariant ? -8 : 'auto',
            right: isFieldVariant ? -8 : 0,
            width: 24,
            height: 24,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            '&:hover': {
              bgcolor: 'error.light',
              borderColor: 'error.main',
              color: 'error.contrastText',
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </Box>
  );
};
