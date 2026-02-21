# Spectatr - Product Vision

## Overview

Multi-sport fantasy sports platform enabling users to create, manage, and compete in customizable leagues. Initially rugby union, designed for easy extension to soccer, cricket, American football, basketball.

**Key Differentiators:** Multi-sport architecture, customizable leagues, multiple game modes, per-instance theming, real-time scoring/drafts.

## Multi-Sport Architecture

### Tenant vs League (Important Distinction)

**Tenant** (Sport Competition):
- Represents a specific sport competition or season
- Examples: `trc-2025` (The Rugby Championship 2025), `svns` (Sevens World Series), `a-league`, `nba`, `nfl`
- Separate database scope, independent player pools, distinct branding
- Users can participate in multiple tenants (e.g., play both TRC and SVNS)

**League** (User Group):
- User-created group within a tenant
- Examples: `family-league`, `office-league`, `mates-league`
- Shares the tenant's player pool and competition data
- Multiple leagues compete using the same players within a tenant

**Hierarchy:** `Tenant → League → Team → Players`

### Sport-Agnostic Design
- JSON-configured field layouts (flexbox positioning)
- Sport-specific squad configs (positions, counts, budgets)
- Per-tenant themes and rules
- Extension via configuration files (no code changes)

**Currently:** Rugby Union (15 players, 8 positions)  
**Planned:** Soccer, Cricket, American Football, Basketball

### Tenant Customization
Each tenant independently configurable:
- Sport selection, theme (colors, logos, backgrounds), default rules, branding

**Examples:**
- `trc-2025` - Green field, rugby rules, 15-player squads
- `premier-league` - Soccer theme, 11 players, goalkeeper required

## Game Modes

### 1. Standard Mode
Classic league, most points wins. Individual competition, weekly/season scoring, public/private leagues.

**Use Case:** Casual players, large public leagues

### 2. Round Robin Mode
Head-to-head weekly matchups with turn-based draft.

**Mechanics:** Weekly H2H, shared player pool (drafted players unavailable to others), standings, playoff bracket

**Use Case:** Friends/colleagues wanting competitive matchups

### 3. Ranked Mode
ELO-based global ranking with H2H matches.

**Mechanics:** Global pool, skill-based matchmaking, ELO rating affected by W/L

**Tiers:** Rookie (0-999) → Squad Player (1000-1499) → Journeyman (1500-1999) → Veteran (2000-2499) → International (2500-2999) → Test Animal (3000+)

**Use Case:** Competitive players seeking progression

## League Configuration

### Multi-League Support
Create/join unlimited leagues with different teams per league.

### Configurable Rules

**1. Draft Mode** (On/Off)  
On: Turn-based selection, shared pool, draft order (random/snake/manual), timer per pick  
Off: Open pool, independent squad building

**2. Pricing Model** (Fixed/Dynamic)  
Fixed: Constant prices  
Dynamic: Performance-based price changes (buy low, sell high strategy)

**3. Price Cap**  
Budget limit (e.g., 42M for rugby)

**4. Position Matching** (On/Off)  
On: Players must match position from last game  
Off: Any eligible position

**5. Squad Limits**  
Max players from same real-world team (e.g., max 3 from South Africa)

**6. Shared Pool** (On/Off, default off)  
On: Players available to all teams  
Off: Each player on one team only (scarcity strategy)

### Sport Squad Configs
**Not league-configurable.** Sport-specific:
- Position requirements (e.g., rugby: 1 hooker, 2 props, 2 locks)
- Max squad size (15 rugby, 11 soccer)
- Default budget caps
- Field layout

**Rugby Example:** 15 players (3 outside-back, 2 center, 1 fly-half, 1 scrum-half, 3 back-row, 2 lock, 2 prop, 1 hooker)

## Validation Strategy

### Two-Layer Validation
**Layer 1 (SportSquadConfig):** Immutable sport definitions (positions, max players, budget)  
**Layer 2 (League Rules):** User-configurable constraints layered on top

**Implementation:** Shared Zod schemas (FE/BE consistency), pure functions, actionable error messages

## Theme System

**Per-Instance Customization:**
- Sport-specific color palettes (field, positions)
- Custom typography variants (playerLabel, fieldLabel, statValue)
- Instance-specific logos/branding

**Current Themes:** Rugby (green field), Light, Dark

**Architecture:**
```
theme/
  tokens/        # palette, typography, spacing, shape, transitions
  components/    # buttons, chips, lists
  instances/     # rugby, light, dark
```

**Custom Components:** PlayerSlot, EmptySlot (theme-token based)

## Key Features

### My Team Page (Current Focus)
Split panel: player list (left) + field viz (right). Filterable/searchable players, budget tracker, position-based slots, add/remove with validation, tab navigation (LIST/SQUAD), state export/import.

### Draft System (Planned)
WebSocket real-time draft rooms, turn-based selection, draft order management, timer per pick, live chat, visual picker indicators.

### Live Scoring (Planned)
Real-time score updates, player performance tracking, auto point calculations, standings updates, push notifications.

### League Management (Planned)
Create/join leagues, configure rules, invite via email/link, view history/stats, manage schedule/playoffs, chat/announcements.

## Data Model

**User** → has many Leagues (created/joined) → has many Teams  
**League** → belongs to User (creator), has many Users (participants), has many Teams, has Rules  
**Team** → belongs to User and League, has many Players, budget tracking  
**Player** → belongs to Squad (real-world team), position, cost, stats, images (pitch/profile)  
**Squad** → real-world team (e.g., South Africa), has team color, referred to as "Squad" in UI  
**SportSquadConfig** → sport-specific constraints (not per-league)  
**LeagueRules** → league-specific configurations

## Future Enhancements

**Sports:** Soccer, Cricket, American Football, Basketball  
**Features:** Mobile app (React Native), social features, achievements, analytics, trades, waiver wire, playoff viz, custom scoring, multi-season with keepers  
**Integrations:** Real-world data APIs, social sharing, payments, aggregator platforms

## Target Audience

**Primary:** Sports fans, casual fantasy players, friend groups  
**Secondary:** Competitive players, league organizers, sports organizations (branded instances)

## Success Metrics

**Engagement:** DAU, WAU, session duration, squad completion rate  
**League Activity:** Active leagues, average size, draft completion, weekly submissions  
**Growth:** Registrations, retention (7/30-day), sport adoption, feature usage
