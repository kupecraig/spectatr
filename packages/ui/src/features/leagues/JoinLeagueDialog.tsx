import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Stack,
  Alert,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useLeagueStore } from '@/stores/leagueStore';
import { useJoinLeagueMutation } from '@/hooks/api/useLeaguesQuery';
import { joinLeagueByCodeSchema } from '@spectatr/shared-types';

// ─────────────────────────────────────────────────────────────────────────────
// JoinLeagueDialog
// ─────────────────────────────────────────────────────────────────────────────

interface JoinLeagueDialogProps {
  /** Called after a successful join with the joined league ID */
  onSuccess?: (leagueId: number) => void;
}

export function JoinLeagueDialog({ onSuccess }: JoinLeagueDialogProps) {
  const { dialogMode, joinInviteCode, joinTeamName, setJoinInviteCode, setJoinTeamName, closeDialog } =
    useLeagueStore();
  const open = dialogMode === 'join';
  const mutation = useJoinLeagueMutation();

  const parseResult = joinLeagueByCodeSchema.safeParse({
    inviteCode: joinInviteCode,
    teamName: joinTeamName,
  });

  const formErrors: Record<string, string> = {};
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      const field = issue.path[0] as string;
      formErrors[field] = issue.message;
    }
  }

  const handleSubmit = async () => {
    if (!parseResult.success) return;
    try {
      const result = await mutation.mutateAsync(parseResult.data);
      closeDialog();
      onSuccess?.(result.leagueId);
    } catch {
      // Error displayed via mutation.error
    }
  };

  const serverError =
    mutation.error instanceof Error ? mutation.error.message : mutation.error ? String(mutation.error) : null;

  return (
    <Dialog open={open} onClose={closeDialog} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Join League
        <IconButton onClick={closeDialog} size="small" aria-label="Close dialog">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Enter the 8-character invite code your league admin shared with you.
          </Typography>

          {serverError && (
            <Alert severity="error" onClose={() => mutation.reset()}>
              {serverError}
            </Alert>
          )}

          {/* Invite Code */}
          <TextField
            label="Invite Code"
            value={joinInviteCode}
            onChange={(e) => setJoinInviteCode(e.target.value.toUpperCase())}
            error={Boolean(joinInviteCode && formErrors.inviteCode)}
            helperText={joinInviteCode ? formErrors.inviteCode : undefined}
            required
            fullWidth
            inputProps={{ maxLength: 8, style: { letterSpacing: '0.25em', fontFamily: 'monospace' } }}
            placeholder="ABCD1234"
          />

          {/* Team Name */}
          <TextField
            label="Your Team Name"
            value={joinTeamName}
            onChange={(e) => setJoinTeamName(e.target.value)}
            error={Boolean(joinTeamName && formErrors.teamName)}
            helperText={joinTeamName ? formErrors.teamName : undefined}
            required
            fullWidth
            inputProps={{ maxLength: 50 }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={closeDialog} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!parseResult.success || mutation.isPending}
        >
          {mutation.isPending ? 'Joining…' : 'Join League'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
