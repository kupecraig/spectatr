import type { FC } from 'react';
import { Box, ClickAwayListener, Typography } from '@mui/material';
import { fieldLayout } from '@/config/fieldLayouts';
import { useMyTeamStore } from '@/stores';
import { PlayerSlot, PlayerSlotSkeleton, EmptySlot } from '@/components';
import type { Player } from '@/mocks/playerData';

export const FieldView: FC = () => {
  const { slots, removePlayer, setFilters, setActiveTab, selectedSlotId, setSelectedSlot, isLoading } = useMyTeamStore();

  const handleSlotClick = (slotId: string, positionType: string) => {
    // If clicking on already selected slot, keep it selected and switch to list
    if (selectedSlotId === slotId) {
      setFilters({ position: positionType });
      setActiveTab('LIST');
    } else {
      // Select this slot
      setSelectedSlot(slotId);
      setFilters({ position: positionType });
      setActiveTab('LIST');
    }
  };

  const handleClickAway = () => {
    // Deselect slot and reset position filter when clicking outside
    setSelectedSlot(null);
    setFilters({ position: undefined });
  };

  const handleRemovePlayer = (player: Player) => {
    removePlayer(player.id);
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box
        sx={{
          width: '100%',
          height: '100%',
          backgroundImage: `url(${fieldLayout.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: (theme) => theme.palette.field?.backgroundFallback || theme.palette.success.main,
          borderRadius: (theme) => Number(theme.shape.borderRadius) * 0.5,
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 600,
          position: 'relative',
        }}
      >
      {/* Round indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          padding: 1,
          minWidth: 80,
          textAlign: 'center',
          boxShadow: 2,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Round
        </Typography>
        <Typography variant="h6" fontWeight="bold">
          1
        </Typography>
      </Box>

      {/* Field rows */}
      {fieldLayout.rows.map((row) => (
        <Box
          key={row.id}
          sx={{
            display: 'flex',
            justifyContent: row.justifyContent,
            alignItems: 'center',
            gap: row.spacing,
            padding: 1,
          }}
        >
          {row.positions.map((position) => {
            const player = slots[position.id]; // Get player from specific slot
            const isSelected = selectedSlotId === position.id;
            
            let slotContent;
            if (isLoading) {
              slotContent = <PlayerSlotSkeleton variant="field" />;
            } else if (player) {
              slotContent = (
                <PlayerSlot
                  player={player}
                  variant="field"
                  onRemoveClick={() => handleRemovePlayer(player)}
                />
              );
            } else {
              slotContent = (
                <EmptySlot
                  label={position.label}
                  variant="field"
                  isSelected={isSelected}
                  onClick={() => handleSlotClick(position.id, position.type)}
                />
              );
            }
            
            return (
              <Box
                key={position.id}
                sx={{
                  transform: `translate(${position.offsetX || 0}px, ${position.offsetY || 0}px)`,
                }}
              >
                {slotContent}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
    </ClickAwayListener>
  );
};
