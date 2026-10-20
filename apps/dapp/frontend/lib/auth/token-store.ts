/**
 * Canonical client-side session storage. The short-lived access token lives
 * in module memory only, so it never touches localStorage (or any other
 * JS-readable persistent storage) where XSS, extensions or a compromised
 * dependency could lift it. After a reload the token is recovered through the
 * httpOnly refresh cookie (/auth/refresh); see components/auth-provider.tsx.
 *
 * The refresh token is NOT stored here either. The server sets it as an
 * httpOnly, Secure cookie (scoped to /api/v1/auth) on /auth/verify and rotates
 * it on every /auth/refresh. The browser attaches the cookie automatically;
 * the client only needs `credentials: "include"` on the fetch calls that touch
 * it (see lib/api/client.ts).
 */

const LEGACY_ACCESS_TOKEN_KEY = "nester_auth_token";
const USER_ID_KEY = "nester_user_id";
const DEVICE_FINGERPRINT_KEY = "nester_device_fingerprint";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

let accessToken = "";
const listeners = new Set<(token: string) => void>();

// Tokens written by earlier versions must not linger in localStorage.
if (isBrowser()) {
  window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
}

function notify(): void {
  listeners.forEach((listener) => listener(accessToken));
}

export function subscribeAccessToken(listener: (token: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAccessToken(): string {
  return accessToken;
}

export function getUserId(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(USER_ID_KEY);
}

export function setUserId(id: string | null): void {
  if (!isBrowser()) return;
  if (id) {
    window.localStorage.setItem(USER_ID_KEY, id);
  } else {
    window.localStorage.removeItem(USER_ID_KEY);
  }
}

export function setAccessToken(token: string): void {
  accessToken = token;
  notify();
}

export function clearTokens(): void {
  accessToken = "";
  notify();
  if (!isBrowser()) return;
  window.localStorage.removeItem(USER_ID_KEY);
}

/**
 * A random ID generated once per browser and persisted indefinitely — not a
 * hardware fingerprint, just a stable per-installation identifier. Bound to
 * the session at login and enforced on every refresh server-side, so a
 * refresh token stolen and replayed from a different browser is detectable.
 */
export function getOrCreateDeviceFingerprint(): string {
  if (!isBrowser()) return "";
  let fingerprint = window.localStorage.getItem(DEVICE_FINGERPRINT_KEY);
  if (!fingerprint) {
    fingerprint = generateFingerprint();
    window.localStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
  }
  return fingerprint;
}

function generateFingerprint(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `fp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Storage key exported for the cross-tab `storage` event listener. */
export const USER_ID_STORAGE_KEY = USER_ID_KEY;
