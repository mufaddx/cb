"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { CampaignPreferenceInfoModal } from "@/components/CampaignPreferenceInfoModal";
import { PageHeading } from "@/components/PageHeading";
import { PageLoader } from "@/components/PageLoader";
import { CheckCircleIcon, GearIcon, SlidersIcon, UserIcon } from "@/components/icons";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CreatorProfile {
  displayName: string;
  bio: string | null;
  location: string | null;
  categories: Array<{ category: Category }>;
  campaignPreferences: string[] | null;
}

interface InstagramStatus {
  status: "NOT_CONNECTED" | "CONNECTED" | "NEEDS_RECONNECTION" | "SYNC_FAILED";
  username?: string;
  profilePictureUrl?: string | null;
  latestMetrics?: { followers: number } | null;
}

const CAMPAIGN_PREFERENCE_OPTIONS = [
  { value: "CLIPPING" as const, label: "Clipping", description: "Post a video the brand already made, as-is." },
  { value: "CREATOR_CONTENT" as const, label: "Creator Content", description: "Review the product yourself, on camera." },
];

const TABS = [
  { key: "personal", label: "Personal Info", icon: UserIcon },
  { key: "preferences", label: "Preferences", icon: SlidersIcon },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// Creator-only — a brand's targeting category (BrandCategory, its own
// industry tags) is a separate concept from this and isn't edited
// here. If a brand somehow lands on this page (shouldn't, since it's
// not in BRAND_NAV) it just sees the "no creator profile" message
// below instead of a broken form.
export default function ProfilePage() {
  const [tab, setTab] = useState<TabKey>("personal");
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [notACreator, setNotACreator] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [campaignPreferences, setCampaignPreferences] = useState<string[]>([]);
  const [infoModalType, setInfoModalType] = useState<"CLIPPING" | "CREATOR_CONTENT" | null>(null);
  const [instagram, setInstagram] = useState<InstagramStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [prefLoading, setPrefLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Category[]>("/api/categories").then(setCategories).catch(() => setCategories([]));
    apiFetch<CreatorProfile>("/api/creators/me")
      .then((p) => {
        setSelected(new Set(p.categories.map((c) => c.category.id)));
        setBio(p.bio ?? "");
        setLocation(p.location ?? "");
        setDisplayName(p.displayName);
        setCampaignPreferences(p.campaignPreferences ?? []);
        setLoaded(true);
      })
      .catch(() => setNotACreator(true));
    apiFetch<InstagramStatus>("/api/instagram").then(setInstagram).catch(() => setInstagram({ status: "NOT_CONNECTED" }));
  }, []);

  const MAX_CATEGORIES = 3;

  function toggleCategory(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_CATEGORIES) {
        next.add(id);
      }
      return next;
    });
  }

  function togglePreference(value: string) {
    setCampaignPreferences((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await apiFetch("/api/creators/me", {
        method: "PATCH",
        body: { bio, location, categoryIds: Array.from(selected) },
      });
      setSuccess("Profile updated.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    setError(null);
    setSuccess(null);
    setPrefLoading(true);
    try {
      await apiFetch("/api/creators/me", { method: "PATCH", body: { campaignPreferences } });
      setSuccess("Preferences updated.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setPrefLoading(false);
    }
  }

  if (notACreator) {
    return (
      <main style={{ padding: 32 }}>
        <p className="helper-text">No creator profile to configure on this account.</p>
      </main>
    );
  }

  if (!loaded || categories === null) {
    return <PageLoader />;
  }

  const categoryBadges = categories.filter((c) => selected.has(c.id));
  const tipsComplete = {
    photo: instagram?.status === "CONNECTED" && !!instagram.profilePictureUrl,
    categories: selected.size > 0,
    bio: bio.trim().length > 20,
    location: location.trim().length > 0,
    instagram: instagram?.status === "CONNECTED",
  };
  const completedCount = Object.values(tipsComplete).filter(Boolean).length;

  return (
    <main style={{ padding: 32 }}>
      <PageHeading
        icon={UserIcon}
        tint="purple"
        title="Profile"
        description="Manage your profile information and show your best self to brands and creators."
      />

      <div className="sidebar-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--color-border)" }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
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
                <t.icon width={15} height={15} /> {t.label}
              </button>
            ))}
          </div>

          {tab === "personal" ? (
            <div className="card" style={{ padding: 28 }}>
              <form onSubmit={save}>
                <label className="label">Categories ({selected.size}/{MAX_CATEGORIES})</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, margin: "8px 0 24px" }}>
                  {categories.map((c) => {
                    const checked = selected.has(c.id);
                    const disabled = !checked && selected.size >= MAX_CATEGORIES;
                    return (
                      <label
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          cursor: disabled ? "not-allowed" : "pointer",
                          padding: "10px 14px",
                          borderRadius: "var(--radius-control)",
                          opacity: disabled ? 0.5 : 1,
                          background: checked ? "var(--color-primary-soft)" : "var(--color-bg-subtle)",
                          transition: "background-color var(--duration-fast) ease",
                        }}
                      >
                        <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleCategory(c.id)} />
                        <span style={{ fontSize: 13.5 }}>{c.name}</span>
                      </label>
                    );
                  })}
                </div>

                <label className="label">Bio</label>
                <textarea
                  className="input"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell brands and creators about yourself…"
                  maxLength={500}
                  style={{ display: "block", marginBottom: 4, minHeight: 100, resize: "vertical", fontFamily: "inherit" }}
                />
                <p className="helper-text" style={{ textAlign: "right", marginBottom: 20 }}>{bio.length}/500</p>

                <label className="label">Location</label>
                <input
                  className="input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter your location (e.g. Mumbai, India)"
                  style={{ display: "block", marginBottom: 24, maxWidth: 320 }}
                />

                {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}
                {success && <p style={{ color: "var(--color-success)", fontSize: 13, marginBottom: 16 }}>{success}</p>}

                <Button type="submit" loading={loading}>Save Changes</Button>
              </form>
            </div>
          ) : (
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ marginTop: 0 }}>Which campaigns do you want to do?</h3>
              <p className="helper-text" style={{ marginBottom: 16 }}>
                This controls which brand offers you get matched to. Pick as many as apply — leaving both unchecked
                means you&apos;re matched to everything.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {CAMPAIGN_PREFERENCE_OPTIONS.map((opt) => (
                  <div
                    key={opt.value}
                    className="card"
                    style={{
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: campaignPreferences.includes(opt.value) ? "var(--color-primary-soft)" : "transparent",
                      borderColor: campaignPreferences.includes(opt.value) ? "var(--color-primary)" : undefined,
                    }}
                  >
                    <input
                      type="checkbox"
                      id={`pref-${opt.value}`}
                      checked={campaignPreferences.includes(opt.value)}
                      onChange={() => togglePreference(opt.value)}
                      style={{ width: 17, height: 17, flexShrink: 0 }}
                    />
                    <label htmlFor={`pref-${opt.value}`} style={{ flex: 1, cursor: "pointer" }}>
                      <strong style={{ fontSize: 14 }}>{opt.label}</strong>
                      <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)" }}>{opt.description}</div>
                    </label>
                    <button
                      type="button"
                      onClick={() => setInfoModalType(opt.value)}
                      className="badge"
                      style={{ border: "none", cursor: "pointer", flexShrink: 0 }}
                    >
                      ℹ️ What&apos;s this?
                    </button>
                  </div>
                ))}
              </div>
              {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}
              {success && <p style={{ color: "var(--color-success)", fontSize: 13, marginBottom: 16 }}>{success}</p>}
              <Button onClick={savePreferences} loading={prefLoading}>Save Preferences</Button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>Profile Preview</h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: instagram?.profilePictureUrl ? undefined : "var(--gradient-brand)",
                  backgroundImage: instagram?.profilePictureUrl ? `url(${instagram.profilePictureUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {!instagram?.profilePictureUrl && displayName.charAt(0).toUpperCase()}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{displayName}</div>
                {instagram?.status === "CONNECTED" && (
                  <div className="helper-text">
                    @{instagram.username}
                    {instagram.latestMetrics && ` · ${instagram.latestMetrics.followers.toLocaleString()} followers`}
                  </div>
                )}
                {location && <div className="helper-text">{location}</div>}
              </div>
            </div>
            {categoryBadges.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {categoryBadges.map((c) => (
                  <span key={c.id} className="badge">{c.name}</span>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 15 }}>Profile Tips</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { key: "photo", label: "Connect Instagram to show your photo", href: "/instagram" },
                { key: "categories", label: "Select relevant categories" },
                { key: "bio", label: "Write a compelling bio" },
                { key: "location", label: "Add your location" },
                { key: "instagram", label: "Connect your Instagram account", href: "/instagram" },
              ].map((tip) => {
                const done = tipsComplete[tip.key as keyof typeof tipsComplete];
                return (
                  <div key={tip.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    {done ? (
                      <CheckCircleIcon width={16} height={16} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                    ) : (
                      <span style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid var(--color-border-strong)", flexShrink: 0 }} />
                    )}
                    <span style={{ color: done ? "var(--color-text)" : "var(--color-text-secondary)" }}>{tip.label}</span>
                  </div>
                );
              })}
            </div>
            <p className="helper-text" style={{ marginTop: 12, marginBottom: 0 }}>{completedCount}/5 complete</p>
          </div>

          <a href="/settings" className="card" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--color-text)" }}>
            <span className="icon-badge icon-badge-blue" aria-hidden="true"><GearIcon width={17} height={17} /></span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>Account Settings</div>
              <div className="helper-text" style={{ fontSize: 12 }}>Password, notifications and more</div>
            </div>
          </a>
        </div>
      </div>

      {infoModalType && <CampaignPreferenceInfoModal type={infoModalType} onClose={() => setInfoModalType(null)} />}
    </main>
  );
}
