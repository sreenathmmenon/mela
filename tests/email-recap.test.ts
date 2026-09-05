import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import {
  createRecapHandler,
  parseRecap,
  recapMessage,
  RecapError,
  type MatchMemory,
} from "../remote/recap";
const memory: MatchMemory = {
  gameKind: "pen_fight",
  humanName: "Astra",
  aiName: "MelaBot",
  humanScore: 2,
  humanWickets: 0,
  botScore: 1,
  botWickets: 0,
  notableMoment: "Nila's TILT changed the flick.",
  crowdActions: 1,
};
test("recap accepts one opted-in mailbox and rejects recipient/header or match injection", () => {
  assert.deepEqual(
    parseRecap({ email: " You@Example.com ", matchId: "7", consent: true }),
    { email: "you@example.com", matchId: "7" },
  );
  for (const bad of [
    { email: "a@example.com,b@example.com" },
    { email: "a@example.com\r\nBcc: b@example.com" },
    { consent: false },
    { matchId: "7 OR 1=1" },
    { html: "spam" },
  ])
    assert.throws(() =>
      parseRecap({
        email: "you@example.com",
        matchId: "7",
        consent: true,
        ...bad,
      }),
    );
});
test("recap renders saved game-specific scores, escaped names, attribution and a fixed return origin", () => {
  const pen = recapMessage(
    {
      ...memory,
      humanName: "<img src=x>",
      notableMoment: "<script>alert(1)</script>",
    },
    "7",
    "https://mela.example",
  );
  assert.match(pen.html, /&lt;img/);
  assert.doesNotMatch(pen.html, /<script>/);
  assert.match(pen.text, /https:\/\/mela.example\/\?memory=7/);
  assert.match(pen.text, /2 · MelaBot 1/);
  const book = recapMessage(
    {
      ...memory,
      gameKind: "book_cricket",
      humanScore: 12,
      humanWickets: 2,
      botScore: 13,
      botWickets: 1,
    },
    "8",
    "https://mela.example",
  );
  assert.match(book.text, /Astra 12\/2 · MelaBot 13\/1/);
  assert.match(book.text, /Nila's TILT/);
});
async function serverFor(
  overrides: Partial<Parameters<typeof createRecapHandler>[0]> = {},
) {
  const sent: any[] = [];
  const handler = createRecapHandler({
    origin: "https://mela.example",
    apiKey: "test-only",
    from: "Mela <recap@example.com>",
    read: async (token) => {
      if (token !== "valid-session")
        throw new RecapError(401, "Reconnect to Mela");
      return { identity: "identity-1", memory };
    },
    fetch: (async (_url, init) => {
      sent.push(init);
      return Response.json({ id: "test-provider-id" });
    }) as typeof fetch,
    ...overrides,
  });
  const server = createServer(async (req, res) => {
    if (!(await handler(req, res, req.url!))) res.writeHead(404).end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const post = (
    body: unknown = { email: "you@example.com", matchId: "7", consent: true },
    headers: Record<string, string> = {},
  ) =>
    fetch(url + "/api/recap", {
      method: "POST",
      headers: {
        Origin: "https://mela.example",
        "Content-Type": "application/json",
        Authorization: "Bearer valid-session",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  return {
    sent,
    post,
    url,
    close: () => {
      server.closeAllConnections();
      server.close();
    },
  };
}
test("real HTTP route reads authoritative memory, sends once and deduplicates retries", async () => {
  const s = await serverFor();
  try {
    assert.equal((await s.post()).status, 200);
    assert.equal((await s.post()).status, 200);
    assert.equal(s.sent.length, 1);
    const body = JSON.parse(s.sent[0].body);
    assert.deepEqual(body.to, ["you@example.com"]);
    assert.match(body.text, /Astra 2/);
    assert.match(s.sent[0].headers["Idempotency-Key"], /^[a-f0-9]{64}$/);
  } finally {
    s.close();
  }
});
test("wrong origin, invalid session and unfinished match never send mail", async () => {
  const s = await serverFor();
  try {
    assert.equal(
      (await s.post(undefined, { Origin: "https://elsewhere.example" })).status,
      403,
    );
    assert.equal(
      (await s.post(undefined, { Authorization: "Bearer invalid" })).status,
      401,
    );
    assert.equal(s.sent.length, 0);
  } finally {
    s.close();
  }
  const missing = await serverFor({
    read: async () => {
      throw new RecapError(404, "Match is not complete");
    },
  });
  try {
    assert.equal((await missing.post()).status, 404);
    assert.equal(missing.sent.length, 0);
  } finally {
    missing.close();
  }
});
test("provider rejection does not show success and retry keeps the same idempotency key", async () => {
  let calls = 0;
  const keys: string[] = [];
  const s = await serverFor({
    fetch: (async (_url, init) => {
      keys.push((init!.headers as Record<string, string>)["Idempotency-Key"]);
      return ++calls === 1
        ? Response.json({ error: "no" }, { status: 500 })
        : Response.json({ id: "real-acceptance" });
    }) as typeof fetch,
  });
  try {
    assert.equal((await s.post()).status, 502);
    assert.equal((await s.post()).status, 200);
    assert.equal(keys[0], keys[1]);
  } finally {
    s.close();
  }
});
test("concurrent copies cannot double-send and per-recipient budgets are server enforced", async () => {
  let unblock!: () => void;
  const gate = new Promise<void>((r) => (unblock = r));
  const s = await serverFor({
    read: async () => {
      await gate;
      return { identity: "same", memory };
    },
  });
  try {
    const a = s.post();
    await new Promise((r) => setTimeout(r, 30));
    const b = await s.post();
    assert.equal(b.status, 409);
    unblock();
    assert.equal((await a).status, 200);
    assert.equal(s.sent.length, 1);
    for (const matchId of ["8", "9"])
      assert.equal(
        (await s.post({ email: "you@example.com", matchId, consent: true }))
          .status,
        200,
      );
    assert.equal(
      (await s.post({ email: "you@example.com", matchId: "10", consent: true }))
        .status,
      429,
    );
  } finally {
    unblock();
    s.close();
  }
});
test("unconfigured provider reports unavailable without capturing an email", async () => {
  const s = await serverFor({ apiKey: undefined });
  try {
    assert.deepEqual(await (await fetch(s.url + "/api/recap/status")).json(), {
      enabled: false,
    });
    assert.equal((await s.post()).status, 503);
    assert.equal(s.sent.length, 0);
  } finally {
    s.close();
  }
});
