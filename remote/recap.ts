import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { DbConnection } from "../src/module_bindings";

export type MatchMemory = {
  gameKind: string;
  humanName: string;
  aiName: string;
  humanScore: number;
  humanWickets: number;
  botScore: number;
  botWickets: number;
  notableMoment: string;
  crowdActions: number;
};
export class RecapError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function parseRecap(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new RecapError(400, "Enter your email to send this recap.");
  const b = body as Record<string, unknown>;
  if (
    Object.keys(b).some((k) => !["email", "matchId", "consent"].includes(k)) ||
    b.consent !== true
  )
    throw new RecapError(
      400,
      "Please request this one-time email for yourself.",
    );
  if (typeof b.matchId !== "string" || !/^[1-9][0-9]{0,17}$/.test(b.matchId))
    throw new RecapError(400, "This match link is not valid.");
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  // A single mailbox only: no display names, recipient lists or header injection.
  if (
    email.length > 254 ||
    !/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(
      email,
    ) ||
    email.split("@")[0].length > 64
  )
    throw new RecapError(
      400,
      "Enter a valid email address, like you@example.com.",
    );
  return { email, matchId: b.matchId };
}
export function recapMessage(
  memory: MatchMemory,
  matchId: string,
  origin: string,
) {
  const pen = memory.gameKind === "pen_fight";
  if (!pen && memory.gameKind !== "book_cricket")
    throw new RecapError(404, "This match recap is not available.");
  const game = pen ? "Pen Fight" : "Book Cricket";
  const score = `${memory.humanName} ${memory.humanScore}${pen ? "" : `/${memory.humanWickets}`} · ${memory.aiName} ${memory.botScore}${pen ? "" : `/${memory.botWickets}`}`;
  const link = new URL(`/?memory=${matchId}`, origin).href;
  const footer =
    "You requested this one-time match recap in Mela. This does not create an account or subscribe you to a mailing list.";
  const subject = `Your Mela ${game} recap · Match ${matchId}`;
  const text = `${game} · Now part of Mela\n\n${score}\n${memory.notableMoment}\n${memory.crowdActions} crowd move${memory.crowdActions === 1 ? "" : "s"}\n\nRevisit this match: ${link}\nPlay again: ${origin}/\n\n${footer}`;
  const html = `<html><body style="margin:0;background:#f5f0e4;color:#231c10;font-family:Arial,sans-serif;padding:24px"><div style="max-width:520px;margin:auto;background:#fffaf0;border:2px solid #231c10;border-radius:16px;padding:28px"><p style="color:#087268;font-size:12px;letter-spacing:2px">MELA · THE WORLD REMEMBERS</p><h1 style="font-family:Georgia,serif;font-size:30px">Your ${game} story.</h1><p style="font-size:20px;font-weight:bold">${escape(score)}</p><p style="line-height:1.6">${escape(memory.notableMoment)}</p><p>${memory.crowdActions} crowd move${memory.crowdActions === 1 ? "" : "s"} helped write this chapter.</p><p style="margin:28px 0"><a href="${escape(link)}" style="background:#087268;color:#fff;padding:14px 20px;text-decoration:none;border-radius:8px;display:inline-block">Revisit this match →</a></p><p><a href="${escape(origin)}/" style="color:#087268">Ready for another game?</a></p><hr style="border:0;border-top:1px solid #ddd1bc"><p style="font-size:12px;color:#625742;line-height:1.6">${footer}</p></div></body></html>`;
  return { subject, text, html };
}

/** The world verifies the supplied session; email uses a read-only memory subscription. */
export function readRecap(
  token: string,
  matchId: string,
): Promise<{ identity: string; memory: MatchMemory }> {
  return new Promise((resolve, reject) => {
    let connection: DbConnection | undefined;
    let finished = false;
    const finish = (
      error?: Error,
      result?: { identity: string; memory: MatchMemory },
    ) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      connection?.disconnect();
      if (error) reject(error);
      else resolve(result!);
    };
    const timer = setTimeout(
      () =>
        finish(
          new RecapError(
            503,
            "Mela could not read this match. Please try again.",
          ),
        ),
      8000,
    );
    connection = DbConnection.builder()
      .withUri(
        process.env.VITE_SPACETIMEDB_HOST ||
          "https://maincloud.spacetimedb.com",
      )
      .withDatabaseName(process.env.VITE_SPACETIMEDB_DB_NAME || "mela-cah23")
      .withToken(token)
      .onConnect((db, identity) => {
        if (finished) {
          db.disconnect();
          return;
        }
        db.subscriptionBuilder()
          .onApplied(() => {
            const memory = db.db.matchMemory.matchId.find(BigInt(matchId));
            if (!memory)
              finish(
                new RecapError(
                  404,
                  "A recap is available once this match has finished.",
                ),
              );
            else
              finish(undefined, { identity: identity.toHexString(), memory });
          })
          .onError(() =>
            finish(
              new RecapError(
                503,
                "Mela could not read this match. Please try again.",
              ),
            ),
          )
          .subscribe(`SELECT * FROM match_memory WHERE match_id = ${matchId}`);
      })
      .onConnectError(() =>
        finish(
          new RecapError(401, "Reconnect to Mela, then try sending again."),
        ),
      )
      .build();
  });
}

