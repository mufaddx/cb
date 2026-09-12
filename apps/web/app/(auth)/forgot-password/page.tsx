"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { AuthNavLink } from "@/components/AuthNavLink";
import { FormField } from "@/components/FormField";
import { MailIcon } from "@/components/icons";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/password/forgot", { method: "POST", auth: false, body: { email } });
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 style={{ fontSize: 27 }}>Reset your password</h1>
      <p className="helper-text" style={{ marginBottom: 24, fontSize: 14.5 }}>
        Enter the email on your account and we&apos;ll send a 6-digit reset code.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="email"
          label="Email"
          type="email"
          icon={<MailIcon width={16} height={16} />}
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {error && (
          <p className="error-text" role="alert" style={{ marginBottom: 16 }}>
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} style={{ width: "100%" }}>
          Send reset code
        </Button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14, color: "var(--color-text-secondary)", textAlign: "center" }}>
        Remembered it? <AuthNavLink href="/login" style={{ fontWeight: 600 }}>Log in</AuthNavLink>
      </p>
    </>
  );
}
