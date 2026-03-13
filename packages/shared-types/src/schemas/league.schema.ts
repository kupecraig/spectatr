import { z } from 'zod';

/**
 * Optional draft configuration — only relevant when draftMode is true.
 */
export const draftSettingsSchema = z
  .object({
    draftType: z.enum(['snake', 'linear']),
    pickTimeLimit: z.number().positive(),
    draftOrder: z.enum(['random', 'ranked']),
    scheduledDate: z.string(),
  })
  .optional();

export type DraftSettings = z.infer<typeof draftSettingsSchema>;

/**
 * League rules — client-facing shape only.
 * DB-admin fields (id, leagueId, name, createdAt, updatedAt) are intentionally excluded.
 * Stored as a JSONB blob on the League row.
 *
 * Note: priceCap is a single optional value — null means unlimited.
 * There is no separate priceCapEnabled boolean; the presence of a value implies the cap is active.
 */
export const leagueRulesSchema = z.object({
  draftMode:           z.boolean().default(false),
  pricingModel:        z.enum(['fixed', 'dynamic']).default('fixed'),
  priceCap:            z.number().positive().max(200_000_000, 'Price cap cannot exceed 200M').nullable().default(null),
  positionMatching:    z.boolean().default(false),
  squadLimitPerTeam:   z.number().nullable().default(null),
  sharedPool:          z.boolean().default(false),
  transfersPerRound:   z.number().int().min(0).default(3),
  wildcardRounds:      z.array(z.number()).default([]),
  tripleCaptainRounds: z.array(z.number()).default([]),
  benchBoostRounds:    z.array(z.number()).default([]),
  draftSettings:       draftSettingsSchema,
});

export type LeagueRules = z.infer<typeof leagueRulesSchema>;

/**
 * Mode-dependent minimum participant counts.
 * Standard: 2 (bare minimum for any competition)
 * Round Robin: 3 (needs rotation of opponents)
 * Ranked: 4 (needs enough players for ELO matchmaking)
 */
export const MIN_PARTICIPANTS: Record<string, number> = {
  standard:      2,
  'round-robin': 3,
  ranked:        4,
};

/**
 * Draft mode adds its own floor and ceiling on top of the game-mode minimum.
 * MIN: 4 — fewer than 4 teams makes the draft pointless (2–3 teams pick through
 *           most of the pool with no real scarcity or strategy).
 * MAX: 20 — beyond 20 teams the player pool becomes too thin for a 15-player
 *           rugby squad (trc-2025 has ~160 players; 20 × 15 = 300 already assumes
 *           a larger rotation). Adjust per tenant if needed in future.
 */
export const MIN_DRAFT_PARTICIPANTS = 4;
export const MAX_DRAFT_PARTICIPANTS = 20;

/**
 * Base object shape — used by both createLeagueSchema and updateLeagueSchema.
 * Exported so consumers can access .shape without triggering ZodEffects wrapping.
 */
export const createLeagueBaseSchema = z.object({
  name:            z.string().min(3).max(60),
  format:          z.enum(['classic', 'draft']).default('classic'),
  gameMode:        z.enum(['standard', 'round-robin', 'ranked']),
  isPublic:        z.boolean().default(false),
  maxParticipants: z.number().int().min(2).max(100).default(10),
  rules:           leagueRulesSchema.default({}),
});

/**
 * Input schema for creating a league.
 * `season` is intentionally omitted — it is resolved server-side from the active Tournament.
 * Enforces:
 *   - MVP: Classic format only supports Standard game mode (RR/Ranked are Phase 2)
 *   - RR requires Draft format by product definition
 *   - Draft format: participant min/max bounds gated behind format === 'draft'
 *   - Classic format: standard participant minimum only
 */
