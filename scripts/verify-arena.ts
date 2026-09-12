import assert from "node:assert/strict";
import { DbConnection } from "../src/module_bindings";
import {
  ARENA_GAMES,
  decideArena,
  type ArenaState,
} from "../spacetimedb/src/arenaRules";
const clients: DbConnection[] = [];
const database = process.env.TEST_SPACETIME_DB || "mela-arena-0912";
async function connect(token?: string) {
  const c = await new Promise<DbConnection>((resolve, reject) =>
    DbConnection.builder()
      .withUri("http://127.0.0.1:3000")
      .withDatabaseName(database)
      .withToken(token)
      .onConnect((c) => resolve(c))
      .onConnectError((_c, e) => reject(e))
      .build(),
  );
  clients.push(c);
  await new Promise<void>((resolve, reject) =>
    c
      .subscriptionBuilder()
      .onApplied(() => resolve())
      .onError((e) => reject(e))
      .subscribe(
        [
          "arena_state",
          "arena_frame",
          "match",
          "match_crowd",
          "match_history",
          "match_memory",
          "mela_profile",
          "my_arena_crowd",
          "own_spectator_cooldown",
          "arena_course",
        ].map((t) => `SELECT * FROM ${t}`),
      ),
  );
  return c;
}
async function until(f: () => boolean, ms = 15000) {
  const end = Date.now() + ms;
  while (!f()) {
    if (Date.now() > end) throw Error("Subscriptions did not converge");
    await new Promise((r) => setTimeout(r, 30));
  }
}
try {
  const a = await connect(),
    b = await connect(),
    c = await connect();
  for (const kind of ARENA_GAMES) {
    await a.reducers.createArena({
      gameKind: kind,
      mode: "solo",
      leftPolicy: "runner",
      rightPolicy: "runner",
      courseId: 0n,
    });
    const match = [...a.db.match.iter()]
      .filter(
        (m) => m.playerIdentity.isEqual(a.identity!) && m.gameKind === kind,
      )
      .sort((x, y) => Number(y.id - x.id))[0];
    assert.ok(match);
    await b.reducers.joinMatchAsSpectator({ matchId: match.id });
    await c.reducers.joinMatchAsSpectator({ matchId: match.id });
    const row = () => a.db.arenaState.matchId.find(match.id)!;
    await assert.rejects(() =>
      b.reducers.playArena({
        matchId: match.id,
        revision: 0,
        side: 0,
        action: JSON.stringify(decideArena(JSON.parse(row().state), 0)),
      }),
    );
    await assert.rejects(() =>
      a.reducers.arenaPower({ matchId: match.id, power: "bridge" }),
    );
    await assert.rejects(() =>
      a.reducers.playArena({
        matchId: match.id,
        revision: 0,
        side: 0,
        action: '{"action":"move","x":8,"y":8}',
      }),
    );
    const spent = await Promise.allSettled([
      b.reducers.arenaPower({ matchId: match.id, power: "spring" }),
      c.reducers.arenaPower({ matchId: match.id, power: "bridge" }),
    ]);
    assert.equal(
      spent.filter((r) => r.status === "fulfilled").length,
      1,
      "one shared pending choice; atomic energy debit",
    );
    await until(() =>
      [...b.db.myArenaCrowd.iter()].some((r) => r.matchId === match.id),
    );
    assert.equal(
      [...a.db.myArenaCrowd.iter()].filter((r) => r.matchId === match.id)
        .length,
      0,
      "pending crowd hidden from player",
    );
    let rejectedDuplicate = false;
    while (row().phase !== "complete") {
      const current = row(),
        s = JSON.parse(current.state) as ArenaState;
      await a.reducers.playArena({
        matchId: match.id,
        revision: current.revision,
        side: 0,
        action: JSON.stringify(decideArena(s, 0)),
      });
      if (!rejectedDuplicate) {
        await assert.rejects(() =>
          a.reducers.playArena({
            matchId: match.id,
            revision: current.revision,
            side: 0,
            action: JSON.stringify(decideArena(s, 0)),
          }),
        );
        rejectedDuplicate = true;
      }
      await until(() => row().revision > current.revision);
      await until(
        () =>
          b.db.arenaState.matchId.find(match.id)?.state === row().state &&
          c.db.arenaState.matchId.find(match.id)?.state === row().state,
      );
      assert.ok(a.db.matchCrowd.matchId.find(match.id)!.energy >= 0);
    }
    const history = [...a.db.matchHistory.iter()].filter(
      (h) => h.matchId === match.id,
    );
    assert.equal(history.length, 1);
    assert.ok(a.db.matchMemory.matchId.find(match.id));
    assert.equal(
      [...a.db.arenaFrame.iter()].filter((f) => f.matchId === match.id).length,
      row().revision + 1,
    );
    const d = await connect();
    assert.equal(
      d.db.arenaState.matchId.find(match.id)!.state,
      row().state,
      "fresh stranger reconstructs completed replay",
    );
    d.disconnect();
    await assert.rejects(() =>
      a.reducers.playArena({
        matchId: match.id,
        revision: row().revision,
        side: 0,
        action: '{"action":"guard","x":0,"y":4}',
      }),
    );
    console.log(
      JSON.stringify({
        kind,
        matchId: String(match.id),
        beats: row().revision,
        result: JSON.parse(row().state).winner,
        clients: 3,
        history: history.length,
        privacy: "pass",
        concurrency: "pass",
        freshReplay: "pass",
      }),
    );
  }
  await assert.rejects(() =>
    a.reducers.publishArenaCourse({ name: "Trap", walls: "[1,9]" }),
  );
  await a.reducers.publishArenaCourse({
    name: "Test crossing",
    walls: "[12,21]",
  });
  assert.ok(
    [...a.db.arenaCourse.iter()].some((c) => c.name === "Test crossing"),
  );
  // Keep established game authority paths working in the same module.
  await a.reducers.createBookCricket();
  console.log(
    "Arena lifecycle, crowd concurrency, privacy, history and course checks passed.",
  );
} finally {
  for (const c of clients) c.disconnect();
}
