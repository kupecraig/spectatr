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
import { createLeagueSchema, MIN_PARTICIPANTS } from '@spectatr/shared-types';

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

          {/* Team Name */}
          <TextField
            label="Your Team Name"
            value={formDraft.teamName}
            onChange={(e) => setFormDraft({ teamName: e.target.value })}
            error={Boolean(formDraft.teamName && formErrors.teamName)}
            helperText={formDraft.teamName && formErrors.teamName}
            required
            fullWidth
            inputProps={{ maxLength: 50 }}
          />

          {/* Price Cap */}
          <FormControl fullWidth>
            <InputLabel>Price Cap</InputLabel>
            <Select
              label="Price Cap"
              value={formDraft.rules?.priceCap ?? 'none'}
              onChange={(e) => {
                const val = e.target.value;
                setFormDraft({ rules: { ...formDraft.rules, priceCap: val === 'none' ? null : Number(val) } });
              }}
            >
              <MenuItem value="none">Unlimited</MenuItem>
              {[30, 35, 40, 42, 45, 50, 60, 75, 100].map((m) => (
                <MenuItem key={m} value={m * 1_000_000}>{m}M</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Player Pricing */}
          <FormControl fullWidth>
            <InputLabel>Player Pricing</InputLabel>
            <Select
              label="Player Pricing"
              value={formDraft.rules?.pricingModel ?? 'fixed'}
              onChange={(e) =>
                setFormDraft({ rules: { ...formDraft.rules, pricingModel: e.target.value as ('fixed' | 'dynamic') } })
              }
            >
              <MenuItem value="fixed">Fixed — prices set at season start</MenuItem>
              <MenuItem value="dynamic">Dynamic — prices rise and fall with performance</MenuItem>
            </Select>
          </FormControl>

          {/* Max Participants — game mode is hardcoded to 'standard' at MVP */}
          <TextField
            label="Max Participants"
            type="number"
            value={formDraft.maxParticipants}
            onChange={(e) => setFormDraft({ maxParticipants: Number(e.target.value) })}
            error={Boolean(formErrors.maxParticipants)}
            helperText={formErrors.maxParticipants ?? `Min ${MIN_PARTICIPANTS['standard']}, max 100`}
            slotProps={{ htmlInput: { min: MIN_PARTICIPANTS['standard'], max: 100 } }}
            fullWidth
          />

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
