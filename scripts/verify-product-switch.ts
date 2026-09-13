import assert from "node:assert/strict";
import { DbConnection } from "../src/module_bindings";

const clients: DbConnection[] = [];
async function connect() {
  const c = await new Promise<DbConnection>((resolve, reject) =>
    DbConnection.builder()
      .withUri("http://127.0.0.1:3000")
      .withDatabaseName(process.env.TEST_SPACETIME_DB || "mela-arena-0912")
      .onConnect(resolve)
      .onConnectError((_c, e) => reject(e))
      .build(),
  );
  clients.push(c);
  await new Promise<void>((resolve, reject) =>
    c
      .subscriptionBuilder()
      .onApplied(() => resolve())
      .onError((e) => reject(e.event))
      .subscribe(
        [
          "match",
          "book_cricket_state",
          "match_memory",
          "match_crowd",
          "match_spectator",
          "player_profile",
        ].map((t) => `SELECT * FROM ${t}`),
      ),
  );
  return c;
}
async function until(check: () => boolean, label: string) {
  const end = Date.now() + 60000;
  while (!check()) {
    if (Date.now() > end) throw Error(label);
    await new Promise((r) => setTimeout(r, 30));
  }
}
try {
  const a = await connect(),
    b = await connect();
  await assert.rejects(
    () => a.reducers.createStickCricket(),
    "explicit creation requires existing profile",
  );
  await a.reducers.enterGame({ gameKind: "book_cricket" });
  await until(
    () =>
      [...a.db.match.iter()].some((m) => m.playerIdentity.isEqual(a.identity!)),
    "guest book entry",
  );
  const book = [...a.db.match.iter()].find((m) =>
    m.playerIdentity.isEqual(a.identity!),
  )!;
  await a.reducers.enterGame({ gameKind: "stick_cricket" });
  assert.equal(
    [...a.db.match.iter()].filter((m) => m.playerIdentity.isEqual(a.identity!))
      .length,
    1,
    "generic guest retry still resumes",
  );
  await a.reducers.createStickCricket();
  await until(
    () =>
      [...a.db.match.iter()].some(
        (m) =>
          m.playerIdentity.isEqual(a.identity!) &&
          m.gameKind === "stick_cricket",
      ),
    "explicit switch to Stick Cricket",
  );
  const stick = [...a.db.match.iter()].find(
    (m) =>
      m.playerIdentity.isEqual(a.identity!) && m.gameKind === "stick_cricket",
  )!;
  assert.equal(a.db.match.id.find(book.id)?.status, "abandoned");
  assert.notEqual(stick.id, book.id);
  await b.reducers.joinMatchAsSpectator({ matchId: stick.id });
  await b.reducers.useCrowdPower({
    matchId: stick.id,
    power: "boost",
    target: "human",
  });
  await until(() => !!a.db.bookCricketState.matchId.find(stick.id), "state");
  while (a.db.bookCricketState.matchId.find(stick.id)?.turn === "human") {
    const count = a.db.bookCricketState.matchId.find(stick.id)!.humanBalls;
    await a.reducers.playBall({ matchId: stick.id, style: "safe" });
    await until(
      () => a.db.bookCricketState.matchId.find(stick.id)!.humanBalls > count,
      "human ball",
    );
  }
  await until(
    () =>
      a.db.match.id.find(stick.id)?.status === "complete" &&
      b.db.match.id.find(stick.id)?.status === "complete",
    "autonomous completion",
  );
  await until(
    () =>
      !!a.db.matchMemory.matchId.find(stick.id) &&
      !!b.db.matchMemory.matchId.find(stick.id),
    "durable history",
  );
  assert.deepEqual(
    a.db.bookCricketState.matchId.find(stick.id),
    b.db.bookCricketState.matchId.find(stick.id),
  );
  assert.deepEqual(
    a.db.matchMemory.matchId.find(stick.id),
    b.db.matchMemory.matchId.find(stick.id),
  );
  assert.equal(
    a.db.matchMemory.matchId.find(stick.id)!.gameKind,
    "stick_cricket",
  );
  assert.equal(a.db.matchMemory.matchId.find(stick.id)!.crowdActions, 1);
  console.log(
    `PASS: explicit Book → Stick switch, preserved guest idempotence, authorization, crowd influence, shared scoring, autonomous completion and two-client history. Match ${stick.id}.`,
  );
} finally {
  for (const c of clients) c.disconnect();
}
