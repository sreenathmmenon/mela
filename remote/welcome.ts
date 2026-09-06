import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { DbConnection } from "../src/module_bindings";
import { realEmail } from "../spacetimedb/src/emailRules";
import { checkDisplayName } from "../spacetimedb/src/displayNameRules";
import { RecapError } from "./recap";

const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function parseWelcome(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new RecapError(400, "Use the Mela join form.");
  const b = body as Record<string, unknown>;
  if (
    Object.keys(b).some((k) => !["name", "email", "consent"].includes(k)) ||
    b.consent !== true ||
    typeof b.email !== "string" ||
    typeof b.name !== "string"
  )
    throw new RecapError(400, "Enter your name and email to join.");
  const name = b.name.trim();
  const check = checkDisplayName(name);
  if (!check.ok)
    throw new RecapError(400, check.message || "Choose another display name.");
  try {
    return { name, email: realEmail(b.email) };
  } catch (error) {
    throw new RecapError(400, (error as Error).message);
  }
}
export function welcomeMessage(origin: string) {
  const link = new URL("/", origin).href;
  return {
    subject: "Welcome to Mela — your next move matters",
    text: `You're in Mela.\n\nPlayers play. Spectators influence. AI participates. The world remembers.\n\nTake on MelaBot in Book Cricket or Pen Fight. Or join the crowd and change someone else's game.\n\nReturn to Mela: ${link}\n\nYour history stays with your current browser identity. This link is not a sign-in or recovery link.\n\nYou received this one-time welcome email because you joined Mela with this address. No newsletter subscription. If this wasn't you, you can ignore this email.`,
    html: `<html><body style="background:#f5f0e4;color:#231c10;font-family:Arial,sans-serif;padding:24px"><main style="max-width:520px;margin:auto;background:#fffaf0;border:2px solid #231c10;border-radius:16px;padding:28px"><p style="color:#087268;letter-spacing:2px">MELA · LIVE PLAYGROUND</p><h1 style="font-family:Georgia,serif">Your next move matters.</h1><p>Players play. Spectators influence. AI participates. The world remembers.</p><p>Take on MelaBot in Book Cricket or Pen Fight. Or join the crowd and change someone else's game.</p><p><a style="display:inline-block;background:#087268;color:white;padding:16px;border-radius:8px" href="${link}">Step into Mela →</a></p><p style="font-size:12px">Your history stays with your current browser identity. This is not a sign-in or recovery link.</p><hr><p style="font-size:12px">You joined Mela with this address. This is a one-time welcome, not a newsletter subscription. If this wasn't you, you can ignore this email.</p></main></body></html>`,
  };
}

type Session = {
  identity: string;
  /** A profile, not merely a contact record, means this identity can return. */
  existing?: boolean;
  enroll: () => Promise<void>;
  close: () => void;
};
export function welcomeSession(
  token: string,
  name: string,
  email: string,
): Promise<Session> {
  return new Promise((resolve, reject) => {
    let db: DbConnection | undefined;
    let done = false;
    const fail = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      db?.disconnect();
      reject(new RecapError(401, "Reconnect to Mela and try again."));
    };
    const timer = setTimeout(fail, 8000);
    db = DbConnection.builder()
      .withUri(
        process.env.VITE_SPACETIMEDB_HOST ||
          "https://maincloud.spacetimedb.com",
      )
      .withDatabaseName(process.env.VITE_SPACETIMEDB_DB_NAME || "mela-cah23")
      .withToken(token)
      .onConnect((connection, identity) => {
        if (done) {
          connection.disconnect();
          return;
        }
        connection
          .subscriptionBuilder()
          .onApplied(() => {
            if (done) return;
            // A welcome email may have been accepted before the profile reducer
            // committed (for example a tab closed during enrolment). A contact
            // alone is not a usable Mela profile. Calling that person
            // "Welcome back" strands a fresh browser on an empty identity.
            const profile = Array.from(connection.db.playerProfile.iter()).find(
              (row) => row.identity.toHexString() === identity.toHexString(),
            );
            done = true;
            clearTimeout(timer);
            resolve({
              identity: identity.toHexString(),
              existing: Boolean(profile),
              enroll: () =>
                connection.reducers.onboardWithEmail({
                  displayName: name,
                  email,
                }),
              close: () => connection.disconnect(),
            });
          })
          .onError(fail)
          .subscribe([
            "SELECT * FROM my_email_contact",
            "SELECT * FROM player_profile",
          ]);
      })
      .onConnectError(fail)
      .build();
  });
}

