import {
  AvailabilityStatus,
  CampaignStatus as PrismaCampaignStatus,
  InstagramStatus,
  Prisma,
  PrismaClient,
  TargetingMetric,
} from "@prisma/client";
import { AuditAction, CampaignStatus } from "@antigravity/shared";
import { ConflictError, ValidationError } from "../../lib/errors";
import { recordAudit } from "../audit/audit.service";
import { transitionCampaign } from "../campaigns/campaigns.service";

const OFFER_TTL_HOURS = 48;

interface EligibleCreator {
  creatorId: string;
  metricValue: number;
  qualityScore: number;
  completionRate: number;
}

/**
 * Matching engine (spec §80). Eligibility, in order:
 *   1. Instagram connected (we need it to verify posts later).
 *   2. Availability = AVAILABLE.
 *   3. Category overlap, if the campaign specifies one.
 *   4. Not already offered this campaign (offers are unique per
 *      campaign+creator — see the schema constraint).
 *   5. Their latest follower/reach snapshot falls inside the slab range.
 * Ranked by quality score, then completion rate (best creators first).
 *
 * KYC status and full preference-matching are NOT enforced yet — KYC
 * only gates payout eligibility once submission/verification exists
 * (spec §35), and campaignPreferences filtering is left permissive so
 * a creator who hasn't set preferences isn't silently excluded. Both
 * are documented simplifications, not oversights.
 */
type DbClient = PrismaClient | Prisma.TransactionClient;

async function findEligibleCreatorsForSlab(
  prisma: DbClient,
  campaignId: string,
  categoryId: string | null,
  metric: TargetingMetric,
  minValue: number,
  maxValue: number | null,
  limit: number
): Promise<EligibleCreator[]> {
  if (limit <= 0) return [];

  const alreadyOffered = await prisma.campaignOffer.findMany({
    where: { campaignId },
    select: { creatorId: true },
  });
  const excludeIds = alreadyOffered.map((o) => o.creatorId);

  const candidates = await prisma.creator.findMany({
    where: {
      availability: AvailabilityStatus.AVAILABLE,
      id: excludeIds.length ? { notIn: excludeIds } : undefined,
      instagramAccount: { status: InstagramStatus.CONNECTED },
      ...(categoryId ? { categories: { some: { categoryId } } } : {}),
    },
    include: {
      instagramAccount: { include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } } },
    },
  });

  const inRange: EligibleCreator[] = [];
  for (const creator of candidates) {
    const snapshot = creator.instagramAccount?.snapshots[0];
    if (!snapshot) continue;
    const value = metric === TargetingMetric.FOLLOWER_COUNT ? snapshot.followers : snapshot.avgReach ?? 0;
    const withinRange = value >= minValue && (maxValue === null || value < maxValue);
    if (!withinRange) continue;
    inRange.push({
      creatorId: creator.id,
      metricValue: value,
      qualityScore: Number(creator.qualityScore),
      completionRate: Number(creator.completionRate),
    });
  }

  inRange.sort((a, b) => b.qualityScore - a.qualityScore || b.completionRate - a.completionRate);
  return inRange.slice(0, limit);
}

export interface MatchingResult {
  campaignId: string;
  offersCreated: number;
  perSlab: Array<{ slabId: string; requested: number; matched: number; stillShort: number }>;
}

/**
 * Sends campaign offers to eligible creators (spec §17 step04's "live
 * inventory": Requested / Eligible / Available / Reserved). Idempotent
 * and re-runnable: calling it again on a campaign already in MATCHING
 * only tops up slabs that are still short, it never re-offers a
 * creator who already has an offer for this campaign.
 *
 * There is no background scheduler yet (see docs/architecture.md), so
 * this is triggered by an admin action (`POST
 * /api/campaigns/:id/match`) rather than automatically the instant a
 * campaign goes LIVE.
 */
export async function createOffersForCampaign(
  prisma: PrismaClient,
  campaignId: string,
  actorId: string
): Promise<MatchingResult> {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { targetingSlabs: true },
  });

  if (campaign.status !== PrismaCampaignStatus.LIVE && campaign.status !== PrismaCampaignStatus.MATCHING) {
    throw new ConflictError(
      `Campaign must be LIVE (or already MATCHING) to run matching — current status: ${campaign.status}`
    );
  }
  if (!campaign.targetingMetric) {
    throw new ValidationError("Campaign has no targeting metric configured");
  }

  const perSlab: MatchingResult["perSlab"] = [];
  let offersCreated = 0;

  await prisma.$transaction(async (tx) => {
    if (campaign.status === PrismaCampaignStatus.LIVE) {
      await transitionCampaign(
        tx,
        campaignId,
        CampaignStatus.LIVE,
        CampaignStatus.MATCHING,
        actorId,
        "OPERATIONS_ADMIN",
        AuditAction.CREATOR_MATCHED
      );
    }

    for (const slab of campaign.targetingSlabs) {
      const remaining = slab.quantity - slab.reserved;
      const eligible = await findEligibleCreatorsForSlab(
        tx,
        campaignId,
        campaign.categoryId,
        campaign.targetingMetric!,
        slab.minValue,
        slab.maxValue,
        remaining
      );

      for (const match of eligible) {
        const offer = await tx.campaignOffer.create({
          data: {
            campaignId,
            creatorId: match.creatorId,
            slabId: slab.id,
            payoutAmount: slab.payoutAmount,
            expiresAt: new Date(Date.now() + OFFER_TTL_HOURS * 60 * 60 * 1000),
          },
        });
        await tx.notification.create({
          data: {
            userId: (await tx.creator.findUniqueOrThrow({ where: { id: match.creatorId } })).userId,
            type: "CAMPAIGN_OFFER",
            title: "New Campaign Offer",
            body: `You have a new offer: ${campaign.title}`,
            campaignId,
          },
        });
        await recordAudit(tx, {
          actorId,
          actorRole: "OPERATIONS_ADMIN",
          action: AuditAction.OFFER_SENT,
          entityType: "CampaignOffer",
          entityId: offer.id,
          newValue: { creatorId: match.creatorId, payoutAmount: Number(slab.payoutAmount) },
        });
      }

      if (eligible.length > 0) {
        await tx.campaignTargetingSlab.update({
          where: { id: slab.id },
          data: { reserved: { increment: eligible.length } },
        });
      }

      offersCreated += eligible.length;
      perSlab.push({
        slabId: slab.id,
        requested: remaining,
        matched: eligible.length,
        stillShort: remaining - eligible.length,
      });
    }
  });

  return { campaignId, offersCreated, perSlab };
}
