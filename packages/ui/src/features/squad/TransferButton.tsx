import type { FC } from 'react';
import { Button, CircularProgress } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SaveIcon from '@mui/icons-material/Save';

export interface TransferButtonProps {
  /** Whether the user is currently in edit mode (has unsaved changes) */
  isEditing: boolean;
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Whether a league is selected (button hidden when no league) */
  hasLeague: boolean;
  /** Callback when "Make Transfers" is clicked */
  onMakeTransfers: () => void;
  /** Callback when "Save Transfers" is clicked */
  onSaveTransfers: () => void;
}

/**
 * Toggle button for Make Transfers / Save Transfers in the AppBar.
 * - "Make Transfers" (outlined) when not editing
 * - "Save Transfers" (contained) when editing
 * - Hidden when no league is selected
 * - Shows spinner when saving
 */
export const TransferButton: FC<TransferButtonProps> = ({
  isEditing,
  isSaving,
  hasLeague,
  onMakeTransfers,
  onSaveTransfers,
}) => {
  // Hidden when no league selected
  if (!hasLeague) {
    return null;
  }

  if (isEditing) {
    return (
      <Button
        variant="contained"
        onClick={onSaveTransfers}
        disabled={isSaving}
        startIcon={
          isSaving ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <SaveIcon />
          )
        }
        sx={{ ml: 2, whiteSpace: 'nowrap' }}
      >
        {isSaving ? 'Saving…' : 'Save Transfers'}
      </Button>
    );
  }

  return (
    <Button
      variant="outlined"
      color="inherit"
      onClick={onMakeTransfers}
      startIcon={<SwapHorizIcon />}
      sx={{ ml: 2, whiteSpace: 'nowrap' }}
    >
      Make Transfers
    </Button>
  );
};
