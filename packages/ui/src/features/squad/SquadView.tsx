import type { FC } from 'react';
import { useState } from 'react';
import { Box, Typography, Paper, List, Button, ListItem, IconButton, CircularProgress, Snackbar, Alert } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import { useMyTeamStore } from '@/stores';
import { PlayerListItem } from '@/features/players';
import { PlayerPosition, POSITION_GROUP_MAPPING } from '@/mocks/playerData';
import { sportSquadConfig } from '@spectatr/shared-types';
import { useSaveSquadMutation } from '@/hooks/api/useTeamsQuery';

export const SquadView: FC = () => {
  const { getSelectedPlayers, totalCost, setActiveTab, setFilters, selectedLeagueId, slots } = useMyTeamStore();

  const selectedPlayers = getSelectedPlayers();
  const saveSquadMutation = useSaveSquadMutation();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const isSquadFull = selectedPlayers.length === sportSquadConfig.maxPlayers;
  const canSave = selectedLeagueId !== null && isSquadFull;

  const handleSave = async () => {
    if (!canSave || !selectedLeagueId) return;

    const players = Object.values(slots)
      .filter((player): player is NonNullable<typeof player> => player !== null)
      .map((player) => ({
        playerId: player.id,
        position: player.position,
      }));

    try {
      await saveSquadMutation.mutateAsync({ leagueId: selectedLeagueId, players });
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

  // Group players by position
  const positionGroups = {
    'Back Three': selectedPlayers.filter((p) => p.position === PlayerPosition.OUTSIDE_BACK),
    'Centre': selectedPlayers.filter((p) => p.position === PlayerPosition.CENTER),
    'Fly-half': selectedPlayers.filter((p) => p.position === PlayerPosition.FLY_HALF),
    'Scrum-half': selectedPlayers.filter((p) => p.position === PlayerPosition.SCRUM_HALF),
    'Back-row': selectedPlayers.filter((p) => p.position === PlayerPosition.LOOSE_FORWARD),
    'Lock': selectedPlayers.filter((p) => p.position === PlayerPosition.LOCK),
    'Prop': selectedPlayers.filter((p) => p.position === PlayerPosition.PROP),
    'Hooker': selectedPlayers.filter((p) => p.position === PlayerPosition.HOOKER),
  };

  // Get required count for each position
  const getRequiredCount = (positionName: string): number => {
    const position = POSITION_GROUP_MAPPING[positionName];
    const positionConfig = sportSquadConfig.positions[position];
    return positionConfig?.max || 0;
  };

  const handleAddPlayer = (positionName: string) => {
    const position = POSITION_GROUP_MAPPING[positionName];
    setFilters({ position });
    setActiveTab('LIST');
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', position: 'relative' }}>
        {/* Transfer Log button - top right */}
        <Button
          variant="text"
          size="small"
          startIcon={<HistoryIcon />}
          sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            textTransform: 'none',
          }}
        >
          My transfer log
        </Button>

        {/* Centered squad value */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Value of my squad
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            {(totalCost / 1_000_000).toFixed(1)}M
          </Typography>
        </Box>
      </Box>

      {/* Squad list grouped by position */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {Object.entries(positionGroups).map(([positionName, players]) => {
          const requiredCount = getRequiredCount(positionName);
          const emptySlots = Math.max(0, requiredCount - players.length);
          
          // Skip positions with no players and no slots
          if (players.length === 0 && emptySlots === 0) return null;

          return (
            <Box key={positionName}>
              <Typography
                variant="subtitle1"
                sx={{
                  px: 2,
                  py: 1,
                  fontWeight: 'bold',
                }}
              >
                {positionName}
              </Typography>
              <List disablePadding>
                {players.map((player) => (
                  <PlayerListItem
                    key={player.id}
                    player={player}
                    validationError={null}
                    isDisabled={false}
                  />
                ))}
                
                {/* Add empty slot buttons */}
                {Array.from({ length: emptySlots }).map((_, index) => (
                  <ListItem
                    key={`${positionName}-empty-${index}`}
                    sx={{
                      borderBottom: 1,
                      borderColor: 'divider',
                      py: 3,
                    }}
                  >
                    <Box
                      onClick={() => handleAddPlayer(positionName)}
                      sx={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 2,
                        borderStyle: 'dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        py: 2,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <IconButton size="large" sx={{ color: 'text.secondary' }}>
                        <AddIcon />
                      </IconButton>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>
          );
        })}

        {selectedPlayers.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No players selected yet
            </Typography>
          </Box>
        )}
      </Box>

      {/* Save Team button */}
      {selectedLeagueId !== null && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleSave}
            disabled={!canSave || saveSquadMutation.isPending}
            startIcon={
              saveSquadMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
          >
            {saveSquadMutation.isPending ? 'Saving...' : 'Save Team'}
          </Button>
        </Box>
      )}

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
    </Paper>
  );
};
