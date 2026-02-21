import { z } from 'zod';
import { sportSquadConfig } from '../config/sport-squad-config';

/**
 * Player position enum - dynamically generated from sport config
 * This ensures positions are always in sync with the sport configuration
 */
const validPositions = Object.keys(sportSquadConfig.positions) as [string, ...string[]];

export const playerPositionSchema = z.enum(validPositions);

export type PlayerPosition = z.infer<typeof playerPositionSchema>;

/**
 * Player position constants for convenience
 * Generated from sport config
 */
export const PlayerPosition = Object.keys(sportSquadConfig.positions).reduce((acc, key) => {
  acc[key.toUpperCase()] = key;
  return acc;
}, {} as Record<string, string>);

/**
 * Player schema - represents a rugby player
 */
export const playerSchema = z.object({
  id: z.number(),
  feedId: z.number(),
  squadId: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  position: playerPositionSchema,
  cost: z.number().positive(),
  status: z.string(),
  isLocked: z.boolean(),
  stats: z.object({
    totalPoints: z.number().nullable(),
    avgPoints: z.number().nullable(),
    lastRoundPoints: z.number().nullable(),
    positionRank: z.number().nullable(),
    nextFixture: z.number().nullable(),
    scores: z.any(),
  }),
  selected: z.object({
    percentage: z.number().min(0).max(100),
  }),
  imagePitch: z.string(),
  imageProfile: z.string(),
});

export type Player = z.infer<typeof playerSchema>;

/**
 * Squad schema - represents a user's selected team
 */
export const squadSchema = z.object({
  players: z.array(playerSchema).max(15),
  totalCost: z.number().max(42_000_000), // 42M budget cap
});

export type Squad = z.infer<typeof squadSchema>;
