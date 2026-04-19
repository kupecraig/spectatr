/**
 * Fetch Round Stats Script
 *
 * Fetches per-round player statistics from playfantasyrugby.com API
 * and writes them to data/{tenantId}/player_round_stats.json
 *
 * Reads player list from data/{tenantId}/players.json (not the DB) because:
 *   - The API uses the game's internal player ID (players.json `id` field)
 *   - The DB stores `feedId` which is a different external identifier
 *   - No DB connection or RLS setup needed
 *
 * Usage:
 *   npx tsx packages/server/src/scripts/fetchRoundStats.ts --tenant super-2026
 *
 * The output file is committed to the repo and used by seed.ts to create
 * ScoringEvent rows for each player × round × stat.
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_ROOT = join(__dirname, '../../../../data');

// Delay between API requests (100ms)
const REQUEST_DELAY_MS = 100;

interface PlayerRoundStats {
  feedId: number;
  rounds: Array<{
    roundId: number;
    stats: Record<string, number>;
  }>;
}

/**
 * The API returns an array of round objects, each containing:
 * - tournamentId, roundId, points, avg (metadata)
 * - stats: { T, TA, C, CM, PG, PGM, ... } (abbreviated stat keys)
 */
interface ApiRoundEntry {
  tournamentId: number;
  roundId: number;
  points: number;
  avg: number;
  stats: Record<string, number>;
}

// Map abbreviated API stat keys back to the long camelCase names
// used by STAT_FIELD_TO_RULE_KEY in scoring.ts
const API_KEY_TO_LONG_NAME: Record<string, string> = {
  T: 'tries',
  TA: 'tryAssists',
  C: 'conversions',
  CM: 'conversionsMissed',
  PG: 'penaltyGoals',
  PGM: 'penaltyGoalsMissed',
  DG: 'dropGoals',
  DGM: 'dropGoalsMissed',
  K_50_22: 'kick5022',
  YC: 'yellowCards',
  RC: 'redCards',
  TW: 'turnoversWon',
  TC: 'turnoversWon', // alias in API
  I: 'interceptions',
  LT: 'lineoutsWon',
  LS: 'lineoutsStolen',
  LE: 'lineoutsLost',
  TK: 'tackles',
  MT: 'tacklesMissed',
  TB: 'tackleBreaks',
  O: 'offloads',
  LB: 'linebreaks',
  LC: 'linebreakAssists',
  MG: 'metresGained',
  PC: 'penaltiesConceded',
  E: 'errors',
  SW: 'scrumsWon',
};

/**
 * Fetches player stats from the playfantasyrugby.com API.
 * Uses the game's internal player ID (from players.json `id` field),
 * NOT the feedId stored in the DB.
 */
async function fetchPlayerStats(gameId: number): Promise<ApiRoundEntry[] | null> {
  const url = `https://playfantasyrugby.com/json/fantasy/player_stats/${gameId}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`  ⚠️ No stats found for gameId ${gameId} (404)`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json() as ApiRoundEntry[];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Failed to fetch stats for gameId ${gameId}: ${errorMessage}`);
    return null;
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Convert API response (array of round entries with abbreviated stat keys)
 * to our internal format (long camelCase stat names matching STAT_FIELD_TO_RULE_KEY)
 */
function convertApiStats(apiRounds: ApiRoundEntry[]): Array<{ roundId: number; stats: Record<string, number> }> {
  const rounds: Array<{ roundId: number; stats: Record<string, number> }> = [];

  for (const entry of apiRounds) {
    if (!entry.stats) continue;

    const longStats: Record<string, number> = {};
    for (const [abbrev, value] of Object.entries(entry.stats)) {
      if (typeof value !== 'number') continue;
      const longName = API_KEY_TO_LONG_NAME[abbrev];
      if (longName) {
        longStats[longName] = value;
      }
    }

    if (Object.keys(longStats).length > 0) {
      rounds.push({ roundId: entry.roundId, stats: longStats });
    }
  }

  // Sort by roundId
  rounds.sort((a, b) => a.roundId - b.roundId);

  return rounds;
}

