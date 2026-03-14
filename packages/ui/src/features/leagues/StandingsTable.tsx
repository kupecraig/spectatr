import {
  Avatar,
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

interface StandingsTableProps {
  standings: LeagueStanding[];
}

export function StandingsTable({ standings }: StandingsTableProps) {
  if (standings.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
        No teams yet — share the invite code to get people in.
      </Typography>
    );
  }

  return (
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
          {standings.map((s) => (
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
          ))}
        </TableBody>
      </Table>
    </TableContainer>
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
