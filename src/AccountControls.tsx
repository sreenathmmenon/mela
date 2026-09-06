import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "react-oidc-context";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import { reducers, tables } from "./module_bindings";
import { AUTH_TOKEN_KEY } from "./identity";
import {
  AUTH_RETURN_TO_KEY,
  PROFILE_LINK_NONCE_KEY,
  safeReturnPath,
} from "./accountFlow";
import { checkDisplayName } from "../spacetimedb/src/displayNameRules";
import "./accountControls.css";

const AccountContext = createContext({ openAccount: () => {} });
export const useMelaAccount = () => useContext(AccountContext);

/** Optional identity controls shared by every game; never a gate before play. */
export function AccountControls({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const conn = useSpacetimeDB();
  const [profiles, profilesReady] = useTable(tables.playerProfile);
  const [links, linksReady] = useTable(tables.myIdentityLink);
  const [statuses, statusReady] = useTable(tables.myAccountStatus);
  const [matches] = useTable(tables.match);
  const [spectators] = useTable(tables.matchSpectator);
  const canonical = links[0]?.canonicalIdentity ?? conn.identity;
  const me = profiles.find((p) => canonical?.isEqual(p.identity));
  const protectedAccount = statuses[0]?.protected === true;
  const recoverable = statuses[0]?.recoverable === true;
  const beginLink = useReducer(reducers.beginProfileLink);
  const completeLink = useReducer(reducers.completeProfileLink);
  const enterGame = useReducer(reducers.enterGame);
  const rename = useReducer(reducers.onboard);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [confirmForget, setConfirmForget] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("mela-save-dismissed") === "1",
  );
  const handled = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const mine = matches.filter(
    (m) =>
      canonical &&
      (m.playerIdentity.isEqual(canonical) ||
        spectators.some(
          (s) => s.matchId === m.id && s.identity.isEqual(canonical),
        )),
  );
  const completed =
    mine.some((m) => m.status === "complete") &&
    !mine.some((m) => m.status === "active");
  const openAccount = () => {
    setName(me?.displayName ?? "");
    setConfirmForget(false);
    setOpen(true);
  };
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  useEffect(() => {
    if (
      !conn.isActive ||
      !auth.isAuthenticated ||
      !profilesReady ||
      !linksReady ||
      !statusReady ||
      handled.current
    )
      return;
    const nonce = sessionStorage.getItem(PROFILE_LINK_NONCE_KEY);
    if (!protectedAccount) {
      if (nonce) {
        setError(
          "This sign-in did not verify your email. Your browser progress is still safe. Return to it or try email sign-in again.",
        );
        setOpen(true);
      }
      return;
    }
    handled.current = true;
    if (me) {
      if (nonce) {
        sessionStorage.removeItem(PROFILE_LINK_NONCE_KEY);
        setMessage(
          "Your saved profile is restored. Any separate guest progress has been kept, not merged.",
        );
        setOpen(true);
      }
      return;
    }
    setBusy(true);
    (nonce ? completeLink({ nonce }) : enterGame({ gameKind: "lobby" }))
      .then(() => {
        sessionStorage.removeItem(PROFILE_LINK_NONCE_KEY);
        setMessage(
          nonce
            ? "Your games and crowd memories are now saved across devices."
            : "Your saved Mela profile is ready. Choose a game.",
        );
      })
      .catch(() => {
        setError(
          "We couldn't finish saving this profile. Your original browser progress is still safe. Return to it and try again.",
        );
        setOpen(true);
      })
      .finally(() => setBusy(false));
  }, [
    conn.isActive,
    auth.isAuthenticated,
    profilesReady,
    linksReady,
    statusReady,
    protectedAccount,
    me,
    completeLink,
    enterGame,
  ]);

  const signIn = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      sessionStorage.setItem(
        AUTH_RETURN_TO_KEY,
        safeReturnPath(
          `${location.pathname}${location.search}${location.hash}`,
        ),
      );
      if (me && !protectedAccount) {
        const nonce = Array.from(
          crypto.getRandomValues(new Uint8Array(32)),
          (b) => b.toString(16).padStart(2, "0"),
        ).join("");
        await beginLink({ nonce });
        sessionStorage.setItem(PROFILE_LINK_NONCE_KEY, nonce);
      }
      await auth.signinRedirect({ prompt: "login" });
    } catch {
      setError(
        "Sign-in couldn't open. You can keep playing and try again later.",
      );
      setBusy(false);
    }
  };
  const returnToGuest = async () => {
    sessionStorage.removeItem(PROFILE_LINK_NONCE_KEY);
    await auth.removeUser();
    location.assign(safeReturnPath(sessionStorage.getItem(AUTH_RETURN_TO_KEY)));
  };
  const forget = async () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(PROFILE_LINK_NONCE_KEY);
    sessionStorage.removeItem(AUTH_RETURN_TO_KEY);
    await auth.removeUser();
    location.assign("/");
  };
  return (
    <AccountContext.Provider value={{ openAccount }}>
      {me && (
        <div className="account-strip">
          <button onClick={openAccount} aria-label="Your Mela profile">
            <span aria-hidden="true">◉</span> {me.displayName}{" "}
            <small>{recoverable ? "Saved profile" : "This browser"}</small>
          </button>
        </div>
      )}
      {me && completed && !recoverable && !dismissed && (
        <aside className="save-invitation">
          <div>
            <strong>Keep this going.</strong>
            <span>Save your progress on any device.</span>
          </div>
          <button onClick={openAccount}>Save progress</button>
          <button
            className="quiet"
            onClick={() => {
              setDismissed(true);
              sessionStorage.setItem("mela-save-dismissed", "1");
            }}
          >
            Not now
          </button>
        </aside>
      )}
      {auth.isAuthenticated &&
      (!statusReady ||
        (protectedAccount && !me && (busy || !handled.current))) ? (
        <section className="join-card" role="status">
          <h2>Restoring your place…</h2>
          <p>Your browser progress stays safe while we connect your profile.</p>
        </section>
      ) : (
        children
      )}
      <dialog
        ref={dialog}
        aria-labelledby="mela-account-title"
        className="account-dialog"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <button
          className="account-close"
          onClick={() => setOpen(false)}
          aria-label="Close profile"
        >
          ×
        </button>
        <h2 id="mela-account-title">{me ? "Your Mela." : "Welcome back."}</h2>
        <p>
          {recoverable
            ? "Saved. Sign in with email on any device."
            : me
              ? "Your progress lives in this browser. Save it to play on any device."
              : "Sign in to restore your saved progress."}
        </p>
        {me && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const check = checkDisplayName(name);
              if (!check.ok) {
                setError(check.message ?? "Choose another nickname.");
                return;
              }
              setBusy(true);
              setError("");
              try {
                await rename({ displayName: name });
                setMessage(
                  "Nickname updated. Your past match memories stay unchanged.",
                );
              } catch {
                setError(
                  "Couldn't update your nickname. Try again when connected.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label htmlFor="mela-nickname">Your nickname</label>
            <div className="account-name-row">
              <input
                id="mela-nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                autoComplete="off"
              />
              <button
                disabled={
                  busy || !conn.isActive || name.trim() === me.displayName
                }
              >
                Save name
              </button>
            </div>
          </form>
        )}
        {!protectedAccount && (
          <button
            className="account-primary"
            disabled={busy || !conn.isActive}
            onClick={() => void signIn()}
          >
            {busy
              ? "Opening secure sign-in…"
              : me
                ? "Save my progress"
                : "Restore with email"}
          </button>
        )}
        {!protectedAccount && (
          <p className="account-note">
            One email link. No password or newsletter.
          </p>
        )}
        {message && (
          <p role="status" className="account-success">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="account-error">
            {error}
          </p>
        )}
        {auth.isAuthenticated && localStorage.getItem(AUTH_TOKEN_KEY) && (
          <button
            className="quiet"
            disabled={busy}
            onClick={() => void returnToGuest()}
          >
            Return to this browser's guest progress
          </button>
        )}
        {!me && (
          <details className="account-note">
            <summary>Played before, but never saved?</summary>
            <p>
              Open your original browser to save its progress. A welcome email
              alone cannot restore it.
            </p>
          </details>
        )}
        <button className="quiet" onClick={() => setOpen(false)}>
          {me ? "Back to the game" : "Just let me play"}
        </button>
        {me && !confirmForget && (
          <button
            className="quiet danger"
            onClick={() => setConfirmForget(true)}
          >
            {auth.isAuthenticated
              ? "Sign out on this device"
              : "Forget this browser profile"}
          </button>
        )}
        {confirmForget && (
          <div className="account-warning">
            <p>
              {recoverable
                ? "You'll leave this profile on this device. Sign in again to restore it."
                : "Without a saved sign-in, forgetting this browser removes your way back to these games. This cannot be undone here."}
            </p>
            <button onClick={() => void forget()}>Confirm and leave</button>
            <button className="quiet" onClick={() => setConfirmForget(false)}>
              Keep playing
            </button>
          </div>
        )}
      </dialog>
    </AccountContext.Provider>
  );
}