type Options = {
  origin: string;
  apiKey?: string;
  from?: string;
  session?: typeof welcomeSession;
  fetch?: typeof fetch;
  now?: () => number;
};
export function createWelcomeHandler(options: Options) {
  const limits = new Map<string, { n: number; until: number }>();
  const pending = new Set<string>();
  const accepted = new Map<string, number>();
  const now = options.now || Date.now;
  const take = (key: string, max: number, duration: number) => {
    for (const [k, v] of limits) if (v.until <= now()) limits.delete(k);
    const v = limits.get(key) || { n: 0, until: now() + duration };
    if (v.n >= max || (!limits.has(key) && limits.size >= 4096))
      throw new RecapError(
        429,
        "Too many welcome requests. Please try again later.",
      );
    v.n++;
    limits.set(key, v);
  };
  let active = 0;
  return async (req: IncomingMessage, res: ServerResponse, path: string) => {
    if (path !== "/api/welcome") return false;
    const json = (status: number, body: unknown) =>
      res
        .writeHead(status, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        })
        .end(JSON.stringify(body));
    let session: Session | undefined;
    let key: string | undefined;
    try {
      if (req.method !== "POST")
        throw new RecapError(405, "Use the join form.");
      if (req.headers.origin !== options.origin)
        throw new RecapError(403, "Join from the Mela app.");
      if (!req.headers["content-type"]?.startsWith("application/json"))
        throw new RecapError(400, "Use the join form.");
      take("requests", 60, 60000);
      if (active >= 4)
        throw new RecapError(
          503,
          "Mela is welcoming a few people. Try again shortly.",
        );
      const token = req.headers.authorization?.match(/^Bearer ([^\s]+)$/)?.[1];
      if (!token || token.length > 8192)
        throw new RecapError(401, "Reconnect to Mela and try again.");
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 2048) throw new RecapError(413, "The request is too large.");
        chunks.push(chunk);
      }
      let body: unknown;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        throw new RecapError(400, "Use the join form.");
      }
      const { name, email } = parseWelcome(body);
      const candidate = hash(`mela-welcome-v1:${email}`);
      if (pending.has(candidate))
        throw new RecapError(
          409,
          "Your welcome is already on its way. Please wait, then retry.",
        );
      if (active >= 4) throw new RecapError(503, "Please try again shortly.");
      key = candidate;
      pending.add(key);
      active++;
      session = await (options.session || welcomeSession)(token, name, email);
      // A stale form must not rewrite a real returning profile or send mail
      // to newly typed details. `existing` means a committed profile, not
      // just an email contact from an interrupted signup.
      if (session.existing) {
        json(200, { accepted: false, existing: true });
        return true;
      }
      take(`identity:${hash(session.identity)}`, 5, 86400000);
      // Registration is the authoritative reducer transaction. It comes
      // before delivery: a provider outage must not make a valid person lose
      // their Mela profile or force them into a fake "returning" state.
      let enrollmentTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          session.enroll(),
          new Promise<never>((_resolve, reject) => {
            enrollmentTimer = setTimeout(
              () => reject(new Error("Enrollment timed out")),
              8000,
            );
          }),
        ]);
      } catch {
        throw new RecapError(
          409,
          "Mela could not create this profile. No registration was made. Use a different email or return to the browser where this email first joined Mela.",
        );
      } finally {
        if (enrollmentTimer) clearTimeout(enrollmentTimer);
      }
      for (const [k, until] of accepted) if (until <= now()) accepted.delete(k);
      let emailStatus: "sent" | "delayed" = "delayed";
      if (!accepted.has(key)) {
        if (options.apiKey && options.from) {
          try {
            take(`email:${hash(email)}`, 3, 86400000);
            take("sends", 100, 86400000);
            const result = await (options.fetch || fetch)(
              "https://api.resend.com/emails",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${options.apiKey}`,
                  "Content-Type": "application/json",
                  "Idempotency-Key": key,
                },
                body: JSON.stringify({
                  from: options.from,
                  to: [email],
                  ...welcomeMessage(options.origin),
                }),
                signal: AbortSignal.timeout(10000),
              },
            );
            if (!result.ok) throw new Error("Provider rejected welcome");
            const data = (await result.json()) as { id?: string };
            if (!data.id) throw new Error("Provider omitted delivery id");
            accepted.set(key, now() + 86400000);
            emailStatus = "sent";
            console.info("Mela welcome accepted by email provider", {
              deliveryId: data.id,
            });
          } catch {
            // Profile/contact are already committed. Delivery can be retried
            // later; it must never undo or deny the registration.
            emailStatus = "delayed";
          }
        }
      } else {
        emailStatus = "sent";
      }
      json(200, { accepted: true, emailStatus });
    } catch (error) {
      json(error instanceof RecapError ? error.status : 503, {
        error:
          error instanceof RecapError
            ? error.message
            : "Mela could not finish joining. Please retry; your welcome will not be resent for the same request.",
      });
    } finally {
      session?.close();
      if (key) {
        pending.delete(key);
        active--;
      }
    }
    return true;
  };
}
