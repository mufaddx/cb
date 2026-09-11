"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

interface Assignment {
  id: string;
  campaign: { id: string; title: string; code: string; type: string };
  creator: { displayName: string };
  shipment: { status: string; courier: string | null; trackingNumber: string | null; expectedDeliveryAt: string | null } | null;
  shippingAddress: { city: string; state: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  ADDRESS_PENDING: "Awaiting address",
  ADDRESS_SUBMITTED: "Ready to ship",
  READY_TO_SHIP: "Ready to ship",
  SHIPPED: "Shipped",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  DELIVERY_FAILED: "Delivery failed",
  RETURNED: "Returned",
  RECEIVED: "Received",
};

export default function ShipmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { courier: string; trackingNumber: string }>>({});

  function load() {
    apiFetch<Assignment[]>("/api/assignments")
      .then((all) => setAssignments(all.filter((a) => a.campaign.type === "PRODUCT_REVIEW" && a.shipment)))
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load shipments."));
  }
  useEffect(load, []);

  async function markShipped(id: string) {
    const draft = drafts[id];
    if (!draft?.courier || !draft?.trackingNumber) {
      setError("Enter both courier and tracking number.");
      return;
    }
    setBusy(id);
    setError(null);
    try {
      await apiFetch(`/api/shipments/${id}/ship`, { method: "POST", body: draft });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  if (!assignments) return <main style={{ padding: 48 }}>Loading…</main>;

  return (
    <>
      <main style={{ padding: "32px" }}>
        {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

        {assignments.length === 0 ? (
          <div className="card">No Product Review shipments yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {assignments.map((a) => (
              <div key={a.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <Link href={`/campaigns/${a.campaign.id}`} style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      {a.campaign.code}
                    </Link>
                    <div style={{ fontWeight: 600 }}>{a.campaign.title}</div>
                    <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                      @{a.creator.displayName} {a.shippingAddress && `· ${a.shippingAddress.city}, ${a.shippingAddress.state}`}
                    </div>
                  </div>
                  <div style={{ fontWeight: 600 }}>{STATUS_LABELS[a.shipment!.status] ?? a.shipment!.status}</div>
                </div>

                {a.shipment!.status === "ADDRESS_SUBMITTED" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <input
                      className="input"
                      placeholder="Courier"
                      value={drafts[a.id]?.courier ?? ""}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [a.id]: { ...prev[a.id], courier: e.target.value, trackingNumber: prev[a.id]?.trackingNumber ?? "" } }))}
                    />
                    <input
                      className="input"
                      placeholder="Tracking number"
                      value={drafts[a.id]?.trackingNumber ?? ""}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [a.id]: { ...prev[a.id], trackingNumber: e.target.value, courier: prev[a.id]?.courier ?? "" } }))}
                    />
                    <Button loading={busy === a.id} onClick={() => markShipped(a.id)}>Mark as Shipped</Button>
                  </div>
                )}
                {a.shipment!.status === "SHIPPED" || a.shipment!.status === "IN_TRANSIT" ? (
                  <p className="helper-text" style={{ marginTop: 8 }}>
                    {a.shipment!.courier} · {a.shipment!.trackingNumber}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
