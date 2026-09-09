import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  AssignmentStatus,
  AvailabilityStatus,
  CampaignStatus,
  CampaignType,
  InstagramStatus,
  PrismaClient,
  RetentionStatus,
  TargetingMetric,
  VerificationResult,
  WalletOwnerType,
  WalletTransactionType,
} from "@prisma/client";
import { runAutomatedVerification, decideVerification } from "../src/modules/verification/verification.service";
import { postLedgerTransaction } from "../src/modules/wallet/wallet.service";
import { encryptSecret } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function makeAssignmentInVerification(opts: {
  postUrl: string;
  disclosureRequired?: boolean;
  retentionDays?: number;
  connected?: boolean;
}) {
  const brandUser = await prisma.user.create({
    data: { email: `brand-${Date.now()}-${Math.random()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
  });
  const brand = await prisma.brand.create({ data: { userId: brandUser.id, companyName: "Test Brand", contactPerson: "Jane" } });
  // Simulate a campaign payment that already went through, so a
  // zero-retention verification pass has reserved funds to release.
  const brandWallet = await prisma.wallet.create({ data: { ownerType: WalletOwnerType.BRAND, brandId: brand.id } });
  await postLedgerTransaction(prisma, { walletId: brandWallet.id, type: WalletTransactionType.DEPOSIT, amount: 10_000 });
  await postLedgerTransaction(prisma, { walletId: brandWallet.id, type: WalletTransactionType.RESERVE, amount: 10_000 });

  const creatorUser = await prisma.user.create({
    data: { email: `creator-${Date.now()}-${Math.random()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
  });
  const creator = await prisma.creator.create({
    data: { userId: creatorUser.id, fullName: "Test Creator", displayName: "tc", availability: AvailabilityStatus.AVAILABLE },
  });

  if (opts.connected !== false) {
    const account = await prisma.instagramAccount.create({
      data: {
        creatorId: creator.id,
        igUserId: `ig_${creator.id}`,
        username: "test_creator",
        accessTokenEncrypted: encryptSecret("fake-token"),
        status: InstagramStatus.CONNECTED,
      },
    });
    await prisma.instagramMetricSnapshot.create({ data: { instagramAccountId: account.id, followers: 25_000 } });
  }

  const campaign = await prisma.campaign.create({
    data: {
      code: `CMP-${Date.now()}-${Math.random()}`,
      brandId: brand.id,
      type: CampaignType.CLIPPING,
      title: "Test campaign",
      description: "For verification tests",
      status: CampaignStatus.IN_PROGRESS,
      targetingMetric: TargetingMetric.FOLLOWER_COUNT,
      disclosureRequired: opts.disclosureRequired ?? true,
      retentionDays: opts.retentionDays ?? 30,
    },
  });

  const offer = await prisma.campaignOffer.create({
    data: { campaignId: campaign.id, creatorId: creator.id, payoutAmount: 800, expiresAt: new Date(Date.now() + 1000 * 60 * 60) },
  });

  const assignment = await prisma.campaignAssignment.create({
    data: {
      campaignId: campaign.id,
      creatorId: creator.id,
      offerId: offer.id,
      status: AssignmentStatus.VERIFICATION,
      payoutAmount: 800,
      postUrl: opts.postUrl,
      postSubmittedAt: new Date(),
    },
  });

  return { assignment, campaign, creator };
}

describe("automated post verification (spec §22)", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("passes and moves to VERIFIED with retention pending when ownership + disclosure both check out", async () => {
    const { assignment, campaign } = await makeAssignmentInVerification({
      postUrl: "https://instagram.com/p/good-post",
      retentionDays: 30,
    });

    await runAutomatedVerification(prisma, assignment.id);

    const updated = await prisma.campaignAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(updated.status).toBe(AssignmentStatus.VERIFIED);
    expect(updated.retentionStatus).toBe(RetentionStatus.PENDING);
    expect(updated.retentionRequiredUntil).not.toBeNull();
    expect(updated.verifiedAt).not.toBeNull();

    const checks = await prisma.postVerification.findMany({ where: { assignmentId: assignment.id } });
    expect(checks.some((c) => c.checkType === "ACCOUNT_MATCH" && c.result === VerificationResult.PASS)).toBe(true);
  });

  it("releases payout immediately when the campaign has no retention requirement", async () => {
    const { assignment } = await makeAssignmentInVerification({
      postUrl: "https://instagram.com/p/good-post-2",
      retentionDays: 0,
    });

    await runAutomatedVerification(prisma, assignment.id);

    const updated = await prisma.campaignAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(updated.status).toBe(AssignmentStatus.PAID);
    expect(updated.retentionStatus).toBe(RetentionStatus.NOT_APPLICABLE);
    expect(updated.paidAt).not.toBeNull();

    const creatorWallet = await prisma.wallet.findUniqueOrThrow({ where: { creatorId: assignment.creatorId } });
    expect(Number(creatorWallet.availableBalance)).toBe(800);
  });

  it("fails hard when the post isn't owned by the connected account", async () => {
    const { assignment } = await makeAssignmentInVerification({ postUrl: "https://instagram.com/p/not-found-post" });

    await runAutomatedVerification(prisma, assignment.id);

    const updated = await prisma.campaignAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(updated.status).toBe(AssignmentStatus.FAILED);
  });

  it("leaves a missing-disclosure post in VERIFICATION for manual review rather than auto-failing it", async () => {
    const { assignment } = await makeAssignmentInVerification({ postUrl: "https://instagram.com/p/no-disclosure-post" });

    await runAutomatedVerification(prisma, assignment.id);

    const updated = await prisma.campaignAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(updated.status).toBe(AssignmentStatus.VERIFICATION);

    const checks = await prisma.postVerification.findMany({ where: { assignmentId: assignment.id } });
    expect(checks.some((c) => c.checkType === "DISCLOSURE" && c.result === VerificationResult.FAIL)).toBe(true);
  });

  it("leaves the assignment in VERIFICATION when the creator has no connected Instagram account", async () => {
    const { assignment } = await makeAssignmentInVerification({ postUrl: "https://instagram.com/p/x", connected: false });

    await runAutomatedVerification(prisma, assignment.id);

    const updated = await prisma.campaignAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(updated.status).toBe(AssignmentStatus.VERIFICATION);
  });

  it("an admin can manually PASS a disclosure-pending assignment", async () => {
    const { assignment } = await makeAssignmentInVerification({ postUrl: "https://instagram.com/p/no-disclosure-post-2" });
    await runAutomatedVerification(prisma, assignment.id);

    const result = await decideVerification(prisma, assignment.id, "admin-1", "PASS", "Disclosure confirmed in bio");
    expect(result.status).toBe(AssignmentStatus.VERIFIED);
  });

  it("rejects deciding an assignment that isn't awaiting verification", async () => {
    const { assignment } = await makeAssignmentInVerification({ postUrl: "https://instagram.com/p/good-post-3", retentionDays: 0 });
    await runAutomatedVerification(prisma, assignment.id); // moves straight to PAYABLE

    await expect(decideVerification(prisma, assignment.id, "admin-1", "PASS")).rejects.toThrow(/not awaiting verification/);
  });
});
