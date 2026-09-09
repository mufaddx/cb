import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CampaignStatus, CampaignType, PaymentStatus, PrismaClient, TargetingMetric, WalletOwnerType, WalletTransactionType } from "@prisma/client";
import { issueRefund } from "../src/modules/refunds/refunds.service";
import { postLedgerTransaction } from "../src/modules/wallet/wallet.service";

const prisma = new PrismaClient();

async function makePaidCampaignWithReservedWallet(paymentAmount: number) {
  const brandUser = await prisma.user.create({
    data: { email: `brand-${Date.now()}-${Math.random()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
  });
  const brand = await prisma.brand.create({ data: { userId: brandUser.id, companyName: "Test Brand", contactPerson: "Jane" } });
  const wallet = await prisma.wallet.create({ data: { ownerType: WalletOwnerType.BRAND, brandId: brand.id } });
  await postLedgerTransaction(prisma, { walletId: wallet.id, type: WalletTransactionType.DEPOSIT, amount: paymentAmount });
  await postLedgerTransaction(prisma, { walletId: wallet.id, type: WalletTransactionType.RESERVE, amount: paymentAmount });

  const campaign = await prisma.campaign.create({
    data: {
      code: `CMP-${Date.now()}-${Math.random()}`,
      brandId: brand.id,
      type: CampaignType.CLIPPING,
      title: "Refund test campaign",
      description: "For refund tests",
      status: CampaignStatus.LIVE,
      targetingMetric: TargetingMetric.FOLLOWER_COUNT,
    },
  });

  const payment = await prisma.payment.create({
    data: {
      campaignId: campaign.id,
      brandId: brand.id,
      provider: "mock",
      providerOrderId: `mock_order_${Date.now()}`,
      providerPaymentId: `mock_pay_${Date.now()}`,
      amount: paymentAmount,
      status: PaymentStatus.PAID,
      idempotencyKey: `${campaign.id}:1`,
    },
  });

  return { brand, wallet, campaign, payment };
}

describe("refunds (spec §84) — ledger discipline + payment status", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("a full refund decrements reserved balance and marks the payment REFUNDED", async () => {
    const { wallet, payment } = await makePaidCampaignWithReservedWallet(1000);

    const refund = await issueRefund(prisma, payment.id, "admin-1", 1000, "Campaign cancelled before matching");
    expect(refund.status).toBe("COMPLETED");

    const updatedPayment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(updatedPayment.status).toBe(PaymentStatus.REFUNDED);

    const updatedWallet = await prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    expect(Number(updatedWallet.reservedBalance)).toBe(0);
    expect(Number(updatedWallet.availableBalance)).toBe(0); // refund never touches available
  });

  it("a partial refund marks the payment PARTIALLY_REFUNDED and leaves the rest reserved", async () => {
    const { wallet, payment } = await makePaidCampaignWithReservedWallet(1000);

    await issueRefund(prisma, payment.id, "admin-1", 300, "One creator's payout forfeited");

    const updatedPayment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(updatedPayment.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);

    const updatedWallet = await prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    expect(Number(updatedWallet.reservedBalance)).toBe(700);
  });

  it("rejects a refund that would exceed the payment's remaining refundable amount", async () => {
    const { payment } = await makePaidCampaignWithReservedWallet(1000);
    await issueRefund(prisma, payment.id, "admin-1", 600, "Partial issue");

    await expect(issueRefund(prisma, payment.id, "admin-1", 600, "Too much")).rejects.toThrow(/exceeds the refundable remainder/);
  });

  it("two partial refunds summing to the full amount end with the payment REFUNDED", async () => {
    const { wallet, payment } = await makePaidCampaignWithReservedWallet(1000);
    await issueRefund(prisma, payment.id, "admin-1", 400, "First partial");
    await issueRefund(prisma, payment.id, "admin-1", 600, "Second partial, now complete");

    const updatedPayment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(updatedPayment.status).toBe(PaymentStatus.REFUNDED);

    const updatedWallet = await prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    expect(Number(updatedWallet.reservedBalance)).toBe(0);
  });

  it("rejects refunding a payment that was never PAID", async () => {
    const { campaign, brand } = await makePaidCampaignWithReservedWallet(1000);
    const unpaidPayment = await prisma.payment.create({
      data: {
        campaignId: campaign.id,
        brandId: brand.id,
        provider: "mock",
        providerOrderId: `mock_order_unpaid_${Date.now()}`,
        amount: 500,
        status: PaymentStatus.PENDING,
        idempotencyKey: `${campaign.id}:2`,
      },
    });
    await expect(issueRefund(prisma, unpaidPayment.id, "admin-1", 100, "test")).rejects.toThrow(/cannot be refunded from status|no provider payment id/);
  });
});
