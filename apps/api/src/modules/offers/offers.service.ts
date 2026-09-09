import { AssignmentStatus as PrismaAssignmentStatus, CampaignStatus as PrismaCampaignStatus, OfferStatus as PrismaOfferStatus, PrismaClient } from "@prisma/client";
import {
  AuditAction,
  CampaignStatus,
  OFFER_TRANSITIONS,
  OfferStatus,
  assertTransition,
} from "@antigravity/shared";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../../lib/errors";
import { recordAudit } from "../audit/audit.service";
import { transitionCampaign } from "../campaigns/campaigns.service";
import { postSystemMessage } from "../messages/messages.service";
import { generateAgreementSafely } from "../agreements/agreements.service";

async function loadOwnedOffer(prisma: PrismaClient, offerId: string, creatorId: string) {
  const offer = await prisma.campaignOffer.findUnique({
    where: { id: offerId },
    include: { campaign: true, slab: true },
  });
  if (!offer) throw new NotFoundError("Offer not found");
  if (offer.creatorId !== creatorId) throw new UnauthorizedError();
  return offer;
}

/** An offer past its expiry that is still OFFERED/VIEWED is expired
 * lazily on read/write — there is no background job yet (see
 * docs/architecture.md), so this is the enforcement point until one
 * exists. */
function isPastExpiry(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now();
}

export async function listMyOffers(prisma: PrismaClient, creatorId: string) {
  return prisma.campaignOffer.findMany({
    where: { creatorId },
    include: { campaign: true, slab: true },
    orderBy: { offeredAt: "desc" },
  });
}

export async function viewOffer(prisma: PrismaClient, offerId: string, creatorId: string) {
  const offer = await loadOwnedOffer(prisma, offerId, creatorId);

  if ((offer.status === PrismaOfferStatus.OFFERED || offer.status === PrismaOfferStatus.VIEWED) && isPastExpiry(offer.expiresAt)) {
    return expireOffer(prisma, offer.id);
  }

  if (offer.status === PrismaOfferStatus.OFFERED) {
    assertTransition("CampaignOffer", OFFER_TRANSITIONS, OfferStatus.OFFERED, OfferStatus.VIEWED);
    const updated = await prisma.campaignOffer.update({
      where: { id: offer.id },
      data: { status: PrismaOfferStatus.VIEWED, viewedAt: new Date() },
    });
    await recordAudit(prisma, {
      actorId: creatorId,
      actorRole: "CREATOR",
      action: AuditAction.OFFER_VIEWED,
      entityType: "CampaignOffer",
      entityId: offer.id,
    });
    return { ...offer, ...updated };
  }
  return offer;
}

async function expireOffer(prisma: PrismaClient, offerId: string) {
  return prisma.$transaction(async (tx) => {
    const offer = await tx.campaignOffer.findUniqueOrThrow({ where: { id: offerId } });
    assertTransition("CampaignOffer", OFFER_TRANSITIONS, offer.status as OfferStatus, OfferStatus.EXPIRED);
    const updated = await tx.campaignOffer.update({
      where: { id: offerId },
      data: { status: PrismaOfferStatus.EXPIRED, respondedAt: new Date() },
    });
    if (offer.slabId) {
      await tx.campaignTargetingSlab.update({ where: { id: offer.slabId }, data: { reserved: { decrement: 1 } } });
    }
    await recordAudit(tx, {
      actorId: null,
      actorRole: "SYSTEM",
      action: AuditAction.OFFER_EXPIRED,
      entityType: "CampaignOffer",
      entityId: offerId,
    });
    return updated;
  });
}

/**
 * Bulk version of the lazy per-offer expiry above — this is what the
 * background scheduler (`jobs/scheduler.ts`) and/or a future real cron
 * job calls. Idempotent: an offer already expired (or since accepted/
 * rejected by the time this runs) is simply skipped, not double-expired.
 */
export async function expireStaleOffers(prisma: PrismaClient): Promise<{ expired: number }> {
  const stale = await prisma.campaignOffer.findMany({
    where: { status: { in: [PrismaOfferStatus.OFFERED, PrismaOfferStatus.VIEWED] }, expiresAt: { lt: new Date() } },
    select: { id: true },
  });

  let expired = 0;
  for (const { id } of stale) {
    try {
      await expireOffer(prisma, id);
      expired++;
    } catch {
      // Already resolved by a concurrent request between the findMany
      // and this call — safe to skip, not a failure of the job.
    }
  }
  return { expired };
}

