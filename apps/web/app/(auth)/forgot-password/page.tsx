"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/password/forgot", { method: "POST", auth: false, body: { email } });
      setSent(true);
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 style={{ fontSize: 26 }}>Reset your password</h1>
      <p className="helper-text" style={{ marginBottom: 24, fontSize: 14.5 }}>
        Enter the email on your account and we&apos;ll send a 6-digit reset code.
      </p>

      <form onSubmit={handleSubmit}>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          className="input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: 16 }}
        />

        {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}
        {sent && <p style={{ marginBottom: 16, fontSize: 14 }}>If that account exists, a code is on its way.</p>}

        <Button type="submit" loading={loading} style={{ width: "100%" }}>
          Send reset code
        </Button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14, color: "var(--color-text-secondary)", textAlign: "center" }}>
        Remembered it? <Link href="/login" style={{ fontWeight: 600 }}>Log in</Link>
      </p>
    </>
  );
}
