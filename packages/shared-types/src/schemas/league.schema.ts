import { z } from 'zod';

/**
 * Draft settings for league
 */
export const draftSettingsSchema = z.object({
  draftType: z.enum(['snake', 'linear']),
  pickTimeLimit: z.number().positive(),
  draftOrder: z.enum(['random', 'ranked']),
  scheduledDate: z.string(),
}).optional();

export type DraftSettings = z.infer<typeof draftSettingsSchema>;

/**
 * League-specific rules configuration
 */
export const leagueRulesSchema = z.object({
  id: z.number(),
  leagueId: z.number(),
  name: z.string(),
  draftMode: z.boolean(),
  pricingModel: z.enum(['fixed', 'dynamic']),
  priceCapEnabled: z.boolean(),
  priceCap: z.number().nullable(),
  positionMatching: z.boolean(),
  squadLimitPerTeam: z.number().nullable(),
  sharedPool: z.boolean(),
  transfersPerRound: z.number(),
  wildcardRounds: z.array(z.number()),
  tripleCaptainRounds: z.array(z.number()),
  benchBoostRounds: z.array(z.number()),
  draftSettings: draftSettingsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type LeagueRules = z.infer<typeof leagueRulesSchema>;