export interface AcceptOfferInput {
  termsAccepted: boolean;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Accepting an offer (spec §21): transitions the offer, creates the
 * CampaignAssignment, and — if this is the campaign's first acceptance
 * — moves the campaign MATCHING -> IN_PROGRESS. All in one transaction
 * so a half-accepted offer can never exist. Requires explicit terms
 * confirmation (spec §21: "Accept requires terms confirmation") —
 * that confirmation is what `modules/agreements` records as the
 * creator's AgreementAcceptance right after this commits.
 */
export async function acceptOffer(prisma: PrismaClient, offerId: string, creatorId: string, input: AcceptOfferInput) {
  if (!input.termsAccepted) {
    throw new ValidationError("You must confirm acceptance of the campaign terms before accepting");
  }
  const offer = await loadOwnedOffer(prisma, offerId, creatorId);

  // Explicit terminal-state guards BEFORE assertTransition: accepting
  // creates a CampaignAssignment (a unique-per-offer side effect), so
  // assertTransition's "same state = no-op" shortcut is wrong here —
  // re-accepting an already-ACCEPTED offer must be a clean conflict,
  // not a second assignment insert crashing on the unique constraint.
  if (offer.status === PrismaOfferStatus.ACCEPTED) {
    throw new ConflictError("This offer has already been accepted");
  }
  if (offer.status === PrismaOfferStatus.REJECTED) {
    throw new ConflictError("This offer was already declined");
  }
  if ((offer.status === PrismaOfferStatus.OFFERED || offer.status === PrismaOfferStatus.VIEWED) && isPastExpiry(offer.expiresAt)) {
    await expireOffer(prisma, offer.id);
    throw new ConflictError("This offer has expired");
  }
  if (offer.status === PrismaOfferStatus.EXPIRED) {
    throw new ConflictError("This offer has expired");
  }

  const assignment = await prisma.$transaction(async (tx) => {
    assertTransition("CampaignOffer", OFFER_TRANSITIONS, offer.status as OfferStatus, OfferStatus.ACCEPTED);

    await tx.campaignOffer.update({
      where: { id: offer.id },
      data: { status: PrismaOfferStatus.ACCEPTED, respondedAt: new Date() },
    });

    // Product Review assignments need a shipping address before any
    // content step can begin (spec §27) — they stay ACCEPTED (with a
    // Shipment row to track) instead of jumping straight to
    // POST_PENDING the way Clipping/Creator Content do.
    const isProductReview = offer.campaign.type === "PRODUCT_REVIEW";
    const assignment = await tx.campaignAssignment.create({
      data: {
        campaignId: offer.campaignId,
        creatorId,
        offerId: offer.id,
        status: isProductReview ? PrismaAssignmentStatus.ACCEPTED : PrismaAssignmentStatus.POST_PENDING,
        payoutAmount: offer.payoutAmount,
        acceptedAt: new Date(),
      },
    });

    if (isProductReview) {
      await tx.shipment.create({ data: { assignmentId: assignment.id } }); // defaults to ADDRESS_PENDING
    }

    await recordAudit(tx, {
      actorId: creatorId,
      actorRole: "CREATOR",
      action: AuditAction.OFFER_ACCEPTED,
      entityType: "CampaignOffer",
      entityId: offer.id,
      newValue: { assignmentId: assignment.id },
    });
    await postSystemMessage(tx, offer.campaignId, "Creator accepted the campaign.");

    const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: offer.campaignId } });
    if (campaign.status === PrismaCampaignStatus.MATCHING) {
      await transitionCampaign(
        tx,
        offer.campaignId,
        CampaignStatus.MATCHING,
        CampaignStatus.IN_PROGRESS,
        creatorId,
        "CREATOR",
        AuditAction.OFFER_ACCEPTED
      );
    }

    return assignment;
  });

  // Post-commit side effect, same pattern as automated verification in
  // assignments.service.ts — a storage hiccup generating the PDF must
  // not fail the accept response itself; `regenerateAgreement` is the
  // recovery path if this warning ever fires.
  await generateAgreementSafely(prisma, assignment.id, input.ipAddress, input.userAgent);

  return assignment;
}

export async function rejectOffer(prisma: PrismaClient, offerId: string, creatorId: string) {
  const offer = await loadOwnedOffer(prisma, offerId, creatorId);

  // Same reasoning as acceptOffer: rejecting decrements slab.reserved
  // as a side effect, so a repeated reject on an already-REJECTED
  // offer must not silently no-op past that decrement a second time.
  if (offer.status === PrismaOfferStatus.REJECTED) {
    throw new ConflictError("This offer was already declined");
  }
  if (offer.status === PrismaOfferStatus.ACCEPTED) {
    throw new ConflictError("This offer has already been accepted and can no longer be declined");
  }

  return prisma.$transaction(async (tx) => {
    assertTransition("CampaignOffer", OFFER_TRANSITIONS, offer.status as OfferStatus, OfferStatus.REJECTED);
    const updated = await tx.campaignOffer.update({
      where: { id: offer.id },
      data: { status: PrismaOfferStatus.REJECTED, respondedAt: new Date() },
    });
    if (offer.slabId) {
      // Freeing the slot lets the next matching run offer it to
      // another eligible creator (spec §17 step04 "Available" count).
      await tx.campaignTargetingSlab.update({ where: { id: offer.slabId }, data: { reserved: { decrement: 1 } } });
    }
    await recordAudit(tx, {
      actorId: creatorId,
      actorRole: "CREATOR",
      action: AuditAction.OFFER_REJECTED,
      entityType: "CampaignOffer",
      entityId: offer.id,
    });
    return updated;
  });
}
