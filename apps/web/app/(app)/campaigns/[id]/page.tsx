"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { completeCheckout, type CheckoutPayload } from "@/lib/payments";
import { useConfirm } from "@/lib/useConfirm";

interface Campaign {
  id: string;
  code: string;
  title: string;
  description: string;
  type: string;
  status: string;
  retentionDays: number;
  pricingSnapshots: Array<{ subtotal: string; platformFee: string; taxAmount: string; totalAmount: string }>;
  targetingSlabs: Array<{ minValue: number; maxValue: number | null; payoutAmount: string; quantity: number; reserved: number }>;
}

interface Offer {
  id: string;
  status: string;
  payoutAmount: string;
  creator: { displayName: string };
}

interface Assignment {
  id: string;
  status: string;
  campaign: { id: string };
  creator: { displayName: string };
  shipment: { status: string; courier: string | null; trackingNumber: string | null } | null;
  contentSubmissions?: Array<{ id: string; version: number; fileKey: string; status: string }>;
}

interface Message {
  id: string;
  senderType: string;
  body: string;
  createdAt: string;
}

const CANCELLABLE = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "PAYMENT_PENDING", "LIVE", "MATCHING", "IN_PROGRESS"];

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const confirm = useConfirm();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shipDrafts, setShipDrafts] = useState<Record<string, { courier: string; trackingNumber: string }>>({});

  function load() {
    apiFetch<Campaign>(`/api/campaigns/${id}`).then(setCampaign).catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load campaign."));
    apiFetch<Offer[]>(`/api/campaigns/${id}/offers`).then(setOffers).catch(() => setOffers([]));
    apiFetch<Assignment[]>("/api/assignments").then((all) => setAssignments(all.filter((a) => a.campaign.id === id))).catch(() => setAssignments([]));
    apiFetch<Message[]>(`/api/messages/${id}`).then(setMessages).catch(() => setMessages([]));
  }
  useEffect(load, [id]);

  async function run(action: () => Promise<unknown>, successMsg?: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCampaign() {
    const confirmed = await confirm({ title: "Submit for review?", description: "An admin will review this campaign before it can go live." });
    if (!confirmed) return;
    run(() => apiFetch(`/api/campaigns/${id}/submit`, { method: "POST" }));
  }

  async function cancelCampaign() {
    const confirmed = await confirm({
      title: "Cancel this campaign?",
      description: "This cannot be undone from here.",
      danger: true,
      confirmLabel: "Cancel Campaign",
    });
    if (!confirmed) return;
    run(() => apiFetch(`/api/campaigns/${id}/cancel`, { method: "POST" }));
  }

  async function payNow() {
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ payment: { id: string }; checkoutPayload: CheckoutPayload }>(
        `/api/payments/campaigns/${id}/pay`,
        { method: "POST" }
      );
      // Opens the real Razorpay checkout once PAYMENT_PROVIDER=razorpay
      // is configured; while it's still =mock, drives the same signed
      // webhook path a real provider callback would hit instead.
      await completeCheckout(result.checkoutPayload, result.payment.id, { description: campaign?.title });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    if (!messageDraft.trim()) return;
    await apiFetch(`/api/messages/${id}`, { method: "POST", body: { body: messageDraft } });
    setMessageDraft("");
    load();
  }

  async function markShipped(assignmentId: string) {
    const draft = shipDrafts[assignmentId];
    if (!draft?.courier || !draft?.trackingNumber) {
      setError("Enter both courier and tracking number.");
      return;
    }
    run(() => apiFetch(`/api/shipments/${assignmentId}/ship`, { method: "POST", body: draft }));
  }

  async function reviewContent(assignmentId: string, decision: "APPROVE" | "REVISION" | "REJECT") {
    let feedback: string | undefined;
    if (decision === "REVISION") {
      const result = await confirm({ title: "Request a revision?", requireInput: true, inputLabel: "Feedback", minInputLength: 3 });
      if (typeof result !== "string") return;
      feedback = result;
    } else {
      const confirmed = await confirm({ title: decision === "APPROVE" ? "Approve this content?" : "Reject this content?", danger: decision === "REJECT" });
      if (!confirmed) return;
    }
    run(() => apiFetch(`/api/content/${assignmentId}/review`, { method: "POST", body: { decision, feedback } }));
  }

  if (error && !campaign) return <p className="error-text" style={{ padding: 48 }}>{error}</p>;
  if (!campaign) return <p style={{ padding: 48 }}>Loading…</p>;

  const pricing = campaign.pricingSnapshots[0];

  return (
    <>
      <main style={{ padding: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{campaign.code} · {campaign.type}</div>
            <h1 style={{ margin: "4px 0" }}>{campaign.title}</h1>
            <div style={{ fontWeight: 600, color: "var(--color-primary)" }}>{campaign.status}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {campaign.status === "DRAFT" && <Button loading={busy} onClick={submitCampaign}>Submit for Review</Button>}
            {campaign.status === "PAYMENT_PENDING" && <Button loading={busy} onClick={payNow}>Pay Now</Button>}
            {CANCELLABLE.includes(campaign.status) && (
              <Button variant="danger" loading={busy} onClick={cancelCampaign}>Cancel</Button>
            )}
          </div>
        </div>

        {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Brief</h3>
          <p style={{ fontSize: 14 }}>{campaign.description}</p>
        </div>

        {pricing && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Pricing</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 4, fontSize: 14, maxWidth: 320 }}>
              <div>Subtotal</div><div>₹{pricing.subtotal}</div>
              <div>Platform fee</div><div>₹{pricing.platformFee}</div>
              <div>Tax</div><div>₹{pricing.taxAmount}</div>
              <div style={{ fontWeight: 700, borderTop: "1px solid var(--color-border)", paddingTop: 4 }}>Total</div>
              <div style={{ fontWeight: 700, borderTop: "1px solid var(--color-border)", paddingTop: 4 }}>₹{pricing.totalAmount}</div>
            </div>
          </div>
        )}

        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Targeting</h3>
          {campaign.targetingSlabs.map((s, i) => (
            <div key={i} style={{ fontSize: 14, marginBottom: 4 }}>
              {s.minValue.toLocaleString()}–{s.maxValue?.toLocaleString() ?? "∞"} followers · ₹{s.payoutAmount} · {s.reserved}/{s.quantity} filled
            </div>
          ))}
        </div>

        {offers.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Offers</h3>
            {offers.map((o) => (
              <div key={o.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0", borderBottom: "1px solid var(--color-border)" }}>
                <span>@{o.creator.displayName}</span>
                <span>₹{o.payoutAmount} · {o.status}</span>
              </div>
            ))}
          </div>
        )}

        {assignments.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Creators Working</h3>
            {assignments.map((a) => (
              <div key={a.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span>@{a.creator.displayName}</span>
                  <span>{a.status}</span>
                </div>

                {/* Product Review: mark shipped once address is submitted */}
                {campaign.type === "PRODUCT_REVIEW" && a.shipment?.status === "ADDRESS_SUBMITTED" && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <input
                      className="input"
                      placeholder="Courier"
                      style={{ padding: "6px 8px" }}
                      value={shipDrafts[a.id]?.courier ?? ""}
                      onChange={(e) => setShipDrafts((prev) => ({ ...prev, [a.id]: { ...prev[a.id], courier: e.target.value, trackingNumber: prev[a.id]?.trackingNumber ?? "" } }))}
                    />
                    <input
                      className="input"
                      placeholder="Tracking #"
                      style={{ padding: "6px 8px" }}
                      value={shipDrafts[a.id]?.trackingNumber ?? ""}
                      onChange={(e) => setShipDrafts((prev) => ({ ...prev, [a.id]: { ...prev[a.id], trackingNumber: e.target.value, courier: prev[a.id]?.courier ?? "" } }))}
                    />
                    <Button loading={busy} onClick={() => markShipped(a.id)}>Mark Shipped</Button>
                  </div>
                )}

                {/* Creator Content / Product Review: review latest submission */}
                {a.status === "VERIFICATION" && a.contentSubmissions && a.contentSubmissions.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <Button loading={busy} onClick={() => reviewContent(a.id, "APPROVE")}>Approve</Button>
                    <Button variant="secondary" loading={busy} onClick={() => reviewContent(a.id, "REVISION")}>Request Revision</Button>
                    <Button variant="danger" loading={busy} onClick={() => reviewContent(a.id, "REJECT")}>Reject</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <h3>Deal Room</h3>
          <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.length === 0 && <p className="helper-text">No messages yet.</p>}
            {messages.map((m) => (
              <div key={m.id} style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: m.senderType === "SYSTEM" ? "var(--color-text-secondary)" : "var(--color-primary)" }}>
                  {m.senderType === "SYSTEM" ? "System" : m.senderType}:
                </span>{" "}
                {m.body}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="Send a message…" value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} />
            <Button onClick={sendMessage}>Send</Button>
          </div>
        </div>
      </main>
    </>
  );
}
