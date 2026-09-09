import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AvailabilityStatus, KycStatus, PrismaClient, WalletOwnerType, WalletTransactionType, WithdrawalStatus } from "@prisma/client";
import {
  approveWithdrawal,
  markWithdrawalFailed,
  markWithdrawalPaid,
  rejectWithdrawal,
  requestWithdrawal,
} from "../src/modules/withdrawals/withdrawals.service";
import { postLedgerTransaction } from "../src/modules/wallet/wallet.service";

const prisma = new PrismaClient();

async function makeFundedCreator(availableBalance: number, kycStatus: KycStatus = KycStatus.VERIFIED) {
  const user = await prisma.user.create({
    data: { email: `creator-${Date.now()}-${Math.random()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
  });
  const creator = await prisma.creator.create({
    data: { userId: user.id, fullName: "Test Creator", displayName: "tc", availability: AvailabilityStatus.AVAILABLE, kycStatus },
  });
  const wallet = await prisma.wallet.create({ data: { ownerType: WalletOwnerType.CREATOR, creatorId: creator.id } });
  if (availableBalance > 0) {
    await postLedgerTransaction(prisma, { walletId: wallet.id, type: WalletTransactionType.CREATOR_EARNING, amount: availableBalance });
  }
  return { creator, wallet };
}

describe("withdrawals (spec §34) — KYC gate + ledger discipline", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects a withdrawal request when KYC isn't verified", async () => {
    const { creator } = await makeFundedCreator(1000, KycStatus.SUBMITTED);
    await expect(requestWithdrawal(prisma, creator.id, 500, "creator@upi")).rejects.toThrow(/KYC must be verified/);
  });

  it("rejects a withdrawal below the minimum amount", async () => {
    const { creator } = await makeFundedCreator(1000);
    await expect(requestWithdrawal(prisma, creator.id, 10, "creator@upi")).rejects.toThrow(/Minimum withdrawal/);
  });

  it("debits available balance immediately on request", async () => {
    const { creator, wallet } = await makeFundedCreator(1000);
    await requestWithdrawal(prisma, creator.id, 400, "creator@upi");

    const updated = await prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    expect(Number(updated.availableBalance)).toBe(600);
  });

  it("rejects a second withdrawal that would overdraw the already-debited balance", async () => {
    const { creator } = await makeFundedCreator(1000);
    await requestWithdrawal(prisma, creator.id, 700, "creator@upi");
    await expect(requestWithdrawal(prisma, creator.id, 700, "creator@upi")).rejects.toThrow(/Insufficient available balance/);
  });

  it("full approve -> mark-paid lifecycle leaves the debit in place (money actually left)", async () => {
    const { creator, wallet } = await makeFundedCreator(1000);
    const withdrawal = await requestWithdrawal(prisma, creator.id, 500, "creator@upi");

    const approved = await approveWithdrawal(prisma, withdrawal.id, "admin-1");
    expect(approved.status).toBe(WithdrawalStatus.APPROVED);

    const paid = await markWithdrawalPaid(prisma, withdrawal.id, "admin-1", "UTR123456789");
    expect(paid.status).toBe(WithdrawalStatus.PAID);
    expect(paid.referenceNumber).toBe("UTR123456789");

    const finalWallet = await prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    expect(Number(finalWallet.availableBalance)).toBe(500); // 1000 - 500, never refunded
  });

  it("rejecting a withdrawal reverses the debit — the creator gets their balance back", async () => {
    const { creator, wallet } = await makeFundedCreator(1000);
    const withdrawal = await requestWithdrawal(prisma, creator.id, 500, "creator@upi");

    let current = await prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    expect(Number(current.availableBalance)).toBe(500);

    const rejected = await rejectWithdrawal(prisma, withdrawal.id, "admin-1", "UPI ID looks invalid");
    expect(rejected.status).toBe(WithdrawalStatus.REJECTED);

    current = await prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    expect(Number(current.availableBalance)).toBe(1000); // fully restored
  });

  it("marking an approved withdrawal failed also reverses the debit", async () => {
    const { creator, wallet } = await makeFundedCreator(1000);
    const withdrawal = await requestWithdrawal(prisma, creator.id, 300, "creator@upi");
    await approveWithdrawal(prisma, withdrawal.id, "admin-1");

    const failed = await markWithdrawalFailed(prisma, withdrawal.id, "admin-1", "Bank rejected the transfer");
    expect(failed.status).toBe(WithdrawalStatus.FAILED);

    const current = await prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    expect(Number(current.availableBalance)).toBe(1000);
  });

  it("cannot mark a withdrawal paid before it's approved", async () => {
    const { creator } = await makeFundedCreator(1000);
    const withdrawal = await requestWithdrawal(prisma, creator.id, 200, "creator@upi");
    await expect(markWithdrawalPaid(prisma, withdrawal.id, "admin-1", "REF1")).rejects.toThrow(/must be APPROVED/);
  });

  it("cannot approve the same withdrawal twice", async () => {
    const { creator } = await makeFundedCreator(1000);
    const withdrawal = await requestWithdrawal(prisma, creator.id, 200, "creator@upi");
    await approveWithdrawal(prisma, withdrawal.id, "admin-1");
    await expect(approveWithdrawal(prisma, withdrawal.id, "admin-1")).rejects.toThrow(/cannot be approved from status/);
  });
});
