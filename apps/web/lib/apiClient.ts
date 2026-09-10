"use client";

// Inlined from packages/shared/src/api.ts (spec §61's API envelope) rather
// than imported from @antigravity/shared: apps/web deploys on Vercel with
// Root Directory = apps/web, which does not see sibling workspace packages
// unless "Include source files outside of the Root Directory" is enabled
// project-by-project on the dashboard. This was the single type this app
// used from that package, so inlining it removes the dependency — and the
// recurring `Cannot find module '@antigravity/shared'` build failure —
// entirely, with nothing left to configure in Vercel.
interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  requestId: string;
}

interface ApiError {
  success: false;
  errorCode: string;
  message: string;
  details?: unknown;
  requestId: string;
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const ACCESS_TOKEN_KEY = "antigravity_access_token";
const REFRESH_TOKEN_KEY = "antigravity_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
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
 * Access tokens live for 15 minutes (JWT_ACCESS_TTL) — with no refresh
 * logic at all, anyone who left a tab open past that got a raw
 * "Invalid or expired access token" error on their next click, with
 * no path back except a manual re-login. This exchanges the refresh
 * token (30 days) for a new pair exactly once per expiry, and
 * de-dupes concurrent 401s from multiple in-flight requests into a
 * single refresh call rather than firing one per request.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const json = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
    if (!json.success) return false;
    setTokens(json.data.accessToken, json.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

function ensureRefreshed(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** The refresh token itself is invalid/expired too — there's no way
 * back short of logging in again. Clears the dead tokens and sends
 * the browser to login instead of leaving the page half-rendered
 * with auth-dependent panels (sidebar, page content) silently empty. */
function forceReLogin(): void {
  clearTokens();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
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
  const useAuth = options.auth !== false;

  async function attempt(): Promise<Response> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (useAuth) {
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  }

  let res = await attempt();
  let json = (await res.json()) as ApiResponse<T>;

  // Only worth retrying when we actually sent a token that the server
  // rejected as expired/invalid — a login page's own wrong-password
  // response reuses the same UNAUTHENTICATED code but is always sent
  // with auth:false, so it never reaches this branch.
  if (!json.success && json.errorCode === "UNAUTHENTICATED" && useAuth && getAccessToken()) {
    const refreshed = await ensureRefreshed();
    if (refreshed) {
      res = await attempt();
      json = (await res.json()) as ApiResponse<T>;
    } else {
      forceReLogin();
    }
  }

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
 * that must NOT be JSON-encoded. Shares the same refresh-and-retry
 * behavior on an expired access token.
 */
export async function uploadFile(file: File, purpose: UploadPurpose): Promise<{ key: string }> {
  const form = new FormData();
  form.append("file", file);

  async function attempt(): Promise<Response> {
    const headers: Record<string, string> = {};
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_URL}/api/uploads?purpose=${purpose}`, { method: "POST", headers, body: form });
  }

  let res = await attempt();
  let json = (await res.json()) as ApiResponse<{ key: string }>;

  if (!json.success && json.errorCode === "UNAUTHENTICATED" && getAccessToken()) {
    const refreshed = await ensureRefreshed();
    if (refreshed) {
      res = await attempt();
      json = (await res.json()) as ApiResponse<{ key: string }>;
    } else {
      forceReLogin();
    }
  }

  if (!json.success) {
    throw new ApiClientError(json.errorCode, json.message, json.details);
  }
  return json.data;
}
