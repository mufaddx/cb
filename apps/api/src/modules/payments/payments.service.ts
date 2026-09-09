import { CampaignStatus as PrismaCampaignStatus, PaymentStatus as PrismaPaymentStatus, PrismaClient, WalletTransactionType } from "@prisma/client";
import {
  AuditAction,
  CAMPAIGN_TRANSITIONS,
  CampaignStatus,
  PAYMENT_TRANSITIONS,
  PaymentStatus,
  assertTransition,
} from "@antigravity/shared";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../../lib/errors";
import { recordAudit } from "../audit/audit.service";
import { getOrCreateWalletForBrand, postLedgerEntryWithinTx } from "../wallet/wallet.service";
import { getPaymentProvider } from "../../services/payment";
import { logger } from "../../lib/logger";

/**
 * Brand initiates payment for an APPROVED-then-PAYMENT_PENDING
 * campaign (spec §31/§82). This only ever creates a payment intent —
 * it NEVER marks the payment or campaign as paid. That happens
 * exclusively in `handleWebhookEvent`, driven by the provider's signed
 * webhook, per "Never trust frontend payment result."
 */
export async function initiateCampaignPayment(prisma: PrismaClient, campaignId: string, brandId: string) {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { pricingSnapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (campaign.brandId !== brandId) throw new UnauthorizedError();
  if (campaign.status !== PrismaCampaignStatus.PAYMENT_PENDING) {
    throw new ConflictError(`Campaign is not awaiting payment (current status: ${campaign.status})`);
  }
  const snapshot = campaign.pricingSnapshots[0];
  if (!snapshot) throw new ValidationError("Campaign has no pricing snapshot");

  // Idempotent: reuse an existing non-terminal payment intent instead
  // of creating a duplicate order for the same campaign.
  const existing = await prisma.payment.findFirst({
    where: { campaignId, status: { in: [PrismaPaymentStatus.CREATED, PrismaPaymentStatus.PENDING, PrismaPaymentStatus.PROCESSING] } },
    orderBy: { createdAt: "desc" },
  });
  if (existing && existing.providerOrderId) {
    return { payment: existing, checkoutPayload: { reused: true, providerOrderId: existing.providerOrderId } };
  }

  const attempt = (await prisma.payment.count({ where: { campaignId } })) + 1;
  const idempotencyKey = `${campaignId}:${attempt}`;
  const amount = Number(snapshot.totalAmount);

  const provider = getPaymentProvider();
  const intent = await provider.createPaymentIntent({
    amount,
    currency: "INR",
    receiptId: idempotencyKey,
    notes: { campaignId, brandId },
  });

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        campaignId,
        brandId,
        provider: process.env.PAYMENT_PROVIDER ?? "mock",
        providerOrderId: intent.providerOrderId,
        amount,
        currency: "INR",
        status: PrismaPaymentStatus.PENDING,
        idempotencyKey,
      },
    });
    await recordAudit(tx, {
      actorId: brandId,
      actorRole: "BRAND",
      action: AuditAction.PAYMENT_INITIATED,
      entityType: "Payment",
      entityId: created.id,
      newValue: { amount, providerOrderId: intent.providerOrderId },
      metadata: { campaignId },
    });
    return created;
  });

  return { payment, checkoutPayload: intent.checkoutPayload };
}

/**
 * The single, trusted path by which a Payment can ever become PAID
 * (spec §31). Steps, all inside one DB transaction:
 *   1. Verify the provider's webhook signature — reject if invalid.
 *   2. Deduplicate by (provider, providerEventId) — a replayed webhook
 *      returns success without double-processing (spec §31).
 *   3. Verify the amount matches what we expect.
 *   4. Transition Payment -> PAID (enforced by PAYMENT_TRANSITIONS).
 *   5. Post two ledger entries: DEPOSIT (funds received from the
 *      brand) then RESERVE (committed to this campaign) — never a
 *      direct balance mutation.
 *   6. Transition Campaign PAID -> LIVE.
 *   7. Record the event as processed.
 */
