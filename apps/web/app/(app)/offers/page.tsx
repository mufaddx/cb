"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

interface Offer {
  id: string;
  status: string;
  payoutAmount: string;
  expiresAt: string;
  campaign: { title: string; type: string; retentionDays: number; code: string; disclosureRequired: boolean };
}

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
    return <main className="container" style={{ padding: "64px 24px" }}>Loading…</main>;
  }

  return (
    <>
      <main style={{ padding: "32px" }}>
        {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

        {offers.length === 0 ? (
          <div className="card">
            <p style={{ margin: 0 }}>No campaign offers yet.</p>
            <p className="helper-text">Complete your profile and connect Instagram to start receiving offers.</p>
          </div>
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
    </>
  );
}
