import type { FC } from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Skeleton,
} from '@mui/material';
import { useMyTeamStore } from '@/stores';
import { useMyLeaguesQuery } from '@/hooks/api/useLeaguesQuery';

export interface LeaguePickerProps {
  /**
   * Optional callback called before changing the league.
   * If provided, the component will call this with the new league ID
   * instead of directly calling setLeagueId.
   * The parent can then decide whether to proceed with the change.
   */
  onLeagueChange?: (newLeagueId: number | null) => void;
}

/**
 * League picker dropdown for selecting which league's team to manage.
 * Shows a skeleton while leagues are loading.
 * 
 * When `onLeagueChange` is provided, delegates league switching to the parent
 * (useful for dirty-state checking). Otherwise calls `setLeagueId` directly.
 */
export const LeaguePicker: FC<LeaguePickerProps> = ({ onLeagueChange }) => {
  const { selectedLeagueId, setLeagueId } = useMyTeamStore();
  const { data: leagues, isLoading } = useMyLeaguesQuery();

  const handleChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    const newLeagueId = value === '' ? null : Number(value);
    
    if (onLeagueChange) {
      // Delegate to parent for dirty-state checking
      onLeagueChange(newLeagueId);
    } else {
      // Direct update (default behavior)
      setLeagueId(newLeagueId);
    }
  };

  if (isLoading) {
    return <Skeleton variant="rectangular" width={220} height={40} />;
  }

  return (
    <FormControl size="small" sx={{ minWidth: 220 }}>
      <InputLabel id="league-picker-label">Select League</InputLabel>
      <Select
        labelId="league-picker-label"
        value={selectedLeagueId !== null ? String(selectedLeagueId) : ''}
        label="Select League"
        onChange={handleChange}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {(leagues ?? []).map((league) => (
          <MenuItem key={league.id} value={String(league.id)}>
            {league.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
