import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Skeleton,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import {
  useLeagueDetailQuery,
  useLeagueStandingsQuery,
  useLeaveLeagueMutation,
} from '@/hooks/api/useLeaguesQuery';
import { useRoundsQuery } from '@/hooks/api/useRoundsQuery';
import {
  LeagueInvitePanel,
  StandingsTable,
  StandingsTableSkeleton,
} from '@/features/leagues';

export function LeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const id = leagueId ? Number(leagueId) : null;

  // Round selection state
  const [selectedRoundId, setSelectedRoundId] = useState<number | undefined>(undefined);

  const { data: detail, isLoading: detailLoading } = useLeagueDetailQuery(id);
  const { data: standings = [], isLoading: standingsLoading, isFetching: standingsFetching } = useLeagueStandingsQuery(id, selectedRoundId);
  const { data: roundsData } = useRoundsQuery();
  const leaveMutation = useLeaveLeagueMutation();

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const isCreator = detail?.myMembership?.role === 'creator';
  const isMember = Boolean(detail?.myMembership);

  const handleLeave = async () => {
    if (!id) return;
    await leaveMutation.mutateAsync(id);
    setLeaveDialogOpen(false);
    navigate('/leagues');
  };

  const handleRoundChange = (roundId: number | undefined) => {
    setSelectedRoundId(roundId);
  };

  const leaveError = leaveMutation.error instanceof Error ? leaveMutation.error.message : null;

  if (detailLoading || !detail) {
    return <LeaguePageSkeleton />;
  }

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
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {detail.name}
          </Typography>
          {isCreator && (
            <IconButton
              color="inherit"
              onClick={() => navigate(`/leagues/${id}/settings`)}
              aria-label="League settings"
            >
              <SettingsIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* ── Page body ── */}
      <Container maxWidth="md" sx={{ mt: 10, mb: 6 }}>
        <Stack spacing={3}>
          {leaveError && (
            <Alert severity="error" onClose={() => leaveMutation.reset()}>
              {leaveError}
            </Alert>
          )}

          {/* League header */}
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={detail.format ? detail.format.charAt(0).toUpperCase() + detail.format.slice(1) : 'Classic'}
                    size="small"
                    variant="outlined"
                  />
                  <Chip label={detail.gameMode.charAt(0).toUpperCase() + detail.gameMode.slice(1)} size="small" />
                  <Chip
                    label={detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}
                    size="small"
                    color={detail.status === 'active' ? 'success' : 'default'}
                  />
                  <Chip
                    label={detail.isPublic ? 'Public' : 'Private'}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Season {detail.season}
                  {' · '}
                  {detail.members?.length ?? 0}{' '}
                  {(detail.members?.length ?? 0) === 1 ? 'member' : 'members'}
                  {detail.maxParticipants ? ` / ${detail.maxParticipants}` : ''}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          {/* Invite panel — members only */}
          {isMember && detail.inviteCode && (
            <Card variant="outlined">
              <CardHeader title="Invite" subheader="Share this code to invite others" />
              <CardContent sx={{ pt: 0 }}>
                <LeagueInvitePanel inviteCode={detail.inviteCode} />
              </CardContent>
            </Card>
          )}

          {/* Standings */}
          <Card variant="outlined">
            <CardHeader title="Standings" />
            <CardContent sx={{ pt: 0 }}>
              {standingsLoading ? (
                <StandingsTableSkeleton />
              ) : (
                <StandingsTable
                  standings={standings}
                  rounds={roundsData?.rounds ?? []}
                  selectedRoundId={selectedRoundId}
                  onRoundChange={handleRoundChange}
                  isLoading={standingsFetching}
                />
              )}
            </CardContent>
          </Card>

          {/* Leave — non-creator members only */}
          {isMember && !isCreator && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                color="error"
                variant="outlined"
                startIcon={<ExitToAppIcon />}
                onClick={() => setLeaveDialogOpen(true)}
              >
                Leave League
              </Button>
            </Box>
          )}
        </Stack>
      </Container>

      {/* Leave confirmation dialog */}
      <Dialog
        open={leaveDialogOpen}
        onClose={() => setLeaveDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Leave {detail.name}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Your team and points will be removed. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveDialogOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleLeave}
            disabled={leaveMutation.isPending}
          >
            {leaveMutation.isPending ? 'Leaving…' : 'Leave League'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function LeaguePageSkeleton() {
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
          {[0, 1, 2].map((i) => (
            <Card key={i} variant="outlined">
              <CardContent>
                <Skeleton variant="text" width="30%" sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={80} />
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