export async function handleWebhookEvent(
  prisma: PrismaClient,
  rawBody: string | Buffer,
  signatureHeader: string | undefined
): Promise<{ status: string }> {
  const provider = getPaymentProvider();
  const signatureValid = provider.verifyWebhookSignature({ rawBody, signatureHeader });

  if (!signatureValid) {
    logger.warn({ signatureHeader }, "Rejected payment webhook: invalid signature");
    throw new ValidationError("Invalid webhook signature");
  }

  const event = provider.parseWebhookEvent(rawBody);
  const providerName = process.env.PAYMENT_PROVIDER ?? "mock";

  return prisma.$transaction(async (tx) => {
    // Idempotency: the unique (provider, providerEventId) constraint
    // means a concurrent/replayed delivery of the same event fails
    // here and is treated as an already-processed success below.
    const existingEvent = await tx.paymentEvent.findUnique({
      where: { provider_providerEventId: { provider: providerName, providerEventId: event.providerEventId } },
    });
    if (existingEvent) {
      return { status: "already_processed" };
    }

    const payment = event.providerOrderId
      ? await tx.payment.findFirst({ where: { providerOrderId: event.providerOrderId } })
      : null;

    await tx.paymentEvent.create({
      data: {
        paymentId: payment?.id,
        provider: providerName,
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        payloadJson: event.payload as any,
        signatureValid: true,
        processedAt: new Date(),
      },
    });

    if (!payment) {
      logger.warn({ event }, "Payment webhook referenced an unknown order — recorded for reconciliation");
      return { status: "unmatched_order" };
    }

    const isCaptured = /captured|paid|success/i.test(event.eventType);
    const isFailed = /failed|declined/i.test(event.eventType);

    if (isCaptured) {
      // Defense in depth beyond the (provider, providerEventId) dedup
      // above: if this payment is already PAID (e.g. a provider sends
      // a second "captured" event under a different event id after a
      // delivery-status hiccup), treat it as an already-processed
      // success instead of re-running ledger postings.
      if (payment.status === PrismaPaymentStatus.PAID) {
        return { status: "already_processed" };
      }

      if (event.amount !== undefined && Math.abs(event.amount - Number(payment.amount)) > 0.01) {
        throw new ConflictError(
          `Webhook amount ${event.amount} does not match expected payment amount ${payment.amount}`
        );
      }

      assertTransition("Payment", PAYMENT_TRANSITIONS, payment.status as PaymentStatus, PaymentStatus.PAID);
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PrismaPaymentStatus.PAID, providerPaymentId: event.providerPaymentId },
      });
      await recordAudit(tx, {
        actorId: null,
        actorRole: "SYSTEM",
        action: AuditAction.PAYMENT_RECEIVED,
        entityType: "Payment",
        entityId: payment.id,
        newValue: { status: "PAID" },
      });

      const wallet = await getOrCreateWalletForBrand(tx, payment.brandId);
      await postLedgerEntryWithinTx(tx, {
        walletId: wallet.id,
        type: WalletTransactionType.DEPOSIT,
        amount: Number(payment.amount),
        referenceType: "PAYMENT",
        referenceId: payment.id,
        campaignId: payment.campaignId,
      });
      await postLedgerEntryWithinTx(tx, {
        walletId: wallet.id,
        type: WalletTransactionType.RESERVE,
        amount: Number(payment.amount),
        referenceType: "CAMPAIGN",
        referenceId: payment.campaignId,
        campaignId: payment.campaignId,
      });
      await recordAudit(tx, {
        actorId: null,
        actorRole: "SYSTEM",
        action: AuditAction.FUNDS_RESERVED,
        entityType: "Campaign",
        entityId: payment.campaignId,
        newValue: { amount: Number(payment.amount) },
      });

      const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: payment.campaignId } });
      assertTransition("Campaign", CAMPAIGN_TRANSITIONS, campaign.status as CampaignStatus, CampaignStatus.PAID);
      await tx.campaign.update({
        where: { id: payment.campaignId },
        data: { status: PrismaCampaignStatus.PAID, paidAt: new Date() },
      });
      assertTransition("Campaign", CAMPAIGN_TRANSITIONS, CampaignStatus.PAID, CampaignStatus.LIVE);
      await tx.campaign.update({
        where: { id: payment.campaignId },
        data: { status: PrismaCampaignStatus.LIVE, liveAt: new Date() },
      });

      return { status: "payment_confirmed_campaign_live" };
    }

    if (isFailed) {
      assertTransition("Payment", PAYMENT_TRANSITIONS, payment.status as PaymentStatus, PaymentStatus.FAILED);
      await tx.payment.update({ where: { id: payment.id }, data: { status: PrismaPaymentStatus.FAILED } });
      await recordAudit(tx, {
        actorId: null,
        actorRole: "SYSTEM",
        action: AuditAction.PAYMENT_FAILED,
        entityType: "Payment",
        entityId: payment.id,
      });
      return { status: "payment_failed_recorded" };
    }

    return { status: "event_recorded_no_action" };
  });
}
