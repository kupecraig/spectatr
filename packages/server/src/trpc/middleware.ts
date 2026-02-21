/**
 * tRPC Middleware
 * 
 * Reusable middleware for logging, tenant validation, and authentication.
 */

import { TRPCError } from '@trpc/server';
import { createClerkClient } from '@clerk/backend';
import { middleware } from './index.js';
import { logger } from '../utils/logger.js';
import { createAuditLog } from '../utils/audit.js';
import { prisma } from '../db/prisma.js';
import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
});

/**
 * Logging middleware - logs all requests
 */
export const loggingMiddleware = middleware(async ({ path, type, next }) => {
  const start = Date.now();

  const result = await next();

  const duration = Date.now() - start;
  logger.debug(`${type} ${path}`, { duration: `${duration}ms` });

  return result;
});

/**
 * Tenant validation middleware - ensures tenant exists
 */
export const tenantMiddleware = middleware(async ({ ctx, next }) => {
  if (!ctx.tenant) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Tenant not found: ${ctx.tenantId}`,
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenant: ctx.tenant, // Type-safe: tenant is guaranteed to exist
    },
  });
});

/**
 * Audit logging middleware - logs mutations for compliance
 * Captures user actions, IP address, user agent, and state changes
 */
export const auditMiddleware = middleware(async ({ ctx, path, type, input, next }) => {
  // Only audit mutations (not queries)
  if (type !== 'mutation') {
    return next();
  }

  const beforeState = input;
  const result = await next();

  // Create audit log asynchronously (don't block response)
  // Uses unscoped prisma as audit logs are cross-tenant
  createAuditLog(prisma, {
    userId: ctx.userId ?? undefined,
    teamId: typeof input === 'object' && input !== null && 'teamId' in input 
      ? (input.teamId as number) 
      : undefined,
    action: path,
    beforeState: beforeState as Prisma.InputJsonValue,
    afterState: result.ok ? (result.data as Prisma.InputJsonValue) : undefined,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  }).catch((error) => {
    logger.error(`Failed to create audit log for action ${path}. Error: ${error}`);
  });

  return result;
});

/**
 * Authentication middleware - requires valid Clerk session
 * Looks up user by clerkUserId and sets ctx.userId to our internal ID
 * 
 * Provider-agnostic design: Only this middleware needs to change if switching auth providers.
 * All application code uses ctx.userId (our internal CUID), not provider-specific IDs.
 */
export const authMiddleware = middleware(async ({ ctx, next }) => {
  if (!ctx.clerkUserId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  try {
    // Fetch user data from Clerk
    const clerkUser = await clerkClient.users.getUser(ctx.clerkUserId);

    // Upsert user in DB (uses unscoped prisma - users are global, not tenant-specific)
    // This keeps user data fresh (email changes, avatar updates, etc.)
    const user = await prisma.user.upsert({
      where: { clerkUserId: ctx.clerkUserId },
      update: {
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
        username: clerkUser.username ?? null,
        avatar: clerkUser.imageUrl ?? null,
        emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified'
          ? new Date()
          : null,
      },
      create: {
        clerkUserId: ctx.clerkUserId,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
        username: clerkUser.username ?? null,
        avatar: clerkUser.imageUrl ?? null,
        emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified'
          ? new Date()
          : null,
      },
    });

    // Return context with our internal user ID (provider-agnostic)
    return next({
      ctx: {
        userId: user.id,  // Our internal CUID - used throughout the app
        user,  // Full user object for convenience
      },
    });
  } catch (error) {
    logger.error('Auth middleware error', { 
      clerkUserId: ctx.clerkUserId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Failed to authenticate user',
    });
  }
});
