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
 * Canonical player status values
 */
export const playerStatusSchema = z.enum([
  'available',
  'selected',
  'not-selected',
  'uncertain',
  'injured',
  'eliminated',
  'benched',
]);

export type PlayerStatus = z.infer<typeof playerStatusSchema>;

/**
 * Player sort options for list endpoint
 * Native columns: totalPoints, avgPoints, lastRoundPoints, cost
 * JSONB stat fields: tries, tackles, conversions, metresGained
 */
export const PlayerSortBySchema = z.enum([
  'totalPoints',
  'avgPoints',
  'lastRoundPoints',
  'cost',
  'tries',
  'tackles',
  'conversions',
  'metresGained',
]);

export type PlayerSortBy = z.infer<typeof PlayerSortBySchema>;

/**
 * Schema for player list item response (includes scoring columns)
 * Used by players.list tRPC procedure
 */
export const playerListItemSchema = z.object({
  id: z.number(),
  feedId: z.number(),
  squadId: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  position: playerPositionSchema,
  cost: z.number().positive(),
  status: playerStatusSchema,
  isLocked: z.boolean(),
  stats: z.record(z.unknown()).default({}),
  selected: z.record(z.unknown()).default({}),
  imagePitch: z.string().nullable(),
  imageProfile: z.string().nullable(),
  // Scoring columns (populated by calculateRoundPoints)
  totalPoints: z.number().int().default(0),
  avgPoints: z.number().default(0),
  lastRoundPoints: z.number().int().default(0),
});

export type PlayerListItem = z.infer<typeof playerListItemSchema>;

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
  status: playerStatusSchema,
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
