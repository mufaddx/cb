"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { CampaignPreferenceInfoModal } from "@/components/CampaignPreferenceInfoModal";
import { FormField } from "@/components/FormField";
import { PasswordField } from "@/components/PasswordField";
import { MailIcon, PhoneIcon, UserIcon } from "@/components/icons";
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

  // "Already have an account? Log in" is deliberately not repeated here —
  // the auth layout's brand panel (and the top strip on mobile) already
  // carries that prompt.
  return (
    <>
      <h1 className="auth-title">Create your account</h1>
      <p className="helper-text auth-subtitle">Start launching campaigns or accepting offers in minutes.</p>

      <div role="radiogroup" aria-label="Account type" style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {(["BRAND", "CREATOR"] as const).map((type) => (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={accountType === type}
            onClick={() => setAccountType(type)}
            className="card"
            style={{
              flex: 1,
              textAlign: "left",
              cursor: "pointer",
              padding: "12px 16px",
              background: accountType === type ? "var(--color-primary-soft)" : "var(--color-bg-subtle)",
              borderColor: accountType === type ? "var(--color-primary)" : undefined,
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
        <div style={{ marginBottom: 20 }}>
          <label className="label">Which campaigns do you want to do?</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CAMPAIGN_PREFERENCE_OPTIONS.map((opt) => (
              <div
                key={opt.value}
                className="card"
                style={{
                  padding: "10px 14px",
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
        </div>
      )}

      {infoModalType && <CampaignPreferenceInfoModal type={infoModalType} onClose={() => setInfoModalType(null)} />}

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="name"
          label="Full name"
          type="text"
          icon={<UserIcon width={16} height={16} />}
          required
          autoComplete="name"
          placeholder="Your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <FormField
          id="email"
          label="Email"
          type="email"
          icon={<MailIcon width={16} height={16} />}
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <FormField
          id="phone"
          label="Mobile number"
          type="tel"
          icon={<PhoneIcon width={16} height={16} />}
          inputMode="numeric"
          required
          autoComplete="tel"
          placeholder="10-digit mobile number"
          maxLength={10}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
        />

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={8}
          helperText="At least 8 characters, one uppercase letter, one number."
        />

        {error && (
          <p className="error-text" role="alert" style={{ marginBottom: 16 }}>
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} style={{ width: "100%" }}>
          Create account
        </Button>
      </form>
    </>
  );
}
