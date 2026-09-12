"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { AuthNavLink } from "@/components/AuthNavLink";
import { FormField } from "@/components/FormField";
import { PasswordField } from "@/components/PasswordField";
import { apiFetch, ApiClientError, setTokens } from "@/lib/apiClient";

const RESEND_COOLDOWN_SECONDS = 60;

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await apiFetch<{ accessToken: string; refreshToken: string }>("/api/auth/password/reset", {
        method: "POST",
        auth: false,
        body: { email, code, newPassword },
      });
      setTokens(result.accessToken, result.refreshToken);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    try {
      await apiFetch("/api/auth/password/forgot", { method: "POST", auth: false, body: { email } });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not resend code.");
    } finally {
      setResending(false);
    }
  }

  const masked = email.replace(/^(.{2}).+(@.+)$/, "$1***$2");

  return (
    <>
      <h1 style={{ fontSize: 27 }}>Enter your reset code</h1>
      <p className="helper-text" style={{ marginBottom: 28, fontSize: 14.5 }}>
        We sent a 6-digit code to <strong>{masked || email}</strong>.
        {!email && (
          <>
            {" "}
            Don&apos;t have one? <AuthNavLink href="/forgot-password">Request a code</AuthNavLink>.
          </>
        )}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="code"
          label="Reset code"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          required
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          style={{ letterSpacing: 6, fontSize: 20, textAlign: "center" }}
        />

        <PasswordField
          id="newPassword"
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          minLength={8}
        />

        {error && (
          <p className="error-text" role="alert" style={{ marginBottom: 16 }}>
            {error}
          </p>
        )}

        <Button
          type="submit"
          loading={loading}
          disabled={code.length !== 6 || newPassword.length < 8}
          style={{ width: "100%", marginBottom: 16 }}
        >
          Reset password
        </Button>
      </form>

      <div style={{ display: "flex", justifyContent: "center", fontSize: 14 }}>
        <Button variant="text" onClick={handleResend} disabled={cooldown > 0 || !email} loading={resending}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </Button>
      </div>
    </>
  );
}
