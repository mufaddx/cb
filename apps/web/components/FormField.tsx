"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  error?: string;
  containerStyle?: React.CSSProperties;
}

/** One labeled input, with an optional leading icon and an inline
 * error message tied to it via aria-describedby — the shared shape
 * every auth field (email, phone, OTP code) uses instead of each page
 * hand-rolling its own label+input+icon markup. */
export function FormField({ label, icon, error, id, className, containerStyle, ...rest }: FormFieldProps) {
  const errorId = error && id ? `${id}-error` : undefined;
  return (
    <div style={{ marginBottom: 16, ...containerStyle }}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="input-icon-wrap">
        {icon && (
          <span className="input-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          id={id}
          className={["input", icon ? "input-with-icon" : "", className].filter(Boolean).join(" ")}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          {...rest}
        />
      </div>
      {error && (
        <p className="error-text" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
