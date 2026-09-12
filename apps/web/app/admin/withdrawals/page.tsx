"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "../../../components/Button";
import { PageLoader } from "../../../components/PageLoader";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { useConfirm } from "../../../lib/useConfirm";

interface WithdrawalItem {
  id: string;
  amount: string;
  upiId: string;
  status: string;
  requestedAt: string;
  creator: { fullName: string; displayName: string; kycStatus: string };
}

// A UPI deep link — scanning it (or opening it on a phone) prefills the
// payee, amount and a note in whichever UPI app handles it. There is no
// webhook or bank API behind this: it only gets the admin to a
// pre-filled pay screen, it can't tell us the payment actually landed.
// Confirming that still needs the UTR/reference number entered below —
// real auto-verification of an outgoing UPI payout would require a
// business payouts API (Razorpay Payouts, Cashfree Payouts, etc.),
// which isn't wired up in this codebase.
function upiPayLink(upiId: string, amount: string, withdrawalId: string) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: "Vidlix",
    am: amount,
    cu: "INR",
    tn: `Withdrawal ${withdrawalId.slice(0, 8)}`,
  });
  return `upi://pay?${params.toString()}`;
}

function PayoutModal({
  item,
  onClose,
  onSubmit,
  submitting,
}: {
  item: WithdrawalItem;
  onClose: () => void;
  onSubmit: (referenceNumber: string) => void;
  submitting: boolean;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState("");
  const link = upiPayLink(item.upiId, item.amount, item.id);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(link, { width: 220, margin: 1 })
      .then((url) => !cancelled && setQrDataUrl(url))
      .catch(() => !cancelled && setQrDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [link]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: 380, width: "100%", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 4px" }}>Pay ₹{item.amount} via UPI</h3>
        <p className="helper-text" style={{ marginBottom: 16 }}>
          {item.creator.fullName} (@{item.creator.displayName}) · {item.upiId}
        </p>

        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt={`UPI QR code to pay ${item.upiId}`} width={220} height={220} style={{ margin: "0 auto 12px", borderRadius: 8 }} />
        ) : (
          <div style={{ width: 220, height: 220, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)" }}>
            Generating QR…
          </div>
        )}

        <p className="helper-text" style={{ marginBottom: 16 }}>
          Scan with any UPI app to pay {item.upiId}, or open <a href={link}>this link</a> on your phone. Once the transfer is done, enter the UTR / UPI reference number below to confirm payout.
        </p>

        <label className="helper-text" style={{ display: "block", textAlign: "left", marginBottom: 6 }}>
          UTR / UPI reference number
        </label>
        <input
          className="input"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="e.g. 402812345678"
          style={{ width: "100%", marginBottom: 16 }}
          autoFocus
        />

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            loading={submitting}
            disabled={referenceNumber.trim().length < 3}
            onClick={() => onSubmit(referenceNumber.trim())}
          >
            Confirm paid
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function WithdrawalsQueuePage() {
  const confirm = useConfirm();
  const [queue, setQueue] = useState<WithdrawalItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [payoutTarget, setPayoutTarget] = useState<WithdrawalItem | null>(null);

  function load() {
    apiFetch<WithdrawalItem[]>("/api/withdrawals/queue")
      .then(setQueue)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load the queue."));
  }
  useEffect(load, []);

  // "Approve" now moves straight into the payout step — approving a
  // withdrawal always means paying it out next, so a click here
  // immediately opens the UPI QR/reference modal instead of leaving
  // the admin to separately remember to come back and mark it paid.
  async function approve(item: WithdrawalItem) {
    const confirmed = await confirm({ title: "Approve this withdrawal?", description: `You'll pay ₹${item.amount} to ${item.upiId} next.` });
    if (!confirmed) return;

    setActingOn(item.id);
    setError(null);
    try {
      await apiFetch(`/api/withdrawals/${item.id}/approve`, { method: "POST" });
      setPayoutTarget({ ...item, status: "APPROVED" });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  async function reject(id: string) {
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

    setActingOn(id);
    setError(null);
    try {
      await apiFetch(`/api/withdrawals/${id}/reject`, { method: "POST", body: { reason } });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  async function confirmPaid(referenceNumber: string) {
    if (!payoutTarget) return;
    setActingOn(payoutTarget.id);
    setError(null);
    try {
      await apiFetch(`/api/withdrawals/${payoutTarget.id}/mark-paid`, { method: "POST", body: { referenceNumber } });
      setPayoutTarget(null);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  if (!queue) return <PageLoader />;

  return (
    <div>
      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      {queue.length === 0 ? (
        <div className="card">No withdrawals pending.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {queue.map((item) => (
            <div key={item.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  KYC: {item.creator.kycStatus} · {item.status}
                </div>
                <div style={{ fontWeight: 600 }}>{item.creator.fullName} (@{item.creator.displayName})</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{item.upiId}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>₹{item.amount}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {item.status === "REQUESTED" && (
                    <>
                      <Button loading={actingOn === item.id} onClick={() => approve(item)}>
                        Approve
                      </Button>
                      <Button variant="danger" loading={actingOn === item.id} onClick={() => reject(item.id)}>
                        Reject
                      </Button>
                    </>
                  )}
                  {item.status === "APPROVED" && (
                    <Button loading={actingOn === item.id} onClick={() => setPayoutTarget(item)}>
                      Pay via UPI
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {payoutTarget && (
        <PayoutModal
          item={payoutTarget}
          submitting={actingOn === payoutTarget.id}
          onClose={() => setPayoutTarget(null)}
          onSubmit={confirmPaid}
        />
      )}
    </div>
  );
}
