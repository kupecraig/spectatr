import { useState, type FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Tabs,
  Tab,
  Button,
  Paper,
  Stack,
} from '@mui/material';
import { SignInButton, UserButton } from '../components/auth';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import HomeIcon from '@mui/icons-material/Home';
import SportsIcon from '@mui/icons-material/Sports';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SettingsDialog from '@/components/SettingsDialog';
import { useMyTeamStore } from '@/stores';
import { PlayerList } from '@/features/players';
import { SquadView, FieldView } from '@/features/squad';
import { leagueRules } from '@/mocks/playerData';

const drawerWidth = 240;

export const MyTeamPage: FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTab, setActiveTab, getSelectedPlayers, getRemainingBudget, clearSquad } = useMyTeamStore();

  const selectedPlayers = getSelectedPlayers();

  // Use first league rules for now (in real app, would be selected league)
  const currentLeagueRules = leagueRules[0];
  const maxBudget = currentLeagueRules?.priceCap || 42_000_000;
  const remainingBudget = getRemainingBudget(maxBudget);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue as 'LIST' | 'SQUAD');
  };

  const handleClear = () => {
    if (globalThis.confirm('Are you sure you want to remove all players?')) {
      clearSquad();
    }
  };

  const handleAutofill = () => {
    // Placeholder - future feature
    alert('Autofill feature coming soon!');
  };

  const handleCompare = () => {
    // Placeholder - future feature (deferred to later step)
    alert('Player comparison feature coming soon!');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={toggleDrawer}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Fantasy Sports - My Team
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
        onClose={toggleDrawer}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
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

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex' }}>
        <Toolbar />
        
        {/* Left sidebar - Fixed width */}
        <Box 
          sx={{ 
            width: 450,
            height: 'calc(100vh - 64px)', // 64px is AppBar height
            position: 'fixed',
            left: 0,
            top: 64,
            overflowY: 'auto',
            p: 2
          }}
        >
          <Paper sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
          }}>
            {/* Tab navigation */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={handleTabChange}>
                <Tab label="LIST" value="LIST" />
                <Tab label="SQUAD" value="SQUAD" />
              </Tabs>
            </Box>

            {/* Budget and actions - only on LIST tab */}
            {activeTab === 'LIST' && (
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                {/* Budget display */}
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderRadius: 2,
                    p: 1,
                    mb: 1
                  }}
                >
                  <Typography variant="h6" color="text.primary" fontSize="medium">
                    Budget
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {(remainingBudget / 1_000_000).toFixed(1)}M
                  </Typography>
                </Box>

                {/* Action buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Stack direction="row" spacing={1}>
                    <Button 
                      variant="outlined" 
                      onClick={handleClear} 
                      disabled={selectedPlayers.length === 0}
                      sx={{ borderRadius: 8 }}
                    >
                      Clear
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={handleAutofill} 
                      disabled
                      sx={{ 
                        borderRadius: 8,
                        bgcolor: 'warning.main',
                        '&:hover': { bgcolor: 'warning.dark' }
                      }}
                    >
                      Autofill
                    </Button>
                  </Stack>
                  <Button 
                    variant="outlined" 
                    onClick={handleCompare} 
                    disabled
                    sx={{ borderRadius: 8 }}
                  >
                    Compare
                  </Button>
                </Box>
              </Box>
            )}

            {/* Content */}
            <Box>
              {activeTab === 'LIST' ? <PlayerList /> : <SquadView />}
            </Box>
          </Paper>
        </Box>

        {/* Right panel - Field view centered */}
        <Box 
          sx={{ 
            flexGrow: 1,
            marginLeft: '450px', // Same as sidebar width
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 3,
            minHeight: 'calc(100vh - 64px)'
          }}
        >
          <Box sx={{ maxWidth: 1000, width: '100%' }}>
            <FieldView />
          </Box>
        </Box>
      </Box>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  );
};
