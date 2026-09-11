"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CreatorProfile {
  bio: string | null;
  location: string | null;
  categories: Array<{ category: Category }>;
}

// Creator-only — a brand's targeting category (BrandCategory, its own
// industry tags) is a separate concept from this and isn't edited
// here. If a brand somehow lands on this page (shouldn't, since it's
// not in BRAND_NAV) it just sees the "no creator profile" message
// below instead of a broken form.
export default function ProfilePage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [notACreator, setNotACreator] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
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
        setLoaded(true);
      })
      .catch(() => setNotACreator(true));
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

  if (notACreator) {
    return (
      <main style={{ padding: 32 }}>
        <p className="helper-text">No creator profile to configure on this account.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 32 }}>
      <p className="helper-text" style={{ marginBottom: 24, maxWidth: 640 }}>
        Categories decide which campaigns reach you — a brand targeting &quot;Fitness &amp; Health&quot; only
        matches creators who&apos;ve picked that category here. Pick up to {MAX_CATEGORIES} that fit your content best.
      </p>

      {!loaded || categories === null ? (
        <p className="helper-text">Loading…</p>
      ) : (
        <form onSubmit={save} style={{ maxWidth: 640 }}>
          <label className="label">Categories ({selected.size}/{MAX_CATEGORIES})</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, margin: "8px 0 20px" }}>
            {categories.map((c) => {
              const checked = selected.has(c.id);
              const disabled = !checked && selected.size >= MAX_CATEGORIES;
              return (
                <label
                  key={c.id}
                  className="card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: disabled ? "not-allowed" : "pointer",
                    padding: "10px 14px",
                    opacity: disabled ? 0.5 : 1,
                    background: checked ? "var(--color-primary-soft)" : "var(--color-bg-subtle)",
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
            style={{ marginBottom: 16, minHeight: 80, resize: "vertical", fontFamily: "inherit" }}
          />

          <label className="label">Location</label>
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ marginBottom: 20, maxWidth: 300 }}
          />

          {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}
          {success && <p style={{ color: "var(--color-success)", fontSize: 13, marginBottom: 16 }}>{success}</p>}

          <Button type="submit" loading={loading}>Save</Button>
        </form>
      )}
    </main>
  );
}
