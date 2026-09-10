"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
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

export default function WithdrawalsQueuePage() {
  const confirm = useConfirm();
  const [queue, setQueue] = useState<WithdrawalItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  function load() {
    apiFetch<WithdrawalItem[]>("/api/withdrawals/queue")
      .then(setQueue)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load the queue."));
  }
  useEffect(load, []);

  async function approve(id: string, amount: string) {
    const confirmed = await confirm({ title: "Approve this withdrawal?", description: `₹${amount} is marked ready to pay out.` });
    if (!confirmed) return;

    setActingOn(id);
    setError(null);
    try {
      await apiFetch(`/api/withdrawals/${id}/approve`, { method: "POST" });
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

  async function markPaid(id: string, amount: string) {
    const referenceNumber = await confirm({
      title: "Mark this withdrawal paid?",
      description: `Confirms ₹${amount} was actually transferred via UPI.`,
      impact: "This cannot be undone — only mark paid once the transfer is confirmed.",
      confirmLabel: "Mark Paid",
      requireInput: true,
      inputLabel: "Payment reference number (UTR/UPI ref) — required as evidence",
      minInputLength: 3,
    });
    if (typeof referenceNumber !== "string") return;

    setActingOn(id);
    setError(null);
    try {
      await apiFetch(`/api/withdrawals/${id}/mark-paid`, { method: "POST", body: { referenceNumber } });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  if (!queue) return <p>Loading…</p>;

  return (
    <div>
      <p className="helper-text" style={{ marginBottom: 20 }}>{queue.length} pending</p>
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
                      <Button loading={actingOn === item.id} onClick={() => approve(item.id, item.amount)}>
                        Approve
                      </Button>
                      <Button variant="danger" loading={actingOn === item.id} onClick={() => reject(item.id)}>
                        Reject
                      </Button>
                    </>
                  )}
                  {item.status === "APPROVED" && (
                    <Button loading={actingOn === item.id} onClick={() => markPaid(item.id, item.amount)}>
                      Mark Paid
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
