"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/apiClient";

interface QueueCardDef {
  label: string;
  href: string;
  fetchCount: () => Promise<number>;
}

function useQueueCount(fetcher: () => Promise<number>) {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetcher()
      .then(setCount)
      .catch(() => setError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { count, error };
}

function QueueCard({ def }: { def: QueueCardDef }) {
  const { count, error } = useQueueCount(def.fetchCount);
  return (
    <Link href={def.href} className="card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>{def.label}</div>
      <div style={{ fontSize: 32, fontWeight: 700 }}>
        {error ? "—" : count === null ? "…" : count}
      </div>
      <div style={{ fontSize: 13, color: "var(--color-primary)", marginTop: 8 }}>Open queue →</div>
    </Link>
  );
}

const arrLen = async (path: string) => (await apiFetch<unknown[]>(path)).length;

const QUEUES: QueueCardDef[] = [
  { label: "Campaign Reviews", href: "/admin/campaigns", fetchCount: () => arrLen("/api/campaigns/review-queue") },
  { label: "Content Verification", href: "/admin/verification", fetchCount: () => arrLen("/api/verifications/queue") },
  { label: "Creator Content Review", href: "/admin/content", fetchCount: () => arrLen("/api/content/queue") },
  { label: "Retention Checks", href: "/admin/retention", fetchCount: () => arrLen("/api/retention/queue") },
  { label: "KYC Reviews", href: "/admin/kyc", fetchCount: () => arrLen("/api/kyc/queue") },
  { label: "Withdrawals", href: "/admin/withdrawals", fetchCount: () => arrLen("/api/withdrawals/queue") },
  { label: "Disputes", href: "/admin/disputes", fetchCount: () => arrLen("/api/disputes/queue") },
  { label: "Fraud Flags", href: "/admin/fraud", fetchCount: () => arrLen("/api/fraud/queue") },
];

export default function OperationsCenterPage() {
  return (
    <div>
      <p className="helper-text" style={{ marginBottom: 24 }}>
        Every count below is live from the database — not cached.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {QUEUES.map((q) => (
          <QueueCard key={q.href} def={q} />
        ))}
      </div>
    </div>
  );
}
