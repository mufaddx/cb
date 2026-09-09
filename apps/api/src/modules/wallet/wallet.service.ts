import { Prisma, PrismaClient, WalletOwnerType, WalletTransactionType } from "@prisma/client";
import { CREDIT_TYPES, DEBIT_TYPES } from "@antigravity/shared";
import { ConflictError, NotFoundError } from "../../lib/errors";

export interface PostLedgerTransactionInput {
  walletId: string;
  type: WalletTransactionType;
  amount: number; // always positive; `type` implies credit/debit direction
  referenceType?: string;
  referenceId?: string;
  campaignId?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
}

/**
 * The ONLY sanctioned way to change a wallet balance (spec §59:
 * "Never directly modify wallet balance without ledger transaction.
 * Prevent negative balances. Use database transactions.").
 *
 * Every caller — payment webhook, payout release, refund, withdrawal —
 * goes through this function. It:
 *   1. Locks the wallet row (SELECT ... FOR UPDATE) inside a DB
 *      transaction so concurrent postings can't race past the balance
 *      check.
 *   2. Computes the new balance and rejects the write if it would go
 *      negative.
 *   3. Writes the wallet_transactions row and the updated wallet
 *      balance atomically.
 *
 * RESERVE/RELEASE move money between `availableBalance` and
 * `reservedBalance` on the same wallet; SPEND/WITHDRAWAL/TAX/FEE debit
 * `availableBalance` directly; DEPOSIT/CREATOR_EARNING/REFUND/REVERSAL
 * credit `availableBalance`.
 */
/**
 * Core posting logic, usable both standalone and nested inside a
 * caller's own `$transaction` (e.g. the payment webhook handler, which
 * must post two ledger entries and update Payment/Campaign atomically).
 * Prisma does not support nesting `$transaction` calls, so callers that
 * already hold a `Prisma.TransactionClient` must use this directly
 * instead of `postLedgerTransaction`.
 */
export async function postLedgerEntryWithinTx(
  tx: Prisma.TransactionClient,
  input: PostLedgerTransactionInput
) {
  if (input.amount <= 0) {
    throw new ConflictError("Ledger transaction amount must be positive");
  }

  const rows = await tx.$queryRaw<
    Array<{ id: string; available_balance: string; reserved_balance: string }>
  >(Prisma.sql`SELECT id, available_balance, reserved_balance FROM wallets WHERE id = ${input.walletId} FOR UPDATE`);

  const wallet = rows[0];
  if (!wallet) throw new NotFoundError(`Wallet ${input.walletId} not found`);

  const available = new Prisma.Decimal(wallet.available_balance);
  const reserved = new Prisma.Decimal(wallet.reserved_balance);
  const amount = new Prisma.Decimal(input.amount);

  let newAvailable = available;
  let newReserved = reserved;

  switch (input.type) {
    case WalletTransactionType.RESERVE:
      newAvailable = available.minus(amount);
      newReserved = reserved.plus(amount);
      break;
    case WalletTransactionType.RELEASE:
      newAvailable = available.plus(amount);
      newReserved = reserved.minus(amount);
      break;
    case WalletTransactionType.SPEND:
      // Spend draws down the reserved balance (funds already
      // committed to a campaign at payment time), not available.
      newReserved = reserved.minus(amount);
      break;
    case WalletTransactionType.REFUND:
      // A brand refund returns money from the reserved pot back out
      // to the brand's payment method via the provider — it leaves
      // the platform, it does not become available to spend again.
      newReserved = reserved.minus(amount);
      break;
    default:
      if ((CREDIT_TYPES as WalletTransactionType[]).includes(input.type)) {
        newAvailable = available.plus(amount);
      } else if ((DEBIT_TYPES as WalletTransactionType[]).includes(input.type)) {
        newAvailable = available.minus(amount);
      }
  }

  if (newAvailable.isNegative()) {
    throw new ConflictError(
      `Insufficient available balance: ${available.toFixed(2)} - ${amount.toFixed(2)} would go negative`
    );
  }
  if (newReserved.isNegative()) {
    throw new ConflictError(
      `Insufficient reserved balance: ${reserved.toFixed(2)} - ${amount.toFixed(2)} would go negative`
    );
  }

  await tx.wallet.update({
    where: { id: input.walletId },
    data: { availableBalance: newAvailable, reservedBalance: newReserved },
  });

  const transaction = await tx.walletTransaction.create({
    data: {
      walletId: input.walletId,
      type: input.type,
      amount: amount,
      balanceAfter: newAvailable,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      campaignId: input.campaignId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      createdBy: input.createdBy,
    },
  });

  return { transaction, availableBalance: newAvailable, reservedBalance: newReserved };
}

export async function postLedgerTransaction(
  prisma: PrismaClient,
  input: PostLedgerTransactionInput
) {
  return prisma.$transaction(async (tx) => postLedgerEntryWithinTx(tx, input));
}

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function getOrCreateWalletForBrand(db: DbClient, brandId: string) {
  const existing = await db.wallet.findUnique({ where: { brandId } });
  if (existing) return existing;
  return db.wallet.create({ data: { ownerType: WalletOwnerType.BRAND, brandId } });
}

export async function getOrCreateWalletForCreator(db: DbClient, creatorId: string) {
  const existing = await db.wallet.findUnique({ where: { creatorId } });
  if (existing) return existing;
  return db.wallet.create({ data: { ownerType: WalletOwnerType.CREATOR, creatorId } });
}
