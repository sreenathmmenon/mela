/**
 * This device's Mela identity lives in a SpacetimeDB auth token. Signing out
 * drops the token and re-enters with a fresh identity — the shared-device /
 * re-scan flow at demos — while keeping any `?join=` link intact so the
 * visitor lands straight back in the crowd they scanned.
 */
const HOST =
  import.meta.env.VITE_SPACETIMEDB_HOST ??
  (import.meta.env.DEV
    ? "ws://localhost:3000"
    : "https://maincloud.spacetimedb.com");
const DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? "mela-cah23";

export const AUTH_TOKEN_KEY = `${HOST}/${DB_NAME}/auth_token`;

export function signOut() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  window.location.reload();
}
