"use client";

import { useState } from "react";
import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

const FAQS = [
  {
    q: "How do creators get paid?",
    a: "Once your content is verified, and it has cleared any retention period the campaign requires, your payout is released straight to your in-app wallet. You can withdraw it to UPI as soon as your identity verification is complete.",
  },
  {
    q: "What's the difference between the two campaign types?",
    a: "Clipping means re-cutting and posting a video the brand already supplied. Creator Content means producing something original from a brief — a brand can also have you receive and review a physical product as part of that content.",
  },
  {
    q: "Is my Instagram password ever requested?",
    a: "Never. Instagram connects through an official login flow, and the platform never sees or stores your password.",
  },
  {
    q: "What is retention, and why does it matter?",
    a: "Some campaigns require your post to stay live for a set number of days after it's verified. Taking it down early can forfeit the payout for that deliverable, under that campaign's terms.",
  },
  {
    q: "How are brand payments protected?",
    a: "A payment only counts as confirmed once the payment provider sends a signed confirmation back to the platform, never just because the browser reports success, and funds are reserved before a campaign goes live.",
  },
  {
    q: "Can a campaign be refunded?",
    a: "Yes, in full or in part, through the same payment provider that processed it. Refunds are handled by platform admins, and every one is tied to a specific payment and a stated reason.",
  },
];

export default function FaqContent() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "64px 24px 96px", maxWidth: 760 }}>
        <span className="eyebrow" style={{ marginBottom: 16 }}>FAQ</span>
        <h1 style={{ marginTop: 12 }}>Frequently asked questions</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 36, fontSize: 16 }}>
          Can&apos;t find what you&apos;re looking for? Reach out on the contact page and we&apos;ll help directly.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="card" style={{ padding: "18px 22px", cursor: "pointer" }} onClick={() => setOpen(isOpen ? null : i)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{item.q}</span>
                  <span
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: isOpen ? "var(--color-primary)" : "var(--color-bg-subtle)",
                      color: isOpen ? "#fff" : "var(--color-text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      transition: "background-color var(--duration-fast) ease, color var(--duration-fast) ease",
                    }}
                  >
                    {isOpen ? "−" : "+"}
                  </span>
                </div>
                {isOpen && (
                  <p style={{ color: "var(--color-text-secondary)", marginTop: 12, marginBottom: 0, fontSize: 14.5, lineHeight: 1.65 }}>
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
