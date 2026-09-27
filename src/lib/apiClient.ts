/**
 * Single entry point for every call the Admin website makes to the Garment
 * E-commerce FastAPI backend — the same backend and the same endpoints the
 * Flutter admin app uses (dristi-admin-app/lib/services/api_service.dart).
 *
 * It mirrors that Dio setup: a bearer token on every request, one transparent
 * refresh-and-replay on a 401, and a logout when the refresh itself fails.
 * Responses come back camelCased so pages never spell snake_case field names.
 *
 * Token keys are deliberately prefixed `dristi_admin_` — the Flutter app stores
 * its own under `admin_access_token`, and the customer storefront uses
 * `dristhi_access_token`. Keeping them distinct means an admin session and a
 * shopper session can coexist in one browser without clobbering each other.
 */

const FALLBACK_BASE_URL = 'https://d100c6f2kgsym4.cloudfront.net';

const ACCESS_TOKEN_KEY = 'dristi_admin_access_token';
const REFRESH_TOKEN_KEY = 'dristi_admin_refresh_token';

// Vite inlines `import.meta.env` at build time; optional chaining keeps the
// module importable outside a Vite build (type-checks, test runners).
const configuredBaseUrl = import.meta.env?.VITE_API_BASE_URL;

let baseUrl = configuredBaseUrl?.replace(/\/$/, '') || FALLBACK_BASE_URL;
let accessToken: string | null = null;
let refreshToken: string | null = null;

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The session is gone (or was never there) rather than the request being wrong. */
  get isAuthError() {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  get isNotFound() {
    return this.statusCode === 404;
  }
}

/** Turns anything thrown by a fetch into a message worth putting in a toast. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function getBaseUrl(): string {
  return baseUrl;
}

/** Restores the admin session from a previous visit. */
export function initApiClient(): void {
  try {
    accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    /* private browsing — the session just does not persist */
  }
}

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  } catch {
    /* noop */
  }
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* noop */
  }
}

export function hasToken(): boolean {
  return accessToken !== null;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) h.Authorization = `Bearer ${accessToken}`;
  return h;
}

const toCamel = (key: string) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/**
 * Normalises response keys to camelCase.
 *
 * `state_fees` on the delivery settings is a map keyed by Indian state names
 * ("West Bengal", "Tamil Nadu") — real data, not field names — so that one key
 * is passed through untouched. Everything else is a field name.
 */
function camelizeKeys(value: unknown, parentKey?: string): unknown {
  if (Array.isArray(value)) return value.map(v => camelizeKeys(v));
  if (value !== null && typeof value === 'object') {
    if (parentKey === 'state_fees') return { ...(value as Record<string, unknown>) };
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [toCamel(k), camelizeKeys(v, k)]),
    );
  }
  return value;
}

/**
 * FastAPI reports validation failures as a list of error objects under `detail`.
 * Flatten those into one readable sentence instead of showing "[object Object]".
 */
function extractDetail(decoded: unknown): string | null {
  if (typeof decoded !== 'object' || decoded === null) return null;
  const detail = (decoded as Record<string, unknown>).detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map(d => (typeof d === 'object' && d !== null ? String((d as Record<string, unknown>).msg ?? '') : String(d)))
      .filter(Boolean);
    if (messages.length) return messages.join('. ');
  }
  return null;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let decoded: unknown = text;
  try {
    decoded = text ? JSON.parse(text) : null;
  } catch {
    /* a non-JSON body (e.g. a proxy error page) stays a string */
  }

  if (res.ok) {
    if (typeof decoded === 'object' && decoded !== null) return camelizeKeys(decoded) as T;
    return decoded as T;
  }

  throw new ApiError(res.status, extractDetail(decoded) ?? `Request failed (${res.status})`);
}

const REFRESH_PATH = '/api/v1/auth/refresh-token';

/**
 * `unavailable` is deliberately distinct from `expired`: the refresh could not
 * be attempted (the network was down), which is not evidence the session died.
 * Only `expired` ends the session.
 */
type RefreshOutcome = 'refreshed' | 'expired' | 'unavailable';

let refreshInFlight: Promise<RefreshOutcome> | null = null;

/** Called when the session ends for good, so the app can drop to the login page. */
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

/**
 * Exchanges the refresh token for a new access token. Concurrent callers share
 * one in-flight request, so a burst of 401s triggers a single refresh.
 */
async function refreshAccessToken(): Promise<RefreshOutcome> {
  if (!refreshToken) return 'expired';

  refreshInFlight ??= (async (): Promise<RefreshOutcome> => {
    try {
      const res = await fetch(`${baseUrl}${REFRESH_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return 'expired';
      const data = await res.json();
      const access = data.access_token as string | undefined;
      if (!access) return 'expired';
      setTokens(access, (data.refresh_token as string) ?? refreshToken!);
      return 'refreshed';
    } catch {
      return 'unavailable';
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** Shared 401 handling for both the JSON and the multipart paths. */
async function replayOnAuthFailure(res: Response, path: string, send: () => Promise<Response>): Promise<Response> {
  // A request that carried no token failing with 401/403 is not a dead session
  // (it is a page loaded before signing in), so only retry authed calls.
  const isAuthFailure = res.status === 401 || res.status === 403;
  if (!isAuthFailure || !accessToken || path === REFRESH_PATH) return res;

  const outcome = await refreshAccessToken();
  if (outcome === 'refreshed') return send();
  if (outcome === 'expired') {
    clearTokens();
    onSessionExpired?.();
  }
  // 'unavailable' keeps the tokens; the original error surfaces and the next
  // call can try again once the network recovers.
  return res;
}

async function request<T>(path: string, init: RequestInit, query?: Record<string, string>): Promise<T> {
  const url = new URL(`${baseUrl}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }

  const send = () => fetch(url.toString(), { ...init, headers: headers() });

  let res: Response;
  try {
    res = await send();
  } catch {
    throw new ApiError(0, 'Cannot reach the server right now. Check your connection and try again.');
  }

  res = await replayOnAuthFailure(res, path, send);
  return handleResponse<T>(res);
}

export function apiGet<T>(path: string, query?: Record<string, string>): Promise<T> {
  return request<T>(path, { method: 'GET' }, query);
}

export function apiPost<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
}

export function apiPut<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

/**
 * Multipart upload. Unlike the JSON helpers this one must NOT set a
 * Content-Type header — the browser fills in the multipart boundary.
 *
 * `fields` carries the extra form values the endpoint expects (the image upload
 * takes a `folder`; the video upload fixes its folder server-side and takes
 * none), matching ApiService.uploadBytes / uploadVideoBytes.
 */
export async function apiUpload<T>(path: string, file: File, fields: Record<string, string> = {}): Promise<T> {
  const send = () => {
    const form = new FormData();
    form.append('file', file, file.name);
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));

    const h: Record<string, string> = {};
    if (accessToken) h.Authorization = `Bearer ${accessToken}`;
    return fetch(`${baseUrl}${path}`, { method: 'POST', headers: h, body: form });
  };

  let res: Response;
  try {
    res = await send();
  } catch {
    throw new ApiError(0, 'Cannot reach the server right now. Check your connection and try again.');
  }

  res = await replayOnAuthFailure(res, path, send);
  return handleResponse<T>(res);
}
