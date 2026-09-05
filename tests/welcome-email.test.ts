import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import {
  realEmail,
  legacyEmail,
  migrateLegacyContacts,
} from "../spacetimedb/src/emailRules";
import {
  createWelcomeHandler,
  parseWelcome,
  welcomeMessage,
} from "../remote/welcome";
import { parseRecap, RecapError } from "../remote/recap";

test("legacy contacts are unique, unverified, non-deliverable and never accepted for sending", () => {
  const addresses = new Set(
    Array.from({ length: 100 }, (_, i) =>
      legacyEmail(i.toString(16).padStart(64, "0")),
    ),
  );
  assert.equal(addresses.size, 100);
  for (const email of addresses) {
    assert.throws(() => realEmail(email));
    assert.throws(() => parseRecap({ email, matchId: "7", consent: true }));
  }
});
test("legacy migration covers existing profiles exactly once and preserves real contacts and world rows", () => {
  let migrated = false;
  const identity = (n: number) => ({
    toHexString: () => n.toString(16).padStart(64, "0"),
  });
  const profiles = [1, 2, 3].map((n) => ({ identity: identity(n), score: 42 }));
  const contacts = new Map<any, any>([
    [
      profiles[0].identity,
      { email: "real@example.com", source: "user_supplied" },
    ],
  ]);
  const ctx = {
    timestamp: 123,
    db: {
      playerProfile: { iter: () => profiles },
      emailContact: {
        identity: { find: (id: any) => contacts.get(id) },
        insert: (row: any) => contacts.set(row.identity, row),
      },
      emailMigration: {
        id: { find: () => migrated },
        insert: () => {
          migrated = true;
        },
      },
    },
  };
  migrateLegacyContacts(ctx);
  migrateLegacyContacts(ctx);
  assert.equal(contacts.size, 3);
  assert.equal(contacts.get(profiles[0].identity).email, "real@example.com");
  for (const p of profiles.slice(1)) {
    assert.equal(contacts.get(p.identity).source, "legacy_placeholder");
    assert.equal(contacts.get(p.identity).verified, false);
    assert.equal(p.score, 42);
  }
  profiles.push({ identity: identity(4), score: 42 });
  migrateLegacyContacts(ctx);
  assert.equal(
    contacts.size,
    3,
    "new arrivals are never silently classified as legacy",
  );
});
test("welcome input requires consent, safe name and real mailbox; content makes no recovery or subscription promise", () => {
  assert.deepEqual(
    parseWelcome({ name: " Maya ", email: " Me@Example.com ", consent: true }),
    { name: "Maya", email: "me@example.com" },
  );
  for (const extra of [
    { consent: false },
    { email: "x@users.invalid" },
    { email: "a@example.com\r\nBcc:b@example.com" },
    { email: "a..b@example.com" },
    { name: "<script>" },
    { html: "spam" },
  ])
    assert.throws(() =>
      parseWelcome({
        name: "Maya",
        email: "me@example.com",
        consent: true,
        ...extra,
      }),
    );
  const message = welcomeMessage("https://mela.example");
  assert.match(message.text, /not a sign-in or recovery link/);
  assert.match(message.text, /No newsletter subscription/);
  assert.match(message.html, /https:\/\/mela.example\//);
});
async function fixture(
  overrides: Partial<Parameters<typeof createWelcomeHandler>[0]> = {},
) {
  const calls: string[] = [];
  const handler = createWelcomeHandler({
    origin: "https://mela.example",
    apiKey: "test",
    from: "Mela <hello@example.com>",
    session: async (token) => {
      if (token !== "valid") throw new RecapError(401, "Bad session");
      calls.push("authenticate");
      return {
        identity: "one",
        enroll: async () => {
          calls.push("enroll");
        },
        close: () => {
          calls.push("close");
        },
      };
    },
    fetch: (async (_url, init) => {
      calls.push("send");
      assert.match(String(init?.body), /Welcome to Mela/);
      return Response.json({ id: "test-email" });
    }) as typeof fetch,
    ...overrides,
  });
  const server = createServer(async (req, res) => {
    if (!(await handler(req, res, req.url!))) res.writeHead(404).end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const post = (
    body: unknown = { name: "Maya", email: "me@example.com", consent: true },
    headers: Record<string, string> = {},
  ) =>
    fetch(`http://127.0.0.1:${(server.address() as any).port}/api/welcome`, {
      method: "POST",
      headers: {
        Origin: "https://mela.example",
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  return {
    post,
    calls,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
test("real HTTP flow authenticates, sends, then enrolls; retries do not send twice", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.post()).status, 200);
    assert.deepEqual(f.calls, ["authenticate", "send", "enroll", "close"]);
    assert.equal((await f.post()).status, 200);
    assert.equal(f.calls.filter((x) => x === "send").length, 1);
  } finally {
    await f.close();
  }
});
test("provider failure never enrolls a new user or claims success", async () => {
  const f = await fixture({
    fetch: (async () =>
      new Response("failure", { status: 500 })) as typeof fetch,
  });
  try {
    assert.equal((await f.post()).status, 502);
    assert.deepEqual(f.calls, ["authenticate", "close"]);
  } finally {
    await f.close();
  }
});
test("bad origins, sessions, placeholders and missing config cannot send", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (await f.post(undefined, { Origin: "https://evil.example" })).status,
      403,
    );
    assert.equal(
      (await f.post(undefined, { Authorization: "Bearer bad" })).status,
      401,
    );
    assert.equal(
      (
        await f.post({
          name: "Maya",
          email: legacyEmail("a".repeat(64)),
          consent: true,
        })
      ).status,
      400,
    );
    assert.equal(f.calls.length, 0);
  } finally {
    await f.close();
  }
  const off = await fixture({ apiKey: undefined });
  try {
    assert.equal((await off.post()).status, 503);
  } finally {
    await off.close();
  }
});
test("concurrent identical welcomes are serialized and rate budgets reject abuse", async () => {
  let release!: () => void;
  let entered!: () => void;
  const ready = new Promise<void>((r) => (entered = r));
  const wait = new Promise<void>((r) => (release = r));
  const f = await fixture({
    fetch: (async () => {
      entered();
      await wait;
      return Response.json({ id: "once" });
    }) as typeof fetch,
  });
  try {
    const first = f.post();
    await ready;
    assert.equal((await f.post()).status, 409);
    release();
    assert.equal((await first).status, 200);
    for (let i = 0; i < 4; i++) assert.equal((await f.post()).status, 200);
    assert.equal((await f.post()).status, 429);
  } finally {
    release();
    await f.close();
  }
});
test("enrollment failure after provider acceptance retries without resending", async () => {
  let attempts = 0;
  const f = await fixture({
    session: async () => ({
      identity: "one",
      close: () => {},
      enroll: async () => {
        if (++attempts === 1) throw new Error("temporary");
      },
    }),
  });
  try {
    assert.equal((await f.post()).status, 503);
    assert.equal((await f.post()).status, 200);
    assert.equal(f.calls.filter((x) => x === "send").length, 1);
  } finally {
    await f.close();
  }
});
