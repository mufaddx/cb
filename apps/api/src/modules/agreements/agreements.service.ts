import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { AuditAction } from "@antigravity/shared";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../lib/errors";
import { recordAudit } from "../audit/audit.service";
import { recordDocument } from "../documents/documents.service";
import { getStorageProvider } from "../../services/storage";
import { renderAgreementPdf, type AgreementPdfContent } from "../../lib/pdf";
import { logger } from "../../lib/logger";

const TERMS_VERSION = "v1-foundation-draft";

/**
 * Builds the structured agreement terms (spec §36) from the campaign/
 * assignment/offer data that exists at acceptance time. This feeds
 * both the stored `contentJson` (the source of truth) and the PDF
 * (a rendering of it) — never let the two drift by hand-editing the PDF text.
 */
function buildAgreementContent(params: {
  campaign: { code: string; title: string; type: string; retentionDays: number; disclosureRequired: boolean; usageDuration: string | null };
  brand: { companyName: string };
  creator: { fullName: string; displayName: string };
  payoutAmount: number;
  assignmentId: string;
}): AgreementPdfContent {
  const { campaign, brand, creator, payoutAmount, assignmentId } = params;
  return {
    title: "Campaign Agreement",
    subtitle: `${campaign.code} — ${campaign.title}`,
    sections: [
      {
        heading: "Parties",
        lines: [`Brand: ${brand.companyName}`, `Creator: ${creator.fullName} (${creator.displayName})`, `Assignment ID: ${assignmentId}`],
      },
      {
        heading: "Deliverable",
        lines: [`Campaign type: ${campaign.type}`, `Disclosure required: ${campaign.disclosureRequired ? "Yes" : "No"}`],
      },
      {
        heading: "Payment",
        lines: [`Payout amount: ₹${payoutAmount.toFixed(2)}`, "Payment is released after verification" + (campaign.retentionDays > 0 ? ` and a ${campaign.retentionDays}-day retention period.` : ".")],
      },
      {
        heading: "Usage Rights & Retention",
        lines: [
          `Minimum retention: ${campaign.retentionDays} day(s)`,
          `Usage duration: ${campaign.usageDuration ?? "As configured for this campaign"}`,
        ],
      },
      {
        heading: "Cancellation, Refund & Dispute Terms",
        lines: [
          "Either party may raise a dispute through the platform's Deal Room.",
          "Refunds, where applicable, are processed per the platform's refund policy and are not automatic.",
          "This is a foundation-build draft for demonstration — it is NOT reviewed legal contract language (spec §38).",
        ],
      },
      {
        heading: "Platform Terms",
        lines: [`Terms version: ${TERMS_VERSION}`, "By accepting this offer, the creator confirmed acceptance of these terms."],
      },
    ],
  };
}

/**
 * Generates the agreement PDF + DB rows for a just-accepted assignment
 * (spec §36/§21). Called as a post-commit step right after
 * `offers.service.ts::acceptOffer` — if this throws, the assignment
 * still exists without an agreement; `regenerateAgreement` (below) is
 * the recovery path rather than failing the whole acceptance.
 */
export async function generateAgreementForAssignment(
  prisma: PrismaClient,
  assignmentId: string,
  ipAddress?: string,
  userAgent?: string
) {
  const assignment = await prisma.campaignAssignment.findUnique({
    where: { id: assignmentId },
    include: { campaign: { include: { brand: true } }, creator: true },
  });
  if (!assignment) throw new NotFoundError("Assignment not found");

  const existing = await prisma.agreement.findUnique({ where: { assignmentId } });
  if (existing) return existing;

  const content = buildAgreementContent({
    campaign: assignment.campaign,
    brand: assignment.campaign.brand,
    creator: assignment.creator,
    payoutAmount: Number(assignment.payoutAmount),
    assignmentId,
  });
  const contentJson = { ...content, generatedAt: new Date().toISOString() };
  const documentHash = crypto.createHash("sha256").update(JSON.stringify(contentJson)).digest("hex");

  const pdfBuffer = await renderAgreementPdf(content);
  const documentKey = `agreements/${assignmentId}.pdf`;
  await getStorageProvider().putObject({ key: documentKey, body: pdfBuffer, contentType: "application/pdf" });

  return prisma.$transaction(async (tx) => {
    const agreement = await tx.agreement.create({
      data: {
        campaignId: assignment.campaignId,
        assignmentId,
        brandId: assignment.campaign.brandId,
        creatorId: assignment.creatorId,
        termsVersion: TERMS_VERSION,
        contentJson: contentJson as any,
        documentKey,
        documentHash,
      },
    });

    await recordAudit(tx, {
      actorId: null,
      actorRole: "SYSTEM",
      action: AuditAction.AGREEMENT_GENERATED,
      entityType: "Agreement",
      entityId: agreement.id,
      metadata: { assignmentId },
    });

    await recordDocument(tx, {
      type: "AGREEMENT",
      ownerUserId: assignment.creator.userId,
      campaignId: assignment.campaignId,
      assignmentId,
      objectKey: documentKey,
      hash: documentHash,
    });

    // Accepting the offer IS accepting these terms (spec §21's
    // "Accept requires terms confirmation") — record that acceptance
    // against the creator's own user id, with whatever request
    // metadata the controller captured.
    await tx.agreementAcceptance.create({
      data: {
        agreementId: agreement.id,
        userId: assignment.creator.userId,
        ipAddress,
        userAgent,
        documentHash,
      },
    });
    await recordAudit(tx, {
      actorId: assignment.creatorId,
      actorRole: "CREATOR",
      action: AuditAction.AGREEMENT_ACCEPTED,
      entityType: "Agreement",
      entityId: agreement.id,
    });

    return agreement;
  });
}

/** Recovery path if `generateAgreementForAssignment` failed as a
 * post-commit side effect (e.g. storage was briefly unavailable). */
export async function regenerateAgreement(prisma: PrismaClient, assignmentId: string) {
  const existing = await prisma.agreement.findUnique({ where: { assignmentId } });
  if (existing) throw new ConflictError("An agreement already exists for this assignment");
  return generateAgreementForAssignment(prisma, assignmentId);
}

export async function getAgreementForAssignment(
  prisma: PrismaClient,
  assignmentId: string,
  brandId?: string,
  creatorId?: string
) {
  const agreement = await prisma.agreement.findUnique({ where: { assignmentId } });
  if (!agreement) throw new NotFoundError("No agreement found for this assignment");
  if (brandId && agreement.brandId !== brandId) throw new UnauthorizedError();
  if (creatorId && agreement.creatorId !== creatorId) throw new UnauthorizedError();

  const downloadUrl = await getStorageProvider().getSignedDownloadUrl(agreement.documentKey);
  return { ...agreement, downloadUrl };
}

/** Used by `offers.service.ts` as a fire-and-forget follow-up — log,
 * don't throw, so a storage hiccup never blocks the offer-accept
 * response the creator is waiting on. */
export async function generateAgreementSafely(prisma: PrismaClient, assignmentId: string, ipAddress?: string, userAgent?: string) {
  try {
    await generateAgreementForAssignment(prisma, assignmentId, ipAddress, userAgent);
  } catch (err) {
    logger.warn({ err, assignmentId }, "Agreement generation failed; use regenerateAgreement to retry");
  }
}
