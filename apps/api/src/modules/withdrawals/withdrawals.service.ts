import { PrismaClient, WithdrawalStatus as PrismaWithdrawalStatus, WalletTransactionType } from "@prisma/client";
import { AuditAction, KycStatus, WITHDRAWAL_TRANSITIONS, WithdrawalStatus, assertTransition } from "@antigravity/shared";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../../lib/errors";
import { recordAudit } from "../audit/audit.service";
import { postLedgerEntryWithinTx } from "../wallet/wallet.service";
import { MIN_WITHDRAWAL_AMOUNT } from "./withdrawals.validation";

/**
 * Creator requests a withdrawal (spec §34). The requested amount is
 * debited from `availableBalance` immediately via a WITHDRAWAL ledger
 * entry — not deferred to admin approval — so:
 *   - the existing row-locked ledger machinery is what prevents a
 *     second concurrent request from over-drawing the balance (no
 *     separate "pending withdrawal" check needed, no race window), and
 *   - a rejection/failure simply reverses the debit (REVERSAL),
 *     rather than needing a parallel "was this ever actually reserved"
 *     bookkeeping system.
 */
export async function requestWithdrawal(prisma: PrismaClient, creatorId: string, amount: number, upiId: string) {
  if (amount < MIN_WITHDRAWAL_AMOUNT) {
    throw new ValidationError(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL_AMOUNT}`);
  }

  const creator = await prisma.creator.findUniqueOrThrow({ where: { id: creatorId } });
  if (creator.kycStatus !== KycStatus.VERIFIED) {
    throw new ConflictError("KYC must be verified before requesting a withdrawal");
  }

  const wallet = await prisma.wallet.findUnique({ where: { creatorId } });
  if (!wallet) throw new NotFoundError("Wallet not found");

  return prisma.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawal.create({
      data: { creatorId, walletId: wallet.id, amount, upiId, status: PrismaWithdrawalStatus.REQUESTED },
    });

    // postLedgerEntryWithinTx's row lock + negative-balance guard is
    // what actually enforces "sufficient available balance" — this
    // isn't a separate check, it's the ledger doing its one job. If
    // the balance can't cover it, this throws and the withdrawal
    // insert above rolls back with it.
    await postLedgerEntryWithinTx(tx, {
      walletId: wallet.id,
      type: WalletTransactionType.WITHDRAWAL,
      amount,
      referenceType: "WITHDRAWAL",
      referenceId: withdrawal.id,
    });

    await recordAudit(tx, {
      actorId: creatorId,
      actorRole: "CREATOR",
      action: AuditAction.WITHDRAWAL_REQUESTED,
      entityType: "Withdrawal",
      entityId: withdrawal.id,
      newValue: { amount, upiId },
    });

    return withdrawal;
  });
}

export async function listMyWithdrawals(prisma: PrismaClient, creatorId: string) {
  return prisma.withdrawal.findMany({ where: { creatorId }, orderBy: { requestedAt: "desc" } });
}

export async function listWithdrawalQueue(prisma: PrismaClient) {
  return prisma.withdrawal.findMany({
    where: { status: { in: [PrismaWithdrawalStatus.REQUESTED, PrismaWithdrawalStatus.UNDER_REVIEW, PrismaWithdrawalStatus.APPROVED] } },
    include: { creator: { select: { id: true, fullName: true, displayName: true, kycStatus: true } } },
    orderBy: { requestedAt: "asc" },
  });
}

async function loadWithdrawal(prisma: PrismaClient, withdrawalId: string) {
  const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
  if (!withdrawal) throw new NotFoundError("Withdrawal not found");
  return withdrawal;
}

export async function approveWithdrawal(prisma: PrismaClient, withdrawalId: string, adminId: string) {
  const withdrawal = await loadWithdrawal(prisma, withdrawalId);
  if (withdrawal.status !== PrismaWithdrawalStatus.REQUESTED && withdrawal.status !== PrismaWithdrawalStatus.UNDER_REVIEW) {
    throw new ConflictError(`Withdrawal cannot be approved from status ${withdrawal.status}`);
  }

  return prisma.$transaction(async (tx) => {
    if (withdrawal.status === PrismaWithdrawalStatus.REQUESTED) {
      assertTransition("Withdrawal", WITHDRAWAL_TRANSITIONS, WithdrawalStatus.REQUESTED, WithdrawalStatus.UNDER_REVIEW);
      await tx.withdrawal.update({ where: { id: withdrawalId }, data: { status: PrismaWithdrawalStatus.UNDER_REVIEW } });
    }
    assertTransition("Withdrawal", WITHDRAWAL_TRANSITIONS, WithdrawalStatus.UNDER_REVIEW, WithdrawalStatus.APPROVED);
    const updated = await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: PrismaWithdrawalStatus.APPROVED, reviewedAt: new Date(), reviewedBy: adminId },
    });
    await recordAudit(tx, {
      actorId: adminId,
      actorRole: "FINANCE_ADMIN",
      action: AuditAction.WITHDRAWAL_APPROVED,
      entityType: "Withdrawal",
      entityId: withdrawalId,
    });
    return updated;
  });
}

export async function rejectWithdrawal(prisma: PrismaClient, withdrawalId: string, adminId: string, reason: string) {
  const withdrawal = await loadWithdrawal(prisma, withdrawalId);
  if (withdrawal.status !== PrismaWithdrawalStatus.REQUESTED && withdrawal.status !== PrismaWithdrawalStatus.UNDER_REVIEW) {
    throw new ConflictError(`Withdrawal cannot be rejected from status ${withdrawal.status}`);
  }

  return prisma.$transaction(async (tx) => {
    assertTransition("Withdrawal", WITHDRAWAL_TRANSITIONS, withdrawal.status as WithdrawalStatus, WithdrawalStatus.REJECTED);
    const updated = await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: PrismaWithdrawalStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason: reason,
      },
    });

    // Reverse the debit posted at request time — the creator never
    // actually forfeits funds for a rejected request.
    await postLedgerEntryWithinTx(tx, {
      walletId: withdrawal.walletId,
      type: WalletTransactionType.REVERSAL,
      amount: Number(withdrawal.amount),
      referenceType: "WITHDRAWAL",
      referenceId: withdrawalId,
    });

    await recordAudit(tx, {
      actorId: adminId,
      actorRole: "FINANCE_ADMIN",
      action: AuditAction.WITHDRAWAL_REJECTED,
      entityType: "Withdrawal",
      entityId: withdrawalId,
      metadata: { reason },
    });
    return updated;
  });
}

/**
 * Creator cancels their own withdrawal request — same terminal state
 * and ledger reversal as an admin rejection (rejectWithdrawal below),
 * just actor-initiated and only while nothing has actually started
 * moving (REQUESTED/UNDER_REVIEW). Once APPROVED an admin is already
 * acting on it, so cancellation stops being offered from here.
 * Distinguished from an admin rejection by `reviewedBy` staying null.
 */
export async function cancelWithdrawal(prisma: PrismaClient, creatorId: string, withdrawalId: string) {
  const withdrawal = await loadWithdrawal(prisma, withdrawalId);
  if (withdrawal.creatorId !== creatorId) throw new UnauthorizedError();
  if (withdrawal.status !== PrismaWithdrawalStatus.REQUESTED && withdrawal.status !== PrismaWithdrawalStatus.UNDER_REVIEW) {
    throw new ConflictError(`This withdrawal can no longer be cancelled (current status: ${withdrawal.status})`);
  }

  return prisma.$transaction(async (tx) => {
    assertTransition("Withdrawal", WITHDRAWAL_TRANSITIONS, withdrawal.status as WithdrawalStatus, WithdrawalStatus.REJECTED);
    const updated = await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: PrismaWithdrawalStatus.REJECTED, reviewedAt: new Date(), rejectionReason: "Cancelled by creator" },
    });

    await postLedgerEntryWithinTx(tx, {
      walletId: withdrawal.walletId,
      type: WalletTransactionType.REVERSAL,
      amount: Number(withdrawal.amount),
      referenceType: "WITHDRAWAL",
      referenceId: withdrawalId,
    });

    await recordAudit(tx, {
      actorId: creatorId,
      actorRole: "CREATOR",
      action: AuditAction.WITHDRAWAL_REJECTED,
      entityType: "Withdrawal",
      entityId: withdrawalId,
      metadata: { reason: "Cancelled by creator" },
    });
    return updated;
  });
}

export async function markWithdrawalPaid(
  prisma: PrismaClient,
  withdrawalId: string,
  adminId: string,
  referenceNumber: string,
  proofKey?: string
) {
  const withdrawal = await loadWithdrawal(prisma, withdrawalId);
  if (withdrawal.status !== PrismaWithdrawalStatus.APPROVED) {
    throw new ConflictError(`Withdrawal must be APPROVED before it can be marked paid (current status: ${withdrawal.status})`);
  }

  return prisma.$transaction(async (tx) => {
    assertTransition("Withdrawal", WITHDRAWAL_TRANSITIONS, WithdrawalStatus.APPROVED, WithdrawalStatus.PAID);
    const updated = await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: PrismaWithdrawalStatus.PAID, paidAt: new Date(), referenceNumber, proofKey },
    });
    await recordAudit(tx, {
      actorId: adminId,
      actorRole: "FINANCE_ADMIN",
      action: AuditAction.WITHDRAWAL_PAID,
      entityType: "Withdrawal",
      entityId: withdrawalId,
      newValue: { referenceNumber },
    });
    return updated;
  });
}

/**
 * Marks a withdrawal FAILED (e.g. the UPI transfer bounced) and
 * reverses the debit. This is intentionally a dead end in this slice
 * — the state machine permits FAILED -> UNDER_REVIEW for a retry, but
 * re-locking funds on retry is a separate, not-yet-built code path.
 * For now, a failed withdrawal's creator simply submits a new request.
 */
export async function markWithdrawalFailed(prisma: PrismaClient, withdrawalId: string, adminId: string, reason: string) {
  const withdrawal = await loadWithdrawal(prisma, withdrawalId);
  if (withdrawal.status !== PrismaWithdrawalStatus.APPROVED) {
    throw new ConflictError(`Only an APPROVED withdrawal can be marked failed (current status: ${withdrawal.status})`);
  }

  return prisma.$transaction(async (tx) => {
    assertTransition("Withdrawal", WITHDRAWAL_TRANSITIONS, WithdrawalStatus.APPROVED, WithdrawalStatus.FAILED);
    const updated = await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: PrismaWithdrawalStatus.FAILED, rejectionReason: reason },
    });
    await postLedgerEntryWithinTx(tx, {
      walletId: withdrawal.walletId,
      type: WalletTransactionType.REVERSAL,
      amount: Number(withdrawal.amount),
      referenceType: "WITHDRAWAL",
      referenceId: withdrawalId,
    });
    return updated;
  });
}
