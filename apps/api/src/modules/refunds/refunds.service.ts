import { PaymentStatus as PrismaPaymentStatus, PrismaClient, RefundStatus as PrismaRefundStatus, WalletTransactionType } from "@prisma/client";
import { AuditAction, PAYMENT_TRANSITIONS, PaymentStatus, REFUND_TRANSITIONS, RefundStatus, assertTransition } from "@antigravity/shared";
import { ConflictError, NotFoundError, ValidationError } from "../../lib/errors";
import { recordAudit } from "../audit/audit.service";
import { getOrCreateWalletForBrand, postLedgerEntryWithinTx } from "../wallet/wallet.service";
import { getPaymentProvider } from "../../services/payment";

/**
 * Issues a refund against a PAID (or already partially-refunded)
 * payment (spec §84). Synchronous in this build — the mock/Razorpay
 * adapter's `createRefund` returns a final status in its HTTP
 * response, so REQUESTED -> PROCESSING -> COMPLETED all happen in one
 * call. A real async-settlement provider would instead leave this at
 * PROCESSING and complete it via a webhook, mirroring
 * `payments.service.ts::handleWebhookEvent` — that webhook path isn't
 * built since the mock/Razorpay flow used here doesn't need it.
 *
 * Campaign status is deliberately left untouched: a refund can be
 * partial (one creator's forfeited payout, while the rest of the
 * campaign continues) or full (paired with a separate
 * cancel/dispute-resolve action) — conflating the two would force a
 * campaign transition that doesn't always apply.
 */
export async function issueRefund(
  prisma: PrismaClient,
  paymentId: string,
  adminId: string,
  amount: number,
  reason: string
) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { refunds: true } });
  if (!payment) throw new NotFoundError("Payment not found");
  if (!payment.providerPaymentId) {
    throw new ConflictError("This payment has no provider payment id to refund against");
  }
  if (!payment.campaignId) {
    // This flow's ledger reversal (WalletTransactionType.REFUND) debits
    // reservedBalance, which a wallet top-up never has any of — it went
    // straight to availableBalance with no RESERVE step. Refunding a
    // top-up needs a different debit path; not built yet.
    throw new ConflictError("Wallet top-ups and credit-pack purchases can't be refunded from this screen yet — this only handles campaign payments.");
  }
  // Captured as a local so it stays narrowed to `string` inside the
  // $transaction closure below — TS can't carry the guard above's
  // narrowing of `payment.campaignId` into a separate function scope.
  const campaignId = payment.campaignId;
  if (payment.status !== PrismaPaymentStatus.PAID && payment.status !== PrismaPaymentStatus.PARTIALLY_REFUNDED) {
    throw new ConflictError(`Payment cannot be refunded from status ${payment.status}`);
  }

  const alreadyRefunded = payment.refunds
    .filter((r) => r.status === PrismaRefundStatus.COMPLETED)
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const remaining = Number(payment.amount) - alreadyRefunded;
  if (amount > remaining) {
    throw new ValidationError(`Refund amount ₹${amount} exceeds the refundable remainder of ₹${remaining.toFixed(2)}`);
  }

  const provider = getPaymentProvider();
  const providerResult = await provider.createRefund({
    providerPaymentId: payment.providerPaymentId,
    amount,
    reason,
  });

  return prisma.$transaction(async (tx) => {
    const refund = await tx.refund.create({
      data: { paymentId, amount, reason, initiatedBy: adminId, status: PrismaRefundStatus.REQUESTED },
    });

    assertTransition("Refund", REFUND_TRANSITIONS, RefundStatus.REQUESTED, RefundStatus.PROCESSING);
    assertTransition("Refund", REFUND_TRANSITIONS, RefundStatus.PROCESSING, RefundStatus.COMPLETED);
    const updatedRefund = await tx.refund.update({
      where: { id: refund.id },
      data: {
        status: PrismaRefundStatus.COMPLETED,
        providerRefundId: providerResult.providerRefundId,
        processedAt: new Date(),
      },
    });

    const wallet = await getOrCreateWalletForBrand(tx, payment.brandId);
    await postLedgerEntryWithinTx(tx, {
      walletId: wallet.id,
      type: WalletTransactionType.REFUND,
      amount,
      referenceType: "REFUND",
      referenceId: refund.id,
      campaignId,
    });

    const willBeFullyRefunded = alreadyRefunded + amount >= Number(payment.amount) - 0.01;
    assertTransition("Payment", PAYMENT_TRANSITIONS, payment.status as PaymentStatus, PaymentStatus.REFUND_PENDING);
    await tx.payment.update({ where: { id: paymentId }, data: { status: PrismaPaymentStatus.REFUND_PENDING } });
    const finalStatus = willBeFullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
    assertTransition("Payment", PAYMENT_TRANSITIONS, PaymentStatus.REFUND_PENDING, finalStatus);
    await tx.payment.update({ where: { id: paymentId }, data: { status: finalStatus as PrismaPaymentStatus } });

    await recordAudit(tx, {
      actorId: adminId,
      actorRole: "FINANCE_ADMIN",
      action: AuditAction.REFUND_CREATED,
      entityType: "Refund",
      entityId: refund.id,
      newValue: { amount, reason },
      metadata: { paymentId, campaignId },
    });

    return updatedRefund;
  });
}

export async function listRefundsForPayment(prisma: PrismaClient, paymentId: string) {
  return prisma.refund.findMany({ where: { paymentId }, orderBy: { createdAt: "desc" } });
}
