export interface CreatePaymentIntentInput {
  amount: number; // in rupees, decimal
  currency: string;
  receiptId: string; // our Payment.id, used as idempotency/reconciliation key
  notes?: Record<string, string>;
}

export interface CreatePaymentIntentResult {
  providerOrderId: string;
  checkoutPayload: Record<string, unknown>; // whatever the frontend SDK needs
}

export interface VerifyWebhookInput {
  rawBody: string | Buffer;
  signatureHeader: string | undefined;
}

export interface WebhookEvent {
  providerEventId: string;
  eventType: string; // e.g. "payment.captured", "payment.failed", "refund.processed"
  providerOrderId?: string;
  providerPaymentId?: string;
  amount?: number;
  payload: Record<string, unknown>;
}

export interface CreateRefundInput {
  providerPaymentId: string;
  amount: number;
  reason: string;
}

export interface CreateRefundResult {
  providerRefundId: string;
  status: string;
}

/**
 * Payment provider abstraction (spec §31/§60). Domain code (campaign
 * payment flow, refund flow) depends only on this interface — never on
 * a Razorpay/Cashfree SDK directly — so the provider can be swapped or
 * mocked without touching business logic.
 *
 * CRITICAL: the frontend's reported payment result is NEVER trusted.
 * Every payment is confirmed only via `verifyWebhookSignature` +
 * `parseWebhookEvent` inside the webhook route, which is the only path
 * allowed to mark a Payment PAID.
 */
export interface PaymentProvider {
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult>;
  verifyWebhookSignature(input: VerifyWebhookInput): boolean;
  parseWebhookEvent(rawBody: string | Buffer): WebhookEvent;
  createRefund(input: CreateRefundInput): Promise<CreateRefundResult>;
  /**
   * Rebuilds the checkout payload for an order created earlier in a
   * previous request (the idempotent-reuse path in
   * initiateCampaignPayment) — a fresh createPaymentIntent call would
   * create a second, duplicate order with the provider for the same
   * payment, which reusing the existing Payment row is specifically
   * meant to avoid. Must return the exact same shape createPaymentIntent's
   * checkoutPayload does, so the frontend's completeCheckout can't tell
   * the difference between a fresh order and a reused one.
   */
  describeExistingIntent(providerOrderId: string, amount: number, currency: string): Record<string, unknown>;
}
