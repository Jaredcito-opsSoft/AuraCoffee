import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';

export interface CreateAuditLogParams {
  userId?: number | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function recordAuditLog(
  params: CreateAuditLogParams,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx || prisma;
  try {
    await client.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ? String(params.entityId) : null,
        details: params.details ? (params.details as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('[AuditLog Error]: Failed to create audit log entry', error);
  }
}
