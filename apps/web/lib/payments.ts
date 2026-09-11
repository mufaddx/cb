"use client";

import { apiFetch } from "./apiClient";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    // Razorpay's own terms require loading this fresh from their CDN
    // at runtime rather than bundling/self-hosting it.
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment gateway. Check your connection and try again."));
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

export interface CheckoutPayload {
  provider?: string;
  key?: string;
  order_id: string;
  amount: number;
  currency: string;
  [extra: string]: unknown;
}

/**
 * Completes a payment intent the backend already created (a campaign
 * payment or a wallet top-up) — real Razorpay Checkout once
 * PAYMENT_PROVIDER=razorpay is configured (detected by the presence
 * of `key` in the checkout payload the backend returned), or the
 * dev-only simulated webhook while it's still PAYMENT_PROVIDER=mock.
 * Either way, this call's own success never means "paid" — only the
 * backend's signature-verified webhook handler is ever allowed to
 * mark a Payment PAID; this just gets the user through whichever UI
 * flow leads there.
 */
export async function completeCheckout(
  checkoutPayload: CheckoutPayload,
  paymentId: string,
  opts: { description?: string } = {}
): Promise<void> {
  if (!checkoutPayload.key) {
    await apiFetch("/api/payments/dev/simulate-webhook", {
      method: "POST",
      body: { paymentId, outcome: "captured" },
    });
    return;
  }

  await loadRazorpayScript();
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("Payment gateway failed to load."));
      return;
    }
    const rzp = new window.Razorpay({
      key: checkoutPayload.key,
      order_id: checkoutPayload.order_id,
      amount: checkoutPayload.amount,
      currency: checkoutPayload.currency,
      name: "Vidlix",
      description: opts.description,
      theme: { color: "#4f46e5" },
      handler: () => resolve(),
      modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
    });
    rzp.open();
  });
}
