---
title: League Rules — MVP Implementation Plan
version: 2.0
date_created: 2026-02-25
last_updated: 2026-02-25
---
# League Rules — MVP Implementation Plan

End-to-end plan for completing the league rules feature set for MVP. Product decisions are recorded below; this document is now the implementation spec.

**MVP scope:** Classic format only, Standard game mode only. Draft, Round Robin, and Ranked are Phase 2.

---

## Current State Assessment

### DB Schema (`prisma/schema.prisma`)
| Field | Status | Gap |
|-------|--------|-----|
| `League.gameMode` | ✅ Exists | `enum` allows `round-robin`, `ranked` — must be restricted in app layer for MVP; no DB change needed |
| `League.rules` (JSONB) | ✅ Exists | Stores `leagueRulesSchema` blob — no column change needed |
| `League.status` | ✅ Exists | `draft`/`active`/`completed` — correct |
| `League.format` | ❌ Missing | No `format` field on League row — needed to enforce Classic vs Draft separation |
| `Team.budget` | ⚠️ Hardcoded | Creator's team created with `budget: 42_000_000` hardcoded — should derive from `rules.priceCap` |

### Shared Types (`packages/shared-types/src/schemas/league.schema.ts`)
| Item | Status | Gap |
|------|--------|-----|
| `leagueRulesSchema.priceCapEnabled` | ⚠️ Remove | Separate boolean is redundant — `priceCap=null` means unlimited per product decision |
| `leagueRulesSchema.draftMode` + `draftSettings` | ✅ Keep in schema | Keep for forward-compat; UI will not expose it at MVP |
| `createLeagueSchema.gameMode` | ⚠️ Wrong options | Currently accepts `round-robin` and `ranked` — must restrict to `standard` for MVP |
| `createLeagueSchema` format field | ❌ Missing | No `format` field (`classic`\|`draft`) — needed for Phase 2 readiness and constraint logic |
| Draft participant validation in `createLeagueSchema` | ⚠️ Scope | Draft min/max validation fires for all leagues now — should be gated on `format === 'draft'` |

### Backend (`packages/server/src/trpc/routers/leagues.ts`)
| Item | Status | Gap |
|------|--------|-----|
| `create` mutation — `budget` hardcoded | ⚠️ Bug | `budget: 42_000_000` ignores `rules.priceCap` — should use cap value or a sensible tenant default |
| `join` mutation — `budget` hardcoded | ⚠️ Bug | Same issue — joining member's team budget not derived from league rules |
| `list` procedure — `gameMode` filter | ⚠️ Scope | Accepts `round-robin` and `ranked` — fine as-is (no data exists), but should be noted |
| No format stored or enforced | ❌ Missing | API persists whatever `gameMode` is sent; no format constraint exists server-side |

### UI — `CreateLeagueDialog.tsx`
| Item | Status | Gap |
|------|--------|-----|
| Game Mode selector | ⚠️ Wrong options | Shows Standard, Round Robin, Ranked — MVP should show Standard only (or hide selector entirely since there's only one choice) |
| Draft Mode toggle | ⚠️ Remove for MVP | Exposed to user but Phase 2 only — hide at MVP |
| Draft participant bounds logic | ⚠️ Coupled to draft | Inlined `isDraft` checks for min/max — simplifies greatly once draft toggle is hidden |
| No rules fields beyond draft | ❌ Missing | Price cap, pricing model, position matching, squad limit, transfers, chips not exposed in create dialog |

### UI — `LeagueSettingsPage.tsx`
| Item | Status | Gap |
|------|--------|-----|
| Draft card | ⚠️ Remove for MVP | Full draft settings section (Draft Mode, Draft Order, Draft Type, pick timer, scheduled date) — Phase 2 only |
| `priceCapEnabled` + `priceCap` as two separate fields | ⚠️ Simplify | Refactor to single optional numeric field: set a value to cap, leave null for unlimited |
| Pricing model, position matching, squad limit, transfers, chips | ❌ Missing or incomplete | These Classic rules fields are in the schema but partially or not exposed in the settings page |
| No format indicator | ❌ Missing | Settings page should show the league's format prominently |

---

## Changes Required

### 1. DB Schema — add `format` field

Add `format String @default("classic")` to the `League` model. No migration complexity — the default covers all existing rows.

```prisma
model League {
  // ... existing fields ...
  format  String  @default("classic")  // 'classic' | 'draft'
  // ...
}
```

Migration: `npm run db:migrate` → name it `add_league_format`.
No RLS change needed — `leagues` table already has RLS via `tenantId`.

---

### 2. Shared Types — `leagueRulesSchema` + `createLeagueSchema`

**a) Remove `priceCapEnabled`, simplify price cap:**
```typescript
// BEFORE
priceCapEnabled: z.boolean().default(true),
priceCap:        z.number().nullable().default(null),

// AFTER — null means unlimited
priceCap: z.number().positive().nullable().default(null),
```

