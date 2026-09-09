import { PrismaClient } from "@prisma/client";
import { AuditAction } from "@antigravity/shared";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { recordAudit } from "../audit/audit.service";
import type { CreateFlagSchema } from "./fraud.validation";
import type { z } from "zod";

type CreateFlagInput = z.infer<typeof CreateFlagSchema>;

/**
 * Fraud flags are raised (by a future automated check, or manually by
 * an admin) but NEVER auto-act — spec §54: "Never automatically ban
 * solely based on an opaque score." Every flag sits OPEN until a human
 * reviews it and explicitly clears or restricts the entity.
 */
export async function raiseFlag(prisma: PrismaClient, input: CreateFlagInput, actorId: string | null) {
  const flag = await prisma.fraudFlag.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      flagType: input.flagType,
      riskScore: input.riskScore,
      evidenceJson: input.evidence as any,
      status: "OPEN",
    },
  });
  await recordAudit(prisma, {
    actorId,
    actorRole: actorId ? "OPERATIONS_ADMIN" : "SYSTEM",
    action: AuditAction.FRAUD_FLAG_RAISED,
    entityType: "FraudFlag",
    entityId: flag.id,
    newValue: { entityType: input.entityType, entityId: input.entityId, flagType: input.flagType, riskScore: input.riskScore },
  });
  return flag;
}

export async function listFlagQueue(prisma: PrismaClient) {
  return prisma.fraudFlag.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" } });
}

export async function getFlagsForEntity(prisma: PrismaClient, entityType: string, entityId: string) {
  return prisma.fraudFlag.findMany({ where: { entityType, entityId }, orderBy: { createdAt: "desc" } });
}

export async function reviewFlag(
  prisma: PrismaClient,
  flagId: string,
  adminId: string,
  decision: "CLEARED" | "RESTRICTED",
  notes?: string
) {
  const flag = await prisma.fraudFlag.findUnique({ where: { id: flagId } });
  if (!flag) throw new NotFoundError("Fraud flag not found");
  if (flag.status !== "OPEN" && flag.status !== "REVIEWED") {
    throw new ConflictError(`Flag cannot be reviewed from status ${flag.status}`);
  }

  const updated = await prisma.fraudFlag.update({
    where: { id: flagId },
    data: {
      status: decision,
      resolvedBy: adminId,
      resolvedAt: new Date(),
      // Only touch evidenceJson when there's something to merge in —
      // leaving the field out of `data` keeps the existing value,
      // where re-assigning `flag.evidenceJson` back (a JsonValue,
      // possibly `null`) would fail Prisma's update-input typing.
      ...(notes ? { evidenceJson: { ...((flag.evidenceJson as object) ?? {}), reviewNotes: notes } as any } : {}),
    },
  });

  // RESTRICTED sets the underlying entity's availability where we
  // have a concrete field for it (a creator going BUSY/unavailable
  // for matching) — it still never deletes/bans anything outright;
  // an admin always took an explicit action here, which is audited.
  if (decision === "RESTRICTED" && flag.entityType === "CREATOR") {
    await prisma.creator.update({ where: { id: flag.entityId }, data: { availability: "PAUSED" } });
  }

  // FRAUD_FLAG_CLEARED is the only dedicated audit action for a
  // review outcome (spec §39's catalog has no distinct "restricted"
  // action) — a RESTRICTED decision is recorded as a generic
  // ADMIN_DECISION with the outcome in its metadata instead of
  // overloading FRAUD_FLAG_CLEARED with the opposite meaning.
  await recordAudit(prisma, {
    actorId: adminId,
    actorRole: "OPERATIONS_ADMIN",
    action: decision === "CLEARED" ? AuditAction.FRAUD_FLAG_CLEARED : AuditAction.ADMIN_DECISION,
    entityType: "FraudFlag",
    entityId: flagId,
    newValue: { decision },
    metadata: notes ? { notes, flagDecision: decision } : { flagDecision: decision },
  });

  return updated;
}
