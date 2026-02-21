import type { FC } from 'react';
import { Box, Typography } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

export interface EmptySlotProps {
  label: string;
  variant?: 'field' | 'list';
  isSelected?: boolean;
  onClick?: () => void;
}

/**
 * EmptySlot component
 * Displays an empty position slot with add icon and label
 * Uses theme.palette.selection for state-based styling
 */
export const EmptySlot: FC<EmptySlotProps> = ({
  label,
  variant = 'field',
  isSelected = false,
  onClick,
}) => {
  const isFieldVariant = variant === 'field';

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: isFieldVariant ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isFieldVariant ? 0.5 : 1,
        padding: isFieldVariant ? 1 : 1.5,
        cursor: onClick ? 'pointer' : 'default',
        border: 2,
        borderStyle: 'dashed',
        borderColor: isSelected
          ? (theme) => theme.palette.selection?.available || theme.palette.primary.main
          : (theme) => theme.palette.divider,
        borderRadius: isFieldVariant ? '50%' : 1,
        width: isFieldVariant ? 80 : 'auto',
        height: isFieldVariant ? 80 : 'auto',
        minHeight: isFieldVariant ? 80 : 48,
        bgcolor: isSelected ? 'action.selected' : 'transparent',
        transition: (theme) =>
          theme.transitions.create(['background-color', 'border-color'], {
            duration: theme.transitions.duration.shorter,
          }),
        '&:hover': onClick
          ? {
              bgcolor: 'action.hover',
              borderColor: (theme) => theme.palette.selection?.available || theme.palette.primary.light,
            }
          : {},
      }}
    >
      {/* Add Icon */}
      <AddCircleOutlineIcon
        sx={{
          fontSize: isFieldVariant ? 32 : 24,
          color: isSelected 
            ? (theme) => theme.palette.selection?.available || theme.palette.primary.main
            : 'text.secondary',
        }}
      />

      {/* Label */}
      <Typography
        variant={isFieldVariant ? 'emptySlotLabel' : 'body2'}
        sx={{
          color: isSelected
            ? (theme) => theme.palette.selection?.available || theme.palette.primary.main
            : 'text.secondary',
          maxWidth: isFieldVariant ? 70 : 'none',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};
