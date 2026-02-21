import type { PrismaClient, Prisma } from '@prisma/client';
import { logger } from './logger.js';

export interface AuditLogData {
  userId?: string;
  teamId?: number;
  action: string;
  beforeState?: Prisma.InputJsonValue;
  afterState?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 * Used for compliance, debugging, and dispute resolution
 */
export async function createAuditLog(
  prisma: PrismaClient,
  data: AuditLogData
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        teamId: data.teamId,
        action: data.action,
        beforeState: data.beforeState,
        afterState: data.afterState,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });

    logger.info(
      `Audit log created: ${data.action} by user ${data.userId || 'unknown'} for team ${data.teamId || 'N/A'}`
    );
  } catch (error) {
    // Don't fail the request if audit logging fails
    logger.error(
      `Failed to create audit log for action ${data.action} - continuing with request. Error: ${error}`
    );
  }
}

/**
 * Common audit actions
 */
export const AUDIT_ACTIONS = {
  PLAYER_SELECTED: 'player_selected',
  PLAYER_REMOVED: 'player_removed',
  SQUAD_UPDATED: 'squad_updated',
  TRANSFER_MADE: 'transfer_made',
  TEAM_CREATED: 'team_created',
  TEAM_UPDATED: 'team_updated',
  ROUND_LOCKED: 'round_locked',
  POINTS_CALCULATED: 'points_calculated',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
