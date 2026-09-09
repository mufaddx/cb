"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "../../components/Button";
import { apiFetch, ApiClientError } from "../../lib/apiClient";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        auth: false,
        body: { email, password, accountType },
      });
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ maxWidth: 440, padding: "64px 24px" }}>
      <h1 style={{ fontSize: 28 }}>Create your account</h1>

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
              borderColor: accountType === type ? "var(--color-primary)" : "var(--color-border)",
              borderWidth: accountType === type ? 2 : 1,
            }}
          >
            <strong>{type === "BRAND" ? "Brand" : "Creator"}</strong>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              {type === "BRAND" ? "Launch campaigns" : "Accept campaigns"}
            </div>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginBottom: 16 }} />

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

      <p style={{ marginTop: 20, fontSize: 14, color: "var(--color-text-secondary)" }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
