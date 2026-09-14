"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "../../../../components/Button";
import { PageLoader } from "../../../../components/PageLoader";
import { BackLink, Field, StatusBadge, formatDateTime, formatINR, humanize } from "../../../../components/admin/AdminUI";
import { apiFetch, ApiClientError } from "../../../../lib/apiClient";
import { useConfirm } from "../../../../lib/useConfirm";

interface Refund {
  id: string;
  amount: string;
  reason: string;
  status: string;
  createdAt: string;
  providerRefundId: string | null;
}
interface PaymentEvent {
  id: string;
  eventType: string;
  receivedAt: string;
  signatureValid: boolean;
}
interface PaymentDetail {
  id: string;
  amount: string;
  status: string;
  provider: string;
  purpose: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  createdAt: string;
  campaign: { id: string; title: string; code: string } | null;
  brand: { id: string; companyName: string };
  refunds: Refund[];
  events: PaymentEvent[];
}

export default function AdminPaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const confirm = useConfirm();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");

  function load() {
    apiFetch<PaymentDetail>(`/api/payments/admin/${id}`)
      .then(setPayment)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load this payment."));
  }
  useEffect(load, [id]);

  async function refund() {
    if (!payment) return;
    const refunded = payment.refunds.filter((r) => r.status === "COMPLETED").reduce((s, r) => s + Number(r.amount), 0);
    const remaining = Number(payment.amount) - refunded;
    const amount = Number(refundAmount);
    if (!amount || amount <= 0 || amount > remaining) {
      setError(`Enter a refund amount between ₹0.01 and ₹${remaining.toFixed(2)}.`);
      return;
    }
    const reason = await confirm({
      title: `Refund ${formatINR(amount)}?`,
      description: "Calls the real payment provider's refund API and decrements the brand's reserved balance.",
      impact: "This cannot be undone.",
      danger: true,
      confirmLabel: "Refund",
      requireInput: true,
      inputLabel: "Reason",
      minInputLength: 5,
    });
    if (typeof reason !== "string") return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/payments/${id}/refund`, { method: "POST", body: { amount, reason } });
      setRefundAmount("");
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !payment) {
    return (
      <div className="adm-stack">
        <BackLink href="/admin/payments">Back to payments</BackLink>
        <p className="error-text">{error}</p>
      </div>
    );
  }
  if (!payment) return <PageLoader />;

  const refunded = payment.refunds.filter((r) => r.status === "COMPLETED").reduce((s, r) => s + Number(r.amount), 0);
  const remaining = Number(payment.amount) - refunded;
  const canRefund = payment.campaign !== null && (payment.status === "PAID" || payment.status === "PARTIALLY_REFUNDED") && remaining > 0;

  return (
    <div className="adm-stack">
      <BackLink href="/admin/payments">Back to payments</BackLink>

      <div className="adm-detail-head">
        <div>
          <h1>{formatINR(payment.amount)}</h1>
          <div className="adm-detail-sub">
            <Link href={`/admin/brands/${payment.brand.id}`} className="adm-view-link">{payment.brand.companyName}</Link>
            <span className="adm-chip">{humanize(payment.purpose)}</span>
            <StatusBadge status={payment.status} />
          </div>
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}

      <div className="adm-detail-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="adm-panel" style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "14px 20px" }}>
            <Field label="Provider" value={humanize(payment.provider)} />
            <Field label="Created" value={formatDateTime(payment.createdAt)} />
            <Field label="Provider order ID" value={payment.providerOrderId ?? "—"} muted />
            <Field label="Provider payment ID" value={payment.providerPaymentId ?? "—"} muted />
            {payment.campaign && (
              <Field label="Campaign" value={<Link href={`/admin/campaigns/${payment.campaign.id}`} className="adm-view-link">{payment.campaign.title}</Link>} full />
            )}
          </div>

          {payment.events.length > 0 && (
            <div className="adm-panel">
              <div className="adm-panel-head"><h3>Provider event timeline</h3></div>
              {payment.events.map((e) => (
                <div key={e.id} className="adm-panel-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 650, fontSize: 13.5 }}>{humanize(e.eventType)}</div>
                    <div className="helper-text">{formatDateTime(e.receivedAt)}</div>
                  </div>
                  <StatusBadge status={e.signatureValid ? "VERIFIED" : "REJECTED"} label={e.signatureValid ? "Signature valid" : "Signature invalid"} />
                </div>
              ))}
            </div>
          )}

          <div className="adm-panel">
            <div className="adm-panel-head"><h3>Refunds ({payment.refunds.length})</h3></div>
            {payment.refunds.length === 0 ? (
              <p className="adm-panel-empty">No refund has been issued for this payment.</p>
            ) : (
              payment.refunds.map((r) => (
                <div key={r.id} className="adm-panel-row" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 650, fontSize: 13.5 }}>{formatINR(r.amount)}</div>
                    <div className="helper-text">{r.reason}</div>
                    <div className="helper-text">{formatDateTime(r.createdAt)}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="adm-panel" style={{ padding: 18 }}>
          <div className="adm-field-label">Refunded so far</div>
          <div style={{ fontSize: 24, fontWeight: 750, marginTop: 4 }}>{formatINR(refunded)}</div>
          {canRefund ? (
            <div style={{ marginTop: 14 }}>
              <label className="helper-text" style={{ display: "block", marginBottom: 6 }}>Refund amount (max {formatINR(remaining)})</label>
              <input
                className="input"
                placeholder={remaining.toFixed(2)}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <Button variant="danger" loading={busy} onClick={refund} style={{ width: "100%" }}>
                Issue refund
              </Button>
            </div>
          ) : (
            <div className="helper-text" style={{ marginTop: 10 }}>Nothing left to refund on this payment.</div>
          )}
        </div>
      </div>
    </div>
  );
}
