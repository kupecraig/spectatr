import type { FC } from 'react';
import { Skeleton, ListItem, Box, Avatar } from '@mui/material';

/**
 * PlayerListItemSkeleton component
 * Displays a skeleton placeholder matching PlayerListItem dimensions
 * Used during loading states to prevent layout shift
 */
export const PlayerListItemSkeleton: FC = () => {
  return (
    <ListItem
      sx={{
        borderLeft: 3,
        borderColor: 'transparent',
        borderBottom: 1,
        borderBottomColor: 'divider',
        p: 1,
      }}
    >
      {/* Columns 1 & 2: Player info + Price */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        flex: 1,
      }}>
        {/* Column 1: Player info */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {/* Player name - infers height from fontSize */}
          <Skeleton 
            variant="text" 
            width="60%" 
            sx={{ fontSize: '1rem' }} // body1 size
          />
          
          {/* Position and selection chips */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {/* Position badge */}
            <Skeleton 
              variant="rounded" 
              width={60} 
              height={20}
            />
            {/* Selection percent badge */}
            <Skeleton 
              variant="rounded" 
              width={60} 
              height={20}
            />
          </Box>
        </Box>

        {/* Column 2: Price */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 2 }}>
          <Skeleton 
            variant="text" 
            width={50}
            sx={{ fontSize: '1rem' }} // body1 size
          />
        </Box>
      </Box>

      {/* Column 3: Action button - use dimension inference */}
      <Skeleton variant="circular">
        <Avatar sx={{ width: 40, height: 40 }} />
      </Skeleton>
    </ListItem>
  );
};
