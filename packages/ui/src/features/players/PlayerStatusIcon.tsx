import type { FC } from 'react';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import HealingIcon from '@mui/icons-material/Healing';
import BlockIcon from '@mui/icons-material/Block';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import type { PlayerStatus } from '@spectatr/shared-types';

interface PlayerStatusIconProps {
  status: PlayerStatus;
}

export const PlayerStatusIcon: FC<PlayerStatusIconProps> = ({ status }) => {
  switch (status) {
    case 'uncertain':
      return (
        <HelpOutlineIcon
          fontSize="small"
          sx={{ color: 'warning.main' }}
        />
      );
    case 'injured':
      return (
        <HealingIcon
          fontSize="small"
          sx={{ color: 'error.main' }}
        />
      );
    case 'eliminated':
      return (
        <BlockIcon
          fontSize="small"
          sx={{ color: 'text.disabled' }}
        />
      );
    case 'benched':
      return (
        <EventSeatIcon
          fontSize="small"
          sx={{ color: 'text.secondary' }}
        />
      );
    default:
      return null;
  }
};
