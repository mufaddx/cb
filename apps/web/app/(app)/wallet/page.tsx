"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { completeCheckout, type CheckoutPayload } from "@/lib/payments";
import { useConfirm } from "@/lib/useConfirm";

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
  reviewedBy: string | null;
  rejectionReason: string | null;
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

// The full TX_LABEL map covers every type either wallet can ever post —
// but a brand never sees a CREATOR_EARNING/FEE row and a creator never
// sees a RESERVE/SPEND/DEPOSIT one, so offering all of them in the
// filter dropdown is just noise scoped to the wrong account. REVERSAL
// (a rejected/cancelled withdrawal's refund) is left out of both — it
// still shows correctly labeled under "All types," it just isn't
// common enough on either side to earn its own filter option.
const CREATOR_TX_FILTER_TYPES = ["CREATOR_EARNING", "WITHDRAWAL", "FEE"];
const BRAND_TX_FILTER_TYPES = ["DEPOSIT", "RESERVE", "RELEASE", "SPEND", "REFUND", "ADJUSTMENT"];

const WITHDRAWAL_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Requested",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  PAID: "Paid",
  FAILED: "Failed",
  REJECTED: "Rejected",
};
const CANCELLABLE_WITHDRAWAL_STATUSES = new Set(["REQUESTED", "UNDER_REVIEW"]);

function withdrawalStatusLabel(w: Withdrawal): string {
  // A creator's own cancellation reuses the REJECTED status (same
  // ledger reversal, same terminal state) — reviewedBy staying null is
  // what tells them apart from an admin's rejection.
  if (w.status === "REJECTED" && !w.reviewedBy) return "Cancelled";
  return WITHDRAWAL_STATUS_LABEL[w.status] ?? w.status;
}

/** A real modal instead of an inline form sitting in the page flow —
 * enter an amount, hand off to whichever payment gateway is actually
 * configured (completeCheckout picks Razorpay Checkout or the mock
 * simulate-webhook path on its own), and the wallet page reloads once
 * it resolves. */
function AddFundsModal({ onClose, onFunded }: { onClose: () => void; onFunded: () => void }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await apiFetch<{ payment: { id: string }; checkoutPayload: CheckoutPayload }>(
        "/api/payments/wallet/topup",
        { method: "POST", body: { amount: Number(amount) } }
      );
      await completeCheckout(result.checkoutPayload, result.payment.id, { description: "Wallet top-up" });
      onFunded();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, background: "rgba(35, 28, 15, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="paper-modal" style={{ maxWidth: 400, width: "100%", padding: 24 }}>
        <h3 style={{ margin: "0 0 4px" }}>Add Funds</h3>
        <p className="helper-text" style={{ marginBottom: 16 }}>Top up your available balance to spend on any campaign.</p>
        <form onSubmit={submit}>
          <label className="label">Amount (₹)</label>
          <input
            className="input"
            type="number"
            min={100}
            step="1"
            required
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <Button type="submit" loading={loading} style={{ flex: 1 }}>Continue to Pay</Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const confirm = useConfirm();
  const [accountType, setAccountType] = useState<"BRAND" | "CREATOR" | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[] | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[] | null>(null);
  const [txFilter, setTxFilter] = useState("");
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [fundedMessage, setFundedMessage] = useState<string | null>(null);

  const txFilterTypes = accountType === "BRAND" ? BRAND_TX_FILTER_TYPES : CREATOR_TX_FILTER_TYPES;
  const visibleTransactions = transactions?.filter((t) => !txFilter || t.type === txFilter) ?? null;

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

  async function cancelWithdrawal(id: string) {
    const confirmed = await confirm({
      title: "Cancel this withdrawal?",
      description: "The reserved amount goes straight back to your available balance.",
      danger: true,
      confirmLabel: "Cancel Withdrawal",
    });
    if (!confirmed) return;
    setCancellingId(id);
    setError(null);
    try {
      await apiFetch(`/api/withdrawals/${id}/cancel`, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setCancellingId(null);
    }
  }

  function handleFunded() {
    setShowAddFunds(false);
    setFundedMessage("Payment received — your balance is updating.");
    // The webhook that actually credits the wallet lands a moment
    // after the checkout modal resolves (Razorpay confirms the
    // charge, then calls our webhook) — a short delay before
    // reloading gives it time to land instead of showing a stale
    // balance for a beat.
    setTimeout(load, 1200);
  }

  return (
    <>
      <main style={{ padding: "32px" }}>
        <div className="wallet-grid" style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24, alignItems: "start" }}>
          {/* Left: balance + the one action (Add Funds for a brand,
              Withdraw for a creator) — everything you'd act on. */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="card">
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
              {accountType === "BRAND" && (
                <Button onClick={() => setShowAddFunds(true)} style={{ marginTop: 16, width: "100%" }}>
                  Add Funds
                </Button>
              )}
              {fundedMessage && <p style={{ color: "var(--color-success)", fontSize: 13, marginTop: 12 }}>{fundedMessage}</p>}
            </div>

            {accountType === "CREATOR" && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Withdraw</h3>
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
          </div>

          {/* Right: the full history — every withdrawal request, and
              every wallet transaction, filterable by type. */}
          <div>
            {accountType === "CREATOR" && withdrawals && withdrawals.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ marginTop: 0 }}>Withdrawal History</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {withdrawals.map((w) => (
                    <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>₹{w.amount}</div>
                        <div className="helper-text">{w.upiId}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{withdrawalStatusLabel(w)}</span>
                        {CANCELLABLE_WITHDRAWAL_STATUSES.has(w.status) && (
                          <Button variant="secondary" loading={cancellingId === w.id} onClick={() => cancelWithdrawal(w.id)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <h3 style={{ margin: 0 }}>Transactions</h3>
                <select className="input" value={txFilter} onChange={(e) => setTxFilter(e.target.value)} style={{ width: "auto", minWidth: 160 }}>
                  <option value="">All types</option>
                  {txFilterTypes.map((value) => (
                    <option key={value} value={value}>{TX_LABEL[value]}</option>
                  ))}
                </select>
              </div>
              {!visibleTransactions || visibleTransactions.length === 0 ? (
                <div style={{ padding: "48px 0", textAlign: "center", color: "var(--color-text-secondary)" }}>
                  <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>₹</div>
                  <div style={{ fontSize: 13.5 }}>
                    {txFilter ? "No transactions of this type yet." : "Your transactions will show up here."}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {visibleTransactions.map((t) => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
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
            </div>
          </div>
        </div>
      </main>

      {showAddFunds && <AddFundsModal onClose={() => setShowAddFunds(false)} onFunded={handleFunded} />}
    </>
  );
}
