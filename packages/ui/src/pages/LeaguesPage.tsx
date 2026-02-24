import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tab,
  Tabs,
  Toolbar,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HomeIcon from '@mui/icons-material/Home';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import SportsIcon from '@mui/icons-material/Sports';
import { useAuth } from '@clerk/clerk-react';
import SettingsDialog from '@/components/SettingsDialog';
import { SignInButton, UserButton } from '@/components/auth';
import {
  LeagueCard,
  LeagueCardSkeleton,
  CreateLeagueDialog,
  JoinLeagueDialog,
  MyLeagueListItem,
  MyLeagueListItemSkeleton,
} from '@/features/leagues';
import { useLeagueListQuery, useMyLeaguesQuery, useLeaveLeagueMutation } from '@/hooks/api/useLeaguesQuery';
import { useLeagueStore } from '@/stores/leagueStore';

type GameModeFilter = 'standard' | 'round-robin' | 'ranked' | null;

// ─────────────────────────────────────────────────────────────────────────────
// LeaguesPage
// ─────────────────────────────────────────────────────────────────────────────

export function LeaguesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn } = useAuth();
  const { openCreateDialog, openJoinDialog, browseGameMode, setBrowseGameMode } = useLeagueStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState<'browse' | 'mine'>(isSignedIn ? 'mine' : 'browse');

  const drawerWidth = 240;
  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'My Team', icon: <SportsIcon />, path: '/my-team' },
    { text: 'Leagues', icon: <EmojiEventsIcon />, path: '/leagues' },
    { text: 'Leaderboard', icon: <LeaderboardIcon />, path: '/leaderboard' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  // Queries
  const browseQuery = useLeagueListQuery(browseGameMode ?? undefined);
  const myLeaguesQuery = useMyLeaguesQuery();
  const leaveMutation = useLeaveLeagueMutation();

  const myLeagueIds = new Set((myLeaguesQuery.data ?? []).map((l) => l.id));

  const handleJoinFromCard = (inviteCode?: string) => {
    if (!isSignedIn) {
      navigate('/');
      return;
    }
    openJoinDialog(inviteCode);
  };

  const handleLeave = async (leagueId: number) => {
    if (!confirm('Are you sure you want to leave this league?')) return;
    await leaveMutation.mutateAsync(leagueId);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setDrawerOpen(!drawerOpen)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Spectatr
          </Typography>
          <SignInButton />
          <UserButton />
          <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Toolbar />
        <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          Leagues
        </Typography>
        {isSignedIn && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<MeetingRoomIcon />}
              onClick={() => openJoinDialog()}
            >
              Join
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openCreateDialog()}
            >
              Create
            </Button>
          </Box>
        )}
      </Box>

      {/* Tabs */}
      {isSignedIn && (
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="My Leagues" value="mine" />
          <Tab label="Browse" value="browse" />
        </Tabs>
      )}

      {/* ── My Leagues tab ── */}
      {tab === 'mine' && isSignedIn && (
        <Box>
          {myLeaguesQuery.isLoading && (
            <Box>
              {Array.from({ length: 3 }, (_, i) => (
                <MyLeagueListItemSkeleton key={i} />
              ))}
            </Box>
          )}
          {myLeaguesQuery.isSuccess && myLeaguesQuery.data.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography color="text.secondary" gutterBottom>
                You haven&apos;t joined any leagues yet.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2 }}>
                <Button variant="outlined" onClick={() => setTab('browse')}>
                  Browse Leagues
                </Button>
                <Button variant="contained" onClick={() => openCreateDialog()}>
                  Create League
                </Button>
              </Box>
            </Box>
          )}
          {myLeaguesQuery.isSuccess &&
            myLeaguesQuery.data.map((league) => (
              <MyLeagueListItem
                key={league.id}
                league={league}
                onView={() => navigate(`/leagues/${league.id}`)}
                onLeave={() => handleLeave(league.id)}
              />
            ))}
        </Box>
      )}

      {/* ── Browse tab ── */}
      {(tab === 'browse' || !isSignedIn) && (
        <Box>
          {/* Game mode filter */}
          <Box sx={{ mb: 2 }}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={browseGameMode}
              onChange={(_, v: GameModeFilter) => setBrowseGameMode(v)}
            >
              <ToggleButton value="standard">Standard</ToggleButton>
              <ToggleButton value="round-robin">Round Robin</ToggleButton>
              <ToggleButton value="ranked">Ranked</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Grid of league cards */}
          <Grid container spacing={2}>
            {browseQuery.isLoading &&
              Array.from({ length: 6 }, (_, i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                  <LeagueCardSkeleton />
                </Grid>
              ))}

            {browseQuery.isSuccess && browseQuery.data.leagues.length === 0 && (
              <Grid size={12}>
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No public leagues found. Be the first to{' '}
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => openCreateDialog()}
                    disabled={!isSignedIn}
                    sx={{ verticalAlign: 'baseline', p: 0, minWidth: 0 }}
                  >
                    create one
                  </Button>
                  .
                </Typography>
              </Grid>
            )}

            {browseQuery.isSuccess &&
              browseQuery.data.leagues.map((league) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={league.id}>
                  <LeagueCard
                    league={league}
                    isMember={myLeagueIds.has(league.id)}
                    onJoin={() => handleJoinFromCard()}
                    onView={() => navigate(`/leagues/${league.id}`)}
                  />
                </Grid>
              ))}
          </Grid>
        </Box>
      )}

      {/* Dialogs */}
      <CreateLeagueDialog onSuccess={(id) => navigate(`/leagues/${id}`)} />
      <JoinLeagueDialog onSuccess={(id) => navigate(`/leagues/${id}`)} />
    </Container>
      </Box>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  );
}
