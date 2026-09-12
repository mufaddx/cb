"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon, LockIcon } from "./icons";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  helperText?: string;
  error?: string;
  minLength?: number;
  required?: boolean;
}

/** Login and signup both need a password field with a show/hide
 * toggle — pulled into one component (spec'd reusable name) so the
 * eye-icon toggle, its aria-label, and the field's error/helper text
 * behave identically everywhere instead of being re-implemented per
 * page. */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  helperText,
  error,
  minLength,
  required = true,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div style={{ marginBottom: helperText || error ? 4 : 16 }}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="input-icon-wrap">
        <span className="input-icon" aria-hidden="true">
          <LockIcon width={16} height={16} />
        </span>
        <input
          id={id}
          className="input input-with-icon"
          type={show ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          style={{ paddingRight: 44 }}
        />
        <button
          type="button"
          className="input-eye-toggle"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOffIcon width={17} height={17} /> : <EyeIcon width={17} height={17} />}
        </button>
      </div>
      {helperText && !error && (
        <p className="helper-text" style={{ marginBottom: 16 }}>
          {helperText}
        </p>
      )}
      {error && (
        <p className="error-text" id={errorId} role="alert" style={{ marginBottom: 16 }}>
          {error}
        </p>
      )}
    </div>
  );
}