interface SeedPlayer {
  id: number;       // Game's internal ID — used for API calls
  feedId: number;   // External feed ID — stored in DB, used to key output file
  firstName: string;
  lastName: string;
}

const API_BASE = 'https://playfantasyrugby.com/json/fantasy';

/**
 * Fetches the latest players.json from the API and writes it to the data directory.
 * Ensures we have the full, up-to-date player list before fetching per-player stats.
 */
async function fetchAndSavePlayersJson(tenantDir: string): Promise<SeedPlayer[]> {
  const url = `${API_BASE}/players.json`;
  console.log('📥 Fetching latest players.json from API...');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch players.json: HTTP ${response.status}`);
  }

  const players: SeedPlayer[] = await response.json() as SeedPlayer[];
  const outputPath = join(tenantDir, 'players.json');
  writeFileSync(outputPath, JSON.stringify(players, null, 2));
  console.log(`   ✅ Saved ${players.length} players to ${outputPath}\n`);

  return players;
}

async function main() {
  const args = process.argv.slice(2);
  const tenantIdx = args.indexOf('--tenant');
  const tenantId = tenantIdx !== -1 ? args[tenantIdx + 1] : null;

  if (!tenantId) {
    console.error('❌ Usage: npx tsx fetchRoundStats.ts --tenant <tenant-id>');
    console.error('   Example: npx tsx fetchRoundStats.ts --tenant super-2026');
    process.exit(1);
  }

  console.log(`\n🏉 Fetching round stats for tenant: ${tenantId}\n`);

  const tenantDir = join(DATA_ROOT, tenantId);
  if (!existsSync(tenantDir)) {
    mkdirSync(tenantDir, { recursive: true });
  }

  // Fetch latest players.json from the API to ensure we have all players
  const players = await fetchAndSavePlayersJson(tenantDir);
  // Sort by game ID for consistent ordering
  players.sort((a, b) => a.id - b.id);

  console.log(`📋 Processing ${players.length} players for ${tenantId}\n`);

  const allStats: PlayerRoundStats[] = [];
  let fetchedCount = 0;
  let skippedCount = 0;

  for (const player of players) {
    console.log(`  Fetching stats for ${player.firstName} ${player.lastName} (gameId: ${player.id})...`);

    const apiStats = await fetchPlayerStats(player.id);

    if (apiStats) {
      const rounds = convertApiStats(apiStats);
      if (rounds.length > 0) {
        allStats.push({
          feedId: player.feedId,
          rounds,
        });
        fetchedCount++;
        console.log(`    ✅ Got ${rounds.length} rounds of stats`);
      } else {
        skippedCount++;
        console.log(`    ⏭️ No stat data in response`);
      }
    } else {
      skippedCount++;
    }

    // Rate limiting
    await sleep(REQUEST_DELAY_MS);
  }

  // Guard against overwriting good data with empty results
  const outputDir = join(DATA_ROOT, tenantId);
  const outputPath = join(outputDir, 'player_round_stats.json');

  if (allStats.length === 0 && existsSync(outputPath)) {
    console.error(`\n⚠️ No stats fetched — refusing to overwrite existing ${outputPath}`);
    console.error('   Use --force to overwrite anyway.');
    if (!args.includes('--force')) {
      process.exit(1);
    }
  }

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(outputPath, JSON.stringify(allStats, null, 2));

  console.log(`\n📊 Summary:`);
  console.log(`   • Players processed: ${players.length}`);
  console.log(`   • Players with stats: ${fetchedCount}`);
  console.log(`   • Players skipped: ${skippedCount}`);
  console.log(`   • Output file: ${outputPath}\n`);
  console.log(`✅ Done!\n`);
}

try {
  await main();
} catch (error) {
  console.error('❌ Script failed:', error);
  process.exit(1);
}
