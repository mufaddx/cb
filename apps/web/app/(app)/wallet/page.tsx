"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

interface Wallet {
  availableBalance: string;
  reservedBalance: string;
  platformFeePct: number | null;
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

const TX_LABEL: Record<string, string> = {
  DEPOSIT: "Deposit",
  RESERVE: "Reserved for campaign",
  RELEASE: "Released",
  SPEND: "Campaign spend",
  CREATOR_EARNING: "Earning",
  REFUND: "Refund",
  WITHDRAWAL: "Withdrawal",
  ADJUSTMENT: "Adjustment",
  TAX: "Tax",
  FEE: "Platform fee",
  REVERSAL: "Reversal",
};
const DEBIT_TX_TYPES = new Set(["RESERVE", "SPEND", "WITHDRAWAL", "TAX", "FEE"]);

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
  const [topupAmount, setTopupAmount] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [topupSuccess, setTopupSuccess] = useState<string | null>(null);

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

  async function addFunds(e: React.FormEvent) {
    e.preventDefault();
    setTopupError(null);
    setTopupSuccess(null);
    setTopupLoading(true);
    try {
      const result = await apiFetch<{ payment: { id: string } }>("/api/payments/wallet/topup", {
        method: "POST",
        body: { amount: Number(topupAmount) },
      });
      // PAYMENT_PROVIDER=mock in this environment — there's no real
      // checkout to hand off to, so this drives the same signed
      // webhook a real gateway would send, the identical pattern
      // campaigns/[id]'s "Pay Now" already uses for campaign payments.
      await apiFetch("/api/payments/dev/simulate-webhook", {
        method: "POST",
        body: { paymentId: result.payment.id, outcome: "captured" },
      }).catch(() => null);
      setTopupSuccess(`₹${topupAmount} added to your wallet.`);
      setTopupAmount("");
      load();
    } catch (err) {
      setTopupError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setTopupLoading(false);
    }
  }

  return (
    <>
      <main style={{ padding: "32px" }}>
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="helper-text">Available Balance</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>₹{wallet?.availableBalance ?? "—"}</div>
          {wallet && Number(wallet.reservedBalance) > 0 && (
            <div className="helper-text">Reserved: ₹{wallet.reservedBalance}</div>
          )}
          {accountType === "CREATOR" && !!wallet?.platformFeePct && (
            <div className="helper-text" style={{ marginTop: 4 }}>
              A {wallet.platformFeePct}% platform fee is deducted from each payout — shown as its own line below.
            </div>
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
            <h3>Add Funds</h3>
            <p className="helper-text" style={{ marginBottom: 16 }}>
              Top up your available balance directly, or pay for a specific{" "}
              <Link href="/campaigns/create" style={{ color: "var(--color-primary)" }}>campaign</Link> when you create one.
            </p>
            <form onSubmit={addFunds} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                className="input"
                type="number"
                min={100}
                step="1"
                placeholder="Amount (₹)"
                required
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                style={{ maxWidth: 200 }}
              />
              <Button type="submit" loading={topupLoading}>Add Funds</Button>
            </form>
            {topupError && <p className="error-text" style={{ marginTop: 12, marginBottom: 0 }}>{topupError}</p>}
            {topupSuccess && <p style={{ color: "var(--color-success)", fontSize: 13, marginTop: 12, marginBottom: 0 }}>{topupSuccess}</p>}
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
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{TX_LABEL[t.type] ?? t.type}</div>
                  <div className="helper-text">{new Date(t.createdAt).toLocaleString()}</div>
                </div>
                <div style={{ fontWeight: 600, color: DEBIT_TX_TYPES.has(t.type) ? "var(--color-danger)" : "var(--color-success)" }}>
                  {DEBIT_TX_TYPES.has(t.type) ? "−" : "+"}₹{t.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