export const createLeagueSchema = createLeagueBaseSchema.superRefine((data, ctx) => {
  // MVP guard: Classic format only supports Standard game mode.
  if (data.format === 'classic' && data.gameMode !== 'standard') {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      message: 'Round Robin and Ranked modes are not yet available. Use Standard.',
      path:    ['gameMode'],
    });
  }

  // Product rule: Round Robin requires Draft format.
  if (data.gameMode === 'round-robin' && data.format !== 'draft') {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      message: 'Round Robin requires Draft format.',
      path:    ['gameMode'],
    });
  }

  const modeLabels: Record<string, string> = {
    standard:      'Standard',
    'round-robin': 'Round Robin',
    ranked:        'Ranked',
  };
  const label = modeLabels[data.gameMode] ?? data.gameMode;

  if (data.format === 'draft') {
    // Draft format: enforce draft-specific participant floor and ceiling.
    const isDraft = data.rules.draftMode;
    const modeMin  = MIN_PARTICIPANTS[data.gameMode] ?? 2;
    const effectiveMin = isDraft ? Math.max(modeMin, MIN_DRAFT_PARTICIPANTS) : modeMin;

    if (data.maxParticipants < effectiveMin) {
      const qualifier = isDraft && MIN_DRAFT_PARTICIPANTS > modeMin ? `Draft ${label}` : label;
      ctx.addIssue({
        code:      z.ZodIssueCode.too_small,
        minimum:   effectiveMin,
        type:      'number',
        inclusive: true,
        message:   `${qualifier} leagues require at least ${effectiveMin} participants`,
        path:      ['maxParticipants'],
      });
    }

    if (data.maxParticipants > MAX_DRAFT_PARTICIPANTS) {
      ctx.addIssue({
        code:      z.ZodIssueCode.too_big,
        maximum:   MAX_DRAFT_PARTICIPANTS,
        type:      'number',
        inclusive: true,
        message:   `Draft leagues support a maximum of ${MAX_DRAFT_PARTICIPANTS} participants`,
        path:      ['maxParticipants'],
      });
    }
  } else {
    // Classic format: apply standard mode minimum only.
    const modeMin = MIN_PARTICIPANTS[data.gameMode] ?? 2;
    if (data.maxParticipants < modeMin) {
      ctx.addIssue({
        code:      z.ZodIssueCode.too_small,
        minimum:   modeMin,
        type:      'number',
        inclusive: true,
        message:   `${label} leagues require at least ${modeMin} participants`,
        path:      ['maxParticipants'],
      });
    }
  }
});

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;

/**
 * Input schema for updating a league (creator only).
 * All fields optional except id.
 */
export const updateLeagueSchema = createLeagueBaseSchema.partial().extend({
  id: z.number(),
});

export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>;

/**
 * Input schema for joining a league by invite code.
 * `teamName` is required so the user can name their team on join.
 */
export const joinLeagueByCodeSchema = z.object({
  inviteCode: z.string().length(8),
  teamName:   z.string().min(1).max(50),
});

export type JoinLeagueByCodeInput = z.infer<typeof joinLeagueByCodeSchema>;

/**
 * Full league response shape returned from the API.
 */
export const leagueSchema = z.object({
  id:              z.number(),
  tenantId:        z.string(),
  name:            z.string(),
  creatorId:       z.string(),
  sportType:       z.string(),
  format:          z.enum(['classic', 'draft']).default('classic'),
  gameMode:        z.enum(['standard', 'round-robin', 'ranked']),
  season:          z.string(),
  status:          z.enum(['draft', 'active', 'completed']),
  isPublic:        z.boolean(),
  inviteCode:      z.string().optional(),
  maxParticipants: z.number().optional(),
  rules:           leagueRulesSchema.optional(),
  createdAt:       z.string(),
  updatedAt:       z.string(),
});

export type League = z.infer<typeof leagueSchema>;

/**
 * Team response shape returned from the API.
 */
export const teamSchema = z.object({
  id:        z.number(),
  tenantId:  z.string(),
  userId:    z.string(),
  leagueId:  z.number(),
  name:      z.string(),
  budget:    z.number(),
  totalCost: z.number(),
  points:    z.number(),
  rank:      z.number().optional(),
  wins:      z.number(),
  losses:    z.number(),
  draws:     z.number(),
});

export type Team = z.infer<typeof teamSchema>;
