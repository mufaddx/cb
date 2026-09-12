"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { usePageHeaderExtra } from "@/components/AppShell";
import { ChatIcon, LockIcon } from "@/components/icons";
import { PageLoader } from "@/components/PageLoader";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { completeCheckout, type CheckoutPayload } from "@/lib/payments";

interface Category {
  id: string;
  name: string;
}

interface TopCreator {
  id: string;
  displayName: string;
  bio: string | null;
  location: string | null;
  qualityScore: string;
  completionRate: string;
  categories: string[];
  instagramUsername: string | null;
  profilePictureUrl: string | null;
  followers: number | null;
  avgReach: number | null;
  unlocked: boolean;
}

interface Me {
  brand: { profileViewCredits: number } | null;
}

interface FollowerRange {
  minValue: number;
  maxValue: number | null;
}

const METRICS = [
  { value: "", label: "Any" },
  { value: "FOLLOWER_COUNT", label: "Followers" },
  { value: "AVERAGE_REACH", label: "Reach" },
];

function formatRange(r: FollowerRange): string {
  const min = r.minValue.toLocaleString("en-IN");
  return r.maxValue == null ? `${min}+` : `${min} – ${r.maxValue.toLocaleString("en-IN")}`;
}

function BuyCreditsModal({ onClose, onBought }: { onClose: () => void; onBought: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setError(null);
    setLoading(true);
    try {
      const result = await apiFetch<{ payment: { id: string }; checkoutPayload: CheckoutPayload }>(
        "/api/payments/credits/purchase",
        { method: "POST" }
      );
      await completeCheckout(result.checkoutPayload, result.payment.id, { description: "50 profile-view credits" });
      onBought();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, background: "rgba(35, 28, 15, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="paper-modal" style={{ maxWidth: 400, width: "100%", padding: 24, textAlign: "center" }}>
        <h3 style={{ margin: "0 0 8px" }}>Unlock creator profiles</h3>
        <p className="helper-text" style={{ marginBottom: 20 }}>
          50 credits for ₹599 — one credit reveals one creator&apos;s real name and Instagram handle, permanently, for your account.
        </p>
        {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Button loading={loading} onClick={buy}>Buy 50 credits — ₹599</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

export default function TopCreatorsPage() {
  const router = useRouter();
  const [creators, setCreators] = useState<TopCreator[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBuy, setShowBuy] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [startingChatId, setStartingChatId] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState("");
  const [metric, setMetric] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [ranges, setRanges] = useState<FollowerRange[]>([]);
  const [rangeIdx, setRangeIdx] = useState("");

  function refreshCredits() {
    apiFetch<Me>("/api/auth/me").then((me) => setCredits(me.brand?.profileViewCredits ?? 0)).catch(() => null);
  }

  useEffect(() => {
    apiFetch<Category[]>("/api/categories").then(setCategories).catch(() => setCategories([]));
    refreshCredits();
  }, []);

  // Range options come from the same admin-managed rate card (see
  // /admin/pricing) that drives Create Campaign's targeting picker —
  // one place controls both instead of a brand typing arbitrary numbers.
  useEffect(() => {
    setRangeIdx("");
    setMinValue("");
    setMaxValue("");
    if (!metric) {
      setRanges([]);
      return;
    }
    apiFetch<FollowerRange[]>(`/api/creators/follower-ranges?metric=${metric}`)
      .then(setRanges)
      .catch(() => setRanges([]));
  }, [metric]);

  function onRangeChange(idxStr: string) {
    setRangeIdx(idxStr);
    if (idxStr === "") {
      setMinValue("");
      setMaxValue("");
      return;
    }
    const r = ranges[Number(idxStr)];
    if (!r) return;
    setMinValue(String(r.minValue));
    setMaxValue(r.maxValue != null ? String(r.maxValue) : "");
  }

  function load() {
    const params = new URLSearchParams();
    if (categoryId) params.set("categoryId", categoryId);
    if (metric) params.set("metric", metric);
    if (minValue) params.set("minValue", minValue);
    if (maxValue) params.set("maxValue", maxValue);
    apiFetch<TopCreator[]>(`/api/creators/top?${params.toString()}`)
      .then(setCreators)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load creators."));
  }
  useEffect(load, [categoryId, metric, minValue, maxValue]);

  async function unlock(id: string): Promise<boolean> {
    setUnlockingId(id);
    setError(null);
    try {
      await apiFetch(`/api/creators/${id}/unlock`, { method: "POST" });
      load();
      refreshCredits();
      return true;
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Something went wrong.";
      if (message.toLowerCase().includes("no profile-view credits")) {
        setShowBuy(true);
      } else {
        setError(message);
      }
      return false;
    } finally {
      setUnlockingId(null);
    }
  }

  async function startChat(creatorId: string) {
    setStartingChatId(creatorId);
    try {
      const conversation = await apiFetch<{ id: string }>("/api/conversations", { method: "POST", body: { creatorId } });
      router.push(`/messages?id=${conversation.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't start that conversation.");
    } finally {
      setStartingChatId(null);
    }
  }

  // A brand can't message a creator whose identity it hasn't paid to
  // reveal yet — clicking the chat icon on a locked row spends a
  // credit to unlock first (or opens Buy Credits if there isn't one),
  // then opens the conversation in the same click.
  async function handleMessageClick(c: TopCreator) {
    if (c.unlocked) {
      startChat(c.id);
      return;
    }
    const unlocked = await unlock(c.id);
    if (unlocked) startChat(c.id);
  }

  usePageHeaderExtra(
    <>
      <span className="badge">{credits ?? "—"} credits left</span>
      <Button variant="secondary" onClick={() => setShowBuy(true)}>Buy credits</Button>
    </>,
    [credits]
  );

  if (error) return <main style={{ padding: 32 }}><p className="error-text">{error}</p></main>;

  return (
    <main style={{ padding: "32px" }}>
      <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 20, padding: 16 }}>
        <div>
          <label className="label">Category</label>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ minWidth: 160 }}>
            <option value="">Any</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Target by</label>
          <select className="input" value={metric} onChange={(e) => setMetric(e.target.value)} style={{ minWidth: 130 }}>
            {METRICS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        {metric && (
          <div>
            <label className="label">Range</label>
            <select className="input" value={rangeIdx} onChange={(e) => onRangeChange(e.target.value)} style={{ minWidth: 170 }}>
              <option value="">Any</option>
              {ranges.map((r, i) => (
                <option key={i} value={i}>{formatRange(r)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!creators ? (
        <PageLoader />
      ) : creators.length === 0 ? (
        <p className="helper-text">No creators match these filters.</p>
      ) : (
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "8px 12px" }}>Creator</th>
                <th style={{ padding: "8px 12px" }}>Categories</th>
                <th style={{ padding: "8px 12px" }}>Followers</th>
                <th style={{ padding: "8px 12px" }}>Avg. reach</th>
                <th style={{ padding: "8px 12px" }}>Quality</th>
                <th style={{ padding: "8px 12px" }}>Completion</th>
                <th style={{ padding: "8px 12px" }} />
              </tr>
            </thead>
            <tbody>
              {creators.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "8px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        aria-hidden="true"
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: c.profilePictureUrl ? undefined : "var(--gradient-brand)",
                          backgroundImage: c.profilePictureUrl ? `url(${c.profilePictureUrl})` : undefined,
                          backgroundSize: "cover",
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                          {!c.unlocked && <LockIcon width={12} height={12} />}
                          {c.displayName}
                        </div>
                        {c.instagramUsername && <div className="helper-text">@{c.instagramUsername}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "8px 12px" }}>{c.categories.length ? c.categories.join(", ") : "—"}</td>
                  <td style={{ padding: "8px 12px" }}>{c.followers != null ? c.followers.toLocaleString("en-IN") : "—"}</td>
                  <td style={{ padding: "8px 12px" }}>{c.avgReach != null ? c.avgReach.toLocaleString("en-IN") : "—"}</td>
                  <td style={{ padding: "8px 12px" }}>{Number(c.qualityScore).toFixed(1)}</td>
                  <td style={{ padding: "8px 12px" }}>{Number(c.completionRate).toFixed(0)}%</td>
                  <td style={{ padding: "8px 12px" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {!c.unlocked && (
                        <Button variant="secondary" loading={unlockingId === c.id} onClick={() => unlock(c.id)}>
                          Unlock
                        </Button>
                      )}
                      <button
                        onClick={() => handleMessageClick(c)}
                        disabled={startingChatId === c.id || unlockingId === c.id}
                        aria-label={c.unlocked ? "Chat" : "Unlock to chat"}
                        title={c.unlocked ? "Chat" : "Unlock to chat"}
                        style={{ background: "var(--color-bg-subtle)", border: "none", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: c.unlocked ? "var(--color-primary)" : "var(--color-text-secondary)" }}
                      >
                        <ChatIcon width={16} height={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showBuy && (
        <BuyCreditsModal
          onClose={() => setShowBuy(false)}
          onBought={() => {
            setShowBuy(false);
            setTimeout(refreshCredits, 1200);
          }}
        />
      )}
    </main>
  );
}
