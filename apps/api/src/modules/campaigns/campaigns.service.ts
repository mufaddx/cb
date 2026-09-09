import crypto from "crypto";
import { CampaignStatus as PrismaCampaignStatus, PrismaClient } from "@prisma/client";
import {
  ASSIGNMENT_TRANSITIONS,
  AuditAction,
  CAMPAIGN_TRANSITIONS,
  CampaignStatus,
  DEFAULT_CLIPPING_RETENTION_DAYS,
  assertTransition,
} from "@antigravity/shared";
import { NotFoundError, UnauthorizedError, ValidationError } from "../../lib/errors";
import { recordAudit } from "../audit/audit.service";
import { computePricingBreakdown } from "./pricing.service";
import type { CreateCampaignInput } from "./campaigns.validation";

function generateCampaignCode(): string {
  return `CMP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

/** Thin wrapper so every campaign status mutation goes through the
 * shared, enforced state machine (spec §56) instead of a raw `update`. */
async function transitionCampaign(
  tx: Parameters<typeof recordAudit>[0],
  campaignId: string,
  from: CampaignStatus,
  to: CampaignStatus,
  actorId: string | null,
  actorRole: string | null,
  action: AuditAction,
  extraData: Record<string, unknown> = {}
) {
  assertTransition("Campaign", CAMPAIGN_TRANSITIONS, from, to);
  await tx.campaign.update({ where: { id: campaignId }, data: { status: to as any, ...extraData } });
  await recordAudit(tx, {
    actorId,
    actorRole,
    action,
    entityType: "Campaign",
    entityId: campaignId,
    oldValue: { status: from },
    newValue: { status: to },
  });
}

export async function createDraftCampaign(
  prisma: PrismaClient,
  brandId: string,
  actorId: string,
  input: CreateCampaignInput
) {
  const pricing = await computePricingBreakdown(prisma, input.type, input.targetingMetric, input.targetingSlabs);

  if (input.productId) {
    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product || product.brandId !== brandId || product.archived) {
      throw new ValidationError("Selected product was not found in your catalog");
    }
  }

  return prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        code: generateCampaignCode(),
        brandId,
        type: input.type,
        title: input.title,
        description: input.description,
        objective: input.objective,
        categoryId: input.categoryId,
        subcategory: input.subcategory,
        language: input.language,
        status: PrismaCampaignStatus.DRAFT,
        targetingMetric: input.targetingMetric,
        retentionDays: input.type === "CLIPPING" ? input.retentionDays ?? DEFAULT_CLIPPING_RETENTION_DAYS : input.retentionDays,
        disclosureRequired: input.disclosureRequired,
        restrictedCategory: input.restrictedCategory ?? null,
        requiresManualReview: Boolean(input.restrictedCategory),
        briefJson: input.briefJson as any,
        targetingSlabs: {
          create: input.targetingSlabs.map((s) => ({
            minValue: s.minValue,
            maxValue: s.maxValue,
            payoutAmount: s.payoutAmount,
            quantity: s.quantity,
          })),
        },
        pricingSnapshots: {
          create: {
            subtotal: pricing.subtotal,
            platformFee: pricing.platformFee,
            taxAmount: pricing.taxAmount,
            totalAmount: pricing.totalAmount,
            snapshotJson: pricing.snapshot as any,
          },
        },
        ...(input.productId ? { products: { create: { productId: input.productId } } } : {}),
      },
      include: { targetingSlabs: true, pricingSnapshots: true, products: { include: { product: true } } },
    });

    await recordAudit(tx, {
      actorId,
      actorRole: "BRAND",
      action: AuditAction.CAMPAIGN_CREATED,
      entityType: "Campaign",
      entityId: campaign.id,
      newValue: { status: campaign.status, type: campaign.type },
    });

    return campaign;
  });
}

export async function submitCampaign(prisma: PrismaClient, campaignId: string, brandId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    if (campaign.brandId !== brandId) throw new UnauthorizedError();

    await transitionCampaign(
      tx,
      campaignId,
      campaign.status as CampaignStatus,
      CampaignStatus.SUBMITTED,
      actorId,
      "BRAND",
      AuditAction.CAMPAIGN_SUBMITTED,
      { submittedAt: new Date() }
    );
    // Move straight into the admin review queue.
    await transitionCampaign(
      tx,
      campaignId,
      CampaignStatus.SUBMITTED,
      CampaignStatus.UNDER_REVIEW,
      actorId,
      "BRAND",
      AuditAction.CAMPAIGN_SUBMITTED,
      { reviewedAt: null }
    );

    return tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  });
}

export async function approveCampaign(prisma: PrismaClient, campaignId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });

    await transitionCampaign(
      tx,
      campaignId,
      campaign.status as CampaignStatus,
      CampaignStatus.APPROVED,
      adminId,
      "OPERATIONS_ADMIN",
      AuditAction.CAMPAIGN_APPROVED,
      { approvedAt: new Date(), reviewedAt: new Date() }
    );
    // Approval always implies "payment required next" (spec §81/§82).
    await transitionCampaign(
      tx,
      campaignId,
      CampaignStatus.APPROVED,
      CampaignStatus.PAYMENT_PENDING,
      adminId,
      "OPERATIONS_ADMIN",
      AuditAction.CAMPAIGN_APPROVED
    );

    return tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  });
}

export async function rejectCampaign(
  prisma: PrismaClient,
  campaignId: string,
  adminId: string,
  reason: string
) {
  return prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    await transitionCampaign(
      tx,
      campaignId,
      campaign.status as CampaignStatus,
      CampaignStatus.REJECTED,
      adminId,
      "OPERATIONS_ADMIN",
      AuditAction.CAMPAIGN_REJECTED,
      { rejectionReason: reason, reviewedAt: new Date() }
    );
    return tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  });
}

export async function cancelCampaign(
  prisma: PrismaClient,
  campaignId: string,
  brandId: string,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    if (campaign.brandId !== brandId) throw new UnauthorizedError();

    await transitionCampaign(
      tx,
      campaignId,
      campaign.status as CampaignStatus,
      CampaignStatus.CANCELLED,
      actorId,
      "BRAND",
      AuditAction.CAMPAIGN_CANCELLED,
      { cancelledAt: new Date() }
    );
    return tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  });
}

export async function listCampaignsForBrand(prisma: PrismaClient, brandId: string) {
  return prisma.campaign.findMany({
    where: { brandId },
    include: { pricingSnapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCampaignForBrand(prisma: PrismaClient, campaignId: string, brandId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { targetingSlabs: true, pricingSnapshots: { orderBy: { createdAt: "desc" }, take: 1 }, payments: true },
  });
  if (!campaign) throw new NotFoundError("Campaign not found");
  if (campaign.brandId !== brandId) throw new UnauthorizedError();
  return campaign;
}

/** Admin view of any campaign — no brand-ownership check, gated at
 * the route by CAMPAIGN_REVIEW instead. */
export async function getCampaignForAdmin(prisma: PrismaClient, campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      targetingSlabs: true,
      pricingSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },
      payments: true,
      brand: true,
      assignments: { include: { creator: true } },
    },
  });
  if (!campaign) throw new NotFoundError("Campaign not found");
  return campaign;
}

/** Admin review queue (spec §45): campaigns awaiting a decision. */
export async function listCampaignReviewQueue(prisma: PrismaClient) {
  return prisma.campaign.findMany({
    where: { status: { in: [PrismaCampaignStatus.SUBMITTED, PrismaCampaignStatus.UNDER_REVIEW] } },
    include: { brand: true, targetingSlabs: true, pricingSnapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { submittedAt: "asc" },
  });
}

export { transitionCampaign };
