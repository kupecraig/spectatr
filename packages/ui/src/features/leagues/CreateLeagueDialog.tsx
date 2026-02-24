import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  FormControlLabel,
  InputLabel,
  Switch,
  Button,
  IconButton,
  Stack,
  Alert,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useLeagueStore } from '@/stores/leagueStore';
import { useCreateLeagueMutation } from '@/hooks/api/useLeaguesQuery';
import { createLeagueSchema, MIN_PARTICIPANTS, MIN_DRAFT_PARTICIPANTS, MAX_DRAFT_PARTICIPANTS } from '@spectatr/shared-types';

// ─────────────────────────────────────────────────────────────────────────────
// CreateLeagueDialog
// ─────────────────────────────────────────────────────────────────────────────

interface CreateLeagueDialogProps {
  /** Called after a successful create */
  onSuccess?: (leagueId: number) => void;
}

export function CreateLeagueDialog({ onSuccess }: CreateLeagueDialogProps) {
  const { dialogMode, formDraft, setFormDraft, closeDialog } = useLeagueStore();
  const open = dialogMode === 'create';
  const mutation = useCreateLeagueMutation();

  // Client-side validation
  const parseResult = createLeagueSchema.safeParse(formDraft);
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
      const league = await mutation.mutateAsync(parseResult.data);
      closeDialog();
      onSuccess?.(league.id);
    } catch {
      // Error displayed via mutation.error
    }
  };

  const serverError =
    mutation.error instanceof Error ? mutation.error.message : mutation.error ? String(mutation.error) : null;

  return (
    <Dialog open={open} onClose={closeDialog} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Create League
        <IconButton onClick={closeDialog} size="small" aria-label="Close dialog">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {serverError && (
            <Alert severity="error" onClose={() => mutation.reset()}>
              {serverError}
            </Alert>
          )}

          {/* Name */}
          <TextField
            label="League Name"
            value={formDraft.name}
            onChange={(e) => setFormDraft({ name: e.target.value })}
            error={Boolean(formDraft.name && formErrors.name)}
            helperText={formDraft.name && formErrors.name}
            required
            fullWidth
            inputProps={{ maxLength: 60 }}
          />

          {/* Game Mode */}
          <FormControl fullWidth required>
            <InputLabel>Game Mode</InputLabel>
            <Select
              label="Game Mode"
              value={formDraft.gameMode}
              onChange={(e) =>
                setFormDraft({ gameMode: e.target.value as typeof formDraft.gameMode })
              }
            >
              <MenuItem value="standard">Standard</MenuItem>
              <MenuItem value="round-robin">Round Robin</MenuItem>
              <MenuItem value="ranked">Ranked</MenuItem>
            </Select>
          </FormControl>

          {/* Draft Mode */}
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(formDraft.rules?.draftMode)}
                onChange={(e) =>
                  setFormDraft({ rules: { ...formDraft.rules, draftMode: e.target.checked } })
                }
              />
            }
            label={
              <Stack>
                <Typography variant="body2">Draft Mode</Typography>
                <Typography variant="caption" color="text.secondary">
                  Players are picked in turns from a shared pool — max {MAX_DRAFT_PARTICIPANTS} participants
                </Typography>
              </Stack>
            }
          />

          {/* Max Participants */}
          {(() => {
            const isDraft = Boolean(formDraft.rules?.draftMode);
            const modeMin = MIN_PARTICIPANTS[formDraft.gameMode];
            const effectiveMin = isDraft ? Math.max(modeMin, MIN_DRAFT_PARTICIPANTS) : modeMin;
            const effectiveMax = isDraft ? MAX_DRAFT_PARTICIPANTS : 100;
            const modeLabels: Record<string, string> = {
              standard:      'Standard',
              'round-robin': 'Round Robin',
              ranked:        'Ranked',
            };
            const label = modeLabels[formDraft.gameMode] ?? formDraft.gameMode;
            const hint = isDraft
              ? `Draft leagues: ${effectiveMin}–${effectiveMax} participants`
              : `Min ${effectiveMin} for ${label} mode, max ${effectiveMax}`;
            return (
              <TextField
                label="Max Participants"
                type="number"
                value={formDraft.maxParticipants}
                onChange={(e) =>
                  setFormDraft({ maxParticipants: Number(e.target.value) })
                }
                error={Boolean(formErrors.maxParticipants)}
                helperText={formErrors.maxParticipants ?? hint}
                inputProps={{ min: effectiveMin, max: effectiveMax }}
                fullWidth
              />
            );
          })()}

          {/* Public toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={formDraft.isPublic}
                onChange={(e) => setFormDraft({ isPublic: e.target.checked })}
              />
            }
            label={
              <Stack>
                <Typography variant="body2">Public League</Typography>
                <Typography variant="caption" color="text.secondary">
                  Anyone can find and request to join this league
                </Typography>
              </Stack>
            }
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
          {mutation.isPending ? 'Creating…' : 'Create League'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
