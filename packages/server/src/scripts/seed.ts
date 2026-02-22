import { PrismaClient, Prisma } from '@prisma/client';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../env/.env') });

const prisma = new PrismaClient();

const DATA_ROOT = join(__dirname, '../../../../data');

// ---------------------------------------------------------------------------
// Tenant configuration map
// Adding a third tenant only requires a new entry here — no script changes.
// ---------------------------------------------------------------------------
interface TenantSeedConfig {
  id: string;
  name: string;
  slug: string;
  sportType: string;
  primaryColor: string;
  tournamentName: string;
  season: string;
  dataDir: string;
  /** Player stats file to merge into player.stats JSONB (optional) */
  playerStatsFile?: string;
}

const TENANT_CONFIGS: Record<string, TenantSeedConfig> = {
  'trc-2025': {
    id: 'trc-2025',
    name: 'The Rugby Championship 2025',
    slug: 'trc-2025',
    sportType: 'rugby-union',
    primaryColor: '#006400',
    tournamentName: 'The Rugby Championship 2025',
    season: '2025',
    dataDir: join(DATA_ROOT, 'trc-2025'),
  },
  'super-2026': {
    id: 'super-2026',
    name: 'Super Rugby Pacific 2026',
    slug: 'super-2026',
    sportType: 'rugby-union',
    primaryColor: '#1a1a2e',
    tournamentName: 'Super Rugby Pacific 2026',
    season: '2026',
    dataDir: join(DATA_ROOT, 'super-2026'),
    playerStatsFile: 'player_stats.json',
  },
};

// ---------------------------------------------------------------------------
// Round normalizer
// Both trc-2025 and super-2026 use { number, status, startDate, endDate, tournaments[] }.
// We only need the top-level fields; the nested tournaments array is discarded.
// ---------------------------------------------------------------------------
interface RawRound {
  number: number;
  status: string;
  startDate: string;
  endDate: string;
  // tournaments array intentionally not modelled — we discard it
}

function normaliseRound(raw: RawRound): RawRound {
  return {
    number: raw.number,
    status: raw.status,
    startDate: raw.startDate,
    endDate: raw.endDate,
  };
}

