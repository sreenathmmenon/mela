import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { Identity } from "spacetimedb";
import { SpacetimeDBProvider } from "spacetimedb/react";
import { DbConnection, ErrorContext } from "./module_bindings/index.ts";
import BigScreen from "./BigScreen.tsx";
import { AUTH_TOKEN_KEY } from "./identity.ts";

const HOST =
  import.meta.env.VITE_SPACETIMEDB_HOST ??
  (import.meta.env.DEV
    ? "ws://localhost:3000"
    : "https://maincloud.spacetimedb.com");
const DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? "mela-cah23";

const onConnect = (_conn: DbConnection, identity: Identity, token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
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

const connectionBuilder = DbConnection.builder()
  .withUri(HOST)
  .withDatabaseName(DB_NAME)
  .withToken(localStorage.getItem(AUTH_TOKEN_KEY) || undefined)
  .onConnect(onConnect)
  .onDisconnect(onDisconnect)
  .onConnectError(onConnectError);

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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      <MelaRoot />
    </SpacetimeDBProvider>
  </StrictMode>,
);

// Hand off from the pre-render splash only once React has painted a frame, so
// there is never a gap between the two.
requestAnimationFrame(() =>
  requestAnimationFrame(() => document.getElementById("boot")?.remove()),
);
