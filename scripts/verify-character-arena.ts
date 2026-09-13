import assert from "node:assert/strict";
import { DbConnection } from "../src/module_bindings";
import { Identity } from "spacetimedb";
import {
  CHARACTER_PRESETS,
  decideCharacter,
} from "../spacetimedb/src/arenaCharacter";
const clients: DbConnection[] = [];
async function connect() {
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
        [
          "arena_state",
          "arena_production",
          "arena_frame",
          "match",
          "match_participant",
          "match_memory",
          "match_history",
          "match_crowd",
          "my_arena_crowd",
          "my_arena_production",
        ].map((t) => `SELECT * FROM ${t}`),
      ),
  );
  return c;
}
async function until(f: () => boolean, ms = 95000) {
  const end = Date.now() + ms;
  while (!f()) {
    if (Date.now() > end) throw Error("Character scenario did not converge");
    await new Promise((r) => setTimeout(r, 40));
  }
}
try {
  const a = await connect(),
    b = await connect(),
    c = await connect();
  const count = [...a.db.match.iter()].length;
  await assert.rejects(() =>
    a.reducers.createCharacterArena({
      gameKind: "bridge_breakers",
      mode: "agents",
      amber: '{"name":"Cheater","pace":"teleport"}',
      teal: JSON.stringify(CHARACTER_PRESETS[1]),
      courseId: 0n,
      agent: undefined,
    }),
  );
  assert.equal(
    [...a.db.match.iter()].length,
    count,
    "invalid character creates no match",
  );
  for (const kind of process.env.TEST_CHARACTER_LIVE_ONLY === "1"
    ? []
    : ["bridge_breakers", "crown_run", "mela_heist"]) {
    const args = {
      gameKind: kind,
      mode: "agents",
      amber: JSON.stringify(CHARACTER_PRESETS[0]),
      teal: JSON.stringify(CHARACTER_PRESETS[1]),
      courseId: 0n,
      agent: undefined,
    };
    await a.reducers.createCharacterArena(args);
    const id = [...a.db.match.iter()]
      .filter((m) => m.playerIdentity.isEqual(a.identity!))
      .sort((x, y) => Number(y.id - x.id))[0].id;
    const row = () => a.db.arenaState.matchId.find(id)!;
    await b.reducers.joinMatchAsSpectator({ matchId: id });
    await c.reducers.joinMatchAsSpectator({ matchId: id });
    const bought = await Promise.allSettled([
      b.reducers.arenaPower({ matchId: id, power: "bridge" }),
      c.reducers.arenaPower({ matchId: id, power: "spring" }),
    ]);
    assert.equal(bought.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      [...a.db.myArenaCrowd.iter()].filter((r) => r.matchId === id).length,
      0,
    );
    assert.equal(
      [...b.db.myArenaProduction.iter()].length,
      0,
      "non-agent inbox empty",
    );
    await assert.rejects(() =>
      a.reducers.playArena({
        matchId: id,
        revision: 0,
        side: 0,
        action: '{"action":"guard","x":0,"y":4}',
      }),
    );
    await until(() => row().phase === "complete");
    await until(
      () =>
        b.db.arenaState.matchId.find(id)?.state === row().state &&
        c.db.arenaState.matchId.find(id)?.state === row().state,
    );
    const production = a.db.arenaProduction.matchId.find(id)!;
    assert.equal(production.amber, args.amber);
    assert.equal(production.teal, args.teal);
    const frames = [...a.db.arenaFrame.iter()].filter((f) => f.matchId === id);
    assert.equal(frames.length, row().revision + 1);
    assert.equal(new Set(frames.map((f) => f.revision)).size, frames.length);
    assert.equal(
      [...a.db.matchHistory.iter()].filter((h) => h.matchId === id).length,
      1,
    );
    assert.ok(a.db.matchMemory.matchId.find(id));
    assert.equal(a.db.matchMemory.matchId.find(id)!.humanName, "Chai Fox");
    assert.equal(a.db.matchMemory.matchId.find(id)!.aiName, "Moon Owl");
    assert.ok(a.db.matchCrowd.matchId.find(id)!.energy >= 0);
    const participants = [...a.db.matchParticipant.iter()].filter(
      (p) => p.matchId === id,
    );
    assert.ok(participants.some((p) => p.displayName === "Chai Fox"));
    assert.ok(participants.some((p) => p.displayName === "Moon Owl"));
    const fresh = await connect();
    assert.deepEqual(fresh.db.arenaProduction.matchId.find(id), production);
    assert.equal(fresh.db.arenaState.matchId.find(id)!.state, row().state);
    fresh.disconnect();
    console.log(
      JSON.stringify({
        game: kind,
        match: String(id),
        beats: row().revision,
        winner: JSON.parse(row().state).winner,
        threeClients: true,
        privateCrowd: true,
        concurrency: true,
        characterSnapshot: true,
        freshReplay: true,
        uniqueHistory: true,
      }),
    );
  }
  const live = process.env.TEST_CHARACTER_ASTRA === "1";
  const status = live
    ? await (await fetch("http://127.0.0.1:8082/api/arena/status")).json()
    : undefined;
  if (live) assert.equal(status.available, true);
  await a.reducers.createCharacterArena({
    gameKind: "bridge_breakers",
    mode: "solo",
    amber: JSON.stringify(CHARACTER_PRESETS[0]),
    teal: JSON.stringify(CHARACTER_PRESETS[1]),
    courseId: 0n,
    agent: live ? Identity.fromString(status.identity) : undefined,
  });
  const id = [...a.db.match.iter()]
    .filter((m) => m.playerIdentity.isEqual(a.identity!))
    .sort((x, y) => Number(y.id - x.id))[0].id;
  const row = () => a.db.arenaState.matchId.find(id)!;
  await b.reducers.joinMatchAsSpectator({ matchId: id });
  while (row().phase !== "complete") {
    const old = row();
    await a.reducers.playArena({
      matchId: id,
      revision: old.revision,
      side: 0,
      action: JSON.stringify(
        decideCharacter(JSON.parse(old.state), 0, CHARACTER_PRESETS[0]),
      ),
    });
    await until(() => row().revision > old.revision, 35000);
  }
  await until(() => b.db.arenaState.matchId.find(id)?.state === row().state);
  const frames = [...a.db.arenaFrame.iter()].filter(
    (f) => f.matchId === id && f.revision > 0,
  );
  const external = frames.filter((f) =>
    f.source.includes("External agent"),
  ).length;
  if (live) assert.ok(external > 0);
  console.log(
    JSON.stringify({
      mode: live ? "human-vs-live-Astra-character" : "human-vs-character",
      match: String(id),
      beats: row().revision,
      externalTurns: external,
      convergence: true,
    }),
  );
  if (live) {
    await a.reducers.createCharacterArena({
      gameKind: "bridge_breakers",
      mode: "agents",
      amber: JSON.stringify(CHARACTER_PRESETS[0]),
      teal: JSON.stringify(CHARACTER_PRESETS[1]),
      courseId: 0n,
      agent: Identity.fromString(status.identity),
    });
    const duelId = [...a.db.match.iter()]
      .filter((m) => m.playerIdentity.isEqual(a.identity!))
      .sort((x, y) => Number(y.id - x.id))[0].id;
    await until(
      () =>
        [...a.db.arenaFrame.iter()].some(
          (f) => f.matchId === duelId && f.revision === 1,
        ),
      35000,
    );
    const opening = [...a.db.arenaFrame.iter()].find(
      (f) => f.matchId === duelId && f.revision === 1,
    )!;
    assert.equal(opening.source, "External agent / External agent");
    assert.ok(a.db.arenaProduction.matchId.find(duelId));
    console.log(
      JSON.stringify({
        mode: "live-Astra-character-duel",
        match: String(duelId),
        openingSource: opening.source,
        characterSnapshot: true,
      }),
    );
    // End the paid fixture through a normal rematch, not by changing world rows.
    await a.reducers.createCharacterArena({
      gameKind: "bridge_breakers",
      mode: "solo",
      amber: JSON.stringify(CHARACTER_PRESETS[0]),
      teal: JSON.stringify(CHARACTER_PRESETS[1]),
      courseId: 0n,
      agent: undefined,
    });
  }
} finally {
  clients.forEach((c) => c.disconnect());
}
