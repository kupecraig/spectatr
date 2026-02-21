# Common Fantasy Sports Architecture Patterns Research

Architectural patterns used by production fantasy sports platforms (ESPN Fantasy, FPL, DraftKings) that should be considered for Spectatr.

## Core Patterns for MVP

### 1. Gameweek/Round State Management

**Current Round Singleton Pattern:**
```sql
CREATE TABLE gameweek_state (
  id INT PRIMARY KEY CHECK (id = 1), -- Only one row allowed
  current_round INT NOT NULL,
  status TEXT CHECK (status IN ('pre_round', 'active', 'locked', 'processing', 'complete')),
  deadline TIMESTAMP NOT NULL,
  next_round_starts TIMESTAMP
);
```

**Why:** Single source of truth for "what round is it?" Used in every query (player locks, transfers, scoring)

**State Transitions:**
- `pre_round` → Users can edit teams freely
- `active` → First match kicked off, some players locked
- `locked` → All matches started, no changes allowed
- `processing` → Calculating points (read-only)
- `complete` → Round finished, view-only mode

### 2. Points Breakdown and Event Sourcing

**Granular Scoring Events:**
```sql
CREATE TABLE scoring_events (
  id SERIAL PRIMARY KEY,
  player_id INT,
  match_id INT,
  round_id INT,
  event_type TEXT, -- 'try', 'conversion', 'penalty', 'yellow_card', 'minutes_played'
  points INT,
  occurred_at TIMESTAMP,
  metadata JSONB -- { "assist_by": 123, "video_url": "..." }
);

-- Materialized view for fast lookup
CREATE MATERIALIZED VIEW player_round_points AS
SELECT 
  player_id,
  round_id,
  SUM(points) as total_points,
  json_agg(json_build_object('type', event_type, 'points', points)) as breakdown
FROM scoring_events
GROUP BY player_id, round_id;
```

**Why Event Sourcing:** 
- Can recalculate points if scoring rules change mid-season
- Provides detailed breakdown: "15 pts from 1 try + 5 tackles"
- Audit trail for disputes

### 3. Audit Trail for Accountability

**Track All User Actions:**
```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INT,
  team_id INT,
  action TEXT, -- 'transfer', 'captain_change', 'chip_used'
  before_state JSONB,
  after_state JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_team ON audit_log(team_id, created_at DESC);
```

**Use Cases:**
- User claims "I picked X but it changed" → Check audit log
- Detect suspicious activity (100 transfers in 1 minute = bot)
- Support tickets reference audit trail

### 4. Multi-Tier Caching Strategy

**Redis Layers:**
```typescript
// Hot data (update every 5-10s)
cache.set('current_round', roundId, { ttl: 10 });
cache.set('players:prices', allPrices, { ttl: 300 }); // 5 min

// Warm data (update every 1-5 min)
cache.set(`player:${id}:stats`, stats, { ttl: 60 });

// Cold data (update on change only)
cache.set('squads:all', squads, { ttl: 86400 }); // 24 hours

// Invalidation strategy
onPlayerUpdate(playerId) {
  cache.del(`player:${playerId}:stats`);
  cache.del('players:prices'); // Bust aggregate cache
}
```

### 5. Rate Limiting by Action Type

**Different Limits per Endpoint:**
```typescript
const rateLimits = {
  '/checksum.json': { window: '1m', max: 120 },
  '/api/players': { window: '1m', max: 60 },
  '/api/transfers': { window: '1m', max: 10 }, // Prevent spam
  '/api/team/save': { window: '10s', max: 3 }  // Prevent rapid-fire saves
};

// Redis-backed sliding window
```

**Bot Detection:**
- Flag teams making transfers every second (inhuman speed)
- Require CAPTCHA after suspicious activity
- Temporary IP ban for automated scraping

## Phase 2 Patterns (After Authentication)

### 6. Transfer System Architecture

**Unlimited vs Limited Transfers:**
```sql
CREATE TABLE transfers (
  id SERIAL PRIMARY KEY,
  team_id INT REFERENCES teams(id),
  round_id INT REFERENCES rounds(id),
  player_in_id INT REFERENCES players(id),
  player_out_id INT REFERENCES players(id),
  cost INT, -- Points penalty if over limit
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT no_duplicate_transfers UNIQUE (team_id, round_id, player_in_id)
);

-- Track transfer quota per team
CREATE TABLE team_state (
  team_id INT PRIMARY KEY,
  transfers_remaining INT DEFAULT 1,
  wildcard_available BOOLEAN DEFAULT true,
  last_transfer_round INT
);
```

