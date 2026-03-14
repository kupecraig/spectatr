import { Box, Card, CardContent, CardActions, Chip, Typography, Button, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PeopleIcon from '@mui/icons-material/People';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import type { LeagueWithCount } from '@/hooks/api/useLeaguesQuery';

// ─────────────────────────────────────────────────────────────────────────────
// LeagueCard
// ─────────────────────────────────────────────────────────────────────────────

interface LeagueCardProps {
  league: LeagueWithCount;
  /** Whether the user is already a member */
  isMember?: boolean;
  onJoin?: () => void;
  onView?: () => void;
}

const GAME_MODE_LABEL: Record<string, string> = {
  standard: 'Standard',
  'round-robin': 'Round Robin',
  ranked: 'Ranked',
};

export function LeagueCard({ league, isMember, onJoin, onView }: LeagueCardProps) {
  const theme = useTheme();
  const memberCount = league._count.members;
  const isFull = league.maxParticipants != null && memberCount >= league.maxParticipants;

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Name + visibility badge */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <Typography variant="h6" component="h3" sx={{ flexGrow: 1, fontSize: '1rem', fontWeight: 600 }}>
            {league.name}
          </Typography>
          {league.isPublic ? (
            <PublicIcon fontSize="small" sx={{ color: theme.palette.text.secondary, mt: 0.25 }} />
          ) : (
            <LockIcon fontSize="small" sx={{ color: theme.palette.text.secondary, mt: 0.25 }} />
          )}
        </Box>

        {/* Meta chips */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
          <Chip
            label={GAME_MODE_LABEL[league.gameMode] ?? league.gameMode}
            size="small"
            variant="outlined"
          />
          <Chip
            icon={<PeopleIcon />}
            label={
              league.maxParticipants
                ? `${memberCount} / ${league.maxParticipants}`
                : `${memberCount} members`
            }
            size="small"
            color={isFull ? 'warning' : 'default'}
            variant="outlined"
          />
          {league.season && (
            <Chip label={`Season ${league.season}`} size="small" variant="outlined" />
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 2, gap: 1 }}>
        {isMember ? (
          <Button size="small" variant="contained" onClick={onView} fullWidth>
            View League
          </Button>
        ) : (
          <>
            <Button size="small" variant="outlined" onClick={onView} sx={{ flex: 1 }}>
              Details
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={onJoin}
              disabled={isFull}
              sx={{ flex: 1 }}
            >
              {isFull ? 'Full' : 'Join'}
            </Button>
          </>
        )}
      </CardActions>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LeagueCardSkeleton
// ─────────────────────────────────────────────────────────────────────────────

export function LeagueCardSkeleton() {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Skeleton variant="text" width="70%" height={28} sx={{ mb: 1 }} />
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <Skeleton variant="rounded" width={80} height={24} />
          <Skeleton variant="rounded" width={90} height={24} />
        </Box>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Skeleton variant="rounded" width="100%" height={36} />
      </CardActions>
    </Card>
  );
}
