import type { Request, Response } from "express";
import { prisma } from "@antigravity/db";
import { env } from "../../config/env";
import { sendSuccess } from "../../lib/apiResponse";
import { ValidationError } from "../../lib/errors";
import * as paymentsService from "./payments.service";
import { buildMockWebhookRequest } from "../../services/payment";

export async function initiatePaymentHandler(req: Request, res: Response) {
  const campaignId = req.params.campaignId;
  const brandId = req.auth!.brandId!;
  const result = await paymentsService.initiateCampaignPayment(prisma, campaignId, brandId);
  sendSuccess(res, result, "Payment intent created.");
}

/** Admin payment table (spec §48). */
export async function listPaymentsHandler(_req: Request, res: Response) {
  const payments = await prisma.payment.findMany({
    include: { campaign: { include: { brand: true } }, refunds: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  sendSuccess(res, payments);
}

/** Raw-body webhook receiver — signature is verified against the exact
 * bytes the provider sent, before any JSON parsing (spec §31). */
export async function webhookHandler(req: Request, res: Response) {
  const signatureHeader =
    req.header("x-razorpay-signature") ?? req.header("x-mock-signature") ?? undefined;
  const result = await paymentsService.handleWebhookEvent(prisma, req.body, signatureHeader);
  // Webhook responses should always be a plain 200 with minimal body —
  // providers retry on non-2xx, which is undesirable once we've safely
  // recorded/deduplicated the event.
  res.status(200).json({ received: true, ...result });
}

/**
 * Development-only convenience endpoint: builds a correctly-signed
 * mock webhook payload and feeds it through the exact same
 * `handleWebhookEvent` path a real provider callback would use — so
 * the full payment confirmation flow can be exercised before a
 * Razorpay account exists. Disabled outside development.
 */
export async function devSimulateWebhookHandler(req: Request, res: Response) {
  if (env.NODE_ENV === "production" || env.PAYMENT_PROVIDER !== "mock") {
    throw new ValidationError("This endpoint is only available in development with PAYMENT_PROVIDER=mock");
  }
  const { campaignId, outcome = "captured" } = req.body as { campaignId: string; outcome?: "captured" | "failed" };
  const payment = await prisma.payment.findFirstOrThrow({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
  });

  const { rawBody, signature } = buildMockWebhookRequest({
    eventType: outcome === "captured" ? "payment.captured" : "payment.failed",
    orderId: payment.providerOrderId!,
    amount: Number(payment.amount),
  });
  // Route it through the real handler exactly as the webhook route would.
  const result = await paymentsService.handleWebhookEvent(prisma, rawBody, signature);
  sendSuccess(res, result, "Simulated webhook processed.");
}