// ---------------------------------------------------------------------------
// Seed a single tenant
// ---------------------------------------------------------------------------
async function seedTenant(config: TenantSeedConfig): Promise<void> {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🌱 Seeding tenant: ${config.id}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const TENANT_ID = config.id;

  // --- Load data files -------------------------------------------------------
  const playersData: unknown[] = JSON.parse(
    readFileSync(join(config.dataDir, 'players.json'), 'utf-8')
  );
  const squadsData: Array<{
    id: number;
    name: string;
    abbreviation: string;
    badge: string | null;
    backgroundColor: string;
  }> = JSON.parse(readFileSync(join(config.dataDir, 'squads.json'), 'utf-8'));

  const roundsRaw: RawRound[] = JSON.parse(
    readFileSync(join(config.dataDir, 'rounds.json'), 'utf-8')
  );
  const roundsData = roundsRaw.map(normaliseRound);

  // Optional player stats file (e.g. super-2026)
  // Supports both:
  //   - Array format: [{ feedId, ...stats }, ...]
  //   - Object format: { "feedId": { ...stats }, ... }  ← super-2026 uses this
  let playerStatsMap: Record<number, unknown> = {};
  if (config.playerStatsFile) {
    const statsPath = join(config.dataDir, config.playerStatsFile);
    if (existsSync(statsPath)) {
      const rawStats: unknown = JSON.parse(readFileSync(statsPath, 'utf-8'));
      if (Array.isArray(rawStats)) {
        // Array format: each element has a feedId field
        playerStatsMap = Object.fromEntries(
          (rawStats as Array<{ feedId: number } & Record<string, unknown>>).map((s) => [s.feedId, s])
        );
      } else if (rawStats !== null && typeof rawStats === 'object') {
        // Object format: keys are feedIds as strings
        playerStatsMap = Object.fromEntries(
          Object.entries(rawStats as Record<string, unknown>).map(([k, v]) => [Number(k), v])
        );
      }
    }
  }

  // 1. Create / upsert tenant -------------------------------------------------
  console.log(`📦 Creating tenant: ${config.name}`);
  const tenant = await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: { name: config.name },
    create: {
      id: TENANT_ID,
      name: config.name,
      slug: config.slug,
      sportType: config.sportType,
      isActive: true,
      logoUrl: null,
      primaryColor: config.primaryColor,
      theme: Prisma.DbNull,
      config: {},
    },
  });
  console.log(`✅ Tenant: ${tenant.name}\n`);

  // 2. Upsert squads — collect DB-assigned IDs keyed by abbreviation ----------
  console.log(`📋 Seeding ${squadsData.length} squads...`);
  const squadIdByAbbr: Record<string, number> = {};
  for (const squad of squadsData) {
    const dbSquad = await prisma.squad.upsert({
      where: {
        tenantId_abbreviation: {
          tenantId: TENANT_ID,
          abbreviation: squad.abbreviation,
        },
      },
      update: {
        name: squad.name,
        badge: squad.badge,
        backgroundColor: squad.backgroundColor || null,
      },
      create: {
        tenantId: TENANT_ID,
        name: squad.name,
        abbreviation: squad.abbreviation,
        badge: squad.badge,
        backgroundColor: squad.backgroundColor || null,
      },
    });
    // Key by JSON id so player records that reference the raw JSON id can be resolved
    squadIdByAbbr[squad.abbreviation] = dbSquad.id;
  }
  // Build a map from raw JSON squadId → DB squadId using the ordered squadsData array
  const jsonIdToDbSquadId: Record<number, number> = {};
  for (const squad of squadsData) {
    const dbId = squadIdByAbbr[squad.abbreviation];
    if (dbId !== undefined) {
      jsonIdToDbSquadId[squad.id] = dbId;
    }
  }
  console.log(`✅ ${squadsData.length} squads seeded\n`);

  // 3. Upsert players --------------------------------------------------------
  if (!Array.isArray(playersData) || playersData.length === 0) {
    console.log(`⚠️  No players found for ${TENANT_ID} — skipping player seeding.\n`);
  } else {
    console.log(`👥 Seeding ${playersData.length} players...`);
    for (const playerRaw of playersData) {
      const player = playerRaw as {
        feedId: number;
        squadId: number;
        firstName: string;
        lastName: string;
        position: string;
        cost: number;
        status: string;
        isLocked: boolean;
        imagePitch: string;
        imageProfile: string;
        stats: unknown;
        selected: unknown;
      };

      // Resolve DB squad ID from raw JSON squadId to avoid cross-tenant collisions
      const dbSquadId = jsonIdToDbSquadId[player.squadId] ?? player.squadId;

      // Merge player_stats.json into stats JSONB if available
      const statsFromFile = playerStatsMap[player.feedId];
      const mergedStats =
        statsFromFile !== undefined
          ? { ...(player.stats as Record<string, unknown>), ...statsFromFile as Record<string, unknown> }
          : player.stats;

      await prisma.player.upsert({
        where: {
          tenantId_feedId: {
            tenantId: TENANT_ID,
            feedId: player.feedId,
          },
        },
        update: {
          squadId: dbSquadId,
          firstName: player.firstName,
          lastName: player.lastName,
          position: player.position,
          cost: player.cost,
          status: player.status,
          isLocked: player.isLocked,
          imagePitch: player.imagePitch,
          imageProfile: player.imageProfile,
          stats: mergedStats as Prisma.InputJsonValue,
          selected: player.selected as Prisma.InputJsonValue,
        },
        create: {
          tenantId: TENANT_ID,
          feedId: player.feedId,
          squadId: dbSquadId,
          firstName: player.firstName,
          lastName: player.lastName,
          position: player.position,
          cost: player.cost,
          status: player.status,
          isLocked: player.isLocked,
          imagePitch: player.imagePitch,
          imageProfile: player.imageProfile,
          stats: mergedStats as Prisma.InputJsonValue,
          selected: player.selected as Prisma.InputJsonValue,
        },
      });
    }
    console.log(`✅ ${playersData.length} players seeded\n`);
  }

  // 4. Create tournament -----------------------------------------------------
  console.log('🏆 Creating tournament...');

  // Use a deterministic tournament ID derived from the tenant to avoid collisions
  // (trc-2025 keeps id=1 for backward compat; super-2026 uses id=2)
  const TOURNAMENT_IDS: Record<string, number> = {
    'trc-2025': 1,
    'super-2026': 2,
  };
  const tournamentId = TOURNAMENT_IDS[TENANT_ID] ?? Math.abs(hashCode(TENANT_ID));

  const tournament = await prisma.tournament.upsert({
    where: { id: tournamentId },
    update: {
      name: config.tournamentName,
      season: config.season,
    },
    create: {
      id: tournamentId,
      tenantId: TENANT_ID,
      name: config.tournamentName,
      season: config.season,
      startDate: new Date(roundsData[0].startDate),
      endDate: new Date(roundsData[roundsData.length - 1].endDate),
    },
  });
  console.log(`✅ Tournament: ${tournament.name}\n`);

  // 5. Upsert rounds ---------------------------------------------------------
  console.log(`📅 Seeding ${roundsData.length} rounds...`);
  for (const round of roundsData) {
    await prisma.round.upsert({
      where: {
        tenantId_tournamentId_roundNumber: {
          tenantId: TENANT_ID,
          tournamentId,
          roundNumber: round.number,
        },
      },
      update: {
        name: `Round ${round.number}`,
        startDate: new Date(round.startDate),
        endDate: new Date(round.endDate),
        status: round.status,
      },
      create: {
        tenantId: TENANT_ID,
        tournamentId,
        roundNumber: round.number,
        name: `Round ${round.number}`,
        startDate: new Date(round.startDate),
        endDate: new Date(round.endDate),
        status: round.status,
      },
    });
  }
  console.log(`✅ ${roundsData.length} rounds seeded\n`);

  // 6. Initialize gameweek state ---------------------------------------------
  console.log('⚙️  Initializing gameweek state...');
  const gameweekState = await prisma.gameweekState.upsert({
    where: { tenantId: TENANT_ID },
    update: {
      currentRound: 1,
      status: 'pre_round',
      deadline: new Date(roundsData[0].startDate),
      nextRoundStarts: new Date(roundsData[1].startDate),
    },
    create: {
      tenantId: TENANT_ID,
      currentRound: 1,
      status: 'pre_round',
      deadline: new Date(roundsData[0].startDate),
      nextRoundStarts: new Date(roundsData[1].startDate),
    },
  });
  console.log(`✅ Gameweek state initialized: Round ${gameweekState.currentRound}\n`);

  console.log('📊 Summary:');
  console.log(`   • Tenant:      ${tenant.name}`);
  console.log(`   • Squads:      ${squadsData.length}`);
  console.log(`   • Players:     ${Array.isArray(playersData) ? playersData.length : 0}`);
  console.log(`   • Tournament:  ${tournament.name}`);
  console.log(`   • Rounds:      ${roundsData.length}`);
  console.log(`   • Round:       ${gameweekState.currentRound}`);
}

