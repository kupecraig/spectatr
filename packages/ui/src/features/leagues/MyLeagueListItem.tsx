import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  IconButton,
  ListItem,
  ListItemText,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { MyLeague } from '@/hooks/api/useLeaguesQuery';

// ─────────────────────────────────────────────────────────────────────────────
// MyLeagueListItem
// ─────────────────────────────────────────────────────────────────────────────

interface MyLeagueListItemProps {
  league: MyLeague;
  onView: () => void;
  onLeave?: () => void;
}

const GAME_MODE_LABEL: Record<string, string> = {
  standard: 'Standard',
  'round-robin': 'Round Robin',
  ranked: 'Ranked',
};

export function MyLeagueListItem({ league, onView, onLeave }: MyLeagueListItemProps) {
  const theme = useTheme();
  const isCreator = league.role === 'creator';

  return (
    <Card variant="outlined" sx={{ mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Clickable main section */}
        <CardActionArea onClick={onView} sx={{ flexGrow: 1 }}>
          <CardContent sx={{ py: 1.5, pl: 2, pr: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ flexGrow: 1 }}>
                {league.name}
              </Typography>
              <Chip
                label={GAME_MODE_LABEL[league.gameMode] ?? league.gameMode}
                size="small"
                variant="outlined"
              />
              {isCreator && <Chip label="Creator" size="small" color="primary" />}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {league.memberCount} members
              {league.myTeam && ` · ${league.myTeam.name}`}
              {` · ${league.myTeam?.points ?? 0} pts`}
            </Typography>
          </CardContent>
        </CardActionArea>

        <Divider orientation="vertical" flexItem />

        {/* Actions column */}
        <Stack
          direction="column"
          justifyContent="center"
          sx={{ px: 1, py: 0.5 }}
        >
          <Tooltip title="View league">
            <IconButton size="small" onClick={onView} aria-label="View league">
              <ChevronRightIcon />
            </IconButton>
          </Tooltip>
          {!isCreator && onLeave && (
            <Tooltip title="Leave league">
              <IconButton
                size="small"
                onClick={onLeave}
                aria-label="Leave league"
                sx={{ color: theme.palette.error.main }}
              >
                <ExitToAppIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MyLeagueListItemSkeleton
// ─────────────────────────────────────────────────────────────────────────────

export function MyLeagueListItemSkeleton() {
  return (
    <Card variant="outlined" sx={{ mb: 1 }}>
      <ListItem sx={{ py: 1.5 }}>
        <ListItemText
          primary={<Skeleton variant="text" width="50%" />}
          secondary={<Skeleton variant="text" width="35%" />}
        />
      </ListItem>
    </Card>
  );
}
