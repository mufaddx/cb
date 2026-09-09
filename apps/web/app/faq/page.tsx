"use client";

import { useState } from "react";
import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

const FAQS = [
  { q: "How do creators get paid?", a: "After your content is verified (and passes any retention period), your payout is released to your in-app wallet. Withdraw to UPI once your KYC is verified." },
  { q: "What's the difference between the three campaign types?", a: "Clipping: re-cut and post brand-supplied video. Creator Content: produce original content to a brief. Product Review: receive a shipped product and review it." },
  { q: "Is my Instagram password ever requested?", a: "No. Instagram is connected via official OAuth — we never see or store your password." },
  { q: "What is retention, and why does it matter?", a: "Some campaigns require your post to stay up for a set number of days after verification. If it's taken down early, the payout for that deliverable may be forfeited per the campaign's terms." },
  { q: "How are brand payments protected?", a: "Payments are confirmed only via a signature-verified webhook from the payment provider — never by trusting what the browser reports — and funds are reserved before a campaign goes live." },
  { q: "Can a campaign be refunded?", a: "Yes, in full or in part, through the same verified payment provider — handled by platform admins, with every refund tied to a specific payment and reason." },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "56px 24px", maxWidth: 720 }}>
        <h1>Frequently Asked Questions</h1>
        <div style={{ marginTop: 24 }}>
          {FAQS.map((item, i) => (
            <div key={item.q} className="card" style={{ marginBottom: 12, cursor: "pointer" }} onClick={() => setOpen(open === i ? null : i)}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                {item.q}
                <span>{open === i ? "−" : "+"}</span>
              </div>
              {open === i && <p style={{ color: "var(--color-text-secondary)", marginTop: 10, marginBottom: 0, fontSize: 14 }}>{item.a}</p>}
            </div>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
