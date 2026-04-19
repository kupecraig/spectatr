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
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../env/.env') });

const prisma = new PrismaClient();
const DATA_ROOT = join(__dirname, '../../../../data');

// Delay between API requests (100ms)
const REQUEST_DELAY_MS = 100;

interface PlayerRoundStats {
  feedId: number;
  rounds: Array<{
    roundNumber: number;
    stats: Record<string, number>;
  }>;
}

interface ApiPlayerStats {
  // The API returns stats keyed by round number, not a database Round.id
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
 * Fetches player stats from the playfantasyrugby.com API
 */
async function fetchPlayerStats(feedId: number): Promise<ApiPlayerStats | null> {
  const url = `https://playfantasyrugby.com/json/fantasy/player_stats/${feedId}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`  ⚠️ No stats found for feedId ${feedId} (404)`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json() as ApiPlayerStats;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Failed to fetch stats for feedId ${feedId}: ${errorMessage}`);
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

  if (!tenantId) {
    console.error('❌ Usage: npx tsx fetchRoundStats.ts --tenant <tenant-id>');
    console.error('   Example: npx tsx fetchRoundStats.ts --tenant super-2026');
    process.exit(1);
  }

  console.log(`\n🏉 Fetching round stats for tenant: ${tenantId}\n`);

  // Verify tenant exists
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    console.error(`❌ Tenant not found: ${tenantId}`);
    process.exit(1);
  }

  // Fetch all players for this tenant within a tenant-scoped transaction
  const players = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`;

    return tx.player.findMany({
      where: { tenantId },
      select: { id: true, feedId: true, firstName: true, lastName: true },
      orderBy: { feedId: 'asc' },
    });
  });

  console.log(`📋 Found ${players.length} players for ${tenant.name}\n`);

  const allStats: PlayerRoundStats[] = [];
  let fetchedCount = 0;
  let skippedCount = 0;

  for (const player of players) {
    console.log(`  Fetching stats for ${player.firstName} ${player.lastName} (feedId: ${player.feedId})...`);

    const apiStats = await fetchPlayerStats(player.feedId);

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

  // Write output file
  const outputDir = join(DATA_ROOT, tenantId);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = join(outputDir, 'player_round_stats.json');
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