**b) Add `format` to `createLeagueBaseSchema`:**
```typescript
format: z.enum(['classic', 'draft']).default('classic'),
```

**c) Restrict `gameMode` to MVP-available values and gate RR/Ranked behind format:**
Keep the full enum in `leagueRulesSchema` for schema compatibility, but add a `superRefine` guard in `createLeagueSchema`:
```typescript
.superRefine((data, ctx) => {
  // MVP: only Standard mode available in Classic format
  if (data.format === 'classic' && data.gameMode !== 'standard') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Round Robin and Ranked modes are not yet available.',
      path: ['gameMode'],
    });
  }
  // RR requires Draft format
  if (data.gameMode === 'round-robin' && data.format !== 'draft') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Round Robin requires Draft format.',
      path: ['gameMode'],
    });
  }
  // Existing draft participant min/max
  if (data.format === 'draft') {
    // ... existing draft bounds check, now gated on format ...
  }
});
```

**d) Add `format` to `leagueSchema` (API response shape):**
```typescript
export const leagueSchema = z.object({
  // ...
  format: z.enum(['classic', 'draft']).default('classic'),
  // ...
});
```

---

### 3. Backend — `leagues.ts` router

**a) Pass `format` through on create:**
```typescript
prisma.league.create({
  data: {
    // ...
    format: input.format ?? 'classic',
    // ...
  },
});
```

**b) Derive team budget from `rules.priceCap` on create and join:**
```typescript
// Replace hardcoded 42_000_000
const budget = (input.rules as LeagueRules)?.priceCap ?? 42_000_000;
// Use budget when creating Team rows
```

---

### 4. UI — `CreateLeagueDialog.tsx`

- **Remove** the Draft Mode toggle and all associated draft participant bound logic
- **Remove** Round Robin and Ranked from Game Mode selector (or hide selector entirely and default to Standard — preferred for MVP simplicity)
- **Add** Classic rules fields (see below)
- `format` defaults to `'classic'`, not shown in form — just sent as a hidden value

**Rules fields to add to the create dialog** (simpler subset for creation — detail in Settings):

| Field | Control | Default |
|-------|---------|---------|
| Price Cap | `TextField` type=number, optional, placeholder "No cap" | `null` |
| Pricing Model | `Select` Fixed / Dynamic | `fixed` |

Remaining rules (position matching, squad limit, transfers, chips) are better set in Settings post-creation to keep the creation dialog lean.

---

### 5. UI — `LeagueSettingsPage.tsx`

**Remove:**
- Entire Draft card (Draft Mode switch, Draft Order, Draft Type, pick timer, scheduled date)

**Refactor:**
- Replace `priceCapEnabled` + `priceCap` two-field pattern with a single optional TextField. Empty = unlimited. Value = cap in millions.

**Add — Classic Rules card:**

| Field | Control | Notes |
|-------|---------|-------|
| Price Cap | TextField (optional number) | `null` → "Unlimited" placeholder |
| Pricing Model | Select | Fixed / Dynamic |
| Position Matching | Switch | Off by default |
| Max Players per Real-World Team | TextField (optional number, 1–15) | `null` → no limit |
| Shared Player Pool | Switch | Off by default; show advisory note when on |
| Transfers per Round | TextField (number, 0–15) | Default 3 |
| Wildcard Rounds | TextField (comma-separated round numbers, optional) | Empty = disabled |
| Triple Captain Rounds | TextField (comma-separated, optional) | Empty = disabled |
| Bench Boost Rounds | TextField (comma-separated, optional) | Empty = disabled |

Chips can be grouped under a collapsible "Chips" sub-section if the card gets too long.

**Format indicator:**
Add a read-only `Chip` or `TextField disabled` at the top of the General card showing the league format (e.g. "Classic").

---

## Tasks

### Phase A — Schema & Types (no UI yet)

- [ ] **DB:** Add `format String @default("classic")` to `League` in `schema.prisma`
- [ ] **DB:** Run `npm run db:migrate` from `packages/server/` — name migration `add_league_format`
- [ ] **DB:** Run `npm run db:generate` to regenerate Prisma client
- [ ] **Shared Types:** Remove `priceCapEnabled` from `leagueRulesSchema`; keep `priceCap: z.number().positive().nullable().default(null)`
- [ ] **Shared Types:** Add `format: z.enum(['classic', 'draft']).default('classic')` to `createLeagueBaseSchema` and `leagueSchema`
- [ ] **Shared Types:** Add `superRefine` to `createLeagueSchema` for MVP game mode restriction and format/gameMode consistency (see spec above)
- [ ] **Shared Types:** Gate existing draft participant min/max validation behind `format === 'draft'`
- [ ] **Shared Types:** Add/update tests in `league.schema.test.ts` — confirm Standard+Classic accepted, RR/Ranked rejected, draft bounds only fire for draft format
- [ ] **Shared Types:** Run `npm run test:unit` in `shared-types` — all green

