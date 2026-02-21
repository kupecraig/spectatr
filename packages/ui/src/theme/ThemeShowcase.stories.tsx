import type { Meta, StoryObj } from '@storybook/react';
import { Box, Typography, Chip, Button, Paper } from '@mui/material';
import playersData from '@data/trc-2025/players.json';
import type { Player } from '@/mocks/playerData';

const players = playersData as Player[];

const ThemeShowcase = () => {
  // Get unique positions from actual player data (sport-agnostic)
  const positions = Array.from(new Set(players.map(p => p.position)));

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Theme Showcase
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Use the theme switcher in the toolbar to test Rugby/Light/Dark themes
      </Typography>

      {/* Position Colors */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Position Colors
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {positions.map((pos) => (
            <Chip
              key={pos}
              label={pos.replace('_', ' ').toUpperCase()}
              sx={{
                bgcolor: (theme) => theme.palette.positions?.[pos] || 'grey',
                color: 'white',
                fontWeight: 'bold',
              }}
            />
          ))}
        </Box>
      </Paper>

      {/* Selection States */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Selection States
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="Available"
            sx={{ bgcolor: (theme) => theme.palette.selection?.available }}
          />
          <Chip
            label="Selected"
            sx={{ bgcolor: (theme) => theme.palette.selection?.selected }}
          />
          <Chip
            label="Error"
            sx={{ bgcolor: (theme) => theme.palette.selection?.error }}
          />
        </Box>
      </Paper>

      {/* Player States */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Player States
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="Uncertain"
            sx={{ bgcolor: (theme) => theme.palette.player?.uncertain }}
          />
          <Chip
            label="Injured"
            sx={{ bgcolor: (theme) => theme.palette.player?.injured }}
          />
          <Chip
            label="Selected"
            sx={{ bgcolor: (theme) => theme.palette.player?.selected }}
          />
          <Chip
            label="Locked"
            sx={{ bgcolor: (theme) => theme.palette.player?.locked }}
          />
        </Box>
      </Paper>

      {/* Typography Variants */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Custom Typography Variants
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              playerLabel
            </Typography>
            <Typography variant="playerLabel">W. JORDAN</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              fieldLabel
            </Typography>
            <Typography variant="fieldLabel">FULLBACK</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              emptySlotLabel
            </Typography>
            <Typography variant="emptySlotLabel">SELECT PLAYER</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              statValue
            </Typography>
            <Typography variant="statValue">$10.5M</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Buttons */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Buttons
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained">Contained</Button>
          <Button variant="outlined">Outlined</Button>
          <Button variant="text">Text</Button>
          <Button variant="contained" color="secondary">
            Secondary
          </Button>
          <Button variant="outlined" color="error">
            Error
          </Button>
        </Box>
      </Paper>

      {/* Stats Colors */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Stats Colors
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="Positive"
            sx={{ bgcolor: (theme) => theme.palette.stats?.positive }}
          />
          <Chip
            label="Negative"
            sx={{ bgcolor: (theme) => theme.palette.stats?.negative }}
          />
          <Chip
            label="Neutral"
            sx={{ bgcolor: (theme) => theme.palette.stats?.neutral }}
          />
        </Box>
      </Paper>

      {/* Field Colors */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Field Background
        </Typography>
        <Box
          sx={{
            bgcolor: (theme) => theme.palette.field?.background,
            p: 4,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              bgcolor: (theme) => theme.palette.field?.playerLabelBg,
              p: 2,
              borderRadius: 1,
            }}
          >
            <Typography variant="playerLabel" sx={{ color: 'white' }}>
              PLAYER ON FIELD
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

const meta = {
  title: 'Theme/Showcase',
  component: ThemeShowcase,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ThemeShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