type Options = {
  origin: string;
  apiKey?: string;
  from?: string;
  read?: typeof readRecap;
  fetch?: typeof fetch;
  now?: () => number;
};
/** Delivery transport only. No game mutations, email tables or mailing-list enrolment. */
export function createRecapHandler(options: Options) {
  const now = options.now || Date.now;
  const read = options.read || readRecap;
  const request = options.fetch || fetch;
  const limits = new Map<string, { count: number; until: number }>();
  const sent = new Map<string, number>();
  const pending = new Set<string>();
  let active = 0;
  const enabled = Boolean(options.apiKey && options.from);
  function take(key: string, max: number, duration: number) {
    for (const [k, value] of limits) if (value.until <= now()) limits.delete(k);
    const value = limits.get(key) || { count: 0, until: now() + duration };
    if (value.count >= max || (!limits.has(key) && limits.size >= 4096))
      throw new RecapError(
        429,
        "A few recaps have already been requested. Please try again later.",
      );
    value.count++;
    limits.set(key, value);
  }
  const json = (res: ServerResponse, status: number, body: unknown) =>
    res
      .writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      })
      .end(JSON.stringify(body));
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    path: string,
  ): Promise<boolean> => {
    if (!["/api/recap", "/api/recap/status"].includes(path)) return false;
    try {
      if (path.endsWith("/status") && req.method === "GET") {
        json(res, 200, { enabled });
        return true;
      }
      if (req.method !== "POST" || path !== "/api/recap")
        throw new RecapError(405, "Use the recap form to request your email.");
      if (req.headers.origin !== options.origin)
        throw new RecapError(403, "Request your recap from the Mela app.");
      if (!enabled)
        throw new RecapError(
          503,
          "Email recaps are not available yet. You can still copy this match link.",
        );
      if (!req.headers["content-type"]?.startsWith("application/json"))
        throw new RecapError(400, "Use the recap form to request your email.");
      // Do not trust forwarded IP headers supplied by callers. Global + verified
      // identity + recipient budgets work behind Railway's proxy without them.
      take("requests", 60, 60000);
      if (active >= 4)
        throw new RecapError(
          503,
          "Mela is sending a few recaps. Please try again shortly.",
        );
      const token = req.headers.authorization?.match(/^Bearer ([^\s]+)$/)?.[1];
      if (!token || token.length > 8192)
        throw new RecapError(401, "Reconnect to Mela, then try sending again.");
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 2048)
          throw new RecapError(413, "The recap request is too large.");
        chunks.push(chunk);
      }
      let body: unknown;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        throw new RecapError(400, "Use the recap form to request your email.");
      }
      const { email, matchId } = parseRecap(body);
      if (active >= 4)
        throw new RecapError(
          503,
          "Mela is sending a few recaps. Please try again shortly.",
        );
      const key = hash(`mela-recap-v1:${matchId}:${email}`);
      for (const [k, until] of sent) if (until <= now()) sent.delete(k);
      if (pending.has(key))
        throw new RecapError(
          409,
          "This recap is already being sent. Please wait a moment.",
        );
      active++;
      pending.add(key);
      try {
        const { identity, memory } = await read(token, matchId);
        if (sent.has(key)) {
          json(res, 200, { accepted: true });
          return true;
        }
        take(`identity:${hash(identity)}`, 5, 86400000);
        take(`recipient:${hash(email)}`, 3, 86400000);
        take("deliveries", 100, 86400000);
        const message = recapMessage(memory, matchId, options.origin);
        const response = await request("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": key,
          },
          body: JSON.stringify({ from: options.from, to: [email], ...message }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok)
          throw new RecapError(
            502,
            "The email service could not accept your recap. Please try again shortly.",
          );
        const data = (await response.json()) as { id?: string };
        if (!data.id)
          throw new RecapError(
            502,
            "Delivery could not be confirmed. Please try again shortly.",
          );
        sent.set(key, now() + 86400000);
        // Neither recipient addresses nor tokens are logged or stored in the world.
        console.info("Mela recap accepted by email provider", {
          matchId,
          deliveryId: data.id,
        });
        json(res, 200, { accepted: true });
      } finally {
        active--;
        pending.delete(key);
      }
    } catch (error) {
      if (error instanceof RecapError)
        json(res, error.status, { error: error.message });
      else
        json(res, 503, {
          error: "Mela could not confirm the email. Please try again shortly.",
        });
    }
    return true;
  };
}
