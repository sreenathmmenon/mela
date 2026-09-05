import { useId, useRef, useState } from "react";
import { AUTH_TOKEN_KEY } from "./identity";
import "./emailRecap.css";

export function EmailRecap({ matchId }: { matchId: bigint }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  return (
    <details className="email-recap">
      <summary>
        Keep this match in your inbox <span>Optional</span>
      </summary>
      {state === "sent" ? (
        <div role="status" className="recap-success">
          <strong>Your match is on its way.</strong>
          <p>
            Check your inbox or spam folder for Mela. Your result and a link
            back are inside.
          </p>
        </div>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy.current) return;
            busy.current = true;
            setState("sending");
            setMessage("");
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 22000);
            try {
              const token = localStorage.getItem(AUTH_TOKEN_KEY);
              if (!token)
                throw new Error("Reconnect to Mela, then try sending again.");
              const response = await fetch("/api/recap", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  matchId: matchId.toString(),
                  email,
                  consent: true,
                }),
                signal: controller.signal,
              });
              const result = await response.json();
              if (!response.ok || result.accepted !== true)
                throw new Error(
                  result.error ||
                    "The recap could not be sent. Please try again.",
                );
              setEmail("");
              setState("sent");
            } catch (error) {
              setState("error");
              setMessage(
                error instanceof Error && error.name !== "AbortError"
                  ? error.message
                  : "We couldn’t confirm the send. Try again; a retry won’t send a second copy today.",
              );
            } finally {
              clearTimeout(timer);
              busy.current = false;
            }
          }}
        >
          <p>The score, the crowd’s moment, and a way back to this match.</p>
          <label htmlFor={id}>Your email address</label>
          <div className="recap-input-row">
            <input
              id={id}
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              maxLength={254}
              placeholder="you@example.com"
              value={email}
              disabled={state === "sending"}
              onChange={(event) => setEmail(event.target.value)}
              aria-describedby={`${id}-privacy ${id}-feedback`}
            />
            <button
              type="submit"
              disabled={state === "sending" || !email.trim()}
            >
              {state === "sending"
                ? "Sending your recap…"
                : "Email me this match"}
            </button>
          </div>
          <p id={`${id}-privacy`} className="recap-privacy">
            One email, only when you ask. No account or mailing list. Resend
            delivers it; your address is never shown to players or spectators.
          </p>
          <p
            id={`${id}-feedback`}
            role={state === "error" ? "alert" : "status"}
            className="recap-feedback"
          >
            {message}
          </p>
        </form>
      )}
    </details>
  );
}
