import type { FC } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  FormControlLabel,
  Checkbox,
  Button,
  Badge,
  Box,
  Typography,
  InputAdornment,
  ListItemText,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useMyTeamStore } from '@/stores';
import { sportSquadConfig, playerStatusSchema } from '@spectatr/shared-types';
import type { PlayerStatus } from '@spectatr/shared-types';

interface FilterPanelProps {
  squadNames: string[];
  minPlayerPrice: number;
  maxPlayerPrice: number;
}

export const FilterPanel: FC<FilterPanelProps> = ({ squadNames, minPlayerPrice, maxPlayerPrice }) => {
  const { filters, setFilters, resetFilters, filtersExpanded, toggleFilters } = useMyTeamStore();

  // Check if price filter has been changed from defaults
  const isPriceFilterActive = 
    filters.minPrice !== minPlayerPrice || 
    filters.maxPrice !== maxPlayerPrice;

  // Count active filters
  const activeFilterCount = [
    filters.search,
    filters.position,
    filters.squad,
    isPriceFilterActive,
    filters.withinBudget,
    filters.statuses.length > 0,
  ].filter(Boolean).length;

  // Get position options from sport config (sport-agnostic)
  const positions = Object.entries(sportSquadConfig.positions).map(([value, config]) => ({
    value,
    label: config.label,
  }));

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  selected: 'Selected',
  'not-selected': 'Not Selected',
  uncertain: 'Uncertain',
  injured: 'Injured',
  eliminated: 'Eliminated',
  benched: 'Benched',
};

  return (
    <Accordion 
      expanded={filtersExpanded} 
      onChange={toggleFilters}
      elevation={0}
      sx={{
        '&:before': {
          display: 'none',
        },
        borderRadius: 0, // Intentionally 0 for flush accordion
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Badge badgeContent={activeFilterCount} color="primary">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon />
            <Typography>Search filters</Typography>
          </Box>
        </Badge>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Name search */}
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Squad and Position dropdowns in one row */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Squad dropdown */}
            <FormControl fullWidth size="small">
              <InputLabel>Squad</InputLabel>
              <Select
                value={filters.squad || ''}
                label="Squad"
                onChange={(e) => setFilters({ squad: e.target.value || null })}
              >
                <MenuItem value="">
                  <em>All squads</em>
                </MenuItem>
                {squadNames.map((squadName) => (
                  <MenuItem key={squadName} value={squadName}>
                    {squadName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Position dropdown */}
            <FormControl fullWidth size="small">
              <InputLabel id="position-filter-label">Position</InputLabel>
              <Select
                labelId="position-filter-label"
                id="position-filter"
                value={filters.position || ''}
                label="Position"
                onChange={(e) => setFilters({ position: e.target.value || null })}
              >
                <MenuItem value="">
                  <em>All positions</em>
                </MenuItem>
                {positions.map((pos) => (
                  <MenuItem key={pos.value} value={pos.value}>
                    {pos.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Price range slider */}
          <Box>
            <Typography variant="body2" gutterBottom>
              Price: ${filters.minPrice}M - ${filters.maxPrice}M
            </Typography>
            <Slider
              value={[filters.minPrice, filters.maxPrice]}
              onChange={(_, newValue) => {
                if (Array.isArray(newValue)) {
                  const [min, max] = newValue;
                  setFilters({ minPrice: min, maxPrice: max });
                }
              }}
              valueLabelDisplay="auto"
              min={minPlayerPrice}
              max={maxPlayerPrice}
              marks
            />
          </Box>

          {/* Within budget checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.withinBudget}
                onChange={(e) => setFilters({ withinBudget: e.target.checked })}
              />
            }
            label="Within my budget"
          />

          {/* Status multi-select */}
          <FormControl fullWidth size="small">
            <Select
              id="status-filter"
              multiple
              value={filters.statuses}
              onChange={(e) => setFilters({ statuses: e.target.value as PlayerStatus[] })}
              renderValue={(selected) =>
                selected.length === 0 ? 'All statuses' : selected.map((s) => STATUS_LABELS[s] ?? s).join(', ')
              }
              displayEmpty
            >
              {playerStatusSchema.options.map((s) => (
                <MenuItem key={s} value={s}>
                  <Checkbox checked={filters.statuses.includes(s)} size="small" />
                  <ListItemText primary={STATUS_LABELS[s] ?? s} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Clear filters button */}
          <Button
            fullWidth
            variant="outlined"
            onClick={resetFilters}
            disabled={activeFilterCount === 0}
          >
            CLEAR MY FILTERS
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};
