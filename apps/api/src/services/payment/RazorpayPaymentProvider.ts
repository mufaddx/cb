import crypto from "crypto";
import type {
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  CreateRefundInput,
  CreateRefundResult,
  PaymentProvider,
  VerifyWebhookInput,
  WebhookEvent,
} from "./PaymentProvider";
import { env } from "../../config/env";

/**
 * Razorpay adapter (spec §31, India-compatible payment provider).
 *
 * Uses Razorpay's REST API directly over fetch rather than pulling in
 * the `razorpay` npm SDK, to keep the dependency surface small and the
 * HTTP calls auditable. Swap to the official SDK if preferred — the
 * PaymentProvider interface is what the rest of the app depends on.
 *
 * Order creation and refunds call the live Razorpay API and therefore
 * require PAYMENT_PROVIDER_KEY / PAYMENT_PROVIDER_SECRET to be set;
 * the env loader refuses to select this provider without them.
 */
export class RazorpayPaymentProvider implements PaymentProvider {
  private baseUrl = "https://api.razorpay.com/v1";
  private authHeader: string;

  constructor() {
    if (!env.PAYMENT_PROVIDER_KEY || !env.PAYMENT_PROVIDER_SECRET) {
      throw new Error("RazorpayPaymentProvider requires PAYMENT_PROVIDER_KEY and PAYMENT_PROVIDER_SECRET");
    }
    this.authHeader =
      "Basic " + Buffer.from(`${env.PAYMENT_PROVIDER_KEY}:${env.PAYMENT_PROVIDER_SECRET}`).toString("base64");
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    const res = await fetch(`${this.baseUrl}/orders`, {
      method: "POST",
      headers: { Authorization: this.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(input.amount * 100), // paise
        currency: input.currency,
        receipt: input.receiptId,
        notes: input.notes ?? {},
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Razorpay order creation failed (${res.status}): ${body}`);
    }

    const order = (await res.json()) as { id: string };
    return {
      providerOrderId: order.id,
      checkoutPayload: {
        key: env.PAYMENT_PROVIDER_KEY,
        order_id: order.id,
        amount: Math.round(input.amount * 100),
        currency: input.currency,
      },
    };
  }

  verifyWebhookSignature({ rawBody, signatureHeader }: VerifyWebhookInput): boolean {
    if (!signatureHeader || !env.PAYMENT_WEBHOOK_SECRET) return false;
    const expected = crypto
      .createHmac("sha256", env.PAYMENT_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    } catch {
      return false; // length mismatch etc. -> treat as invalid, never throw here
    }
  }

  parseWebhookEvent(rawBody: string | Buffer): WebhookEvent {
    const payload = JSON.parse(rawBody.toString());
    const entity = payload.payload?.payment?.entity ?? payload.payload?.refund?.entity ?? {};
    return {
      providerEventId: payload.id ?? entity.id,
      eventType: payload.event,
      providerOrderId: entity.order_id,
      providerPaymentId: entity.id,
      amount: typeof entity.amount === "number" ? entity.amount / 100 : undefined,
      payload,
    };
  }

  async createRefund(input: CreateRefundInput): Promise<CreateRefundResult> {
    const res = await fetch(`${this.baseUrl}/payments/${input.providerPaymentId}/refund`, {
      method: "POST",
      headers: { Authorization: this.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Math.round(input.amount * 100), notes: { reason: input.reason } }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Razorpay refund failed (${res.status}): ${body}`);
    }

    const refund = (await res.json()) as { id: string; status: string };
    return { providerRefundId: refund.id, status: refund.status };
  }
}