/** Simple deterministic string → integer hash (for future tenant IDs). */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash || 1;
}

// ---------------------------------------------------------------------------
// CLI entry point
// Usage:
//   tsx seed.ts                   → seeds trc-2025 (default)
//   tsx seed.ts --tenant super-2026
//   tsx seed.ts --all             → seeds all tenants in TENANT_CONFIGS
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const allFlag = args.includes('--all');
const tenantFlagIdx = args.indexOf('--tenant');
const tenantArg = tenantFlagIdx !== -1 ? args[tenantFlagIdx + 1] : null;

async function main() {
  console.log('🌱 Starting database seed...');

  if (allFlag) {
    console.log(`\nSeeding all tenants: ${Object.keys(TENANT_CONFIGS).join(', ')}`);
    for (const config of Object.values(TENANT_CONFIGS)) {
      await seedTenant(config);
    }
  } else {
    const tenantId = tenantArg ?? 'trc-2025';
    const config = TENANT_CONFIGS[tenantId];
    if (!config) {
      console.error(
        `❌ Unknown tenant: "${tenantId}". Valid options: ${Object.keys(TENANT_CONFIGS).join(', ')}`
      );
      process.exit(1);
    }
    await seedTenant(config);
  }

  console.log('\n🎉 Seed completed successfully!');
}

try {
  await main();
  await prisma.$disconnect();
} catch (e) {
  console.error('❌ Seed failed:', e);
  await prisma.$disconnect();
  process.exit(1);
}
