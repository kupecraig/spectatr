import { squadSchema, type Player, playerPositionSchema } from '../schemas/player.schema';
import { type LeagueRules } from '../schemas/league.schema';
import { sportSquadConfig, type SportSquadConfig } from '../config/sport-squad-config';
import type { ZodError } from 'zod';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a squad against sport-specific rules and league rules using Zod
 * @param players - Array of players to validate
 * @param config - Sport squad configuration
 * @param leagueRules - League-specific rules (optional, for budget and squad limits)
 * @returns Validation result with errors array
 */
export function validateSquad(
  players: Player[],
  config: SportSquadConfig = sportSquadConfig,
  leagueRules?: LeagueRules
): ValidationResult {
  const errors: string[] = [];

  // Validate total player count
  if (players.length !== config.maxPlayers) {
    errors.push(
      `Squad must have exactly ${config.maxPlayers} players (currently ${players.length})`
    );
  }

  // Count players by position
  const positionCounts: Record<string, number> = {};
  players.forEach((player) => {
    positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
  });

  // Validate position requirements
  for (const [position, requirement] of Object.entries(config.positions)) {
    const count = positionCounts[position] || 0;
    if (count < requirement.min) {
      errors.push(
        `Not enough ${requirement.label}: ${count}, minimum required: ${requirement.min}`
      );
    }
    if (count > requirement.max) {
      errors.push(
        `Too many ${requirement.label}: ${count}, maximum allowed: ${requirement.max}`
      );
    }
  }

  // Validate budget (if league rules provided and price cap enabled)
  const totalCost = players.reduce((sum, player) => sum + player.cost, 0);
  if (leagueRules?.priceCapEnabled && leagueRules.priceCap !== null && totalCost > leagueRules.priceCap) {
    errors.push(
      `Budget exceeded: ${(totalCost / 1_000_000).toFixed(1)}M, maximum allowed: ${(leagueRules.priceCap / 1_000_000).toFixed(0)}M`
    );
  }

  // Validate squad limit per team (if league rules provided)
  if (leagueRules?.squadLimitPerTeam !== null && leagueRules?.squadLimitPerTeam !== undefined) {
    const squadCounts: Record<number, number> = {};
    players.forEach((player) => {
      squadCounts[player.squadId] = (squadCounts[player.squadId] || 0) + 1;
    });

    for (const [squadId, count] of Object.entries(squadCounts)) {
      if (count > leagueRules.squadLimitPerTeam) {
        errors.push(`Max. ${leagueRules.squadLimitPerTeam} players from same team (squad ${squadId} has ${count})`);
      }
    }
  }

  // Try Zod validation for additional checks
  try {
    squadSchema.parse({ players, totalCost });
  } catch (error) {
    if (error && typeof error === 'object' && 'errors' in error) {
      const zodError = error as ZodError;
      zodError.errors.forEach((err) => {
        errors.push(err.message);
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a single player position
 */
export function validatePosition(position: unknown): boolean {
  try {
    playerPositionSchema.parse(position);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if adding a player would exceed squad limit per team
 * @param players - Current squad
 * @param newPlayer - Player to add
 * @param maxPerTeam - Maximum players allowed from same squad
 * @returns Validation result
 */
export function validateSquadLimit(
  players: Player[],
  newPlayer: Player,
  maxPerTeam: number
): ValidationResult {
  const squadCounts: Record<number, number> = {};

  // Count current players by squad
  players.forEach((player) => {
    squadCounts[player.squadId] = (squadCounts[player.squadId] || 0) + 1;
  });

  // Check if adding new player would exceed limit
  const currentCount = squadCounts[newPlayer.squadId] || 0;
  if (currentCount >= maxPerTeam) {
    return {
      valid: false,
      errors: [`Max. ${maxPerTeam} same team`],
    };
  }

  return {
    valid: true,
    errors: [],
  };
}
