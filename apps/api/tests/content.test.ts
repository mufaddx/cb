import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  AssignmentStatus,
  AvailabilityStatus,
  CampaignStatus,
  CampaignType,
  PrismaClient,
  SubmissionStatus,
  TargetingMetric,
  WalletOwnerType,
  WalletTransactionType,
} from "@prisma/client";
import { Role } from "@antigravity/shared";
import { reviewContent, submitContent } from "../src/modules/content/content.service";
import { postLedgerTransaction } from "../src/modules/wallet/wallet.service";

const prisma = new PrismaClient();

async function makeCreatorContentAssignment(revisionLimit = 2, campaignType: CampaignType = CampaignType.CREATOR_CONTENT) {
  const brandUser = await prisma.user.create({
    data: { email: `brand-${Date.now()}-${Math.random()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
  });
  const brand = await prisma.brand.create({ data: { userId: brandUser.id, companyName: "Test Brand", contactPerson: "Jane" } });
  const brandWallet = await prisma.wallet.create({ data: { ownerType: WalletOwnerType.BRAND, brandId: brand.id } });
  await postLedgerTransaction(prisma, { walletId: brandWallet.id, type: WalletTransactionType.DEPOSIT, amount: 5000 });
  await postLedgerTransaction(prisma, { walletId: brandWallet.id, type: WalletTransactionType.RESERVE, amount: 5000 });

  const creatorUser = await prisma.user.create({
    data: { email: `creator-${Date.now()}-${Math.random()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
  });
  const creator = await prisma.creator.create({
    data: { userId: creatorUser.id, fullName: "Test Creator", displayName: "tc", availability: AvailabilityStatus.AVAILABLE },
  });

  const campaign = await prisma.campaign.create({
    data: {
      code: `CMP-${Date.now()}-${Math.random()}`,
      brandId: brand.id,
      type: campaignType,
      title: "Content test campaign",
      description: "For content review tests",
      status: CampaignStatus.IN_PROGRESS,
      targetingMetric: TargetingMetric.FOLLOWER_COUNT,
      retentionDays: 0,
      briefJson: { revisionLimit },
    },
  });
  const offer = await prisma.campaignOffer.create({
    data: { campaignId: campaign.id, creatorId: creator.id, payoutAmount: 900, expiresAt: new Date(Date.now() + 1000 * 60 * 60) },
  });
  const assignment = await prisma.campaignAssignment.create({
    data: {
      campaignId: campaign.id,
      creatorId: creator.id,
      offerId: offer.id,
      status: AssignmentStatus.POST_PENDING,
      payoutAmount: 900,
      acceptedAt: new Date(),
    },
  });

  return { brand, creator, campaign, assignment, brandWallet };
}

describe("Creator Content submission + review (spec §24/25)", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("submit -> approve releases payout immediately (retentionDays=0, reusing verification's payout path)", async () => {
    const { brand, creator, assignment, brandWallet } = await makeCreatorContentAssignment();

    await submitContent(prisma, assignment.id, creator.id, "creator-submissions/x/video.mp4");
    let updated = await prisma.campaignAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(updated.status).toBe(AssignmentStatus.VERIFICATION);

    await reviewContent(prisma, assignment.id, brand.id, [Role.BRAND], { decision: "APPROVE" }, brand.id);

    updated = await prisma.campaignAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(updated.status).toBe(AssignmentStatus.PAID);

    const creatorWallet = await prisma.wallet.findUniqueOrThrow({ where: { creatorId: creator.id } });
    expect(Number(creatorWallet.availableBalance)).toBe(900);

    const finalBrandWallet = await prisma.wallet.findUniqueOrThrow({ where: { id: brandWallet.id } });
    expect(Number(finalBrandWallet.reservedBalance)).toBe(5000 - 900);
  });

  it("a brand cannot review another brand's submission", async () => {
    const { creator, assignment } = await makeCreatorContentAssignment();
    await submitContent(prisma, assignment.id, creator.id, "creator-submissions/x/video.mp4");

    const otherBrandUser = await prisma.user.create({
      data: { email: `other-${Date.now()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
    });
    const otherBrand = await prisma.brand.create({ data: { userId: otherBrandUser.id, companyName: "Other", contactPerson: "Bob" } });

    await expect(
      reviewContent(prisma, assignment.id, otherBrand.id, [Role.BRAND], { decision: "APPROVE" }, otherBrand.id)
    ).rejects.toThrow();
  });

  it("requesting a revision sends the assignment back to POST_PENDING and lets the creator resubmit", async () => {
    const { brand, creator, assignment } = await makeCreatorContentAssignment();
    await submitContent(prisma, assignment.id, creator.id, "creator-submissions/x/v1.mp4");

    await reviewContent(prisma, assignment.id, brand.id, [Role.BRAND], { decision: "REVISION", feedback: "Too short" }, brand.id);
    let updated = await prisma.campaignAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(updated.status).toBe(AssignmentStatus.POST_PENDING);

    const submission2 = await submitContent(prisma, assignment.id, creator.id, "creator-submissions/x/v2.mp4");
    expect(submission2.version).toBe(2);
  });

  it("enforces the revision limit, and lets only an admin override it", async () => {
    const { brand, creator, assignment } = await makeCreatorContentAssignment(1); // limit of 1

    await submitContent(prisma, assignment.id, creator.id, "creator-submissions/x/v1.mp4");
    await reviewContent(prisma, assignment.id, brand.id, [Role.BRAND], { decision: "REVISION" }, brand.id);
    await submitContent(prisma, assignment.id, creator.id, "creator-submissions/x/v2.mp4");

    // Limit (1) already used — a brand asking for a second revision is rejected.
    await expect(
      reviewContent(prisma, assignment.id, brand.id, [Role.BRAND], { decision: "REVISION" }, brand.id)
    ).rejects.toThrow(/Revision limit/);

    // A brand cannot self-override even if it sets override:true.
    await expect(
      reviewContent(prisma, assignment.id, brand.id, [Role.BRAND], { decision: "REVISION", override: true }, brand.id)
    ).rejects.toThrow(/Revision limit/);

    // An admin with override:true can push past the limit.
    const revised = await reviewContent(
      prisma,
      assignment.id,
      "admin-1",
      [Role.OPERATIONS_ADMIN],
      { decision: "REVISION", override: true },
      undefined
    );
    expect(revised.status).toBe(AssignmentStatus.POST_PENDING);
  });

  it("rejecting content fails the assignment without any payout", async () => {
    const { brand, creator, assignment } = await makeCreatorContentAssignment();
    await submitContent(prisma, assignment.id, creator.id, "creator-submissions/x/v1.mp4");
    await reviewContent(prisma, assignment.id, brand.id, [Role.BRAND], { decision: "REJECT" }, brand.id);

    const updated = await prisma.campaignAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(updated.status).toBe(AssignmentStatus.FAILED);

    const submission = await prisma.contentSubmission.findFirstOrThrow({ where: { assignmentId: assignment.id } });
    expect(submission.status).toBe(SubmissionStatus.REJECTED);

    const creatorWallet = await prisma.wallet.findUnique({ where: { creatorId: creator.id } });
    expect(creatorWallet).toBeNull(); // no payout wallet was ever created
  });

  // Regression: Product Review is "a specialized Creator Content
  // campaign" (spec §01) — after the product is received, its review
  // submission must go through this same content flow, not be stuck
  // with nowhere to go because submitPost is Clipping-only and
  // submitContent used to be CREATOR_CONTENT-only.
  it("Product Review campaigns can submit and approve a review through the same content flow", async () => {
    const { brand, creator, assignment } = await makeCreatorContentAssignment(2, CampaignType.PRODUCT_REVIEW);

    const submission = await submitContent(prisma, assignment.id, creator.id, "creator-submissions/x/review.mp4");
    expect(submission.version).toBe(1);

    const approved = await reviewContent(prisma, assignment.id, brand.id, [Role.BRAND], { decision: "APPROVE" }, brand.id);
    expect(approved.status).toBe(AssignmentStatus.PAID);
  });
});
