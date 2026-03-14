# League Rules Reference

Spectatr leagues are configured via a **Format** + **Game Mode** + a set of **Rules**. Not all combinations are valid — see the compatibility table and release stages below.

---

## Release Stages

| Feature | Stage |
|---------|-------|
| Classic format | ✅ MVP |
| Standard game mode | ✅ MVP |
| All Classic rules (pricing, cap, positions, transfers, chips) | ✅ MVP |
| Round Robin game mode | 🔜 Phase 2 (requires Draft format) |
| Draft format (draft room, waiver wire) | 🔜 Phase 2 |
| Ranked game mode (ELO) | 🔜 Phase 2 (standalone) |

---

## Formats

Format is set at league creation and cannot be changed. It bundles a compatible set of rules and locks out incompatible ones.

| Format | Description | Stage |
|--------|-------------|-------|
| **Classic** | Open pool — managers build squads independently. Supports pricing, cap, transfers, chips. | ✅ MVP |
| **Draft** | Exclusive pool — turn-based draft. Fixed pricing only, no cap, waiver pickups instead of transfers, no chips. | 🔜 Phase 2 |

---

## Game Modes

| Mode | Description | Format | Stage |
|------|-------------|--------|-------|
| **Standard** | All managers compete independently. Most points at season end wins. Min. 2 participants. | Classic | ✅ MVP |
| **Round Robin** | Weekly H2H matchups. Standings based on W/L/D. Requires exclusive pool (draft). Min. 3 participants. | Draft only | 🔜 Phase 2 |
| **Ranked** | ELO-based global skill matchmaking. Cross-league pairings. Tiers: Rookie → Test Animal. Min. 4 participants. | Classic only | 🔜 Phase 2 |

---

## Rules (Classic Format)

### Pricing Model
`fixed` *(default)* | `dynamic`
- **Fixed:** Player prices set at season start, never change.
- **Dynamic:** Prices rise/fall with real-world performance. Enables buy-low sell-high strategy.

### Price Cap
`null` *(no cap, default)* | value in millions
- Hard budget per team. All managers get the same cap. Leave blank (null) for no cap — unlimited spend.

### Position Matching
`off` *(default)* | `on`
- **Off:** Place any player in any eligible slot.
- **On:** Player can only fill the position they played in their last real-world match.

### Max Players per Real-World Team (`squadLimitPerTeam`)
`null` *(no limit, default)* | `1–15`
- Caps how many players from one real-world squad (e.g. South Africa) a manager can hold. Promotes spread.

### Shared Player Pool
`off` *(default)* | `on`
- **Off:** Each player belongs to one team — scarcity applies.
- **On:** Any player can appear on multiple teams simultaneously — no scarcity.
- ⚠️ When `on`, `squadLimitPerTeam` has reduced strategic value.

### Transfers per Round
`0–15` *(default: 3)*
- Free player swaps per round. `0` = changes only via Wildcard chip.

### Chips
Optional round activations — specify which round numbers each chip is available on. Leave empty to disable.

| Chip | Effect |
|------|--------|
| **Wildcard** | Replace entire squad freely in that round, no transfer penalty. |
| **Triple Captain** | Captain scores 3× instead of 2× that round. |
| **Bench Boost** | All bench players' scores count that round. |

---

## Rules (Draft Format — Phase 2)

| Rule | Value | Note |
|------|-------|------|
| Pool | Exclusive | Players drafted one-per-team |
| Pricing Model | Fixed only | No market; draft position is the resource |
| Price Cap | None | Not applicable |
| Transfers | Waiver pickups | Undrafted players only, configurable claims per round |
| Chips | None | Not applicable |
| Draft Type | `snake` \| `linear` | Snake reverses pick order each round |
| Draft Order | `random` \| `ranked` | Initial pick order assignment |
| Time per Pick | 15–300 seconds | Auto-pick triggers on timeout |

---

## Hard Constraints (all formats)

These combinations are always invalid regardless of format:

| Rule A | Rule B | Reason |
|--------|--------|--------|
| Draft format | `sharedPool = true` | Draft already enforces exclusive ownership |
| Draft format | `pricingModel = dynamic` | No marketplace exists in a draft league |
| Draft format | `draftSettings` absent | Draft cannot run without type, timer, and scheduled date |
