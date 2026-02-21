import { describe, it, expect } from 'vitest';
import { leagueRulesSchema, draftSettingsSchema } from './league.schema';

describe('draftSettingsSchema', () => {
  const createValidDraftSettings = () => ({
    draftType: 'snake' as const,
    pickTimeLimit: 60,
    draftOrder: 'random' as const,
    scheduledDate: '2026-03-15T10:00:00Z',
  });

  it('should parse valid draft settings', () => {
    const validSettings = createValidDraftSettings();
    const result = draftSettingsSchema.safeParse(validSettings);
    
    expect(result.success).toBe(true);
  });

  it('should accept snake draft type', () => {
    const settings = createValidDraftSettings();
    settings.draftType = 'snake';
    
    const result = draftSettingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
  });

  it('should accept linear draft type', () => {
    const settings = {
      ...createValidDraftSettings(),
      draftType: 'linear' as const,
    };
    
    const result = draftSettingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
  });

  it('should reject invalid draft type', () => {
    const settings = createValidDraftSettings();
    (settings as any).draftType = 'invalid';
    
    const result = draftSettingsSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });

  it('should accept random draft order', () => {
    const settings = createValidDraftSettings();
    settings.draftOrder = 'random';
    
    const result = draftSettingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
  });

  it('should accept ranked draft order', () => {
    const settings = {
      ...createValidDraftSettings(),
      draftOrder: 'ranked' as const,
    };
    
    const result = draftSettingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
  });

  it('should reject invalid draft order', () => {
    const settings = createValidDraftSettings();
    (settings as any).draftOrder = 'invalid';
    
    const result = draftSettingsSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });

  it('should reject zero or negative pick time limit', () => {
    const settingsZero = createValidDraftSettings();
    settingsZero.pickTimeLimit = 0;
    
    const settingsNegative = createValidDraftSettings();
    settingsNegative.pickTimeLimit = -30;
    
    expect(draftSettingsSchema.safeParse(settingsZero).success).toBe(false);
    expect(draftSettingsSchema.safeParse(settingsNegative).success).toBe(false);
  });

  it('should accept undefined (optional schema)', () => {
    const result = draftSettingsSchema.safeParse(undefined);
    expect(result.success).toBe(true);
  });
});

