# Spectatr - Data Model

This document describes the core data entities and their relationships in the Spectatr platform.

## Tenant vs League Hierarchy

**Critical Distinction:**
- **Tenant** = Sport competition instance (e.g., `trc-2025`, `svns`, `nba`)
  - Separate database scope, independent player pools
  - Configured via subdomain or environment variable
  - Examples: The Rugby Championship 2025, SVNS Series, NBA Season

- **League** = User-created group within a tenant (e.g., `family-league`, `office-league`)
  - Shares tenant's player pool and competition data
  - Users create/join leagues to compete within a tenant
  - Examples: Family League, Office League, Friends League

**Hierarchy:**
```
Tenant (trc-2025)
  └─ League (family-league)
      └─ Team (Craig's Team)
          └─ Players (selected from trc-2025 pool)
```

## Entity Relationship Overview

```
Tenant (competition instance)
  ↓ (1:many)
User (global, can participate in multiple tenants)
  ↓ (1:many)
Leagues ← User (creator)
  ↓ (1:many)
Teams → User (owner)
  ↓ (1:many)
Players → Squad (real-world team)

League → Rules (configurable settings)
League ← Users (many participants)
```

## Core Entities

### User

Represents a platform user who can create and participate in leagues.

**Relationships:**
- Has many **Leagues** (as creator)
- Belongs to many **Leagues** (as participant)
- Has many **Teams** through Leagues
- Can CRUD (Create, Read, Update, Delete) Leagues
- Can CRUD Teams

**Attributes:**
- `id` - Unique identifier
- `email` - User email address
- `username` - Display name
- `avatar` - Profile image URL
- `createdAt` - Account creation timestamp
- `preferences` - User preferences (theme, notifications, etc.)

**Example:**
```typescript
interface User {
  id: number;
  email: string;
  username: string;
  avatar?: string;
  createdAt: Date;
  preferences: UserPreferences;
}
```

### League

Represents a fantasy league with custom rules and multiple participants.

**Relationships:**
- Belongs to **User** (creator/admin)
- Has many **Users** (participants)
- Has many **Teams**
- Has many **Rules** (configurable settings)

**Attributes:**
- `id` - Unique identifier
- `name` - League name
- `creatorId` - User ID of league creator
- `sportType` - Sport type (rugby, soccer, cricket, etc.)
- `gameMode` - Standard, Round Robin, or Ranked
- `season` - Season identifier (e.g., "2026")
- `status` - Draft, Active, Completed
- `startDate` - League start date
- `endDate` - League end date
- `maxParticipants` - Maximum number of participants
- `isPublic` - Public or private league
- `inviteCode` - Shareable invite code

**Example:**
```typescript
interface League {
  id: number;
  name: string;
  creatorId: number;
  sportType: 'rugby' | 'soccer' | 'cricket';
  gameMode: 'standard' | 'round-robin' | 'ranked';
  season: string;
  status: 'draft' | 'active' | 'completed';
  startDate: Date;
  endDate: Date;
  maxParticipants: number;
  isPublic: boolean;
  inviteCode: string;
}
```

### Team

Represents a user's team within a specific league.

**Relationships:**
- Belongs to **User** (owner)
- Belongs to **League**
- Has many **Players** (selected squad)

**Attributes:**
- `id` - Unique identifier
- `name` - Team name
- `userId` - Owner's user ID
- `leagueId` - League ID
- `budget` - Available budget (in cents)
- `totalCost` - Total cost of selected players (in cents)
- `points` - Total points scored
- `rank` - Current league rank
- `wins` - Number of wins (Round Robin/Ranked modes)
- `losses` - Number of losses
- `draws` - Number of draws

**Example:**
```typescript
interface Team {
  id: number;
  name: string;
  userId: number;
  leagueId: number;
  budget: number; // in cents
  totalCost: number; // in cents
  points: number;
  rank: number;
  wins: number;
  losses: number;
  draws: number;
}
```

### Player

Represents a real-world player available for selection.

