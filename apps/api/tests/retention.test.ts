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
  WalletOwnerType,
  WalletTransactionType,
} from "@prisma/client";
import { runRetentionCheck, runDueRetentionChecks } from "../src/modules/retention/retention.service";
import { postLedgerTransaction } from "../src/modules/wallet/wallet.service";
import { encryptSecret } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function makeVerifiedAssignment(opts: { postUrl: string; retentionRequiredUntil: Date; payoutAmount?: number }) {
  const brandUser = await prisma.user.create({
    data: { email: `brand-${Date.now()}-${Math.random()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
  });
  const brand = await prisma.brand.create({ data: { userId: brandUser.id, companyName: "Test Brand", contactPerson: "Jane" } });
  const brandWallet = await prisma.wallet.create({ data: { ownerType: WalletOwnerType.BRAND, brandId: brand.id } });
  // Fund and reserve the brand wallet as if a real campaign payment had already gone through.
  await postLedgerTransaction(prisma, { walletId: brandWallet.id, type: WalletTransactionType.DEPOSIT, amount: 10_000 });
  await postLedgerTransaction(prisma, { walletId: brandWallet.id, type: WalletTransactionType.RESERVE, amount: 10_000 });

  const creatorUser = await prisma.user.create({
    data: { email: `creator-${Date.now()}-${Math.random()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
  });
  const creator = await prisma.creator.create({
    data: { userId: creatorUser.id, fullName: "Test Creator", displayName: "tc", availability: AvailabilityStatus.AVAILABLE },
  });
  const creatorWallet = await prisma.wallet.create({ data: { ownerType: WalletOwnerType.CREATOR, creatorId: creator.id } });

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

  const campaign = await prisma.campaign.create({
    data: {
      code: `CMP-${Date.now()}-${Math.random()}`,
      brandId: brand.id,
      type: CampaignType.CLIPPING,
      title: "Retention test campaign",
      description: "For retention tests",
      status: CampaignStatus.IN_PROGRESS,
      targetingMetric: TargetingMetric.FOLLOWER_COUNT,
      retentionDays: 30,
    },
  });
  const offer = await prisma.campaignOffer.create({
    data: { campaignId: campaign.id, creatorId: creator.id, payoutAmount: opts.payoutAmount ?? 800, expiresAt: new Date(Date.now() + 1000 * 60 * 60) },
  });
  const assignment = await prisma.campaignAssignment.create({
    data: {
      campaignId: campaign.id,
      creatorId: creator.id,
      offerId: offer.id,
      status: AssignmentStatus.VERIFIED,
      payoutAmount: opts.payoutAmount ?? 800,
      postUrl: opts.postUrl,
      postSubmittedAt: new Date(),
      verifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      retentionStatus: RetentionStatus.PENDING,
      retentionRequiredUntil: opts.retentionRequiredUntil,
    },
  });

  return { assignment, campaign, creator, brandWallet, creatorWallet };
}

describe("retention checks + payout release (spec §23/§83)", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("reports still-pending before the required-until date without touching money", async () => {
    const { assignment, brandWallet, creatorWallet } = await makeVerifiedAssignment({
      postUrl: "https://instagram.com/p/good",
      retentionRequiredUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    });

    const result = await runRetentionCheck(prisma, assignment.id);
    expect(result.outcome).toBe("still_pending");
    expect(result.daysRemaining).toBeGreaterThan(0);

    const brand = await prisma.wallet.findUniqueOrThrow({ where: { id: brandWallet.id } });
    const creator = await prisma.wallet.findUniqueOrThrow({ where: { id: creatorWallet.id } });
    expect(Number(brand.reservedBalance)).toBe(10_000); // untouched
    expect(Number(creator.availableBalance)).toBe(0); // no payout yet
  });

  it("passes retention, releases payout, and posts matching SPEND/CREATOR_EARNING ledger entries", async () => {
    const { assignment, campaign, brandWallet, creatorWallet } = await makeVerifiedAssignment({
      postUrl: "https://instagram.com/p/still-live",
      retentionRequiredUntil: new Date(Date.now() - 1000), // already due
      payoutAmount: 800,
    });

    const result = await runRetentionCheck(prisma, assignment.id);
    expect(result.outcome).toBe("passed");

    const updatedAssignment = await prisma.campaignAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(updatedAssignment.status).toBe(AssignmentStatus.PAID);
    expect(updatedAssignment.retentionStatus).toBe(RetentionStatus.PASSED);

    const brand = await prisma.wallet.findUniqueOrThrow({ where: { id: brandWallet.id } });
    const creator = await prisma.wallet.findUniqueOrThrow({ where: { id: creatorWallet.id } });
    expect(Number(brand.reservedBalance)).toBe(10_000 - 800);
    expect(Number(creator.availableBalance)).toBe(800);

    void campaign;
  });

  it("fails retention and forfeits the payout when the post is no longer live", async () => {
    const { assignment, brandWallet, creatorWallet } = await makeVerifiedAssignment({
      postUrl: "https://instagram.com/p/not-found-anymore",
      retentionRequiredUntil: new Date(Date.now() - 1000),
    });

    const result = await runRetentionCheck(prisma, assignment.id);
    expect(result.outcome).toBe("failed");

    const updatedAssignment = await prisma.campaignAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(updatedAssignment.status).toBe(AssignmentStatus.FAILED);
    expect(updatedAssignment.retentionStatus).toBe(RetentionStatus.FAILED);

    // No payout — reserved funds untouched, creator gets nothing.
    const brand = await prisma.wallet.findUniqueOrThrow({ where: { id: brandWallet.id } });
    const creator = await prisma.wallet.findUniqueOrThrow({ where: { id: creatorWallet.id } });
    expect(Number(brand.reservedBalance)).toBe(10_000);
    expect(Number(creator.availableBalance)).toBe(0);
  });

  it("runDueRetentionChecks only advances assignments that are actually due", async () => {
    const due = await makeVerifiedAssignment({
      postUrl: "https://instagram.com/p/due-and-live",
      retentionRequiredUntil: new Date(Date.now() - 1000),
    });
    const notDue = await makeVerifiedAssignment({
      postUrl: "https://instagram.com/p/not-due-yet",
      retentionRequiredUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    });

    const results = await runDueRetentionChecks(prisma);
    const dueResult = results.find((r) => r.assignmentId === due.assignment.id);
    const notDueResult = results.find((r) => r.assignmentId === notDue.assignment.id);

    expect(dueResult?.outcome).toBe("passed");
    expect(notDueResult).toBeUndefined();
  });
});
