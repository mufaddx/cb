"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { useConfirm } from "../../../lib/useConfirm";

interface PaymentItem {
  id: string;
  amount: string;
  status: string;
  provider: string;
  purpose: string;
  createdAt: string;
  campaign: { title: string; code: string } | null;
  brand: { companyName: string };
  refunds: Array<{ amount: string; status: string }>;
}

const NON_CAMPAIGN_PURPOSE_LABEL: Record<string, string> = {
  WALLET_TOPUP: "Wallet top-up",
  CREATOR_UNLOCK_CREDITS: "Profile-unlock credits",
};

export default function PaymentsPage() {
  const confirm = useConfirm();
  const [payments, setPayments] = useState<PaymentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [refundAmounts, setRefundAmounts] = useState<Record<string, string>>({});

  function load() {
    apiFetch<PaymentItem[]>("/api/payments/admin")
      .then(setPayments)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load payments."));
  }
  useEffect(load, []);

  async function refund(id: string, maxAmount: number) {
    const amount = Number(refundAmounts[id]);
    if (!amount || amount <= 0 || amount > maxAmount) {
      setError(`Enter a refund amount between ₹0.01 and ₹${maxAmount.toFixed(2)}.`);
      return;
    }

    const reason = await confirm({
      title: `Refund ₹${amount.toFixed(2)}?`,
      description: "Calls the real payment provider's refund API and decrements the brand's reserved balance.",
      impact: "This cannot be undone.",
      danger: true,
      confirmLabel: "Refund",
      requireInput: true,
      inputLabel: "Reason",
      minInputLength: 5,
    });
    if (typeof reason !== "string") return;

    setActingOn(id);
    setError(null);
    try {
      await apiFetch(`/api/payments/${id}/refund`, { method: "POST", body: { amount, reason } });
      setRefundAmounts((prev) => ({ ...prev, [id]: "" }));
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  if (!payments) return <p>Loading…</p>;

  return (
    <div>
      <p className="helper-text" style={{ marginBottom: 20 }}>{payments.length} most recent</p>
      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
              <th style={{ padding: "8px 12px" }}>Campaign</th>
              <th style={{ padding: "8px 12px" }}>Brand</th>
              <th style={{ padding: "8px 12px" }}>Amount</th>
              <th style={{ padding: "8px 12px" }}>Status</th>
              <th style={{ padding: "8px 12px" }}>Refunded</th>
              <th style={{ padding: "8px 12px" }}>Refund</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const refunded = p.refunds.filter((r) => r.status === "COMPLETED").reduce((s, r) => s + Number(r.amount), 0);
              const remaining = Number(p.amount) - refunded;
              const canRefund = p.campaign !== null && (p.status === "PAID" || p.status === "PARTIALLY_REFUNDED") && remaining > 0;
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "8px 12px" }}>
                    {p.campaign ? (
                      <>{p.campaign.code}<div className="helper-text">{p.campaign.title}</div></>
                    ) : (
                      <span className="badge">{NON_CAMPAIGN_PURPOSE_LABEL[p.purpose] ?? p.purpose}</span>
                    )}
                  </td>
                  <td style={{ padding: "8px 12px" }}>{p.brand.companyName}</td>
                  <td style={{ padding: "8px 12px" }}>₹{p.amount}</td>
                  <td style={{ padding: "8px 12px" }}>{p.status}</td>
                  <td style={{ padding: "8px 12px" }}>{refunded > 0 ? `₹${refunded.toFixed(2)}` : "—"}</td>
                  <td style={{ padding: "8px 12px" }}>
                    {canRefund && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          className="input"
                          placeholder={`max ${remaining.toFixed(2)}`}
                          style={{ width: 100, padding: "6px 8px" }}
                          value={refundAmounts[p.id] ?? ""}
                          onChange={(e) => setRefundAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        />
                        <Button variant="danger" loading={actingOn === p.id} onClick={() => refund(p.id, remaining)}>
                          Refund
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