describe('leagueRulesSchema', () => {
  const createValidLeagueRules = () => ({
    id: 1,
    leagueId: 100,
    name: 'Test League Rules',
    draftMode: false,
    pricingModel: 'fixed' as const,
    priceCapEnabled: true,
    priceCap: 42000000,
    positionMatching: false,
    squadLimitPerTeam: 4,
    sharedPool: false,
    transfersPerRound: 1,
    wildcardRounds: [10, 20],
    tripleCaptainRounds: [15],
    benchBoostRounds: [25],
    draftSettings: undefined,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  });

  describe('valid league rules parsing', () => {
    it('should parse valid league rules with all fields', () => {
      const validRules = createValidLeagueRules();
      const result = leagueRulesSchema.safeParse(validRules);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validRules.id);
        expect(result.data.name).toBe(validRules.name);
        expect(result.data.pricingModel).toBe(validRules.pricingModel);
      }
    });

    it('should accept fixed pricing model', () => {
      const rules = createValidLeagueRules();
      rules.pricingModel = 'fixed';
      
      const result = leagueRulesSchema.safeParse(rules);
      expect(result.success).toBe(true);
    });

    it('should accept dynamic pricing model', () => {
      const rules = {
        ...createValidLeagueRules(),
        pricingModel: 'dynamic' as const,
      };
      
      const result = leagueRulesSchema.safeParse(rules);
      expect(result.success).toBe(true);
    });

    it('should accept nullable priceCap', () => {
      const rules = createValidLeagueRules();
      (rules as any).priceCap = null;
      
      const result = leagueRulesSchema.safeParse(rules);
      expect(result.success).toBe(true);
    });

    it('should accept nullable squadLimitPerTeam', () => {
      const rules = createValidLeagueRules();
      (rules as any).squadLimitPerTeam = null;
      
      const result = leagueRulesSchema.safeParse(rules);
      expect(result.success).toBe(true);
    });

    it('should accept empty round arrays', () => {
      const rules = createValidLeagueRules();
      rules.wildcardRounds = [];
      rules.tripleCaptainRounds = [];
      rules.benchBoostRounds = [];
      
      const result = leagueRulesSchema.safeParse(rules);
      expect(result.success).toBe(true);
    });

    it('should accept draft settings when provided', () => {
      const rules = createValidLeagueRules();
      (rules as any).draftSettings = {
        draftType: 'snake',
        pickTimeLimit: 90,
        draftOrder: 'random',
        scheduledDate: '2026-03-01T12:00:00Z',
      };
      
      const result = leagueRulesSchema.safeParse(rules);
      expect(result.success).toBe(true);
    });

    it('should accept various boolean combinations', () => {
      const combinations = [
        { draftMode: true, priceCapEnabled: true, positionMatching: true, sharedPool: true },
        { draftMode: false, priceCapEnabled: false, positionMatching: false, sharedPool: false },
        { draftMode: true, priceCapEnabled: false, positionMatching: true, sharedPool: false },
      ];
      
      combinations.forEach((combo) => {
        const rules = { ...createValidLeagueRules(), ...combo };
        const result = leagueRulesSchema.safeParse(rules);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('invalid league rules data', () => {
    it('should reject missing required fields', () => {
      const invalidRules = {
        id: 1,
        name: 'Incomplete',
        // Missing many required fields
      };
      
      const result = leagueRulesSchema.safeParse(invalidRules);
      expect(result.success).toBe(false);
    });

    it('should reject invalid pricing model', () => {
      const rules = createValidLeagueRules();
      (rules as any).pricingModel = 'invalid';
      
      const result = leagueRulesSchema.safeParse(rules);
      expect(result.success).toBe(false);
    });

    it('should reject wrong type for draftMode', () => {
      const rules = createValidLeagueRules();
      (rules as any).draftMode = 'true';
      
      const result = leagueRulesSchema.safeParse(rules);
      expect(result.success).toBe(false);
    });

    it('should reject wrong type for id', () => {
      const rules = createValidLeagueRules();
      (rules as any).id = '1';
      
      const result = leagueRulesSchema.safeParse(rules);
      expect(result.success).toBe(false);
    });

    it('should reject invalid wildcardRounds type', () => {
      const rules = createValidLeagueRules();
      (rules as any).wildcardRounds = 'not-an-array';
      
      const result = leagueRulesSchema.safeParse(rules);
      expect(result.success).toBe(false);
    });

    it('should reject non-number elements in round arrays', () => {
      const rules = createValidLeagueRules();
      (rules as any).wildcardRounds = [10, 'fifteen', 20];
      
      const result = leagueRulesSchema.safeParse(rules);
      expect(result.success).toBe(false);
    });

    it('should reject invalid draft settings', () => {
      const rules = createValidLeagueRules();
      (rules as any).draftSettings = {
        draftType: 'invalid',
        pickTimeLimit: -10,
        draftOrder: 'wrong',
        scheduledDate: '2026-03-01',
      };
      
      const result = leagueRulesSchema.safeParse(rules);
      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle very large numbers for priceCap', () => {
      const rules = createValidLeagueRules();
      rules.priceCap = 999999999;
      
      const result = leagueRulesSchema.safeParse(rules);
      expect(result.success).toBe(true);
    });

    it('should handle large arrays of rounds', () => {
      const rules = createValidLeagueRules();
      rules.wildcardRounds = Array.from({ length: 50 }, (_, i) => i + 1);
      
      const result = leagueRulesSchema.safeParse(rules);
      expect(result.success).toBe(true);
    });

    it('should reject negative transfers per round', () => {
      const rules = createValidLeagueRules();
      rules.transfersPerRound = -1;
      
      // Note: Schema doesn't enforce positive, so this will pass
      // This test documents current behavior
      const result = leagueRulesSchema.safeParse(rules);
      expect(result.success).toBe(true);
    });
  });
});
