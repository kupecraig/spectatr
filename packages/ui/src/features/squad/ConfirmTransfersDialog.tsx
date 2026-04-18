import type { FC } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import type { Player } from '@/mocks/playerData';
import type { TransferDiff } from '@/stores/myTeamStore';
import { sportSquadConfig } from '@spectatr/shared-types';

export interface ConfirmTransfersDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback when user confirms the transfers */
  onConfirm: () => void;
  /** Transfer diff showing added and removed players */
  transferDiff: TransferDiff;
  /** Budget impact (positive = saved money, negative = spent money) */
  budgetDelta: number;
  /** Whether the save is in progress */
  isSaving: boolean;
}

/**
 * Get the display label for a position type from the sport config.
 */
function getPositionLabel(positionType: string): string {
  const config = sportSquadConfig.positions[positionType];
  return config?.label ?? positionType;
}

/**
 * Format cost as millions (e.g., 2.5M)
 */
function formatCost(cost: number): string {
  return `${(cost / 1_000_000).toFixed(1)}M`;
}

/**
 * Dialog showing transfer summary before saving.
 * Displays players added (IN) and removed (OUT) with their costs,
 * plus the net budget impact.
 */
export const ConfirmTransfersDialog: FC<ConfirmTransfersDialogProps> = ({
  open,
  onClose,
  onConfirm,
  transferDiff,
  budgetDelta,
  isSaving,
}) => {
  const { added, removed } = transferDiff;
  const hasChanges = added.length > 0 || removed.length > 0;

  const renderPlayerItem = (player: Player, type: 'in' | 'out') => (
    <ListItem key={player.id} sx={{ py: 1.5 }}>
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: type === 'in' ? 'success.light' : 'error.light' }}>
          <PersonIcon />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={`${player.firstName} ${player.lastName}`}
        secondary={getPositionLabel(player.position)}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {formatCost(player.cost)}
        </Typography>
        <Chip
          label={type === 'in' ? 'IN' : 'OUT'}
          size="small"
          color={type === 'in' ? 'success' : 'error'}
        />
      </Box>
    </ListItem>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Confirm Transfers
        <IconButton onClick={onClose} size="small" aria-label="Close dialog">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {!hasChanges ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No changes to save.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Players IN */}
            {added.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Players In ({added.length})
                </Typography>
                <List disablePadding>
                  {added.map((player) => renderPlayerItem(player, 'in'))}
                </List>
              </Box>
            )}

            {added.length > 0 && removed.length > 0 && <Divider sx={{ my: 2 }} />}

            {/* Players OUT */}
            {removed.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Players Out ({removed.length})
                </Typography>
                <List disablePadding>
                  {removed.map((player) => renderPlayerItem(player, 'out'))}
                </List>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Budget Impact */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 2,
                py: 1.5,
                bgcolor: 'action.hover',
                borderRadius: 1,
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold">
                Budget Impact
              </Typography>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                color={budgetDelta >= 0 ? 'success.main' : 'error.main'}
              >
                {budgetDelta >= 0 ? '+' : ''}
                {formatCost(budgetDelta)}
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={!hasChanges || isSaving}
          startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {isSaving ? 'Saving…' : 'Confirm Transfers'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
