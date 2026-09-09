"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../../components/Button";
import { AppHeader } from "../../components/AppHeader";
import { apiFetch, ApiClientError } from "../../lib/apiClient";

interface Wallet {
  availableBalance: string;
  reservedBalance: string;
}
interface Withdrawal {
  id: string;
  amount: string;
  upiId: string;
  status: string;
  requestedAt: string;
}
interface Me {
  brand: unknown;
  creator: unknown;
}

interface WalletTransaction {
  id: string;
  type: string;
  amount: string;
  createdAt: string;
  referenceType: string | null;
}

export default function WalletPage() {
  const [accountType, setAccountType] = useState<"BRAND" | "CREATOR" | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[] | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[] | null>(null);
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function load() {
    apiFetch<Me>("/api/auth/me").then((me) => setAccountType(me.brand ? "BRAND" : "CREATOR"));
    apiFetch<Wallet>("/api/wallet").then(setWallet).catch(() => null);
    apiFetch<WalletTransaction[]>("/api/wallet/transactions").then(setTransactions).catch(() => null);
    apiFetch<Withdrawal[]>("/api/withdrawals").then(setWithdrawals).catch(() => null);
  }

  useEffect(load, []);

  async function requestWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await apiFetch("/api/withdrawals", { method: "POST", body: { amount: Number(amount), upiId } });
      setSuccess("Withdrawal requested. It's now under review.");
      setAmount("");
      setUpiId("");
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="container" style={{ padding: "48px 24px", maxWidth: 560 }}>
        <h1>Wallet</h1>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="helper-text">Available Balance</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>₹{wallet?.availableBalance ?? "—"}</div>
          {wallet && Number(wallet.reservedBalance) > 0 && (
            <div className="helper-text">Reserved: ₹{wallet.reservedBalance}</div>
          )}
        </div>

        {accountType === "CREATOR" && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3>Withdraw</h3>
            <form onSubmit={requestWithdrawal}>
              <label className="label">Amount (₹)</label>
              <input className="input" type="number" min={100} required value={amount} onChange={(e) => setAmount(e.target.value)} style={{ marginBottom: 16 }} />
              <label className="label">UPI ID</label>
              <input className="input" placeholder="name@bank" required value={upiId} onChange={(e) => setUpiId(e.target.value)} style={{ marginBottom: 16 }} />
              {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}
              {success && <p style={{ color: "var(--color-success)", fontSize: 13, marginBottom: 16 }}>{success}</p>}
              <Button type="submit" loading={loading} style={{ width: "100%" }}>
                Withdraw
              </Button>
            </form>
          </div>
        )}

        {accountType === "BRAND" && (
          <div className="card" style={{ marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: 14 }}>
              Funds are added by paying for a campaign. <Link href="/campaigns/create" style={{ color: "var(--color-primary)" }}>Create a campaign</Link> to add funds.
            </p>
          </div>
        )}

        {accountType === "CREATOR" && withdrawals && (
          <>
            <h3>Withdrawal History</h3>
            {withdrawals.length === 0 ? (
              <p className="helper-text" style={{ marginBottom: 24 }}>No withdrawals yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {withdrawals.map((w) => (
                  <div key={w.id} className="card" style={{ display: "flex", justifyContent: "space-between", padding: 16 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>₹{w.amount}</div>
                      <div className="helper-text">{w.upiId}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{w.status}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <h3>Transactions</h3>
        {!transactions || transactions.length === 0 ? (
          <p className="helper-text">No transactions yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {transactions.map((t) => (
              <div key={t.id} className="card" style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.type}</div>
                  <div className="helper-text">{new Date(t.createdAt).toLocaleString()}</div>
                </div>
                <div style={{ fontWeight: 600 }}>₹{t.amount}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
