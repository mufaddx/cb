import crypto from "crypto";
import { randomUUID } from "crypto";
import type {
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  CreateRefundInput,
  CreateRefundResult,
  PaymentProvider,
  VerifyWebhookInput,
  WebhookEvent,
} from "./PaymentProvider";

const MOCK_SECRET = "mock-webhook-secret-dev-only";

/**
 * Dev/test adapter: simulates Razorpay's create-order -> webhook
 * lifecycle without calling any external service, so the rest of the
 * payment flow (webhook route, ledger, campaign state machine) is
 * exercised end-to-end. Never enabled in production.
 *
 * A companion helper, `buildMockWebhookRequest`, lets tests/dev tools
 * generate a correctly-signed payload the same way the real provider
 * would send one.
 */
export class MockPaymentProvider implements PaymentProvider {
  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    const providerOrderId = `mock_order_${randomUUID()}`;
    return {
      providerOrderId,
      checkoutPayload: {
        provider: "mock",
        order_id: providerOrderId,
        amount: input.amount,
        currency: input.currency,
        note: "PAYMENT_PROVIDER=mock — no real charge occurs. Use POST /api/payments/dev/simulate-webhook to advance this order in development.",
      },
    };
  }

  verifyWebhookSignature({ rawBody, signatureHeader }: VerifyWebhookInput): boolean {
    if (!signatureHeader) return false;
    const expected = crypto.createHmac("sha256", MOCK_SECRET).update(rawBody).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }

  parseWebhookEvent(rawBody: string | Buffer): WebhookEvent {
    const payload = JSON.parse(rawBody.toString());
    return {
      providerEventId: payload.id,
      eventType: payload.event,
      providerOrderId: payload.orderId,
      providerPaymentId: payload.paymentId,
      amount: payload.amount,
      payload,
    };
  }

  async createRefund(input: CreateRefundInput): Promise<CreateRefundResult> {
    return { providerRefundId: `mock_refund_${randomUUID()}`, status: "processed" };
  }
}

export function buildMockWebhookRequest(event: {
  eventType: string;
  orderId: string;
  amount: number;
}): { rawBody: string; signature: string } {
  const payload = {
    id: `mock_evt_${randomUUID()}`,
    event: event.eventType,
    orderId: event.orderId,
    paymentId: `mock_pay_${randomUUID()}`,
    amount: event.amount,
  };
  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", MOCK_SECRET).update(rawBody).digest("hex");
  return { rawBody, signature };
}
