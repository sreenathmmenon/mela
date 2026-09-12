import assert from "node:assert/strict";
import { Identity } from "spacetimedb";
import { DbConnection } from "../src/module_bindings";
import { decideArena } from "../spacetimedb/src/arenaRules";
const clients: DbConnection[] = [];
async function client() {
  const c = await new Promise<DbConnection>((resolve, reject) =>
    DbConnection.builder()
      .withUri("http://127.0.0.1:3000")
      .withDatabaseName(process.env.TEST_SPACETIME_DB || "mela-arena-0912")
      .onConnect((c) => resolve(c))
      .onConnectError((_c, e) => reject(e))
      .build(),
  );
  clients.push(c);
  await new Promise<void>((resolve, reject) =>
    c
      .subscriptionBuilder()
      .onApplied(() => resolve())
      .onError(reject)
      .subscribe(
        ["arena_state", "arena_frame", "match", "match_memory"].map(
          (t) => `SELECT * FROM ${t}`,
        ),
      ),
  );
  return c;
}
async function until(f: () => boolean) {
  const end = Date.now() + 32000;
  while (!f()) {
    if (Date.now() > end) throw Error("AI did not converge");
    await new Promise((r) => setTimeout(r, 50));
  }
}
try {
  const status = await (
    await fetch("http://127.0.0.1:8082/api/arena/status")
  ).json();
  assert.equal(status.available, true, "real Astra worker must be available");
  const a = await client(),
    b = await client();
  await a.reducers.createArena({
    gameKind: "bridge_breakers",
    mode: "solo",
    leftPolicy: "runner",
    rightPolicy: "runner",
    courseId: 0n,
  });
  const id = [...a.db.match.iter()]
    .filter((m) => m.playerIdentity.isEqual(a.identity!))
    .sort((a, b) => Number(b.id - a.id))[0].id;
  await a.reducers.connectArenaAgent({
    matchId: id,
    agent: Identity.fromString(status.identity),
  });
  await b.reducers.joinMatchAsSpectator({ matchId: id });
  const row = () => a.db.arenaState.matchId.find(id)!;
  let real = 0;
  while (row().phase !== "complete") {
    const current = row();
    await a.reducers.playArena({
      matchId: id,
      side: 0,
      revision: current.revision,
      action: JSON.stringify(decideArena(JSON.parse(current.state), 0)),
    });
    await until(() => row().revision > current.revision);
    await until(() => b.db.arenaState.matchId.find(id)?.state === row().state);
    const frame = [...a.db.arenaFrame.iter()].find(
      (f) => f.matchId === id && f.revision === row().revision,
    )!;
    if (frame.source.includes("External agent")) real++;
  }
  assert.ok(
    real > 0,
    "must include actual external proposals, not only fallback",
  );
  assert.ok(a.db.matchMemory.matchId.find(id));
  console.log(
    JSON.stringify({
      matchId: String(id),
      mode: "human-vs-live-astra",
      beats: row().revision,
      realAstraTurns: real,
      result: JSON.parse(row().state).winner,
      convergence: true,
    }),
  );
  await a.reducers.createArena({
    gameKind: "bridge_breakers",
    mode: "agents",
    leftPolicy: "runner",
    rightPolicy: "trickster",
    courseId: 0n,
  });
  const id2 = [...a.db.match.iter()]
    .filter((m) => m.playerIdentity.isEqual(a.identity!))
    .sort((a, b) => Number(b.id - a.id))[0].id;
  await a.reducers.connectArenaAgent({
    matchId: id2,
    agent: Identity.fromString(status.identity),
  });
  await until(() => a.db.arenaState.matchId.find(id2)!.revision >= 1);
  const first = [...a.db.arenaFrame.iter()].find(
    (f) => f.matchId === id2 && f.revision === 1,
  )!;
  assert.equal(first.source, "External agent / External agent");
  console.log(
    JSON.stringify({
      matchId: String(id2),
      mode: "live-astra-vs-live-astra",
      firstBeat: first.source,
    }),
  );
  await a.reducers.createBookCricket(); // End the test hosting session, stop further paid turns.
} finally {
  clients.forEach((c) => c.disconnect());
}
