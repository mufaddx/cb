"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { Button } from "../../../../components/Button";
import { PageLoader } from "../../../../components/PageLoader";
import { BackLink, Field, StatusBadge, formatDateTime, formatINR, humanize } from "../../../../components/admin/AdminUI";
import { apiFetch, ApiClientError } from "../../../../lib/apiClient";
import { useConfirm } from "../../../../lib/useConfirm";

interface WithdrawalDetail {
  id: string;
  amount: string;
  upiId: string;
  status: string;
  requestedAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
  referenceNumber: string | null;
  rejectionReason: string | null;
  creator: { id: string; fullName: string; displayName: string; kycStatus: string; phone: string | null };
  wallet: { availableBalance: string; reservedBalance: string };
}

function upiPayLink(upiId: string, amount: string, withdrawalId: string) {
  const params = new URLSearchParams({ pa: upiId, pn: "Vidlix", am: amount, cu: "INR", tn: `Withdrawal ${withdrawalId.slice(0, 8)}` });
  return `upi://pay?${params.toString()}`;
}

export default function AdminWithdrawalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const confirm = useConfirm();
  const [item, setItem] = useState<WithdrawalDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState("");

  function load() {
    apiFetch<WithdrawalDetail>(`/api/withdrawals/${id}`)
      .then(setItem)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load this withdrawal."));
  }
  useEffect(load, [id]);

  useEffect(() => {
    if (!item || item.status !== "APPROVED") return;
    const link = upiPayLink(item.upiId, item.amount, item.id);
    let cancelled = false;
    QRCode.toDataURL(link, { width: 220, margin: 1 })
      .then((url) => !cancelled && setQrDataUrl(url))
      .catch(() => !cancelled && setQrDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [item]);

  async function approve() {
    if (!item) return;
    const confirmed = await confirm({ title: "Approve this withdrawal?", description: `You'll pay ${formatINR(item.amount)} to ${item.upiId} next.` });
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/withdrawals/${id}/approve`, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    const reason = await confirm({
      title: "Reject this withdrawal?",
      description: "The debited amount is returned to the creator's available balance.",
      danger: true,
      confirmLabel: "Reject",
      requireInput: true,
      inputLabel: "Reason",
      minInputLength: 3,
    });
    if (typeof reason !== "string") return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/withdrawals/${id}/reject`, { method: "POST", body: { reason } });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmPaid() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/withdrawals/${id}/mark-paid`, { method: "POST", body: { referenceNumber: referenceNumber.trim() } });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !item) {
    return (
      <div className="adm-stack">
        <BackLink href="/admin/withdrawals">Back to withdrawals</BackLink>
        <p className="error-text">{error}</p>
      </div>
    );
  }
  if (!item) return <PageLoader />;

  return (
    <div className="adm-stack">
      <BackLink href="/admin/withdrawals">Back to withdrawals</BackLink>

      <div className="adm-detail-head">
        <div>
          <h1>{formatINR(item.amount)} to {item.creator.fullName}</h1>
          <div className="adm-detail-sub">
            <Link href={`/admin/creators/${item.creator.id}`} className="adm-view-link">@{item.creator.displayName}</Link>
            <StatusBadge status={item.status} />
            <StatusBadge status={item.creator.kycStatus} label={`KYC ${humanize(item.creator.kycStatus)}`} />
          </div>
        </div>
        {item.status === "REQUESTED" && (
          <div className="adm-detail-actions">
            <Button variant="danger" disabled={busy} onClick={reject}>Reject</Button>
            <Button loading={busy} onClick={approve}>Approve</Button>
          </div>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}
      {item.rejectionReason && (
        <div className="adm-demo-banner" role="note">
          <span><strong>Rejected:</strong> {item.rejectionReason}</span>
        </div>
      )}

      <div className="adm-detail-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="adm-panel" style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "14px 20px" }}>
            <Field label="UPI ID" value={item.upiId} />
            <Field label="Phone" value={item.creator.phone ?? "—"} />
            <Field label="Requested" value={formatDateTime(item.requestedAt)} />
            <Field label="Reviewed" value={formatDateTime(item.reviewedAt)} />
            <Field label="Paid" value={formatDateTime(item.paidAt)} />
            <Field label="Reference / UTR" value={item.referenceNumber ?? "—"} />
          </div>

          {item.status === "APPROVED" && (
            <div className="adm-panel" style={{ padding: 20, textAlign: "center" }}>
              <h3 style={{ margin: "0 0 4px" }}>Pay {formatINR(item.amount)} via UPI</h3>
              <p className="helper-text" style={{ marginBottom: 16 }}>{item.upiId}</p>
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt={`UPI QR code to pay ${item.upiId}`} width={220} height={220} style={{ margin: "0 auto 12px", borderRadius: 8 }} />
              ) : (
                <div style={{ width: 220, height: 220, margin: "0 auto 12px" }} />
              )}
              <p className="helper-text" style={{ marginBottom: 16 }}>Once the transfer is done, enter the UTR / UPI reference number to confirm payout.</p>
              <div style={{ display: "flex", gap: 8, maxWidth: 340, margin: "0 auto" }}>
                <input
                  className="input"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. 402812345678"
                  style={{ flex: 1 }}
                />
                <Button loading={busy} disabled={referenceNumber.trim().length < 3} onClick={confirmPaid}>
                  Confirm paid
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="adm-panel" style={{ padding: 18 }}>
          <div className="adm-field-label">Creator&apos;s wallet</div>
          <div style={{ fontSize: 24, fontWeight: 750, marginTop: 4 }}>{formatINR(item.wallet.availableBalance)}</div>
          <div className="helper-text" style={{ marginTop: 2 }}>available balance right now</div>
        </div>
      </div>
    </div>
  );
}
