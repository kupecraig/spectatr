import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockIcon from '@mui/icons-material/Lock';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import {
  useLeagueDetailQuery,
  useUpdateLeagueMutation,
  useActivateLeagueMutation,
} from '@/hooks/api/useLeaguesQuery';
import type { LeagueRules } from '@spectatr/shared-types';
import { MIN_PARTICIPANTS } from '@spectatr/shared-types';

// ─────────────────────────────────────────────────────────────────────────────
// LeagueSettingsPage
// Accessible only to authenticated users (ProtectedRoute in App.tsx).
// Creator sees editable form when status=draft; locked (read-only) when active/completed.
// Non-creators see a read-only view.
// ─────────────────────────────────────────────────────────────────────────────

export function LeagueSettingsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const id = leagueId ? Number(leagueId) : null;

  const { data: detail, isLoading } = useLeagueDetailQuery(id);
  const updateMutation = useUpdateLeagueMutation();
  const activateMutation = useActivateLeagueMutation();

  // ── Local form state ────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [isPublic, setIsPublic] = useState(false);
  const [rules, setRules] = useState<Partial<LeagueRules>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Initialise form from loaded league data
  useEffect(() => {
    if (detail) {
      setName(detail.name);
      setMaxParticipants(detail.maxParticipants ?? 10);
      setIsPublic(detail.isPublic);
      setRules(detail.rules ?? {});
      setIsDirty(false);
    }
  }, [detail]);

  const isCreator = detail?.myMembership?.role === 'creator';
  // Rules are locked once the league moves out of draft
  const isLocked = detail?.status !== 'draft';
  // Editing allowed only for the creator while still in draft
  const canEdit = isCreator && !isLocked;

  const patchRules = (patch: Partial<LeagueRules>) => {
    setRules((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!id) return;
    await updateMutation.mutateAsync({
      id,
      name,
      maxParticipants,
      isPublic,
      rules: rules as LeagueRules,
    });
    setIsDirty(false);
  };

  const handleActivate = async () => {
    if (!id) return;
    await activateMutation.mutateAsync(id);
  };

  // Participant bounds — Standard mode only at MVP
  const modeMin = MIN_PARTICIPANTS[detail?.gameMode ?? 'standard'] ?? 2;

  if (isLoading || !detail) {
    return <LeagueSettingsPageSkeleton />;
  }

  const saveError   = updateMutation.error instanceof Error   ? updateMutation.error.message   : null;
  const activateError = activateMutation.error instanceof Error ? activateMutation.error.message : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ── AppBar ── */}
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => navigate('/leagues')}
            aria-label="Back to leagues"
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            {detail.name}
            {isLocked && <LockIcon fontSize="small" sx={{ opacity: 0.7 }} />}
          </Typography>

          {/* Save — only shown when creator can edit and form is dirty */}
          {canEdit && (
            <Button
              color="inherit"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!isDirty || updateMutation.isPending}
              sx={{ mr: 1 }}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          )}

          {/* maxParticipants-only save while locked */}
          {isCreator && isLocked && (
            <Button
              color="inherit"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!isDirty || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* ── Page body ── */}
      <Container maxWidth="md" sx={{ mt: 10, mb: 6 }}>
        <Stack spacing={3}>

          {/* Status banner */}
          {isLocked && (
            <Alert severity="info" icon={<LockIcon />}>
              This league is <strong>{detail.status}</strong> — rules are locked.
              {isCreator && ' You can still increase the participant cap.'}
            </Alert>
          )}

          {updateMutation.isSuccess && !isDirty && (
            <Alert severity="success" onClose={() => updateMutation.reset()}>
              Settings saved.
            </Alert>
          )}
          {saveError && (
            <Alert severity="error" onClose={() => updateMutation.reset()}>
              {saveError}
            </Alert>
          )}
          {activateError && (
            <Alert severity="error" onClose={() => activateMutation.reset()}>
              {activateError}
            </Alert>
          )}

          {/* ── General ── */}
          <Card variant="outlined">
            <CardHeader title="General" subheader="Basic league settings" />
            <CardContent>
              <Stack spacing={2.5}>
                <TextField
                  label="League Name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
                  disabled={!canEdit}
                  fullWidth
                  slotProps={{ htmlInput: { maxLength: 60 } }}
                />

                {/* Game mode is always read-only post-creation */}
                <TextField
                  label="Game Mode"
                  value={detail.gameMode}
                  disabled
                  fullWidth
                  helperText="Game mode cannot be changed after creation"
                />

                {/* Format indicator — read-only, set at creation */}
                <TextField
                  label="League Format"
                  value={detail.format ? detail.format.charAt(0).toUpperCase() + detail.format.slice(1) : 'Classic'}
                  disabled
                  fullWidth
                  helperText="League format cannot be changed after creation"
                />

                <TextField
                  label="Max Participants"
                  type="number"
                  value={maxParticipants}
                  onChange={(e) => { setMaxParticipants(Number(e.target.value)); setIsDirty(true); }}
                  // Creators can always change this; others cannot
                  disabled={!isCreator}
                  helperText={
                    isLocked
                      ? `Can be increased (current: ${detail.maxParticipants}), but not decreased`
                      : `Min ${modeMin}, max 100`
                  }
                  slotProps={{
                    htmlInput: {
                      min: isLocked ? detail.maxParticipants : modeMin,
                      max: 100,
                    },
                  }}
                  fullWidth
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={isPublic}
                      onChange={(e) => { setIsPublic(e.target.checked); setIsDirty(true); }}
                      disabled={!canEdit}
                    />
                  }
                  label={
                    <Stack>
                      <Typography variant="body2">Public League</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Anyone can find and request to join
                      </Typography>
                    </Stack>
                  }
                />
              </Stack>
            </CardContent>
          </Card>

          {/* ── Classic Rules ── */}
          <Card variant="outlined">
            <CardHeader title="Classic Rules" subheader="Player costs, team composition and transfer settings" />
            <CardContent>
              <Stack spacing={2.5}>

                {/* Price Cap */}
                <FormControl fullWidth disabled={!canEdit}>
                  <InputLabel>Price Cap</InputLabel>
                  <Select
                    label="Price Cap"
                    value={rules.priceCap ?? 'none'}
                    onChange={(e) => {
                      const val = e.target.value;
                      patchRules({ priceCap: val === 'none' ? null : Number(val) });
                    }}
                  >
                    <MenuItem value="none">Unlimited</MenuItem>
                    {[30, 35, 40, 42, 45, 50, 60, 75, 100].map((m) => (
                      <MenuItem key={m} value={m * 1_000_000}>{m}M</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Player Pricing */}
                <FormControl fullWidth disabled={!canEdit}>
                  <InputLabel>Player Pricing</InputLabel>
                  <Select<'fixed' | 'dynamic'>
                    label="Player Pricing"
                    value={rules.pricingModel ?? 'fixed'}
                    onChange={(e) => patchRules({ pricingModel: e.target.value })}
                  >
                    <MenuItem value="fixed">Fixed — prices stay constant</MenuItem>
                    <MenuItem value="dynamic">Dynamic — prices change with performance</MenuItem>
                  </Select>
                </FormControl>

                {/* Position Matching */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(rules.positionMatching)}
                      onChange={(e) => patchRules({ positionMatching: e.target.checked })}
                      disabled={!canEdit}
                    />
                  }
                  label={
                    <Stack>
                      <Typography variant="body2">Position Matching</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Players must match their last played position
                      </Typography>
                    </Stack>
                  }
                />

                {/* Players per Squad */}
                <TextField
                  label="Players per Squad"
                  type="number"
                  value={rules.squadLimitPerTeam ?? ''}
                  onChange={(e) =>
                    patchRules({ squadLimitPerTeam: e.target.value === '' ? null : Number(e.target.value) })
                  }
                  disabled={!canEdit}
                  placeholder="No limit"
                  helperText="Leave blank for no limit. e.g. 3 = max 3 players from the same real-world squad"
                  slotProps={{ htmlInput: { min: 1, max: 15 } }}
                  fullWidth
                />

                {/* Shared Player Pool */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(rules.sharedPool)}
                      onChange={(e) => patchRules({ sharedPool: e.target.checked })}
                      disabled={!canEdit}
                    />
                  }
                  label={
                    <Stack>
                      <Typography variant="body2">Shared Player Pool</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Off: each player belongs to one team (creates scarcity). On: anyone can pick anyone.
                      </Typography>
                    </Stack>
                  }
                />
                {/* Transfers per Round */}
                <TextField
                  label="Transfers per Round"
                  type="number"
                  value={rules.transfersPerRound ?? 3}
                  onChange={(e) => patchRules({ transfersPerRound: Number(e.target.value) })}
                  disabled={!canEdit}
                  helperText="Player swaps allowed each round. 0 = no free transfers (Wildcard only)"
                  slotProps={{ htmlInput: { min: 0, max: 15, step: 1 } }}
                  fullWidth
                />

                {/* Chips */}
                <Typography variant="subtitle2" sx={{ pt: 1 }}>Chips</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5 }}>
                  Enter round numbers separated by commas. Leave blank to disable a chip.
                </Typography>

                <TextField
                  label="Wildcard Rounds"
                  value={(rules.wildcardRounds ?? []).join(', ')}
                  onChange={(e) => {
                    const rounds = e.target.value.split(',').map((v) => Number(v.trim())).filter((n) => !Number.isNaN(n) && n > 0);
                    patchRules({ wildcardRounds: rounds });
                  }}
                  disabled={!canEdit}
                  placeholder="e.g. 7, 14"
                  helperText="Replace entire squad freely on these rounds"
                  fullWidth
                />

                <TextField
                  label="Triple Captain Rounds"
                  value={(rules.tripleCaptainRounds ?? []).join(', ')}
                  onChange={(e) => {
                    const rounds = e.target.value.split(',').map((v) => Number(v.trim())).filter((n) => !Number.isNaN(n) && n > 0);
                    patchRules({ tripleCaptainRounds: rounds });
                  }}
                  disabled={!canEdit}
                  placeholder="e.g. 8"
                  helperText="Captain scores 3× instead of 2× on these rounds"
                  fullWidth
                />

                <TextField
                  label="Bench Boost Rounds"
                  value={(rules.benchBoostRounds ?? []).join(', ')}
                  onChange={(e) => {
                    const rounds = e.target.value.split(',').map((v) => Number(v.trim())).filter((n) => !Number.isNaN(n) && n > 0);
                    patchRules({ benchBoostRounds: rounds });
                  }}
                  disabled={!canEdit}
                  placeholder="e.g. 9"
                  helperText="All bench players' scores count on these rounds"
                  fullWidth
                />

              </Stack>
            </CardContent>
          </Card>

          {/* ── Start League ── shown only to creator while in draft ── */}
          {isCreator && !isLocked && (
            <Card variant="outlined" sx={{ borderColor: 'success.main' }}>
              <CardHeader
                title="Start League"
                subheader="Rules will be locked once started. You can still increase the participant cap after starting."
              />
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<PlayArrowIcon />}
                    onClick={handleActivate}
                    disabled={activateMutation.isPending}
                  >
                    {activateMutation.isPending ? 'Starting…' : 'Start League'}
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {detail.members?.length ?? 1}{' '}
                    {(detail.members?.length ?? 1) === 1 ? 'member' : 'members'} joined
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          )}

        </Stack>
      </Container>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function LeagueSettingsPageSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="fixed">
        <Toolbar>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 1 }} />
          <Skeleton variant="text" width={200} />
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 10, mb: 6 }}>
        <Stack spacing={3}>
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} variant="outlined">
              <CardContent>
                <Skeleton variant="text" width="30%" sx={{ mb: 2 }} />
                <Stack spacing={2}>
                  <Skeleton variant="rectangular" height={56} />
                  <Skeleton variant="rectangular" height={56} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
