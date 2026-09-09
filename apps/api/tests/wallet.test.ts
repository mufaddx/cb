import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient, WalletOwnerType, WalletTransactionType } from "@prisma/client";
import { postLedgerTransaction } from "../src/modules/wallet/wallet.service";

const prisma = new PrismaClient();

async function makeBrandWithWallet() {
  const user = await prisma.user.create({
    data: { email: `brand-${Date.now()}-${Math.random()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
  });
  const brand = await prisma.brand.create({
    data: { userId: user.id, companyName: "Test Co", contactPerson: "Jane Doe" },
  });
  const wallet = await prisma.wallet.create({ data: { ownerType: WalletOwnerType.BRAND, brandId: brand.id } });
  return wallet;
}

describe("wallet ledger (spec §59)", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("DEPOSIT increases available balance and writes an immutable ledger row", async () => {
    const wallet = await makeBrandWithWallet();

    const { availableBalance } = await postLedgerTransaction(prisma, {
      walletId: wallet.id,
      type: WalletTransactionType.DEPOSIT,
      amount: 5000,
      referenceType: "TEST",
    });

    expect(availableBalance.toString()).toBe("5000");
    const txRows = await prisma.walletTransaction.findMany({ where: { walletId: wallet.id } });
    expect(txRows).toHaveLength(1);
    expect(txRows[0].type).toBe(WalletTransactionType.DEPOSIT);
  });

  it("RESERVE moves funds from available to reserved, never touching the other wallet rows", async () => {
    const wallet = await makeBrandWithWallet();
    await postLedgerTransaction(prisma, { walletId: wallet.id, type: WalletTransactionType.DEPOSIT, amount: 1000 });

    const { availableBalance, reservedBalance } = await postLedgerTransaction(prisma, {
      walletId: wallet.id,
      type: WalletTransactionType.RESERVE,
      amount: 400,
    });

    expect(availableBalance.toString()).toBe("600");
    expect(reservedBalance.toString()).toBe("400");
  });

  it("rejects a debit that would push available balance negative", async () => {
    const wallet = await makeBrandWithWallet();
    await postLedgerTransaction(prisma, { walletId: wallet.id, type: WalletTransactionType.DEPOSIT, amount: 100 });

    await expect(
      postLedgerTransaction(prisma, { walletId: wallet.id, type: WalletTransactionType.SPEND, amount: 50 })
    ).rejects.toThrow(/Insufficient reserved balance/);

    await expect(
      postLedgerTransaction(prisma, { walletId: wallet.id, type: WalletTransactionType.WITHDRAWAL, amount: 500 })
    ).rejects.toThrow(/Insufficient available balance/);

    // Balance must be unchanged after the rejected attempts.
    const fresh = await prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    expect(fresh.availableBalance.toString()).toBe("100");
  });

  it("serializes concurrent postings so balance never goes negative under a race", async () => {
    const wallet = await makeBrandWithWallet();
    await postLedgerTransaction(prisma, { walletId: wallet.id, type: WalletTransactionType.DEPOSIT, amount: 100 });

    // Fire 5 concurrent withdrawals of 30 against a balance of 100 —
    // at most 3 should succeed (90 total); the rest must be rejected,
    // never allowed to drive the balance negative.
    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        postLedgerTransaction(prisma, { walletId: wallet.id, type: WalletTransactionType.WITHDRAWAL, amount: 30 })
      )
    );

    const succeeded = attempts.filter((a) => a.status === "fulfilled").length;
    expect(succeeded).toBeLessThanOrEqual(3);

    const fresh = await prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    expect(Number(fresh.availableBalance)).toBeGreaterThanOrEqual(0);
    expect(Number(fresh.availableBalance)).toBe(100 - succeeded * 30);
  });
});
