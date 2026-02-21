import sportConfigData from './sport-squad-config.json';

export interface PositionRequirement {
  required: number;
  min: number;
  max: number;
  label: string;
}

export interface SportSquadConfig {
  maxPlayers: number;
  positions: Record<string, PositionRequirement>;
}

/**
 * Rugby Union sport-specific squad configuration
 */
export const sportSquadConfig: SportSquadConfig = sportConfigData;

export type SportSquadConfigType = typeof sportSquadConfig;

/**
 * Get sport config by sport name
 */
export function getSportConfig(sport: 'rugby-union'): SportSquadConfig {
  if (sport === 'rugby-union') {
    return sportSquadConfig;
  }
  throw new Error(`Unknown sport: ${sport}`);
}

/**
 * Get position requirement for a specific position
 */
export function getPositionRequirement(
  config: SportSquadConfig,
  position: string
): PositionRequirement | undefined {
  return config.positions[position];
}
