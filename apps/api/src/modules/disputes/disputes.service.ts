import { DisputeStatus as PrismaDisputeStatus, PrismaClient } from "@prisma/client";
import { AuditAction, CAMPAIGN_TRANSITIONS, CampaignStatus, DISPUTE_TRANSITIONS, DisputeStatus, InvalidTransitionError, assertTransition } from "@antigravity/shared";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../lib/errors";
import { recordAudit } from "../audit/audit.service";
import type { OpenDisputeSchema } from "./disputes.validation";
import type { z } from "zod";

type OpenDisputeInput = z.infer<typeof OpenDisputeSchema>;

export async function openDispute(
  prisma: PrismaClient,
  campaignId: string,
  openedById: string,
  openedByRole: "BRAND" | "CREATOR",
  input: OpenDisputeInput
) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new NotFoundError("Campaign not found");

  return prisma.$transaction(async (tx) => {
    const dispute = await tx.dispute.create({
      data: { campaignId, openedById, type: input.type, reason: input.reason, description: input.description },
    });

    await recordAudit(tx, {
      actorId: openedById,
      actorRole: openedByRole,
      action: AuditAction.DISPUTE_OPENED,
      entityType: "Dispute",
      entityId: dispute.id,
      metadata: { campaignId },
    });

    // A campaign already DISPUTED (a second dispute opened on it)
    // is a safe same-state no-op via assertTransition — unlike
    // offer accept/reject, a campaign status write has no
    // unique-constraint side effect to double-trigger.
    try {
      assertTransition("Campaign", CAMPAIGN_TRANSITIONS, campaign.status as CampaignStatus, CampaignStatus.DISPUTED);
    } catch (err) {
      if (err instanceof InvalidTransitionError) {
        throw new ConflictError(`Campaigns in status ${campaign.status} cannot be disputed`);
      }
      throw err;
    }
    await tx.campaign.update({ where: { id: campaignId }, data: { status: "DISPUTED" } });

    return dispute;
  });
}

export async function listDisputeQueue(prisma: PrismaClient) {
  return prisma.dispute.findMany({
    where: { status: { in: [PrismaDisputeStatus.OPEN, PrismaDisputeStatus.UNDER_REVIEW, PrismaDisputeStatus.EVIDENCE_REQUESTED] } },
    include: { campaign: true },
    orderBy: { createdAt: "asc" },
  });
}

async function loadDispute(prisma: PrismaClient, disputeId: string) {
  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId }, include: { campaign: true } });
  if (!dispute) throw new NotFoundError("Dispute not found");
  return dispute;
}

export async function getDisputeForParty(prisma: PrismaClient, disputeId: string, brandId?: string, creatorId?: string) {
  const dispute = await loadDispute(prisma, disputeId);
  if (brandId && dispute.campaign.brandId !== brandId) throw new UnauthorizedError();
  // Creators aren't linked to a campaign directly; ownership for a
  // creator is "did this creator have an assignment on this campaign" —
  // checked via the openedById field for now (they opened it themselves).
  if (creatorId && dispute.openedById !== creatorId) throw new UnauthorizedError();
  return dispute;
}

export async function requestEvidence(prisma: PrismaClient, disputeId: string, adminId: string) {
  const dispute = await loadDispute(prisma, disputeId);
  return prisma.$transaction(async (tx) => {
    if (dispute.status === PrismaDisputeStatus.OPEN) {
      assertTransition("Dispute", DISPUTE_TRANSITIONS, DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW);
      await tx.dispute.update({ where: { id: disputeId }, data: { status: PrismaDisputeStatus.UNDER_REVIEW } });
    }
    assertTransition("Dispute", DISPUTE_TRANSITIONS, DisputeStatus.UNDER_REVIEW, DisputeStatus.EVIDENCE_REQUESTED);
    const updated = await tx.dispute.update({ where: { id: disputeId }, data: { status: PrismaDisputeStatus.EVIDENCE_REQUESTED } });
    await recordAudit(tx, { actorId: adminId, actorRole: "OPERATIONS_ADMIN", action: AuditAction.ADMIN_DECISION, entityType: "Dispute", entityId: disputeId, metadata: { action: "evidence_requested" } });
    return updated;
  });
}

export async function decideDispute(prisma: PrismaClient, disputeId: string, adminId: string, decisionText: string) {
  const dispute = await loadDispute(prisma, disputeId);
  if (
    dispute.status !== PrismaDisputeStatus.OPEN &&
    dispute.status !== PrismaDisputeStatus.UNDER_REVIEW &&
    dispute.status !== PrismaDisputeStatus.EVIDENCE_REQUESTED
  ) {
    throw new ConflictError(`Dispute cannot be decided from status ${dispute.status}`);
  }

  return prisma.$transaction(async (tx) => {
    let current = dispute.status as DisputeStatus;
    if (current === DisputeStatus.OPEN) {
      assertTransition("Dispute", DISPUTE_TRANSITIONS, current, DisputeStatus.UNDER_REVIEW);
      await tx.dispute.update({ where: { id: disputeId }, data: { status: PrismaDisputeStatus.UNDER_REVIEW } });
      current = DisputeStatus.UNDER_REVIEW;
    }
    if (current === DisputeStatus.EVIDENCE_REQUESTED) {
      assertTransition("Dispute", DISPUTE_TRANSITIONS, current, DisputeStatus.UNDER_REVIEW);
      await tx.dispute.update({ where: { id: disputeId }, data: { status: PrismaDisputeStatus.UNDER_REVIEW } });
      current = DisputeStatus.UNDER_REVIEW;
    }

    assertTransition("Dispute", DISPUTE_TRANSITIONS, DisputeStatus.UNDER_REVIEW, DisputeStatus.DECISION);
    await tx.dispute.update({ where: { id: disputeId }, data: { status: PrismaDisputeStatus.DECISION, decision: decisionText } });
    await recordAudit(tx, { actorId: adminId, actorRole: "OPERATIONS_ADMIN", action: AuditAction.DISPUTE_DECISION, entityType: "Dispute", entityId: disputeId, newValue: { decision: decisionText } });

    assertTransition("Dispute", DISPUTE_TRANSITIONS, DisputeStatus.DECISION, DisputeStatus.RESOLVED);
    const resolved = await tx.dispute.update({
      where: { id: disputeId },
      data: { status: PrismaDisputeStatus.RESOLVED, resolvedAt: new Date() },
    });
    await recordAudit(tx, { actorId: adminId, actorRole: "OPERATIONS_ADMIN", action: AuditAction.DISPUTE_RESOLVED, entityType: "Dispute", entityId: disputeId });

    return resolved;
  });
}
