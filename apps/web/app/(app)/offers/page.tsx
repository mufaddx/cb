"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { PageHeading } from "@/components/PageHeading";
import { PageLoader } from "@/components/PageLoader";
import { GiftIcon, LinkIcon, SearchIcon, ShieldIcon, TargetIcon } from "@/components/icons";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

interface Offer {
  id: string;
  status: string;
  payoutAmount: string;
  expiresAt: string;
  campaign: { title: string; type: string; retentionDays: number; code: string; disclosureRequired: boolean };
}

const FAQ_ITEMS = [
  {
    icon: SearchIcon,
    q: "How do I receive offers?",
    a: "Complete your profile and connect your Instagram to get started.",
  },
  {
    icon: LinkIcon,
    q: "Do I need to connect Instagram?",
    a: "Yes, connecting your Instagram helps brands find you.",
  },
  {
    icon: GiftIcon,
    q: "Is there any fee?",
    a: "No, it's completely free to receive and manage offers.",
  },
  {
    icon: ShieldIcon,
    q: "Are the offers verified?",
    a: "Yes, all brand offers are reviewed to ensure safety and authenticity.",
  },
];

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});

  function load() {
    apiFetch<Offer[]>("/api/campaign-offers")
      .then(setOffers)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load offers."));
  }

  useEffect(load, []);

  async function accept(offerId: string) {
    setActingOn(offerId);
    setError(null);
    try {
      await apiFetch(`/api/campaign-offers/${offerId}/accept`, { method: "POST", body: { termsAccepted: true } });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  async function reject(offerId: string) {
    setActingOn(offerId);
    setError(null);
    try {
      await apiFetch(`/api/campaign-offers/${offerId}/reject`, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  if (error && !offers) {
    return (
      <main className="container" style={{ padding: "64px 24px" }}>
        <p className="error-text">{error}</p>
      </main>
    );
  }

  if (!offers) {
    return <PageLoader />;
  }

  return (
    <main style={{ padding: "32px" }}>
      <PageHeading
        icon={TargetIcon}
        tint="purple"
        title="Offers"
        description="Discover and receive brand collaborations tailored for you."
      />

      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      {offers.length === 0 ? (
        <EmptyState
          icon={GiftIcon}
          tint="purple"
          heading="No campaign offers yet."
          description="Complete your profile and connect your Instagram to start receiving brand collaboration offers."
          primary={{ label: "Connect Instagram", href: "/instagram" }}
          secondary={{ label: "Complete Profile", href: "/profile" }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, textAlign: "left", marginBottom: 32 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <span className="icon-badge icon-badge-blue" aria-hidden="true"><SearchIcon width={16} height={16} /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Get Discovered</div>
                <div className="helper-text" style={{ fontSize: 12.5 }}>Brands can find and send you offers based on your content.</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <span className="icon-badge icon-badge-green" aria-hidden="true"><LinkIcon width={16} height={16} /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Receive Offers</div>
                <div className="helper-text" style={{ fontSize: 12.5 }}>Get collaboration offers directly in your inbox.</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <span className="icon-badge icon-badge-amber" aria-hidden="true"><TargetIcon width={16} height={16} /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Grow Your Earnings</div>
                <div className="helper-text" style={{ fontSize: 12.5 }}>Collaborate with top brands and monetize your content.</div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "left" }}>
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>Frequently Asked Questions</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {FAQ_ITEMS.map((item) => (
                <div key={item.q} style={{ display: "flex", gap: 10 }}>
                  <span className="icon-badge icon-badge-purple" aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0 }}>
                    <item.icon width={15} height={15} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{item.q}</div>
                    <div className="helper-text" style={{ fontSize: 12 }}>{item.a}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </EmptyState>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {offers.map((offer) => (
            <div key={offer.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 600 }}>{offer.campaign.type}</div>
                  <h3 style={{ margin: "4px 0" }}>{offer.campaign.title}</h3>
                  <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: 13 }}>{offer.campaign.code}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-primary)" }}>₹{offer.payoutAmount}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{offer.status}</div>
                </div>
              </div>

              <p className="helper-text" style={{ margin: "12px 0" }}>
                Retention: {offer.campaign.retentionDays} days · Expires {new Date(offer.expiresAt).toLocaleString()}
                {offer.campaign.disclosureRequired && " · Sponsored post disclosure required"}
              </p>

              {(offer.status === "OFFERED" || offer.status === "VIEWED") && (
                <>
                  <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={agreed[offer.id] ?? false}
                      onChange={(e) => setAgreed((prev) => ({ ...prev, [offer.id]: e.target.checked }))}
                      style={{ marginTop: 2 }}
                    />
                    I agree to the campaign terms — payout ₹{offer.payoutAmount}, {offer.campaign.retentionDays}-day
                    retention, and disclosure rules shown above. A signed agreement is generated on acceptance.
                  </label>
                  <div style={{ display: "flex", gap: 12 }}>
                    <Button loading={actingOn === offer.id} disabled={!agreed[offer.id]} onClick={() => accept(offer.id)}>
                      Accept
                    </Button>
                    <Button variant="secondary" loading={actingOn === offer.id} onClick={() => reject(offer.id)}>
                      Decline
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