**Transfer Rules Enforcement:**
1. Check deadline not passed (`round.deadline > NOW()`)
2. Validate squad after transfer (positions, budget, squad limits)
3. Deduct transfer quota or apply points penalty
4. Atomic transaction (all-or-nothing)

### 7. Captaincy and Multipliers

**Double/Triple Points:**
```sql
CREATE TABLE team_players (
  team_id INT,
  player_id INT,
  round_id INT,
  is_captain BOOLEAN DEFAULT false,
  is_vice_captain BOOLEAN DEFAULT false,
  multiplier DECIMAL DEFAULT 1.0, -- 2.0 for captain, 3.0 for triple captain chip
  PRIMARY KEY (team_id, player_id, round_id)
);
```

**Points Calculation:**
```sql
-- Calculate round score for team
SELECT 
  SUM(p.points * tp.multiplier) as total_points
FROM team_players tp
JOIN players p ON p.id = tp.player_id
WHERE tp.team_id = $1 AND tp.round_id = $2;
```

### 8. Historical Data and Rankings

**Track Everything for Stats:**
```sql
CREATE TABLE team_round_history (
  team_id INT,
  round_id INT,
  points INT,
  total_points INT, -- Running total
  rank INT, -- Overall rank
  transfers_made INT,
  transfers_cost INT, -- Points deducted
  PRIMARY KEY (team_id, round_id)
);

-- Efficient rank calculation with window functions
UPDATE team_round_history SET rank = subq.rank
FROM (
  SELECT team_id, RANK() OVER (ORDER BY total_points DESC) as rank
  FROM teams
) subq
WHERE team_round_history.team_id = subq.team_id;
```

### 9. Ownership and Differentials

**Track Selection Popularity:**
```sql
CREATE MATERIALIZED VIEW player_ownership AS
SELECT 
  player_id,
  COUNT(DISTINCT team_id) as selected_by,
  COUNT(DISTINCT team_id) * 100.0 / (SELECT COUNT(*) FROM teams) as ownership_pct
FROM team_players
WHERE round_id = (SELECT current_round FROM gameweek_state)
GROUP BY player_id;

-- Refresh every 5 minutes
REFRESH MATERIALIZED VIEW CONCURRENTLY player_ownership;
```

**Show Users:** "Owned by 42.3% of teams" to identify differentials (low ownership, high potential)

## Phase 3 Patterns (Advanced Features)

### 10. Dynamic Pricing Engine

**Price Change Algorithm (FPL-style):**
```typescript
// Run nightly job
async function updatePlayerPrices() {
  const players = await getPlayersWithOwnership();
  
  for (const player of players) {
    const netTransfers = player.transfersIn - player.transfersOut;
    const threshold = calculateThreshold(player.ownership); // Higher ownership = harder to change
    
    if (netTransfers > threshold) {
      player.cost += 100000; // £0.1M increase
      player.priceChangeHistory.push({ round, change: +0.1 });
    } else if (netTransfers < -threshold) {
      player.cost -= 100000;
    }
  }
  
  // Trigger player checksum update
}
```

**Selling Price Logic:**
- User buys at 10.0M, price rises to 10.5M
- User can sell at 10.2M (capture half the profit)
- Prevents price manipulation via cycling

### 11. Auto-Substitution System

**Bench Logic:**
```sql
CREATE TABLE team_players (
  -- ... existing columns
  position_order INT, -- 1-11 starting, 12-15 bench
  auto_sub_priority INT -- 1 = first sub, 2 = second, etc
);
```

**Auto-Sub Rules (run after matches complete):**
1. If starting player didn't play (minutes = 0)
2. Find highest priority bench player at valid position
3. Swap if formation stays valid (min/max per position)
4. Apply substituted player's points
5. Log substitution in audit trail

### 12. Wildcard/Chips System

**Special Mechanics:**
```sql
CREATE TABLE chips (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE, -- 'wildcard', 'bench_boost', 'triple_captain', 'free_hit'
  description TEXT,
  max_uses INT -- 1 or 2 per season
);

CREATE TABLE team_chips_used (
  team_id INT,
  chip_id INT,
  round_id INT,
  PRIMARY KEY (team_id, chip_id, round_id)
);
```

