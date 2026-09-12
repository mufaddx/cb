"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { PageLoader } from "@/components/PageLoader";
import { apiFetch, ApiClientError, uploadFile } from "@/lib/apiClient";

interface Shipment {
  status: string;
  courier: string | null;
  trackingNumber: string | null;
  expectedDeliveryAt: string | null;
}

interface Assignment {
  id: string;
  status: string;
  payoutAmount: string;
  postUrl: string | null;
  retentionStatus: string;
  retentionRequiredUntil: string | null;
  campaign: { id: string; title: string; code: string; type: "CLIPPING" | "CREATOR_CONTENT" | "PRODUCT_REVIEW" };
  shipment: Shipment | null;
  shippingAddress: unknown | null;
}

const STATUS_LABELS: Record<string, string> = {
  ACCEPTED: "Accepted",
  POST_PENDING: "Ready to submit",
  POST_SUBMITTED: "Submitted",
  VERIFICATION: "Under review",
  VERIFIED: "Verified — in retention",
  PAYABLE: "Payout processing",
  PAID: "Paid",
  FAILED: "Not approved",
};

export default function DealsPage() {
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Per-assignment draft state for the various inline forms below.
  const [urlDraft, setUrlDraft] = useState<Record<string, string>>({});
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [screenshotKeyDraft, setScreenshotKeyDraft] = useState<Record<string, string>>({});
  const [addressDraft, setAddressDraft] = useState<Record<string, Record<string, string>>>({});
  const [contentKeyDraft, setContentKeyDraft] = useState<Record<string, string>>({});

  function load() {
    apiFetch<Assignment[]>("/api/assignments")
      .then(setAssignments)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load your deals."));
  }
  useEffect(load, []);

  async function run(id: string, action: () => Promise<unknown>) {
    setBusy(id);
    setError(null);
    try {
      await action();
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  function submitPost(id: string) {
    const postUrl = urlDraft[id];
    if (!postUrl) return;
    run(id, () =>
      apiFetch(`/api/assignments/${id}/submit-post`, {
        method: "POST",
        body: { postUrl, screenshotKey: screenshotKeyDraft[id], notes: notesDraft[id] },
      })
    );
  }

  async function pickAndUploadScreenshot(id: string, file: File | undefined) {
    if (!file) return;
    setBusy(id);
    setError(null);
    try {
      const { key } = await uploadFile(file, "post-screenshot");
      setScreenshotKeyDraft((prev) => ({ ...prev, [id]: key }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Screenshot upload failed.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadSourceAsset(campaignId: string) {
    try {
      const { url } = await apiFetch<{ url: string }>(`/api/campaigns/${campaignId}/source-asset`);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't get the source video.");
    }
  }

  function submitAddress(id: string) {
    const addr = addressDraft[id] ?? {};
    run(id, () => apiFetch(`/api/shipments/${id}/address`, { method: "POST", body: addr }));
  }

  function confirmReceived(id: string) {
    run(id, () => apiFetch(`/api/shipments/${id}/confirm-received`, { method: "POST", body: {} }));
  }

  async function pickAndUploadContent(id: string, file: File | undefined) {
    if (!file) return;
    setBusy(id);
    setError(null);
    try {
      const { key } = await uploadFile(file, "creator-content");
      setContentKeyDraft((prev) => ({ ...prev, [id]: key }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  function submitContent(id: string) {
    const fileKey = contentKeyDraft[id];
    if (!fileKey) return;
    run(id, () => apiFetch(`/api/content/${id}/submit`, { method: "POST", body: { fileKey } }));
  }

  if (!assignments) {
    return <PageLoader />;
  }

  return (
    <>
      <main style={{ padding: "32px" }}>
        {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

        {assignments.length === 0 ? (
          <div className="card">
            <p style={{ margin: 0 }}>No accepted deals yet.</p>
            <p className="helper-text">Accept a campaign offer to see it here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {assignments.map((a) => (
              <div key={a.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 600 }}>{a.campaign.type}</div>
                    <h3 style={{ margin: "0 0 4px" }}>{a.campaign.title}</h3>
                    <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: 13 }}>{a.campaign.code}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-primary)" }}>₹{a.payoutAmount}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{STATUS_LABELS[a.status] ?? a.status}</div>
                  </div>
                </div>

                {/* --- Clipping: download the brand's source video, then submit an Instagram post URL --- */}
                {a.campaign.type === "CLIPPING" && (
                  <div style={{ marginTop: 16 }}>
                    <Button variant="secondary" onClick={() => downloadSourceAsset(a.campaign.id)}>
                      Download Content
                    </Button>
                  </div>
                )}
                {a.campaign.type === "CLIPPING" && a.status === "POST_PENDING" && (
                  <div style={{ marginTop: 12 }}>
                    <input
                      className="input"
                      placeholder="https://instagram.com/p/..."
                      value={urlDraft[a.id] ?? ""}
                      onChange={(e) => setUrlDraft((prev) => ({ ...prev, [a.id]: e.target.value }))}
                      style={{ marginBottom: 8 }}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => pickAndUploadScreenshot(a.id, e.target.files?.[0])}
                      style={{ marginBottom: 8, fontSize: 13, display: "block" }}
                    />
                    {screenshotKeyDraft[a.id] && <p className="helper-text" style={{ marginTop: -4 }}>Screenshot attached.</p>}
                    <textarea
                      className="input"
                      placeholder="Notes (optional)"
                      value={notesDraft[a.id] ?? ""}
                      onChange={(e) => setNotesDraft((prev) => ({ ...prev, [a.id]: e.target.value }))}
                      style={{ marginBottom: 8, minHeight: 60, resize: "vertical", fontFamily: "inherit" }}
                    />
                    <Button loading={busy === a.id} onClick={() => submitPost(a.id)}>
                      Submit Post
                    </Button>
                  </div>
                )}
                {a.postUrl && a.campaign.type === "CLIPPING" && a.status !== "POST_PENDING" && (
                  <p className="helper-text" style={{ marginTop: 12 }}>
                    Posted: <a href={a.postUrl} target="_blank" rel="noreferrer">{a.postUrl}</a>
                    {a.retentionRequiredUntil && a.retentionStatus !== "PASSED" && a.retentionStatus !== "NOT_APPLICABLE" && (
                      <> · Retention until {new Date(a.retentionRequiredUntil).toLocaleDateString()}</>
                    )}
                  </p>
                )}

                {/* --- Product Review: shipping timeline --- */}
                {a.campaign.type === "PRODUCT_REVIEW" && a.status === "ACCEPTED" && a.shipment?.status === "ADDRESS_PENDING" && (
                  <div style={{ marginTop: 16 }}>
                    <p className="helper-text" style={{ marginBottom: 8 }}>Submit your shipping address to receive the product.</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      {["fullName", "phone", "line1", "city", "state", "pin"].map((field) => (
                        <input
                          key={field}
                          className="input"
                          placeholder={field}
                          value={addressDraft[a.id]?.[field] ?? ""}
                          onChange={(e) =>
                            setAddressDraft((prev) => ({ ...prev, [a.id]: { ...prev[a.id], [field]: e.target.value } }))
                          }
                        />
                      ))}
                    </div>
                    <Button loading={busy === a.id} onClick={() => submitAddress(a.id)}>
                      Submit Address
                    </Button>
                  </div>
                )}
                {a.campaign.type === "PRODUCT_REVIEW" && ["ADDRESS_SUBMITTED", "READY_TO_SHIP"].includes(a.shipment?.status ?? "") && (
                  <p className="helper-text" style={{ marginTop: 16 }}>Waiting for the brand to ship your product.</p>
                )}
                {a.campaign.type === "PRODUCT_REVIEW" && ["SHIPPED", "IN_TRANSIT", "DELIVERED"].includes(a.shipment?.status ?? "") && (
                  <div style={{ marginTop: 16 }}>
                    <p className="helper-text" style={{ marginBottom: 8 }}>
                      {a.shipment?.courier} · {a.shipment?.trackingNumber}
                    </p>
                    <Button loading={busy === a.id} onClick={() => confirmReceived(a.id)}>
                      Confirm Product Received
                    </Button>
                  </div>
                )}

                {/* --- Creator Content / Product Review: submit content once unlocked --- */}
                {(a.campaign.type === "CREATOR_CONTENT" || a.campaign.type === "PRODUCT_REVIEW") && a.status === "POST_PENDING" && (
                  <div style={{ marginTop: 16 }}>
                    <input
                      type="file"
                      accept="video/*,image/*"
                      onChange={(e) => pickAndUploadContent(a.id, e.target.files?.[0])}
                      style={{ marginBottom: 8, fontSize: 13 }}
                    />
                    {contentKeyDraft[a.id] && <p className="helper-text">Uploaded — ready to submit.</p>}
                    <div>
                      <Button loading={busy === a.id} disabled={!contentKeyDraft[a.id]} onClick={() => submitContent(a.id)}>
                        Submit Content
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
