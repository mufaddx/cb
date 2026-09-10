"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { apiFetch, ApiClientError, getAccessToken, setTokens } from "@/lib/apiClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // middleware.ts always sends app.vidlix.in/ here since the edge
  // runtime can't read localStorage to know someone's already signed
  // in — this is where that actually gets checked, client-side.
  useEffect(() => {
    if (getAccessToken()) router.replace("/dashboard");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await apiFetch<{ accessToken: string; refreshToken: string; user: { roles: string[] } }>(
        "/api/auth/login",
        { method: "POST", auth: false, body: { email, password } }
      );
      setTokens(result.accessToken, result.refreshToken);
      const isAdmin = result.user.roles.some((r) =>
        ["SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN", "KYC_ADMIN", "CONTENT_REVIEWER", "SUPPORT_ADMIN"].includes(r)
      );
      router.push(isAdmin ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 style={{ fontSize: 26 }}>Welcome back</h1>
      <p className="helper-text" style={{ marginBottom: 28, fontSize: 14.5 }}>Log in to your Vidlix account.</p>

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

        <div style={{ textAlign: "right", marginBottom: 20 }}>
          <Link href="/forgot-password" style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Forgot password?</Link>
        </div>

        {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

        <Button type="submit" loading={loading} style={{ width: "100%" }}>
          Log in
        </Button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14, color: "var(--color-text-secondary)", textAlign: "center" }}>
        Don&apos;t have an account? <Link href="/signup" style={{ fontWeight: 600 }}>Create one</Link>
      </p>
    </>
  );
}
