import { z } from 'zod';

/**
 * TenantConfig Schema
 *
 * Defines the configuration structure for a Tenant (sport competition instance).
 * This is stored in the `Tenant.config` JSONB column.
 *
 * Structure:
 * - `defaults`: League default values (priceCap, transfersPerRound, squadLimitPerTeamMax)
 * - `scoring`: Scoring rules for fantasy points calculation
 */

/**
 * Scoring rules mapping stat type codes to point values.
 * Keys are short codes (T, TA, C, TK, etc.) and values are integer points.
 *
 * Example: { T: 15, TA: 9, C: 2, CM: -1, TK: 1, MG_per10: 1 }
 */
export const ScoringRulesSchema = z.record(z.string(), z.number());

/**
 * Type for scoring rules
 */
export type ScoringRules = z.infer<typeof ScoringRulesSchema>;

/**
 * TenantConfig schema - nested structure for tenant-level configuration
 */
export const TenantConfigSchema = z.object({
  /**
   * Default values for leagues in this tenant
   */
  defaults: z
    .object({
      /** Default price cap for leagues (in cents). Null means no cap. */
      priceCap: z.number().int().positive().nullable().optional(),
      /** Max players from a single squad */
      squadLimitPerTeamMax: z.number().int().positive().optional(),
      /** Default transfers per round */
      defaultTransfersPerRound: z.number().int().min(0).optional(),
    })
    .optional(),

  /**
   * Scoring configuration for fantasy points
   */
  scoring: z
    .object({
      /** Mapping of stat codes to point values */
      rules: ScoringRulesSchema,
    })
    .optional(),
});

/**
 * Type for TenantConfig
 */
export type TenantConfig = z.infer<typeof TenantConfigSchema>;
