/**
 * Scoring Utility
 *
 * Calculates fantasy points from ScoringEvent rows.
 * Used by gameweek.finaliseRound and gameweek.recalculateLive.
 */

// Interface for round data
interface RoundData {
  id: number;
  roundNumber: number;
}

// Interface for snapshot data
interface SnapshotData {
  id: number;
  tenantId: string;
  teamId: number;
  leagueId: number;
  roundId: number;
  playerId: number;
  position: string;
}

// Interface for scoring event data
interface ScoringEventData {
  id: number;
  tenantId: string;
  playerId: number;
  roundId: number;
  eventType: string;
  points: number;
}

// Interface for team data
interface TeamData {
  id: number;
}

/**
 * Mapping from player_round_stats.json field names to scoring rule keys.
 * The JSON uses camelCase, but scoring rules use short codes.
 */
export const STAT_FIELD_TO_RULE_KEY: Record<string, string> = {
  tries: 'T',
  tryAssists: 'TA',
  assists: 'TA', // alias
  conversions: 'C',
  conversionsMissed: 'CM',
  penaltyGoals: 'PG',
  penalties: 'PG', // alias
  penaltyGoalsMissed: 'PGM',
  dropGoals: 'DG',
  dropGoalsMissed: 'DGM',
  kick5022: 'K_50_22',
  yellowCards: 'YC',
  redCards: 'RC',
  turnoversWon: 'TW',
  turnovers: 'TW', // alias
  interceptions: 'I',
  lineoutsWon: 'LT',
  lineoutsStolen: 'LS',
  lineoutsLost: 'LE',
  tackles: 'TK',
  tacklesMissed: 'MT',
  tackleBreaks: 'TB',
  offloads: 'O',
  linebreaks: 'LB',
  linebreakAssists: 'LC',
  metresGained: 'MG_per10', // Special: floor(value / 10)
  penaltiesConceded: 'PC',
  errors: 'E',
  scrumsWon: 'SW',
  defendersBeaten: 'TB', // treated same as tackle breaks
};

/**
 * Scoring rules for super-2026 tenant.
 * Maps scoring rule keys to point values.
 */
export const SUPER_2026_SCORING_RULES: Record<string, number> = {
  T: 15,      // Try
  TA: 9,      // Try Assist
  C: 2,       // Conversion
  CM: -1,     // Conversion Missed
  PG: 3,      // Penalty Goal
  PGM: -1,    // Penalty Goal Missed
  DG: 3,      // Drop Goal
  DGM: -1,    // Drop Goal Missed
  K_50_22: 10, // 50/22 Kick
  YC: -5,     // Yellow Card
  RC: -10,    // Red Card
  TW: 4,      // Turnover Won
  I: 5,       // Interception
  LT: 1,      // Lineout Won (Throw)
  LS: 5,      // Lineout Stolen
  LE: -2,     // Lineout Lost (Error)
  TK: 1,      // Tackle
  MT: -1,     // Missed Tackle
  TB: 2,      // Tackle Break
  O: 2,       // Offload
  LB: 7,      // Linebreak
  LC: 5,      // Linebreak Created (Assist)
  MG_per10: 1, // Metres Gained per 10m
  PC: -1,     // Penalty Conceded
  E: -1,      // Error
  SW: 3,      // Scrum Won
};

/**
 * Calculate points for a single stat value using the scoring rules.
 */
export function calculateStatPoints(
  statField: string,
  value: number,
  scoringRules: Record<string, number>
): number {
  const ruleKey = STAT_FIELD_TO_RULE_KEY[statField];
  if (!ruleKey) return 0;

  const pointsPerUnit = scoringRules[ruleKey];
  if (pointsPerUnit === undefined) return 0;

  // Special handling for metres gained (floor(value / 10))
  if (ruleKey === 'MG_per10') {
    return Math.floor(value / 10) * pointsPerUnit;
  }

  return value * pointsPerUnit;
}

/**
 * Calculate round points for all teams in a tenant.
 *
 * Algorithm:
 * 1. Load TeamPlayerSnapshot rows for (tenantId, roundId) grouped by teamId
 * 2. For each team: sum ScoringEvent.points WHERE playerId IN (snapshot playerIds) AND roundId
 * 3. Update Team.points = recalculate season total by summing across ALL complete rounds
 * 4. Update Player.totalPoints, lastRoundPoints, avgPoints for affected players
 * 5. All writes in a single $transaction
 *
 * @returns Count of teams and players updated
 */
