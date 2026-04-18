import { useState, useEffect, type FC } from 'react';
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
  Snackbar,
  Alert,
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
import {
  SquadView,
  FieldView,
  LeaguePicker,
  TransferButton,
  ConfirmTransfersDialog,
  UnsavedChangesDialog,
} from '@/features/squad';
import { leagueRules } from '@/mocks/playerData';
import { useTeamByLeagueQuery, useSaveSquadMutation } from '@/hooks/api/useTeamsQuery';

const drawerWidth = 240;

export const MyTeamPage: FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [pendingLeagueId, setPendingLeagueId] = useState<number | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeTab,
    setActiveTab,
    getSelectedPlayers,
    getRemainingBudget,
    clearSquad,
    selectedLeagueId,
    loadTeam,
    enterEditMode,
    commitSave,
    getIsDirty,
    getTransferDiff,
    setLeagueId,
    slots,
    totalCost,
    savedTotalCost,
  } = useMyTeamStore();

  const { data: teamData } = useTeamByLeagueQuery(selectedLeagueId);
  const saveSquadMutation = useSaveSquadMutation();

  useEffect(() => {
    if (teamData) {
      loadTeam(teamData);
    }
  }, [teamData, loadTeam]);

  const selectedPlayers = getSelectedPlayers();
  const isDirty = getIsDirty();
  const transferDiff = getTransferDiff();

  // Budget calculation
  const currentLeagueRules = leagueRules[0];
  const maxBudget = currentLeagueRules?.priceCap || 42_000_000;
  const remainingBudget = getRemainingBudget(maxBudget);

  // Budget delta: positive = saved money (removed cost > added cost)
  const budgetDelta = savedTotalCost - totalCost;

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
    alert('Autofill feature coming soon!');
  };

  const handleCompare = () => {
    alert('Player comparison feature coming soon!');
  };

  // --- Transfer Edit Mode Handlers ---

  const handleMakeTransfers = () => {
    enterEditMode();
  };

  const handleSaveTransfers = () => {
    setConfirmDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!selectedLeagueId) return;

    const players = Object.values(slots)
      .filter((player): player is NonNullable<typeof player> => player !== null)
      .map((player) => ({
        playerId: player.id,
        position: player.position,
      }));

    try {
      await saveSquadMutation.mutateAsync({ leagueId: selectedLeagueId, players });
      commitSave();
      setConfirmDialogOpen(false);
      setSnackbarMessage('Squad saved successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save squad.';
      setSnackbarMessage(message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleLeagueChange = (newLeagueId: number | null) => {
    if (isDirty) {
      // Store the pending league ID and show warning dialog
      setPendingLeagueId(newLeagueId);
      setUnsavedDialogOpen(true);
    } else {
      // No unsaved changes, proceed directly
      setLeagueId(newLeagueId);
    }
  };

  const handleDiscardChanges = () => {
    // User confirmed discard - proceed with league switch
    setLeagueId(pendingLeagueId);
    setPendingLeagueId(null);
    setUnsavedDialogOpen(false);
  };

  const handleCancelLeagueSwitch = () => {
    // User cancelled - keep current state
    setPendingLeagueId(null);
    setUnsavedDialogOpen(false);
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
          <LeaguePicker onLeagueChange={handleLeagueChange} />
          <TransferButton
            isEditing={isDirty}
            isSaving={saveSquadMutation.isPending}
            hasLeague={selectedLeagueId !== null}
            onMakeTransfers={handleMakeTransfers}
            onSaveTransfers={handleSaveTransfers}
          />
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
            height: 'calc(100vh - 64px)',
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
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
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
            marginLeft: '450px',
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

      {/* Confirm Transfers Dialog */}
      <ConfirmTransfersDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmSave}
        transferDiff={transferDiff}
        budgetDelta={budgetDelta}
        isSaving={saveSquadMutation.isPending}
      />

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={unsavedDialogOpen}
        onClose={handleCancelLeagueSwitch}
        onDiscard={handleDiscardChanges}
      />

      {/* Snackbar for success/error feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
