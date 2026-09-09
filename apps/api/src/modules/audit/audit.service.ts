import type { Prisma, PrismaClient } from "@prisma/client";
import type { AuditAction } from "@antigravity/shared";

export interface RecordAuditInput {
  actorId: string | null;
  actorRole: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Audit log writer (spec §39). `tx` accepts either the global Prisma
 * client or an active `$transaction` callback client, so an audit
 * entry can be written atomically alongside the business change it
 * describes — a campaign approval and its audit row either both
 * commit or neither does.
 *
 * No update/delete method is exposed here by design: audit rows are
 * append-only ("Audit logs cannot be deleted by normal users", §39).
 */
export async function recordAudit(
  tx: PrismaClient | Prisma.TransactionClient,
  input: RecordAuditInput
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValue: input.oldValue === undefined ? undefined : (input.oldValue as Prisma.InputJsonValue),
      newValue: input.newValue === undefined ? undefined : (input.newValue as Prisma.InputJsonValue),
      metadata: input.metadata === undefined ? undefined : (input.metadata as Prisma.InputJsonValue),
    },
  });
}
