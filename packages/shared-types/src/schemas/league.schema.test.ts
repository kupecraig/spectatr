import { describe, it, expect } from 'vitest';
import {
  draftSettingsSchema,
  leagueRulesSchema,
  createLeagueBaseSchema,
  createLeagueSchema,
  MIN_PARTICIPANTS,
  MIN_DRAFT_PARTICIPANTS,
  MAX_DRAFT_PARTICIPANTS,
  updateLeagueSchema,
  joinLeagueByCodeSchema,
  leagueSchema,
  teamSchema,
} from './league.schema';

// ---------------------------------------------------------------------------
// draftSettingsSchema
// ---------------------------------------------------------------------------

describe('draftSettingsSchema', () => {
  const valid = () => ({
    draftType: 'snake' as const,
    pickTimeLimit: 60,
    draftOrder: 'random' as const,
    scheduledDate: '2026-03-15T10:00:00Z',
  });

  it('parses valid draft settings', () => {
    expect(draftSettingsSchema.safeParse(valid()).success).toBe(true);
  });

  it('accepts linear draft type', () => {
    expect(draftSettingsSchema.safeParse({ ...valid(), draftType: 'linear' }).success).toBe(true);
  });

  it('rejects invalid draft type', () => {
    expect(draftSettingsSchema.safeParse({ ...valid(), draftType: 'invalid' }).success).toBe(false);
  });

  it('rejects zero or negative pick time limit', () => {
    expect(draftSettingsSchema.safeParse({ ...valid(), pickTimeLimit: 0 }).success).toBe(false);
    expect(draftSettingsSchema.safeParse({ ...valid(), pickTimeLimit: -30 }).success).toBe(false);
  });

  it('accepts undefined (schema is optional)', () => {
    expect(draftSettingsSchema.safeParse(undefined).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// leagueRulesSchema
// ---------------------------------------------------------------------------

describe('leagueRulesSchema', () => {
  it('applies defaults when given an empty object', () => {
    const result = leagueRulesSchema.safeParse({});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.draftMode).toBe(false);
    expect(result.data.pricingModel).toBe('fixed');
    expect(result.data.priceCapEnabled).toBe(true);
    expect(result.data.priceCap).toBeNull();
    expect(result.data.positionMatching).toBe(false);
    expect(result.data.sharedPool).toBe(false);
    expect(result.data.transfersPerRound).toBe(3);
    expect(result.data.wildcardRounds).toEqual([]);
    expect(result.data.tripleCaptainRounds).toEqual([]);
    expect(result.data.benchBoostRounds).toEqual([]);
  });

  it('accepts fixed and dynamic pricing models', () => {
    expect(leagueRulesSchema.safeParse({ pricingModel: 'fixed' }).success).toBe(true);
    expect(leagueRulesSchema.safeParse({ pricingModel: 'dynamic' }).success).toBe(true);
  });

  it('rejects invalid pricing model', () => {
    expect(leagueRulesSchema.safeParse({ pricingModel: 'invalid' }).success).toBe(false);
  });

  it('accepts nullable priceCap and squadLimitPerTeam', () => {
    expect(leagueRulesSchema.safeParse({ priceCap: null, squadLimitPerTeam: null }).success).toBe(true);
  });

  it('rejects negative transfersPerRound', () => {
    expect(leagueRulesSchema.safeParse({ transfersPerRound: -1 }).success).toBe(false);
  });

  it('accepts zero transfersPerRound', () => {
    expect(leagueRulesSchema.safeParse({ transfersPerRound: 0 }).success).toBe(true);
  });

  it('rejects non-integer transfersPerRound', () => {
    expect(leagueRulesSchema.safeParse({ transfersPerRound: 1.5 }).success).toBe(false);
  });

  it('rejects non-number elements in round arrays', () => {
    expect(leagueRulesSchema.safeParse({ wildcardRounds: [10, 'fifteen'] }).success).toBe(false);
  });

  it('does NOT contain DB-admin fields (id, leagueId, name, createdAt, updatedAt)', () => {
    // Schema strips unknown keys — these fields must not appear in output
    const result = leagueRulesSchema.safeParse({
      id: 1, leagueId: 1, name: 'test', createdAt: '2026-01-01', updatedAt: '2026-01-01',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect('id' in result.data).toBe(false);
    expect('leagueId' in result.data).toBe(false);
    expect('name' in result.data).toBe(false);
  });

  it('accepts valid draft settings when provided', () => {
    const result = leagueRulesSchema.safeParse({
      draftSettings: { draftType: 'snake', pickTimeLimit: 90, draftOrder: 'random', scheduledDate: '2026-03-01T12:00:00Z' },
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createLeagueSchema
// ---------------------------------------------------------------------------

describe('createLeagueSchema', () => {
  const valid = () => ({
    name: 'Office League',
    gameMode: 'standard' as const,
    startDate: '2026-03-01T00:00:00.000Z',
  });

  it('parses a valid create input', () => {
    expect(createLeagueSchema.safeParse(valid()).success).toBe(true);
  });

  it('does NOT require season (backend-resolved)', () => {
    const keys = Object.keys(createLeagueBaseSchema.shape);
    expect(keys).not.toContain('season');
  });

  it('rejects name shorter than 3 characters', () => {
    expect(createLeagueSchema.safeParse({ ...valid(), name: 'Aa' }).success).toBe(false);
  });

  it('rejects name longer than 60 characters', () => {
    expect(createLeagueSchema.safeParse({ ...valid(), name: 'A'.repeat(61) }).success).toBe(false);
  });

  it('accepts names at the 3 and 60 char boundaries', () => {
    expect(createLeagueSchema.safeParse({ ...valid(), name: 'Abc' }).success).toBe(true);
    expect(createLeagueSchema.safeParse({ ...valid(), name: 'A'.repeat(60) }).success).toBe(true);
  });

  it('rejects invalid gameMode', () => {
    expect(createLeagueSchema.safeParse({ ...valid(), gameMode: 'fantasy' as never }).success).toBe(false);
  });

  it('accepts all valid gameModes', () => {
    for (const mode of ['standard', 'round-robin', 'ranked'] as const) {
      expect(createLeagueSchema.safeParse({ ...valid(), gameMode: mode }).success).toBe(true);
    }
  });

  it('rejects maxParticipants below 2 or above 100', () => {
    expect(createLeagueSchema.safeParse({ ...valid(), maxParticipants: 1 }).success).toBe(false);
    expect(createLeagueSchema.safeParse({ ...valid(), maxParticipants: 101 }).success).toBe(false);
  });

  it('applies defaults for isPublic and maxParticipants', () => {
    const result = createLeagueSchema.safeParse(valid());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.isPublic).toBe(false);
    expect(result.data.maxParticipants).toBe(10);
  });

  // ── Mode-dependent minimums ────────────────────────────────────────────────

  it('MIN_PARTICIPANTS has correct values for each mode', () => {
    expect(MIN_PARTICIPANTS['standard']).toBe(2);
    expect(MIN_PARTICIPANTS['round-robin']).toBe(3);
    expect(MIN_PARTICIPANTS['ranked']).toBe(4);
  });

  it('accepts maxParticipants at the exact mode minimum (boundary)', () => {
    expect(createLeagueSchema.safeParse({ ...valid(), gameMode: 'standard',    maxParticipants: 2 }).success).toBe(true);
    expect(createLeagueSchema.safeParse({ ...valid(), gameMode: 'round-robin', maxParticipants: 3 }).success).toBe(true);
    expect(createLeagueSchema.safeParse({ ...valid(), gameMode: 'ranked',      maxParticipants: 4 }).success).toBe(true);
  });

  it('rejects maxParticipants below round-robin minimum (3)', () => {
    const result = createLeagueSchema.safeParse({ ...valid(), gameMode: 'round-robin', maxParticipants: 2 });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path[0] === 'maxParticipants')).toBe(true);
    expect(result.error.issues.some((i) => i.message.includes('Round Robin'))).toBe(true);
  });

  it('rejects maxParticipants below ranked minimum (4)', () => {
    const result = createLeagueSchema.safeParse({ ...valid(), gameMode: 'ranked', maxParticipants: 3 });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path[0] === 'maxParticipants')).toBe(true);
    expect(result.error.issues.some((i) => i.message.includes('Ranked'))).toBe(true);
  });

  it('standard mode is not affected by the superRefine (min stays at 2)', () => {
    expect(createLeagueSchema.safeParse({ ...valid(), gameMode: 'standard', maxParticipants: 2 }).success).toBe(true);
    expect(createLeagueSchema.safeParse({ ...valid(), gameMode: 'standard', maxParticipants: 1 }).success).toBe(false);
  });

  // ── Draft mode participant constraints ─────────────────────────────────────

  const withDraft = (overrides = {}) => ({
    ...valid(),
    rules: { draftMode: true },
    ...overrides,
  });

  it('MIN_DRAFT_PARTICIPANTS and MAX_DRAFT_PARTICIPANTS are exported with expected values', () => {
    expect(MIN_DRAFT_PARTICIPANTS).toBe(4);
    expect(MAX_DRAFT_PARTICIPANTS).toBe(20);
  });

  it('draft mode: accepts maxParticipants at the draft minimum (4)', () => {
    expect(createLeagueSchema.safeParse(withDraft({ maxParticipants: 4 })).success).toBe(true);
  });

  it('draft mode: rejects maxParticipants below draft minimum (3)', () => {
    const result = createLeagueSchema.safeParse(withDraft({ maxParticipants: 3 }));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path[0] === 'maxParticipants')).toBe(true);
    expect(result.error.issues.some((i) => i.message.includes('4'))).toBe(true);
  });

  it('draft mode: accepts maxParticipants at the draft maximum (20)', () => {
    expect(createLeagueSchema.safeParse(withDraft({ maxParticipants: 20 })).success).toBe(true);
  });

  it('draft mode: rejects maxParticipants above draft maximum (21)', () => {
    const result = createLeagueSchema.safeParse(withDraft({ maxParticipants: 21 }));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path[0] === 'maxParticipants')).toBe(true);
    expect(result.error.issues.some((i) => i.message.includes('20'))).toBe(true);
  });

  it('draft mode ranked: effective min is draft min (4) not ranked min (4) — same floor', () => {
    // ranked min = 4, draft min = 4 → effective min = 4, no change
    expect(createLeagueSchema.safeParse(withDraft({ gameMode: 'ranked', maxParticipants: 4 })).success).toBe(true);
    expect(createLeagueSchema.safeParse(withDraft({ gameMode: 'ranked', maxParticipants: 3 })).success).toBe(false);
  });

  it('draft mode, max=20 boundary is independent of game mode', () => {
    for (const mode of ['standard', 'round-robin', 'ranked'] as const) {
      expect(createLeagueSchema.safeParse(withDraft({ gameMode: mode, maxParticipants: 20 })).success).toBe(true);
      expect(createLeagueSchema.safeParse(withDraft({ gameMode: mode, maxParticipants: 21 })).success).toBe(false);
    }
  });

  it('non-draft mode: maxParticipants above 20 is valid', () => {
    // The draft cap (20) must NOT apply when draftMode is false
    expect(createLeagueSchema.safeParse({ ...valid(), maxParticipants: 50 }).success).toBe(true);
    expect(createLeagueSchema.safeParse({ ...valid(), maxParticipants: 100 }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// updateLeagueSchema
// ---------------------------------------------------------------------------

describe('updateLeagueSchema', () => {
  it('requires id', () => {
    expect(updateLeagueSchema.safeParse({ name: 'New Name' }).success).toBe(false);
  });

  it('allows partial updates with only id', () => {
    expect(updateLeagueSchema.safeParse({ id: 1 }).success).toBe(true);
    expect(updateLeagueSchema.safeParse({ id: 1, name: 'New Name' }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// joinLeagueByCodeSchema
// ---------------------------------------------------------------------------

describe('joinLeagueByCodeSchema', () => {
  it('parses valid join input', () => {
    expect(joinLeagueByCodeSchema.safeParse({ inviteCode: 'ABCD1234', teamName: 'My Team' }).success).toBe(true);
  });

  it('requires inviteCode to be exactly 8 characters', () => {
    expect(joinLeagueByCodeSchema.safeParse({ inviteCode: 'ABCD123', teamName: 'x' }).success).toBe(false);
    expect(joinLeagueByCodeSchema.safeParse({ inviteCode: 'ABCD12345', teamName: 'x' }).success).toBe(false);
    expect(joinLeagueByCodeSchema.safeParse({ inviteCode: 'ABCD1234', teamName: 'x' }).success).toBe(true);
  });

  it('requires teamName min 1 and max 50 characters', () => {
    expect(joinLeagueByCodeSchema.safeParse({ inviteCode: 'ABCD1234', teamName: '' }).success).toBe(false);
    expect(joinLeagueByCodeSchema.safeParse({ inviteCode: 'ABCD1234', teamName: 'A'.repeat(51) }).success).toBe(false);
    expect(joinLeagueByCodeSchema.safeParse({ inviteCode: 'ABCD1234', teamName: 'A'.repeat(50) }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// leagueSchema
// ---------------------------------------------------------------------------

describe('leagueSchema', () => {
  const valid = () => ({
    id: 1,
    tenantId: 'trc-2025',
    name: 'Family League',
    creatorId: 'user_abc',
    sportType: 'rugby',
    gameMode: 'standard' as const,
    season: '2025',
    status: 'active' as const,
    isPublic: false,
    startDate: '2026-03-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  it('parses a valid league response', () => {
    expect(leagueSchema.safeParse(valid()).success).toBe(true);
  });

  it('optional fields can be absent (inviteCode, maxParticipants, endDate, rules)', () => {
    expect(leagueSchema.safeParse(valid()).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(leagueSchema.safeParse({ ...valid(), status: 'unknown' as never }).success).toBe(false);
  });

  it('rejects invalid gameMode', () => {
    expect(leagueSchema.safeParse({ ...valid(), gameMode: 'fantasy' as never }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// teamSchema
// ---------------------------------------------------------------------------

describe('teamSchema', () => {
  const valid = () => ({
    id: 1,
    tenantId: 'trc-2025',
    userId: 'user_abc',
    leagueId: 1,
    name: "Craig's Team",
    budget: 42000000,
    totalCost: 0,
    points: 0,
    wins: 0,
    losses: 0,
    draws: 0,
  });

  it('parses a valid team', () => {
    expect(teamSchema.safeParse(valid()).success).toBe(true);
  });

  it('rank is optional', () => {
    const result = teamSchema.safeParse(valid());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.rank).toBeUndefined();
  });

  it('accepts rank when provided', () => {
    expect(teamSchema.safeParse({ ...valid(), rank: 1 }).success).toBe(true);
  });
});
