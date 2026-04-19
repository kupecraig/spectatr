/**
 * Fetch Round Stats Script
 *
 * Fetches per-round player statistics from playfantasyrugby.com API
 * and writes them to data/{tenantId}/player_round_stats.json
 *
 * Usage:
 *   npx tsx packages/server/src/scripts/fetchRoundStats.ts --tenant super-2026
 *
 * The output file is committed to the repo and used by seed.ts to create
 * ScoringEvent rows for each player × round × stat.
 *
 * NOTE: This script reads player IDs from data/{tenantId}/players.json
 * because the API expects the game's internal player ID (the `id` field in
 * players.json), not the `feedId` stored in the database.
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../env/.env') });

const prisma = new PrismaClient();
const DATA_ROOT = join(__dirname, '../../../../data');

/**
 * Player data from players.json
 * The `id` field is the game's internal ID used by the API
 * The `feedId` field is stored in the database
 */
interface SeedPlayer {
  id: number;      // Game's internal ID - used for API calls
  feedId: number;  // External feed ID - stored in DB
  firstName: string;
  lastName: string;
}

// Delay between API requests (100ms)
const REQUEST_DELAY_MS = 100;

interface PlayerRoundStats {
  feedId: number;
  rounds: Array<{
    roundNumber: number;
    stats: Record<string, number>;
  }>;
}

/**
 * API response format - stats keyed by round number
 */
interface ApiPlayerStats {
  [roundNumber: string]: {
    tries?: number;
    tryAssists?: number;
    conversions?: number;
    conversionsMissed?: number;
    penaltyGoals?: number;
    penaltyGoalsMissed?: number;
    dropGoals?: number;
    dropGoalsMissed?: number;
    kick5022?: number;
    yellowCards?: number;
    redCards?: number;
    turnoversWon?: number;
    interceptions?: number;
    lineoutsWon?: number;
    lineoutsStolen?: number;
    lineoutsLost?: number;
    tackles?: number;
    tacklesMissed?: number;
    tackleBreaks?: number;
    offloads?: number;
    linebreaks?: number;
    linebreakAssists?: number;
    metresGained?: number;
    penaltiesConceded?: number;
    errors?: number;
    scrumsWon?: number;
    defendersBeaten?: number;
  };
}

/**
 * Load players from seed JSON file
 * Returns players sorted by game ID for consistent processing
 */
function loadPlayersFromJson(tenantId: string): SeedPlayer[] {
  const playersPath = join(DATA_ROOT, tenantId, 'players.json');
  
  if (!existsSync(playersPath)) {
    throw new Error(`Players file not found: ${playersPath}`);
  }
  
  const data = readFileSync(playersPath, 'utf-8');
  const players = JSON.parse(data) as SeedPlayer[];
  
  // Sort by game ID for consistent ordering
  return players.sort((a, b) => a.id - b.id);
}

/**
 * Fetches player stats from the playfantasyrugby.com API
 * Uses the game's internal player ID (not feedId)
 */
async function fetchPlayerStats(gameId: number): Promise<ApiPlayerStats | null> {
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
    return await response.json() as ApiPlayerStats;
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
 * Convert API stats format to our internal format
 */
function convertApiStats(apiStats: ApiPlayerStats): Array<{ roundNumber: number; stats: Record<string, number> }> {
  const rounds: Array<{ roundNumber: number; stats: Record<string, number> }> = [];

  for (const [roundNumberStr, stats] of Object.entries(apiStats)) {
    const roundNumber = parseInt(roundNumberStr, 10);
    if (isNaN(roundNumber)) continue;

    // Filter out null/undefined values and keep only finite positive stats
    const filteredStats: Record<string, number> = {};
    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        filteredStats[key] = value;
      }
    }

    if (Object.keys(filteredStats).length > 0) {
      rounds.push({ roundNumber, stats: filteredStats });
    }
  }

  // Sort by roundNumber
  rounds.sort((a, b) => a.roundNumber - b.roundNumber);

  return rounds;
}

async function main() {
  const args = process.argv.slice(2);
  const tenantIdx = args.indexOf('--tenant');
  const tenantId = tenantIdx !== -1 ? args[tenantIdx + 1] : null;
  const forceOverwrite = args.includes('--force');

  if (!tenantId) {
    console.error('❌ Usage: npx tsx fetchRoundStats.ts --tenant <tenant-id> [--force]');
    console.error('   Example: npx tsx fetchRoundStats.ts --tenant super-2026');
    console.error('   --force: Overwrite existing output even if fewer results are fetched');
    process.exit(1);
  }

  console.log(`\n🏉 Fetching round stats for tenant: ${tenantId}\n`);

  // Verify tenant exists in database
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    console.error(`❌ Tenant not found in database: ${tenantId}`);
    process.exit(1);
  }

  // Load players from seed JSON file (not from DB)
  // The API uses the game's internal player ID (the `id` field in players.json),
  // not the feedId that's stored in the database
  let players: SeedPlayer[];
  try {
    players = loadPlayersFromJson(tenantId);
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  console.log(`📋 Found ${players.length} players in ${tenantId}/players.json\n`);

  const allStats: PlayerRoundStats[] = [];
  let fetchedCount = 0;
  let skippedCount = 0;

  for (const player of players) {
    console.log(`  Fetching stats for ${player.firstName} ${player.lastName} (gameId: ${player.id}, feedId: ${player.feedId})...`);

    // Use game's internal ID for API call (not feedId)
    const apiStats = await fetchPlayerStats(player.id);

    if (apiStats) {
      const rounds = convertApiStats(apiStats);
      if (rounds.length > 0) {
        allStats.push({
          feedId: player.feedId,  // Store feedId for seed.ts to match with DB
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

  // Check for potential data loss before writing
  const outputDir = join(DATA_ROOT, tenantId);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = join(outputDir, 'player_round_stats.json');
  
  // Safeguard: warn if about to overwrite with fewer/no results
  if (existsSync(outputPath) && !forceOverwrite) {
    const existingData = JSON.parse(readFileSync(outputPath, 'utf-8')) as PlayerRoundStats[];
    const existingSize = statSync(outputPath).size;
    
    if (allStats.length === 0) {
      console.error(`\n❌ ABORTED: Would overwrite ${outputPath} (${existingData.length} players, ${existingSize} bytes) with empty results.`);
      console.error(`   Use --force to overwrite anyway.\n`);
      process.exit(1);
    }
    
    if (allStats.length < existingData.length * 0.5) {
      console.warn(`\n⚠️ WARNING: Would overwrite ${existingData.length} players with only ${allStats.length} players.`);
      console.warn(`   Use --force to overwrite anyway.\n`);
      process.exit(1);
    }
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
  await prisma.$disconnect();
} catch (error) {
  console.error('❌ Script failed:', error);
  await prisma.$disconnect();
  process.exit(1);
}
