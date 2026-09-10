"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Button } from "../components/Button";

export interface ConfirmOptions {
  title: string;
  description?: string;
  impact?: string;
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Show a text input (replaces window.prompt) — the resolved value
   * is the entered string, or null if cancelled. */
  requireInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  minInputLength?: number;
}

type Resolver = (value: string | true | null) => void;

interface PendingRequest extends ConfirmOptions {
  resolve: Resolver;
}

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<string | true | null>) | null>(null);

/**
 * Styled replacement for window.confirm/window.prompt (spec §76: a
 * confirmation needs a title, explanation, impact, and a clearly
 * differentiated dangerous-action button — a native browser dialog
 * can't do any of that). Wrap a tree in <ConfirmProvider> once (the
 * admin layout does this) and call `useConfirm()` anywhere inside it.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<PendingRequest | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const resolverRef = useRef<Resolver | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<string | true | null>((resolve) => {
      resolverRef.current = resolve;
      setInputValue("");
      setError(null);
      setRequest({ ...opts, resolve });
    });
  }, []);

  function close(value: string | true | null) {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setRequest(null);
  }

  function handleConfirm() {
    if (request?.requireInput) {
      const minLen = request.minInputLength ?? 1;
      if (inputValue.trim().length < minLen) {
        setError(`Enter at least ${minLen} character${minLen === 1 ? "" : "s"}.`);
        return;
      }
      close(inputValue.trim());
    } else {
      close(true);
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17, 24, 39, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) close(null);
          }}
        >
          <div className="card" style={{ maxWidth: 440, width: "100%" }}>
            <h3 style={{ margin: "0 0 8px" }}>{request.title}</h3>
            {request.description && (
              <p style={{ margin: "0 0 8px", color: "var(--color-text-secondary)", fontSize: 14 }}>{request.description}</p>
            )}
            {request.impact && (
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--color-warning)" }}>{request.impact}</p>
            )}
            {request.requireInput && (
              <div style={{ marginBottom: 16 }}>
                {request.inputLabel && <label className="label">{request.inputLabel}</label>}
                <textarea
                  autoFocus
                  className="input"
                  placeholder={request.inputPlaceholder}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  style={{ minHeight: 72, resize: "vertical", fontFamily: "inherit" }}
                />
                {error && <p className="error-text">{error}</p>}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button variant="secondary" onClick={() => close(null)}>
                {request.cancelLabel ?? "Cancel"}
              </Button>
              <Button variant={request.danger ? "danger" : "primary"} onClick={handleConfirm}>
                {request.confirmLabel ?? (request.danger ? "Confirm" : "Confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/** Returns a function: `await confirm({ title, danger, requireInput, ... })`
 * resolves to `true` (plain confirm), the entered string
 * (requireInput), or `null` (cancelled) — use the null case to bail
 * out of the caller instead of proceeding. */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}