export async function calculateRoundPoints(
  // Using any to support both PrismaClient and transaction clients with extensions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  tenantId: string,
  roundId: number
): Promise<{ teamsUpdated: number; playersUpdated: number }> {
  // Get all complete rounds for this tenant (for cumulative team points)
  const completeRounds: RoundData[] = await prisma.round.findMany({
    where: {
      tenantId,
      status: 'complete',
    },
    select: { id: true, roundNumber: true },
  });

  const completeRoundIds = new Set<number>(completeRounds.map((r: RoundData) => r.id));

  // Also include the round we're calculating (in case it's not marked complete yet)
  completeRoundIds.add(roundId);

  const completeRoundIdArray = Array.from(completeRoundIds);

  // Load ALL snapshots for complete rounds upfront (avoids N+1)
  const allSnapshots: SnapshotData[] = await prisma.teamPlayerSnapshot.findMany({
    where: {
      tenantId,
      roundId: { in: completeRoundIdArray },
    },
  });

  // Group snapshots by teamId and roundId
  const snapshotsByTeamAndRound = new Map<string, SnapshotData[]>();
  for (const snapshot of allSnapshots) {
    const key = `${snapshot.teamId}:${snapshot.roundId}`;
    const existing = snapshotsByTeamAndRound.get(key) ?? [];
    existing.push(snapshot);
    snapshotsByTeamAndRound.set(key, existing);
  }

  // Load ALL scoring events for complete rounds upfront (avoids N+1)
  const allScoringEvents: ScoringEventData[] = await prisma.scoringEvent.findMany({
    where: {
      tenantId,
      roundId: { in: completeRoundIdArray },
    },
  });

  // Group scoring events by playerId and roundId
  const eventsByPlayerAndRound = new Map<string, ScoringEventData[]>();
  const eventsByPlayer = new Map<number, ScoringEventData[]>();
  for (const event of allScoringEvents) {
    // Group by player+round
    const key = `${event.playerId}:${event.roundId}`;
    const existingByRound = eventsByPlayerAndRound.get(key) ?? [];
    existingByRound.push(event);
    eventsByPlayerAndRound.set(key, existingByRound);

    // Group by player only
    const existingByPlayer = eventsByPlayer.get(event.playerId) ?? [];
    existingByPlayer.push(event);
    eventsByPlayer.set(event.playerId, existingByPlayer);
  }

  // Calculate points per player per round
  const playerRoundPoints = new Map<string, number>();
  for (const [key, events] of eventsByPlayerAndRound) {
    const totalPoints = events.reduce((sum: number, e: ScoringEventData) => sum + e.points, 0);
    playerRoundPoints.set(key, totalPoints);
  }

  // Get all teams in this tenant
  const teams: TeamData[] = await prisma.team.findMany({
    where: { tenantId },
    select: { id: true },
  });

  // Calculate cumulative team points across all complete rounds
  const teamCumulativePoints = new Map<number, number>();

  for (const team of teams) {
    let cumulativePoints = 0;

    for (const rId of completeRoundIdArray) {
      const snapshotKey = `${team.id}:${rId}`;
      const teamSnapshots = snapshotsByTeamAndRound.get(snapshotKey) ?? [];

      for (const snapshot of teamSnapshots) {
        const pointsKey = `${snapshot.playerId}:${rId}`;
        cumulativePoints += playerRoundPoints.get(pointsKey) ?? 0;
      }
    }

    teamCumulativePoints.set(team.id, cumulativePoints);
  }

  // Calculate player stats using already-loaded events
  const playerStats = new Map<
    number,
    { totalPoints: number; avgPoints: number; lastRoundPoints: number }
  >();

  for (const [playerId, events] of eventsByPlayer) {
    const totalPoints = events.reduce((sum: number, e: ScoringEventData) => sum + e.points, 0);

    // Calculate rounds played using unique roundIds (not roundNumber to avoid RLS issues)
    const roundsPlayed = new Set(events.map((e: ScoringEventData) => e.roundId)).size;

    const avgPoints = roundsPlayed > 0 ? totalPoints / roundsPlayed : 0;

    // Last round points = points from the specified round
    const lastRoundEvents = events.filter((e: ScoringEventData) => e.roundId === roundId);
    const lastRoundPoints = lastRoundEvents.reduce((sum: number, e: ScoringEventData) => sum + e.points, 0);

    playerStats.set(playerId, {
      totalPoints,
      avgPoints: Math.round(avgPoints * 100) / 100, // Round to 2 decimal places
      lastRoundPoints,
    });
  }

  // Helper to validate finite numbers
  const toFiniteNumber = (value: number, label: string): number => {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid ${label} value generated during round scoring`);
    }
    return value;
  };

  // Helper to build VALUES clause for raw SQL
  const buildValuesClause = (rows: number[][]): string =>
    rows.map((row) => `(${row.join(', ')})`).join(', ');

  const teamRows = Array.from(teamCumulativePoints.entries()).map(([teamId, points]) => [
    teamId,
    toFiniteNumber(points, 'team points'),
  ]);

  const playerRows = Array.from(playerStats.entries()).map(([playerId, stats]) => [
    playerId,
    toFiniteNumber(stats.totalPoints, 'player totalPoints'),
    toFiniteNumber(stats.avgPoints, 'player avgPoints'),
    toFiniteNumber(stats.lastRoundPoints, 'player lastRoundPoints'),
  ]);

  // Execute all updates in a transaction using set-based SQL to avoid per-row update overhead
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.$transaction(async (tx: any) => {
    if (teamRows.length > 0) {
      const teamValuesClause = buildValuesClause(teamRows);

      await tx.$executeRawUnsafe(`
        UPDATE "teams" AS t
        SET "points" = v.points
        FROM (VALUES ${teamValuesClause}) AS v(id, points)
        WHERE t."id" = v.id
      `);
    }

    if (playerRows.length > 0) {
      const playerValuesClause = buildValuesClause(playerRows);

      await tx.$executeRawUnsafe(`
        UPDATE "players" AS p
        SET
          "totalPoints" = v."totalPoints",
          "avgPoints" = v."avgPoints",
          "lastRoundPoints" = v."lastRoundPoints"
        FROM (VALUES ${playerValuesClause}) AS v(id, "totalPoints", "avgPoints", "lastRoundPoints")
        WHERE p."id" = v.id
      `);
    }
  });

  return {
    teamsUpdated: teamCumulativePoints.size,
    playersUpdated: playerStats.size,
  };
}
