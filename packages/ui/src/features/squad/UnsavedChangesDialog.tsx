import type { FC } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Box } from '@mui/material';

export interface UnsavedChangesDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog (Cancel action) */
  onClose: () => void;
  /** Callback when user chooses to discard changes */
  onDiscard: () => void;
}

/**
 * Warning dialog shown when user tries to switch leagues with unsaved changes.
 * Offers Cancel (keep current state) or Discard (proceed with switch).
 */
export const UnsavedChangesDialog: FC<UnsavedChangesDialogProps> = ({
  open,
  onClose,
  onDiscard,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Unsaved Changes
        <IconButton onClick={onClose} size="small" aria-label="Close dialog">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
          <WarningAmberIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
          <Typography variant="body1" align="center">
            You have unsaved changes to your squad.
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            Switching leagues will discard these changes.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" color="error" onClick={onDiscard}>
          Discard Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};
