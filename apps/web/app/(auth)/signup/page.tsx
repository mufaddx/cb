"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CampaignPreferenceInfoModal } from "@/components/CampaignPreferenceInfoModal";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

const CAMPAIGN_PREFERENCE_OPTIONS = [
  { value: "CLIPPING" as const, label: "Clipping", description: "Post a video the brand already made, as-is." },
  { value: "CREATOR_CONTENT" as const, label: "Creator Content", description: "Review the product yourself, on camera." },
];

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultType = params.get("as") === "creator" ? "CREATOR" : "BRAND";

  const [accountType, setAccountType] = useState<"BRAND" | "CREATOR">(defaultType);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaignPreferences, setCampaignPreferences] = useState<string[]>([]);
  const [infoModalType, setInfoModalType] = useState<"CLIPPING" | "CREATOR_CONTENT" | null>(null);

  function togglePreference(value: string) {
    setCampaignPreferences((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (accountType === "CREATOR" && campaignPreferences.length === 0) {
      setError("Choose at least one campaign type you want to do.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        auth: false,
        body: { name, email, phone, password, accountType },
      });
      // Verification (and the actual Creator profile) happens on the
      // next screen — carry the choice forward as a query param since
      // there's no account to attach it to yet.
      const prefParam =
        accountType === "CREATOR" && campaignPreferences.length > 0
          ? `&pref=${campaignPreferences.join(",")}`
          : "";
      router.push(`/verify-otp?email=${encodeURIComponent(email)}${prefParam}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 style={{ fontSize: 26 }}>Create your account</h1>
      <p className="helper-text" style={{ marginBottom: 24, fontSize: 14.5 }}>Start launching campaigns or accepting offers in minutes.</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {(["BRAND", "CREATOR"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setAccountType(type)}
            className="card"
            style={{
              flex: 1,
              textAlign: "left",
              cursor: "pointer",
              background: accountType === type ? "var(--color-primary-soft)" : "var(--color-bg-subtle)",
            }}
          >
            <strong>{type === "BRAND" ? "Brand" : "Creator"}</strong>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              {type === "BRAND" ? "Launch campaigns" : "Accept campaigns"}
            </div>
          </button>
        ))}
      </div>

      {accountType === "CREATOR" && (
        <div style={{ marginBottom: 24 }}>
          <label className="label">Which campaigns do you want to do?</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
        </div>
      )}

      {infoModalType && <CampaignPreferenceInfoModal type={infoModalType} onClose={() => setInfoModalType(null)} />}

      <form onSubmit={handleSubmit}>
        <label className="label" htmlFor="name">Full name</label>
        <input id="name" className="input" type="text" required value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: 16 }} />

        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginBottom: 16 }} />

        <label className="label" htmlFor="phone">Mobile number</label>
        <input
          id="phone"
          className="input"
          type="tel"
          inputMode="numeric"
          required
          placeholder="10-digit mobile number"
          maxLength={10}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          style={{ marginBottom: 16 }}
        />

        <label className="label" htmlFor="password">Password</label>
        <div style={{ position: "relative", marginBottom: 8 }}>
          <input
            id="password"
            className="input"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            style={{ position: "absolute", right: 12, top: 11, background: "none", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 13 }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <p className="helper-text" style={{ marginBottom: 20 }}>At least 8 characters, one uppercase letter, one number.</p>

        {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

        <Button type="submit" loading={loading} style={{ width: "100%" }}>
          Create account
        </Button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14, color: "var(--color-text-secondary)", textAlign: "center" }}>
        Already have an account? <Link href="/login" style={{ fontWeight: 600 }}>Log in</Link>
      </p>
    </>
  );
}
