import type { FC } from 'react';
import { Skeleton, Box, Avatar } from '@mui/material';

export interface PlayerSlotSkeletonProps {
  variant?: 'field' | 'list';
}

/**
 * PlayerSlotSkeleton component
 * Displays a skeleton placeholder matching PlayerSlot dimensions
 * Used during loading states to prevent layout shift
 */
export const PlayerSlotSkeleton: FC<PlayerSlotSkeletonProps> = ({ variant = 'field' }) => {
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
      {/* Player Avatar Skeleton - use dimension inference */}
      <Skeleton variant="circular">
        <Avatar sx={{ width: isFieldVariant ? 80 : 40, height: isFieldVariant ? 80 : 40 }} />
      </Skeleton>

      {/* Player Info Skeleton */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isFieldVariant ? 'center' : 'flex-start',
          flex: isFieldVariant ? 0 : 1,
          gap: 0.5,
        }}
      >
        {/* Name skeleton - infers height from fontSize */}
        <Skeleton
          variant="text"
          width={isFieldVariant ? 100 : 120}
          sx={{
            fontSize: isFieldVariant ? '0.75rem' : '0.875rem',
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
        />
      </Box>
    </Box>
  );
};
