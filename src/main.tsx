import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "react-oidc-context";
import App from "./App.tsx";
import { Identity } from "spacetimedb";
import { SpacetimeDBProvider } from "spacetimedb/react";
import { DbConnection, ErrorContext } from "./module_bindings/index.ts";
import BigScreen from "./BigScreen.tsx";
import { AUTH_TOKEN_KEY } from "./identity.ts";
import { initAnalytics } from "./analytics.ts";
import { WebMCPTools } from "./AgentDuel";

const HOST =
  import.meta.env.VITE_SPACETIMEDB_HOST ??
  (import.meta.env.DEV
    ? "ws://localhost:3000"
    : "https://maincloud.spacetimedb.com");
const DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? "mela-cah23";

const onConnect = (
  useOidc: boolean,
  _conn: DbConnection,
  identity: Identity,
  token: string,
) => {
  // The OIDC library owns the magic-link token lifecycle. Persist only the
  // anonymous SpacetimeDB credential, which remains the low-friction first
  // visit path and must never overwrite an authenticated session.
  if (!useOidc) localStorage.setItem(AUTH_TOKEN_KEY, token);
  console.log(
    "Connected to SpacetimeDB with identity:",
    identity.toHexString(),
  );
};

const onDisconnect = () => {
  console.log("Disconnected from SpacetimeDB");
};

const onConnectError = (_ctx: ErrorContext, err: Error) => {
  console.log("Error connecting to SpacetimeDB:", err);
};

const RETURN_TO_KEY = "mela-auth-return-to";
const oidcConfig = {
  authority: "https://auth.spacetimedb.com/oidc",
  client_id: "client_034JneP1uzy8V3MhC39IXp",
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: window.location.origin,
  scope: "openid profile email",
  response_type: "code",
};

const isScreenRoute = () =>
  window.location.pathname.endsWith("/screen") ||
  window.location.hash.startsWith("#/screen");

/**
 * The stage is a hash route so it works on static hosting. Navigating to it
 * from inside the app only changes the hash, which does not reload the page —
 * so the route has to be reactive, not read once at startup.
 */
function MelaRoot() {
  const [onScreen, setOnScreen] = useState(isScreenRoute);
  useEffect(() => {
    const sync = () => setOnScreen(isScreenRoute());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);
  return onScreen ? <BigScreen /> : <App />;
}

function AuthenticatedMela() {
  const auth = useAuth();
  const oidcToken = auth.user?.id_token;
  const connectionBuilder = useMemo(
    () =>
      DbConnection.builder()
        .withUri(HOST)
        .withDatabaseName(DB_NAME)
        .withToken(
          oidcToken || localStorage.getItem(AUTH_TOKEN_KEY) || undefined,
        )
        .onConnect((conn, identity, token) =>
          onConnect(Boolean(oidcToken), conn, identity, token),
        )
        .onDisconnect(onDisconnect)
        .onConnectError(onConnectError),
    [oidcToken],
  );

  if (auth.isLoading)
    return <main className="app-shell">Connecting to Mela…</main>;
  if (auth.error)
    return (
      <main className="app-shell">
        <p className="feedback error">
          Email sign-in could not finish. Return to Mela and try again.
        </p>
      </main>
    );
  return (
    <SpacetimeDBProvider
      key={oidcToken ? "authenticated-mela" : "anonymous-mela"}
      connectionBuilder={connectionBuilder}
    >
      <WebMCPTools />
      <MelaRoot />
    </SpacetimeDBProvider>
  );
}

initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider
      {...oidcConfig}
      onSigninCallback={() => {
        const returnTo = sessionStorage.getItem(RETURN_TO_KEY);
        sessionStorage.removeItem(RETURN_TO_KEY);
        window.history.replaceState(
          {},
          document.title,
          returnTo || window.location.pathname.replace(/\/callback$/, "/"),
        );
      }}
    >
      <AuthenticatedMela />
    </AuthProvider>
  </StrictMode>,
);

// Hand off from the pre-render splash only once React has painted a frame, so
// there is never a gap between the two.
requestAnimationFrame(() =>
  requestAnimationFrame(() => document.getElementById("boot")?.remove()),
);
