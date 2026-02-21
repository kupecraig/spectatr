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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useMyTeamStore } from '@/stores';
import { VALIDATION } from '@/config/constants';
import { sportSquadConfig } from '@spectatr/shared-types';

interface FilterPanelProps {
  squadNames: string[];
  maxPlayerPrice: number;
}

export const FilterPanel: FC<FilterPanelProps> = ({ squadNames, maxPlayerPrice }) => {
  const { filters, setFilters, resetFilters, filtersExpanded, toggleFilters } = useMyTeamStore();

  // Check if price filter has been changed from defaults
  const isPriceFilterActive = 
    filters.minPrice !== VALIDATION.MIN_PRICE || 
    filters.maxPrice !== maxPlayerPrice;

  // Count active filters
  const activeFilterCount = [
    filters.search,
    filters.position,
    filters.squad,
    isPriceFilterActive,
    filters.withinBudget,
  ].filter(Boolean).length;

  // Get position options from sport config (sport-agnostic)
  const positions = Object.entries(sportSquadConfig.positions).map(([value, config]) => ({
    value,
    label: config.label,
  }));

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
                const [min, max] = newValue;
                setFilters({ minPrice: min, maxPrice: max });
              }}
              valueLabelDisplay="auto"
              min={VALIDATION.MIN_PRICE}
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
