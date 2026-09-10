"use client";

import type { ApiResponse } from "@antigravity/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const ACCESS_TOKEN_KEY = "antigravity_access_token";
const REFRESH_TOKEN_KEY = "antigravity_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export class ApiClientError extends Error {
  constructor(public errorCode: string, message: string, public details?: unknown) {
    super(message);
  }
}

/**
 * Every UI action that touches the backend goes through this
 * function — there is no mocked/fake response path. A failed request
 * throws `ApiClientError` with the server's real errorCode/message so
 * pages can render an honest error state instead of a fabricated one.
 */
export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = (await res.json()) as ApiResponse<T>;

  if (!json.success) {
    throw new ApiClientError(json.errorCode, json.message, json.details);
  }
  return json.data;
}

export type UploadPurpose =
  | "post-screenshot"
  | "creator-content"
  | "campaign-asset"
  | "shipment-proof"
  | "kyc-document"
  | "withdrawal-proof";

/**
 * Real multipart upload to `POST /api/uploads` — returns the storage
 * key the rest of the API expects (content submissions, KYC, shipment
 * proof). Separate from `apiFetch` because this is the one request
 * that must NOT be JSON-encoded.
 */
export async function uploadFile(file: File, purpose: UploadPurpose): Promise<{ key: string }> {
  const form = new FormData();
  form.append("file", file);

  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api/uploads?purpose=${purpose}`, {
    method: "POST",
    headers,
    body: form,
  });

  const json = (await res.json()) as ApiResponse<{ key: string }>;
  if (!json.success) {
    throw new ApiClientError(json.errorCode, json.message, json.details);
  }
  return json.data;
}