**Relationships:**
- Belongs to **Squad** (real-world team)
- Selected by many **Teams**

**Attributes:**
- `id` - Unique identifier
- `feedId` - External data feed ID
- `squadId` - Real-world team ID (South Africa, Australia, etc.)
- `firstName` - Player first name
- `lastName` - Player last name
- `position` - Player position (see Position enum below)
- `cost` - Player cost (in cents)
- `status` - Availability status (available, injured, uncertain, selected)
- `isLocked` - Whether player is locked for gameweek
- `stats` - Player statistics (see PlayerStats below)
- `selected` - Selection percentage (% of users who selected this player)
- `imagePitch` - Jersey image URL for field view
- `imageProfile` - Headshot image URL for profile view

**Example:**
```typescript
interface Player {
  id: number;
  feedId: number;
  squadId: number;
  firstName: string;
  lastName: string;
  position: PlayerPosition;
  cost: number; // in cents (10000000 = $10M)
  status: 'available' | 'injured' | 'uncertain' | 'selected';
  isLocked: boolean;
  stats: PlayerStats;
  selected: PlayerSelected;
  imagePitch: string; // "image/trc/pitch/28160.png"
  imageProfile: string; // "image/trc/profile/28160.png"
}

interface PlayerStats {
  points: number;
  gamesPlayed: number;
  averagePoints: number;
  form: number[]; // Last 5 game scores
  // Sport-specific stats (tries, tackles, etc.)
}

interface PlayerSelected {
  percentage: number; // 0-100
  count: number;
}
```

### Squad (Real-World Team)

Represents a real-world sports team (e.g., South Africa, Australia, New Zealand).

**Note:** Referred to as "Squad" throughout the UI (not "Nation" or "Team").

**Relationships:**
- Has many **Players**

**Attributes:**
- `id` - Unique identifier
- `name` - Team name
- `shortName` - Abbreviated name
- `backgroundColor` - Team color for visual distinction
- `logo` - Team logo URL
- `country` - Country/region

**Example:**
```typescript
interface Squad {
  id: number;
  name: string; // "South Africa"
  shortName: string; // "RSA"
  backgroundColor: string; // "#006400"
  logo: string; // "squads/south-africa.png"
  country: string;
}
```

### Rules (League Rules)

Configurable settings that define how a league operates.

**Relationships:**
- Belongs to **League**

**Rule Types:**

1. **Draft Mode**
   - `enabled: boolean`
   - Turn-based player selection, shared pool

2. **Pricing Model**
   - `type: 'fixed' | 'dynamic'`
   - Fixed: Prices stay constant
   - Dynamic: Prices change based on performance

3. **Price Cap**
   - `cap: number` (in cents)
   - Budget limit (e.g., 42M for rugby)

4. **Position Matching**
   - `enabled: boolean`
   - Players must match position from last game

5. **Squad Limits**
   - `maxPlayersPerSquad: number`
   - Max players from same real-world team (e.g., max 3 from South Africa)

6. **Shared Pool**
   - `enabled: boolean`
   - Players available to all teams (default: false)

**Example:**
```typescript
interface LeagueRules {
  id: number;
  leagueId: number;
  draftMode: boolean;
  pricingModel: 'fixed' | 'dynamic';
  priceCap: number; // in cents
  positionMatching: boolean;
  maxPlayersPerSquad: number;
  sharedPool: boolean;
}
```

### SportSquadConfig

Sport-specific constraints that define squad composition rules.

**Note:** These are **not per-league** - they define the fundamental structure of each sport.

**Attributes:**
- `sportType` - Sport identifier (rugby, soccer, cricket)
- `maxSquadSize` - Maximum players in a squad (15 for rugby, 11 for soccer)
- `positions` - Array of position definitions
- `defaultBudget` - Default budget cap for this sport
- `fieldLayout` - Field visualization configuration