### Phase B — Backend

- [ ] **Router:** Pass `format` from `input.format` (default `'classic'`) through to `prisma.league.create`
- [ ] **Router:** Derive team `budget` from `(input.rules as LeagueRules)?.priceCap ?? 42_000_000` in both `create` and `join` mutations
- [ ] **Router:** Verify `list` and `getById` return `format` field in response (Prisma auto-selects all columns)
- [ ] **Router:** Add `format` to `updateLeagueSchema` as optional (so existing update flow doesn't break)

### Phase C — CreateLeagueDialog

- [ ] Remove Draft Mode `FormControlLabel` and all `isDraft`/`isDraftMode` branching
- [ ] Remove Round Robin and Ranked `MenuItem`s from Game Mode `Select` (or remove the selector entirely and hardcode `standard`)
- [ ] Remove draft-specific `maxParticipants` bounds logic — simplify to standard min
- [ ] Add Price Cap `TextField` (optional, numeric, placeholder "No cap — leave blank")
- [ ] Add Pricing Model `Select` (fixed / dynamic)
- [ ] Pass `format: 'classic'` in form draft (store update) and ensure it reaches the mutation
- [ ] Update Storybook story for `CreateLeagueDialog` — remove draft story, add cap/pricing stories

### Phase D — LeagueSettingsPage

- [ ] Remove Draft `Card` section entirely (~ lines 229–340 in current file)
- [ ] Replace `priceCapEnabled` Switch + `priceCap` TextField pair with single optional TextField (empty = unlimited)
- [ ] Add Classic Rules card with all fields from the table above
- [ ] Implement `patchRules` calls for each new field
- [ ] Add format read-only display to General card header area
- [ ] Ensure `canEdit` disabled state applies correctly to all new fields
- [ ] Update Storybook story for `LeagueSettingsPage`

### Phase E — QA & Cleanup

- [ ] End-to-end smoke test: create league → set rules → activate league → join as second user → verify budget derived from price cap
- [ ] Verify locked state (active/completed league): all new rule fields read-only
- [ ] Verify non-creator view: all fields read-only
- [ ] `npm run build` in both `packages/ui` and `packages/server` — no type errors
- [ ] Remove any stale references to `priceCapEnabled` across the codebase (`grep -r priceCapEnabled packages/`)
- [ ] Update `PRODUCT.md` to reflect MVP scope decisions

---

## Acceptance Criteria

- [ ] Creating a league stores `format: 'classic'` and the correct `rules` blob
- [ ] `priceCap=null` is stored and UI displays "Unlimited" — no `priceCapEnabled` field exists in schema or DB
- [ ] Round Robin and Ranked are not selectable at league creation — schema and UI both reject them
- [ ] Draft Mode toggle does not appear in CreateLeagueDialog or LeagueSettingsPage
- [ ] All Classic rules (pricing model, cap, position matching, squad limit, shared pool, transfers, chips) are configurable in LeagueSettingsPage
- [ ] Team budget on creation and join equals `rules.priceCap` if set, or `42_000_000` if null
- [ ] Rules are locked (read-only) once league status moves from `draft` to `active`
- [ ] Non-creators see all settings as read-only
- [ ] All `league.schema.test.ts` tests pass
- [ ] No TypeScript errors (`strict: true`)
- [ ] No `priceCapEnabled` references remain in the codebase

---

## Recorded Product Decisions

| # | Decision | Outcome |
|---|----------|---------|
| 1 | Format concept | ✅ Adopt Classic / Draft formats. Classic only at MVP. |
| 2 | Draft Mode in MVP | ✅ Defer to Phase 2. |
| 3 | Ranked Mode in MVP | ✅ Defer to Phase 2. |
| 4 | Round Robin game mode | ✅ Requires Draft — defer to Phase 2. Standard only at MVP. |
| 5 | Price cap UX | ✅ `priceCap=null` means unlimited. Remove `priceCapEnabled` toggle. |

---

## Phase 2 Notes (out of scope here, for future plans)

- **Draft + Round Robin spec:** Plan together. Requires WebSocket draft room, pick timers, auto-pick, waiver wire, and H2H matchup pairing engine.
- **Ranked spec:** Plan separately. Requires ELO rating system and cross-league matchmaking. Classic format only.
- **Dynamic pricing:** Requires pricing engine and real-world performance data feed. Classic format only.
