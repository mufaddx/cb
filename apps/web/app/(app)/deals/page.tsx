"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { PageHeading } from "@/components/PageHeading";
import { PageLoader } from "@/components/PageLoader";
import { CheckCircleIcon, HandshakeIcon, TargetIcon, WalletIcon, XCircleIcon } from "@/components/icons";
import { apiFetch, ApiClientError, uploadFile } from "@/lib/apiClient";

type DealTab = "ALL" | "ONGOING" | "COMPLETED" | "CANCELLED";
const DEAL_TABS: Array<{ key: DealTab; label: string }> = [
  { key: "ALL", label: "All Deals" },
  { key: "ONGOING", label: "Ongoing" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

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
  const [loadingAgreementId, setLoadingAgreementId] = useState<string | null>(null);
  const [tab, setTab] = useState<DealTab>("ALL");

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

  // The signed PDF generated when this deal's offer was accepted —
  // real backend feature (GET /api/agreements/assignment/:id) that
  // had no UI anywhere calling it before this.
  async function viewAgreement(assignmentId: string) {
    setLoadingAgreementId(assignmentId);
    setError(null);
    try {
      const { downloadUrl } = await apiFetch<{ downloadUrl: string }>(`/api/agreements/assignment/${assignmentId}`);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't open the agreement.");
    } finally {
      setLoadingAgreementId(null);
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

  const counts: Record<DealTab, number> = {
    ALL: assignments.length,
    ONGOING: assignments.filter((a) => a.status !== "PAID" && a.status !== "FAILED").length,
    COMPLETED: assignments.filter((a) => a.status === "PAID").length,
    CANCELLED: assignments.filter((a) => a.status === "FAILED").length,
  };
  const visible = assignments.filter((a) => {
    if (tab === "ALL") return true;
    if (tab === "ONGOING") return a.status !== "PAID" && a.status !== "FAILED";
    if (tab === "COMPLETED") return a.status === "PAID";
    return a.status === "FAILED";
  });

  return (
    <>
      <main style={{ padding: "32px" }}>
        <PageHeading
          icon={HandshakeIcon}
          tint="pink"
          title="My Deals"
          description="Manage your accepted brand deals and track your progress."
        />

        {assignments.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--color-border)" }}>
            {DEAL_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: tab === t.key ? "2px solid var(--color-primary)" : "2px solid transparent",
                  padding: "10px 14px",
                  marginBottom: -1,
                  fontSize: 13.5,
                  fontWeight: tab === t.key ? 700 : 500,
                  color: tab === t.key ? "var(--color-primary)" : "var(--color-text-secondary)",
                  cursor: "pointer",
                }}
              >
                {t.label} ({counts[t.key]})
              </button>
            ))}
          </div>
        )}

        {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

        {assignments.length === 0 ? (
          <EmptyState
            icon={CheckCircleIcon}
            tint="green"
            heading="No accepted deals yet."
            description="Accept a campaign offer to see it here and start your collaboration journey."
            primary={{ label: "Browse Campaigns", href: "/offers" }}
            secondary={{ label: "View Offers", href: "/offers" }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, textAlign: "left", marginBottom: 32 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <span className="icon-badge icon-badge-purple" aria-hidden="true"><HandshakeIcon width={16} height={16} /></span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Collaborate with top brands</div>
                  <div className="helper-text" style={{ fontSize: 12.5 }}>Work with verified brands and grow your audience.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <span className="icon-badge icon-badge-blue" aria-hidden="true"><TargetIcon width={16} height={16} /></span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Track your progress</div>
                  <div className="helper-text" style={{ fontSize: 12.5 }}>Manage deliverables and deadlines easily.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <span className="icon-badge icon-badge-green" aria-hidden="true"><WalletIcon width={16} height={16} /></span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Get paid securely</div>
                  <div className="helper-text" style={{ fontSize: 12.5 }}>Receive payments directly to your wallet.</div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "left" }}>
              <h3 style={{ marginBottom: 12, fontSize: 15 }}>How it works?</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
                {[
                  { n: 1, title: "Find Offers", desc: "Browse campaign offers from top brands." },
                  { n: 2, title: "Accept Offer", desc: "Review details and accept the offer." },
                  { n: 3, title: "Complete Deliverables", desc: "Create and submit your content." },
                  { n: 4, title: "Get Paid", desc: "Receive payment after approval." },
                ].map((s) => (
                  <div key={s.n}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "var(--color-primary-soft)",
                        color: "var(--color-primary)",
                        fontWeight: 700,
                        fontSize: 13,
                        marginBottom: 8,
                      }}
                    >
                      {s.n}
                    </span>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.title}</div>
                    <div className="helper-text" style={{ fontSize: 12.5 }}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </EmptyState>
        ) : visible.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <XCircleIcon width={24} height={24} style={{ color: "var(--color-text-faint)", marginBottom: 8 }} />
            <p className="helper-text" style={{ margin: 0 }}>No deals in this view.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {visible.map((a) => (
              <div key={a.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 600 }}>{a.campaign.type}</div>
                    <h3 style={{ margin: "0 0 4px" }}>{a.campaign.title}</h3>
                    <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: 13 }}>{a.campaign.code}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-primary)" }}>₹{a.payoutAmount}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>{STATUS_LABELS[a.status] ?? a.status}</div>
                    <button
                      onClick={() => viewAgreement(a.id)}
                      disabled={loadingAgreementId === a.id}
                      style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}
                    >
                      {loadingAgreementId === a.id ? "Opening…" : "View Agreement"}
                    </button>
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
