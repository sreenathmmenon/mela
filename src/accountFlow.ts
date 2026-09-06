export const PROFILE_LINK_NONCE_KEY = "mela-profile-link-nonce";
export const AUTH_RETURN_TO_KEY = "mela-auth-return-to";

export function safeReturnPath(value: string | null): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return "/";
  const url = new URL(value, "https://mela.invalid");
  if (url.pathname === "/callback") return "/";
  for (const key of [
    "code",
    "state",
    "session_state",
    "error",
    "error_description",
    "access_token",
    "id_token",
  ])
    url.searchParams.delete(key);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function analyticsPath(value: string): string {
  const url = new URL(value, "https://mela.invalid");
  if (url.pathname === "/callback") return "/sign-in";
  if (url.hash.startsWith("#/screen") || url.pathname.endsWith("/screen"))
    return "/screen";
  if (url.searchParams.has("join")) return "/crowd-invite";
  if (url.searchParams.has("memory")) return "/memory";
  return url.pathname;
}
