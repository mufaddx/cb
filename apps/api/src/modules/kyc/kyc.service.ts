import { KycStatus as PrismaKycStatus, PrismaClient } from "@prisma/client";
import { AuditAction, KYC_TRANSITIONS, KycStatus, assertTransition } from "@antigravity/shared";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { recordAudit } from "../audit/audit.service";
import { decryptSecret, encryptSecret } from "../../lib/crypto";
import type { SubmitKycInput } from "./kyc.validation";

/**
 * KYC is strictly siloed from brands (spec §35/§92): every route here
 * is gated by KYC_SUBMIT_OWN / KYC_REVIEW, neither of which the BRAND
 * role has (see packages/shared/src/roles.ts) — a brand can never
 * reach these endpoints even by guessing a URL. The document number is
 * AES-256-GCM encrypted at rest; it is never returned by any list
 * endpoint (see `sanitize` below), only decrypted for a KYC admin's
 * single-record detail view.
 */

function sanitize<T extends { documentNumberEncrypted: string }>(record: T) {
  const { documentNumberEncrypted, ...rest } = record;
  return rest;
}

export async function submitKyc(prisma: PrismaClient, creatorId: string, input: SubmitKycInput) {
  const creator = await prisma.creator.findUniqueOrThrow({ where: { id: creatorId } });
  const currentStatus = creator.kycStatus as KycStatus;

  if (currentStatus !== KycStatus.NOT_STARTED && currentStatus !== KycStatus.RESUBMISSION_REQUIRED) {
    throw new ConflictError(`KYC cannot be submitted from status ${currentStatus}`);
  }
  assertTransition("KycRecord", KYC_TRANSITIONS, currentStatus, KycStatus.SUBMITTED);

  return prisma.$transaction(async (tx) => {
    const record = await tx.kycRecord.create({
      data: {
        creatorId,
        documentType: input.documentType,
        documentNumberEncrypted: encryptSecret(input.documentNumber),
        documentKey: input.documentKey,
        status: PrismaKycStatus.SUBMITTED,
      },
    });
    await tx.creator.update({ where: { id: creatorId }, data: { kycStatus: KycStatus.SUBMITTED } });
    await recordAudit(tx, {
      actorId: creatorId,
      actorRole: "CREATOR",
      action: AuditAction.KYC_SUBMITTED,
      entityType: "KycRecord",
      entityId: record.id,
    });
    return sanitize(record);
  });
}

export async function getMyKycStatus(prisma: PrismaClient, creatorId: string) {
  const latest = await prisma.kycRecord.findFirst({
    where: { creatorId },
    orderBy: { submittedAt: "desc" },
  });
  return latest ? sanitize(latest) : { status: KycStatus.NOT_STARTED };
}

export async function listKycQueue(prisma: PrismaClient) {
  const records = await prisma.kycRecord.findMany({
    where: { status: { in: [PrismaKycStatus.SUBMITTED, PrismaKycStatus.UNDER_REVIEW] } },
    include: { creator: { select: { id: true, fullName: true, displayName: true } } },
    orderBy: { submittedAt: "asc" },
  });
  return records.map(sanitize);
}

/** Only a KYC admin reviewing one specific record gets the decrypted
 * document number — never a list endpoint, never a brand. */
export async function getKycRecordForAdmin(prisma: PrismaClient, kycRecordId: string) {
  const record = await prisma.kycRecord.findUnique({
    where: { id: kycRecordId },
    include: { creator: { select: { id: true, fullName: true, displayName: true } } },
  });
  if (!record) throw new NotFoundError("KYC record not found");
  return { ...sanitize(record), documentNumber: decryptSecret(record.documentNumberEncrypted) };
}

export type KycDecision = "VERIFIED" | "REJECTED" | "RESUBMISSION_REQUIRED";

export async function decideKyc(prisma: PrismaClient, kycRecordId: string, adminId: string, decision: KycDecision, reason?: string) {
  const record = await prisma.kycRecord.findUnique({ where: { id: kycRecordId } });
  if (!record) throw new NotFoundError("KYC record not found");
  if (record.status !== PrismaKycStatus.SUBMITTED && record.status !== PrismaKycStatus.UNDER_REVIEW) {
    throw new ConflictError(`KYC record is not awaiting review (current status: ${record.status})`);
  }

  return prisma.$transaction(async (tx) => {
    // SUBMITTED -> UNDER_REVIEW -> decision, mirroring the campaign
    // review pattern: the decision is one admin action, but the state
    // machine still records the intermediate hop.
    if (record.status === PrismaKycStatus.SUBMITTED) {
      assertTransition("KycRecord", KYC_TRANSITIONS, KycStatus.SUBMITTED, KycStatus.UNDER_REVIEW);
      await tx.kycRecord.update({ where: { id: kycRecordId }, data: { status: PrismaKycStatus.UNDER_REVIEW } });
    }
    assertTransition("KycRecord", KYC_TRANSITIONS, KycStatus.UNDER_REVIEW, decision as KycStatus);

    const updated = await tx.kycRecord.update({
      where: { id: kycRecordId },
      data: {
        status: decision as PrismaKycStatus,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason: decision !== "VERIFIED" ? reason : null,
      },
    });
    await tx.creator.update({ where: { id: record.creatorId }, data: { kycStatus: decision } });

    await recordAudit(tx, {
      actorId: adminId,
      actorRole: "KYC_ADMIN",
      action: decision === "VERIFIED" ? AuditAction.KYC_APPROVED : AuditAction.KYC_REJECTED,
      entityType: "KycRecord",
      entityId: kycRecordId,
      newValue: { status: decision },
      metadata: reason ? { reason } : undefined,
    });

    return sanitize(updated);
  });
}
