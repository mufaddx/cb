"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { AuthNavLink } from "@/components/AuthNavLink";
import { FormField } from "@/components/FormField";
import { PasswordField } from "@/components/PasswordField";
import { MailIcon } from "@/components/icons";
import { apiFetch, ApiClientError, getAccessToken, setTokens } from "@/lib/apiClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  // "New to Vidlix? Create an account" lives in the auth layout's brand
  // panel (top strip on mobile) — not repeated under the form.
  return (
    <>
      <h1 className="auth-title">Welcome back</h1>
      <p className="helper-text auth-subtitle">Log in to your Vidlix account.</p>

      <form onSubmit={handleSubmit} noValidate>
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

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        <div style={{ textAlign: "right", marginBottom: 20 }}>
          <AuthNavLink href="/forgot-password" style={{ fontSize: 13.5, fontWeight: 600 }}>
            Forgot password?
          </AuthNavLink>
        </div>

        {error && (
          <p className="error-text" role="alert" style={{ marginBottom: 16 }}>
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} style={{ width: "100%" }}>
          Log in
        </Button>
      </form>
    </>
  );
}
