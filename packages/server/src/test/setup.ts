/**
 * Vitest Setup File
 * 
 * Handles Prisma connect/disconnect lifecycle for integration tests.
 * This file is loaded once per test file via vitest.config.ts setupFiles.
 */

import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../db/prisma.js';

beforeAll(async () => {
  // Connect to the database
  await prisma.$connect();
});

afterAll(async () => {
  // Disconnect to release connections
  await prisma.$disconnect();
});