**Example:**
```typescript
interface SportSquadConfig {
  sportType: 'rugby' | 'soccer' | 'cricket';
  maxSquadSize: number;
  positions: PositionDefinition[];
  defaultBudget: number; // in cents
  fieldLayout: FieldLayout;
}

interface PositionDefinition {
  type: PlayerPosition;
  label: string;
  min: number; // Minimum required
  max: number; // Maximum allowed
}

// Rugby example
const rugbySportConfig: SportSquadConfig = {
  sportType: 'rugby',
  maxSquadSize: 15,
  defaultBudget: 42000000, // 42M
  positions: [
    { type: 'outside_back', label: 'Outside Back', min: 3, max: 3 },
    { type: 'center', label: 'Center', min: 2, max: 2 },
    { type: 'fly_half', label: 'Fly Half', min: 1, max: 1 },
    { type: 'scrum_half', label: 'Scrum Half', min: 1, max: 1 },
    { type: 'back_row', label: 'Back Row', min: 3, max: 3 },
    { type: 'lock', label: 'Lock', min: 2, max: 2 },
    { type: 'prop', label: 'Prop', min: 2, max: 2 },
    { type: 'hooker', label: 'Hooker', min: 1, max: 1 },
  ],
  fieldLayout: { /* field config */ }
};
```

## Position Types

### Rugby Union

```typescript
type PlayerPosition = 
  | 'outside_back'  // Fullback, wings
  | 'center'        // Inside/outside center
  | 'fly_half'      // 10
  | 'scrum_half'    // 9
  | 'back_row'      // Flankers, number 8
  | 'lock'          // Second row
  | 'prop'          // Loosehead, tighthead
  | 'hooker';       // 2
```

### Soccer (Planned)

```typescript
type PlayerPosition = 
  | 'goalkeeper'
  | 'defender'
  | 'midfielder'
  | 'forward';
```

### Cricket (Planned)

```typescript
type PlayerPosition = 
  | 'batsman'
  | 'bowler'
  | 'all_rounder'
  | 'wicket_keeper';
```

## Validation Layers

### Layer 1: SportSquadConfig Validation

Validates squad composition against sport-specific rules:

- Correct number of players per position
- Total squad size within limits
- Budget cap respected

### Layer 2: League Rules Validation

Validates against league-specific constraints:

- Draft mode restrictions
- Position matching rules
- Squad limits per team
- Shared pool availability

**Example Validation Flow:**
```typescript
import { validateSquad } from '@spectatr/shared-types';

const result = validateSquad(squadData);
if (!result.success) {
  // result.errors contains validation issues
  // - Position count errors (too many/few players)
  // - Budget errors (over cap)
  // - League rule errors (max players from same squad)
}
```

## Data Flow Examples

### Creating a Team

1. User creates/joins a **League**
2. User creates a **Team** within that League
3. User selects **Players** for their Team
4. Validation runs:
   - SportSquadConfig: Check position requirements, budget
   - League Rules: Check squad limits, pricing model constraints
5. Team is saved with selected players

### Weekly Scoring (Planned)

1. Real-world match occurs
2. Player performances updated via data feed
3. **Player** stats updated (points, form, etc.)
4. **Team** points recalculated based on selected players
5. **League** standings updated
6. Users notified of score changes (WebSocket)

### Draft Mode (Planned)

1. **League** with draft mode enabled
2. Draft order determined (random, snake, manual)
3. Users take turns selecting **Players**
4. Selected players removed from available pool
5. Validation ensures no duplicate selections
6. **Teams** built sequentially until all positions filled

## Database Schema Notes (Planned)

### Relationships

- User ↔ League: Many-to-many (user_leagues junction table)
- League → Rules: One-to-one (rules embedded or separate table)
- Team → Player: Many-to-many (team_players junction table with gameweek)
- Player → Squad: Many-to-one

### Indexes

- Player: `squadId`, `position`, `cost`
- Team: `userId`, `leagueId`
- League: `creatorId`, `sportType`, `status`

### Constraints

- Team budget cannot exceed price cap
- Position counts must match sport config
- Max players per squad enforced at DB level

---

For more details on validation, see [ARCHITECTURE.md](../ARCHITECTURE.md#validation-architecture).
