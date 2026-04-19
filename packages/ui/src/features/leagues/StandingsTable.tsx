import {
  Avatar,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { LeagueStanding } from '@/hooks/api/useLeaguesQuery';
import type { Round } from '@/hooks/api/useRoundsQuery';

interface StandingsTableProps {
  readonly standings: LeagueStanding[];
  /** Available rounds for the selector. Only shows rounds with status 'active' or 'complete'. */
  readonly rounds?: Round[];
  /** Currently selected round ID. undefined = "All Rounds" (season totals). */
  readonly selectedRoundId?: number;
  /** Callback when round selection changes. undefined = "All Rounds" selected. */
  readonly onRoundChange?: (roundId: number | undefined) => void;
  /** Whether standings data is currently loading/refetching. */
  readonly isLoading?: boolean;
}

export function StandingsTable({
  standings,
  rounds = [],
  selectedRoundId,
  onRoundChange,
  isLoading = false,
}: StandingsTableProps) {
  // Filter rounds to only show active or complete rounds, sorted by roundNumber ascending
  const selectableRounds = rounds
    .filter((r) => r.status === 'active' || r.status === 'complete')
    .sort((a, b) => a.roundNumber - b.roundNumber);

  const handleRoundChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    onRoundChange?.(value === '' ? undefined : Number(value));
  };

  // Show empty state when no teams and not loading
  if (standings.length === 0 && !isLoading) {
    return (
      <Box>
        {onRoundChange && selectableRounds.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="round-select-label">Round</InputLabel>
              <Select
                labelId="round-select-label"
                id="round-select"
                value={selectedRoundId?.toString() ?? ''}
                label="Round"
                onChange={handleRoundChange}
              >
                <MenuItem value="">All Rounds</MenuItem>
                {selectableRounds.map((round) => (
                  <MenuItem key={round.id} value={round.id.toString()}>
                    {round.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No teams yet — share the invite code to get people in.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Round selector - only show if onRoundChange callback is provided and there are rounds */}
      {onRoundChange && selectableRounds.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="round-select-label">Round</InputLabel>
            <Select
              labelId="round-select-label"
              id="round-select"
              value={selectedRoundId?.toString() ?? ''}
              label="Round"
              onChange={handleRoundChange}
            >
              <MenuItem value="">All Rounds</MenuItem>
              {selectableRounds.map((round) => (
                <MenuItem key={round.id} value={round.id.toString()}>
                  {round.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40 }}>#</TableCell>
              <TableCell>Team</TableCell>
              <TableCell>Manager</TableCell>
              <TableCell align="right">Pts</TableCell>
              <TableCell align="right">W</TableCell>
              <TableCell align="right">L</TableCell>
              <TableCell align="right">D</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              // Show skeleton rows while loading
              [0, 1, 2, 3, 4].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton width={20} /></TableCell>
                  <TableCell><Skeleton width={100} /></TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Skeleton variant="circular" width={24} height={24} />
                      <Skeleton width={80} />
                    </Stack>
                  </TableCell>
                  <TableCell><Skeleton width={30} /></TableCell>
                  <TableCell><Skeleton width={20} /></TableCell>
                  <TableCell><Skeleton width={20} /></TableCell>
                  <TableCell><Skeleton width={20} /></TableCell>
                </TableRow>
              ))
            ) : (
              standings.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {s.rank ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar
                        src={s.user?.avatar ?? undefined}
                        alt={s.user?.username ?? s.user?.firstName ?? s.user?.email?.split('@')[0] ?? 'Manager'}
                        sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
                      >
                        {(s.user?.username ?? s.user?.firstName ?? s.user?.email?.split('@')[0] ?? '?')[0].toUpperCase()}
                      </Avatar>
                      <Typography variant="body2">{s.user?.username ?? s.user?.firstName ?? s.user?.email?.split('@')[0] ?? '—'}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={700}>
                      {s.points}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{s.wins}</TableCell>
                  <TableCell align="right">{s.losses}</TableCell>
                  <TableCell align="right">{s.draws}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export function StandingsTableSkeleton() {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {['#', 'Team', 'Manager', 'Pts', 'W', 'L', 'D'].map((h) => (
              <TableCell key={h}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {[0, 1, 2, 3, 4].map((i) => (
            <TableRow key={i}>
              <TableCell><Skeleton width={20} /></TableCell>
              <TableCell><Skeleton width={100} /></TableCell>
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Skeleton variant="circular" width={24} height={24} />
                  <Skeleton width={80} />
                </Stack>
              </TableCell>
              <TableCell><Skeleton width={30} /></TableCell>
              <TableCell><Skeleton width={20} /></TableCell>
              <TableCell><Skeleton width={20} /></TableCell>
              <TableCell><Skeleton width={20} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
