import { PrismaClient, Prisma } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../env/.env') });

const prisma = new PrismaClient();

// Read mock data files
const FRONTEND_MOCKS_PATH = join(__dirname, '../../../../data/trc-2025');

const playersData = JSON.parse(
  readFileSync(join(FRONTEND_MOCKS_PATH, 'players.json'), 'utf-8')
);
const squadsData = JSON.parse(
  readFileSync(join(FRONTEND_MOCKS_PATH, 'squads.json'), 'utf-8')
);
const roundsData = JSON.parse(
  readFileSync(join(FRONTEND_MOCKS_PATH, 'rounds.json'), 'utf-8')
);

const TENANT_ID = 'trc-2025';

async function main() {
  console.log('🌱 Starting database seed...\n');

  // 1. Create tenant
  console.log('📦 Creating tenant: trc-2025');
  const tenant = await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      name: 'The Rugby Championship 2025',
      slug: 'trc',
      sportType: 'rugby-union',
      isActive: true,
      logoUrl: null,
      primaryColor: '#006400',
      theme: Prisma.DbNull,
      config: {},
    },
  });
  console.log(`✅ Tenant created: ${tenant.name}\n`);

  // 2. Create squads
  console.log(`📋 Seeding ${squadsData.length} squads...`);
  for (const squad of squadsData) {
    await prisma.squad.upsert({
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
  }
  console.log(`✅ ${squadsData.length} squads seeded\n`);

  // 3. Create players
  console.log(`👥 Seeding ${playersData.length} players...`);
  for (const player of playersData) {
    await prisma.player.upsert({
      where: {
        tenantId_feedId: {
          tenantId: TENANT_ID,
          feedId: player.feedId,
        },
      },
      update: {
        squadId: player.squadId,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        cost: player.cost,
        status: player.status,
        isLocked: player.isLocked,
        imagePitch: player.imagePitch,
        imageProfile: player.imageProfile,
        stats: player.stats,
        selected: player.selected,
      },
      create: {
        tenantId: TENANT_ID,
        feedId: player.feedId,
        squadId: player.squadId,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        cost: player.cost,
        status: player.status,
        isLocked: player.isLocked,
        imagePitch: player.imagePitch,
        imageProfile: player.imageProfile,
        stats: player.stats,
        selected: player.selected,
      },
    });
  }
  console.log(`✅ ${playersData.length} players seeded\n`);

  // 4. Create tournament (The Rugby Championship 2025)
  console.log('🏆 Creating tournament...');
  const tournament = await prisma.tournament.upsert({
    where: { id: 1 },
    update: {
      name: 'The Rugby Championship 2025',
      season: '2025',
    },
    create: {
      id: 1,
      tenantId: TENANT_ID,
      name: 'The Rugby Championship 2025',
      season: '2025',
      startDate: new Date(roundsData[0].startDate),
      endDate: new Date(roundsData[roundsData.length - 1].endDate),
    },
  });
  console.log(`✅ Tournament created: ${tournament.name}\n`);

  // 5. Create rounds with tournaments
  console.log(`📅 Seeding ${roundsData.length} rounds...`);
  for (const round of roundsData) {
    // Create the round
    await prisma.round.upsert({
      where: {
        tenantId_tournamentId_roundNumber: {
          tenantId: TENANT_ID,
          tournamentId: 1,
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
        tournamentId: 1,
        roundNumber: round.number,
        name: `Round ${round.number}`,
        startDate: new Date(round.startDate),
        endDate: new Date(round.endDate),
        status: round.status,
      },
    });
  }
  console.log(`✅ ${roundsData.length} rounds seeded\n`);

  // 6. Initialize gameweek state
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

  console.log('🎉 Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   • Tenant: ${tenant.name}`);
  console.log(`   • Squads: ${squadsData.length}`);
  console.log(`   • Players: ${playersData.length}`);
  console.log(`   • Tournament: ${tournament.name}`);
  console.log(`   • Rounds: ${roundsData.length}`);
  console.log(`   • Current Round: ${gameweekState.currentRound}`);
}

try {
  await main();
  await prisma.$disconnect();
} catch (e) {
  console.error('❌ Seed failed:', e);
  await prisma.$disconnect();
  process.exit(1);
}
