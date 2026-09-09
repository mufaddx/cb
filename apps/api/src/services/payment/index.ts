import { env } from "../../config/env";
import type { PaymentProvider } from "./PaymentProvider";
import { MockPaymentProvider } from "./MockPaymentProvider";
import { RazorpayPaymentProvider } from "./RazorpayPaymentProvider";

export * from "./PaymentProvider";
export { buildMockWebhookRequest } from "./MockPaymentProvider";

let instance: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (instance) return instance;

  if (env.PAYMENT_PROVIDER === "razorpay") {
    instance = new RazorpayPaymentProvider();
  } else {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "PAYMENT_PROVIDER=mock is not allowed in production. Configure Razorpay before deploying."
      );
    }
    instance = new MockPaymentProvider();
  }
  return instance;
}
