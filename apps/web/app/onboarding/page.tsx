"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/Button";
import { apiFetch, ApiClientError } from "../../lib/apiClient";

export default function OnboardingPage() {
  const router = useRouter();
  const [type, setType] = useState<"BRAND" | "CREATOR" | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitBrand(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/brands", { method: "POST", body: { companyName, contactPerson } });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function submitCreator(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/creators", { method: "POST", body: { fullName, displayName } });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!type) {
    return (
      <main className="container" style={{ maxWidth: 480, padding: "64px 24px" }}>
        <h1>Set up your profile</h1>
        <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
          <Button onClick={() => setType("BRAND")}>I&apos;m a Brand</Button>
          <Button variant="secondary" onClick={() => setType("CREATOR")}>I&apos;m a Creator</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="container" style={{ maxWidth: 480, padding: "64px 24px" }}>
      <h1>{type === "BRAND" ? "Brand profile" : "Creator profile"}</h1>

      {type === "BRAND" ? (
        <form onSubmit={submitBrand} style={{ marginTop: 24 }}>
          <label className="label">Company name</label>
          <input className="input" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={{ marginBottom: 16 }} />
          <label className="label">Contact person</label>
          <input className="input" required value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} style={{ marginBottom: 20 }} />
          {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}
          <Button type="submit" loading={loading} style={{ width: "100%" }}>Continue</Button>
        </form>
      ) : (
        <form onSubmit={submitCreator} style={{ marginTop: 24 }}>
          <label className="label">Full name</label>
          <input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ marginBottom: 16 }} />
          <label className="label">Display name</label>
          <input className="input" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={{ marginBottom: 20 }} />
          {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}
          <Button type="submit" loading={loading} style={{ width: "100%" }}>Continue</Button>
        </form>
      )}
    </main>
  );
}