**Chip Effects:**
- **Wildcard:** Unlimited free transfers for one gameweek
- **Bench Boost:** All 15 players score (not just starting 11)
- **Triple Captain:** 3x points instead of 2x
- **Free Hit:** Temporary squad for one week, reverts after

### 13. Fixture Difficulty Rating (FDR)

**Help Users Plan Transfers:**
```sql
CREATE TABLE fixtures (
  id SERIAL PRIMARY KEY,
  home_squad_id INT,
  away_squad_id INT,
  round_id INT,
  difficulty_home INT, -- 1 (easy) to 5 (hard)
  difficulty_away INT
);

-- Calculate based on opponent strength
UPDATE fixtures SET 
  difficulty_home = CASE 
    WHEN away_squad.avg_goals_conceded < 1.0 THEN 5
    WHEN away_squad.avg_goals_conceded < 1.5 THEN 4
    ELSE 3
  END;
```

**Frontend Shows:** Next 5 fixtures with color-coded difficulty

## Background Jobs Architecture

### Scheduled Workers (BullMQ)

**Job types and schedules:**
```typescript
const jobs = {
  'lock-players': { cron: '* * * * *' }, // Every minute
  'update-scores': { cron: '*/5 * * * *' }, // Every 5 min during matches
  'calculate-bonus': { cron: '0 * * * *' }, // Hourly
  'update-prices': { cron: '0 2 * * *' }, // 2am daily
  'process-auto-subs': { cron: '0 */6 * * *' }, // Every 6 hours
  'refresh-rankings': { cron: '*/10 * * * *' }, // Every 10 min
  'send-deadline-reminders': { cron: '0 9,18 * * *' } // 9am, 6pm
};
```

**Job Idempotency:** Always check if work already done (prevent double-processing)

## Data Consistency & Validation

### Background Validation Jobs

**Find Invalid Squads:**
```sql
-- Find squads with wrong player count, over budget, etc.
SELECT team_id, COUNT(*) as player_count, SUM(cost) as total_cost
FROM team_players tp
JOIN players p ON p.id = tp.player_id
WHERE tp.round_id = (SELECT current_round FROM gameweek_state)
GROUP BY team_id
HAVING COUNT(*) != 15 OR SUM(cost) > 42000000;
```

**Auto-Healing:** Email user "Your squad is invalid, please fix by deadline"

## Deployment Patterns

### Blue-Green Deployments

**Zero-downtime updates:**
- Deploy new version alongside old
- Switch traffic when healthy
- Rollback instantly if issues

### Database Migrations

**Always backward compatible:**
- Phase 1: Add column (nullable)
- Phase 2: Deploy code
- Phase 3: Backfill data
- Phase 4: Enforce NOT NULL
- Never break running code!

### Feature Flags

```sql
CREATE TABLE feature_flags (
  name TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  rollout_pct INT DEFAULT 0 -- Gradual rollout to X% of users
);
```

**Use for:** 
- Testing new chips on 10% of users
- A/B testing scoring rules
- Emergency kill switches

## Implementation Phases

### MVP (Phase 1 - Current Plan)
✅ Gameweek state management
✅ Player locking
✅ Points breakdown (basic)
✅ Audit trail
✅ Rate limiting
✅ Caching strategy
✅ Checksum polling

### Phase 2 (After Authentication)
- Transfer system
- Captaincy
- Historical tracking
- Rankings
- Ownership percentages

### Phase 3 (Advanced Features)
- Dynamic pricing
- Auto-substitutions
- Wildcards/chips
- Fixture difficulty rating
- Advanced analytics

## Key Takeaways

1. **Event Sourcing for Points** - Store individual scoring events, not just totals
2. **Single Source of Truth** - Gameweek state table drives everything
3. **Audit Everything** - Users will dispute changes, you need proof
4. **Cache Aggressively** - But invalidate precisely when data changes
5. **Rate Limit by Action** - Different limits for different endpoint sensitivity
6. **Background Jobs** - Use reliable queue (BullMQ) with idempotency
7. **Backward Compatible Migrations** - Never break running code
8. **Feature Flags** - Test on small % before full rollout

## Resources

**Inspiration from Production Sites:**
- Fantasy Premier League (FPL) - Industry leader, 11M+ users
- ESPN Fantasy - Multi-sport platform
- DraftKings - Real-money daily fantasy
- Yahoo Fantasy - Long-standing platform

**All use similar patterns: PostgreSQL + Redis + checksum/polling + event sourcing**
