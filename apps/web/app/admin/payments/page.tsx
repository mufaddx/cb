"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../../../components/Button";
import { PageLoader } from "../../../components/PageLoader";
import { AdminEmpty, AdminIntro, Avatar, DemoBanner, DemoTag, StatusBadge, formatDate, formatINR } from "../../../components/admin/AdminUI";
import { CreditCardIcon } from "../../../components/icons";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { DEMO_PAYMENTS, isDemoId, withDemo } from "../../../lib/adminDemo";
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
  const [loadError, setLoadError] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [refundAmounts, setRefundAmounts] = useState<Record<string, string>>({});

  function load() {
    apiFetch<PaymentItem[]>("/api/payments/admin")
      .then(setPayments)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Failed to load payments.");
        setLoadError(true);
        setPayments([]);
      });
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

  const { items, isDemo } = withDemo(payments, DEMO_PAYMENTS, { allow: !loadError });
  if (!items) return <PageLoader />;

  const collected = isDemo ? 0 : items.filter((p) => p.status === "PAID" || p.status === "PARTIALLY_REFUNDED").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="adm-stack">
      <AdminIntro
        icon={CreditCardIcon}
        tint="blue"
        meta={
          <>
            <span className="adm-chip">{isDemo ? 0 : items.length} payments</span>
            <span className="adm-chip">{formatINR(collected)} collected</span>
          </>
        }
      >
        Every payment brands have made (campaign payments and wallet top-ups). Campaign payments can be fully or partly
        refunded from here.
      </AdminIntro>
      <DemoBanner show={isDemo} />
      {error && <p className="error-text">{error}</p>}

      {items.length === 0 ? (
        <AdminEmpty icon={CreditCardIcon} title="No payments yet" text="Brand payments appear here as soon as they are confirmed by the payment provider." />
      ) : (
        <div className="adm-table-wrap">
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Paid for</th>
                  <th>Brand</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Refunded</th>
                  <th>Date</th>
                  <th>Refund</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const demo = isDemoId(p.id);
                  const refunded = p.refunds.filter((r) => r.status === "COMPLETED").reduce((s, r) => s + Number(r.amount), 0);
                  const remaining = Number(p.amount) - refunded;
                  const canRefund = p.campaign !== null && (p.status === "PAID" || p.status === "PARTIALLY_REFUNDED") && remaining > 0;
                  return (
                    <tr key={p.id}>
                      <td>
                        {p.campaign ? (
                          <div>
                            <div style={{ fontWeight: 650, display: "flex", alignItems: "center", gap: 8 }}>
                              {p.campaign.title} {demo && <DemoTag />}
                            </div>
                            <div className="helper-text" style={{ marginTop: 1 }}>{p.campaign.code}</div>
                          </div>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <span className="adm-chip">{NON_CAMPAIGN_PURPOSE_LABEL[p.purpose] ?? p.purpose}</span>
                            {demo && <DemoTag />}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="adm-cell-person" style={{ minWidth: 160 }}>
                          <Avatar name={p.brand.companyName} square />
                          <span>{p.brand.companyName}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{formatINR(p.amount)}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td style={{ whiteSpace: "nowrap" }}>{refunded > 0 ? formatINR(refunded) : "—"}</td>
                      <td className="helper-text" style={{ whiteSpace: "nowrap" }}>{formatDate(p.createdAt)}</td>
                      <td>
                        {canRefund ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <input
                              className="input"
                              placeholder={`max ${remaining.toFixed(2)}`}
                              style={{ width: 110, padding: "7px 10px" }}
                              value={refundAmounts[p.id] ?? ""}
                              disabled={demo}
                              onChange={(e) => setRefundAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            />
                            <Button variant="danger" disabled={demo} loading={actingOn === p.id} onClick={() => refund(p.id, remaining)}>
                              Refund
                            </Button>
                          </div>
                        ) : (
                          <span className="helper-text">—</span>
                        )}
                      </td>
                      <td>
                        {demo ? <span className="helper-text">—</span> : <Link href={`/admin/payments/${p.id}`} className="adm-view-link">View →</Link>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
