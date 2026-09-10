"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "text";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

/**
 * Global button system (spec §08): one component implements every
 * variant and the default/hover/active/focus/disabled/loading states,
 * so no page hand-rolls its own button styling. `loading` both shows a
 * spinner and disables the button, preventing duplicate submissions.
 */
export function Button({ variant = "primary", loading = false, disabled, children, className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading}
      className={[`btn btn-${variant}`, className].filter(Boolean).join(" ")}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      <span style={{ visibility: loading ? "hidden" : "visible" }}>{children}</span>
      <style jsx>{`
        .btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 0 18px;
          border-radius: var(--radius-control);
          font-size: 15px;
          font-weight: 600;
          font-family: var(--font-sans);
          cursor: pointer;
          border: none;
          transition: background-color 0.15s ease, color 0.15s ease, transform 0.05s ease;
        }
        .btn:active:not(:disabled) {
          transform: translateY(1px);
        }
        .btn:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }
        .btn:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .btn-primary {
          background: var(--color-primary);
          color: var(--color-white);
        }
        .btn-primary:hover:not(:disabled) {
          background: var(--color-primary-hover);
        }
        .btn-primary:active:not(:disabled) {
          background: var(--color-primary-active);
        }

        .btn-secondary {
          background: var(--color-bg-subtle);
          color: var(--color-text);
        }
        .btn-secondary:hover:not(:disabled) {
          background: var(--color-border);
        }

        .btn-danger {
          background: var(--color-danger);
          color: var(--color-white);
        }
        .btn-danger:hover:not(:disabled) {
          background: var(--color-danger-hover);
        }

        .btn-text {
          background: transparent;
          color: var(--color-primary);
          min-height: auto;
          padding: 4px 6px;
        }
        .btn-text:hover:not(:disabled) {
          text-decoration: underline;
        }

        .btn-spinner {
          position: absolute;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        .btn-secondary .btn-spinner,
        .btn-text .btn-spinner {
          border: 2px solid rgba(79, 70, 229, 0.25);
          border-top-color: var(--color-primary);
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </button>
  );
}
