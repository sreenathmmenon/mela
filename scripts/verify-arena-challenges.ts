import assert from "node:assert/strict";
import { DbConnection } from "../src/module_bindings";
import {
  ARENA_GAMES,
  decideArena,
  type ArenaState,
} from "../spacetimedb/src/arenaRules";
import {
  challengeCheckpoint,
  CHALLENGE_POLICY,
} from "../spacetimedb/src/arenaChallenge";

const connections: DbConnection[] = [];
async function connect(token?: string) {
  const c = await new Promise<DbConnection>((resolve, reject) =>
    DbConnection.builder()
      .withUri("http://127.0.0.1:3000")
      .withDatabaseName(process.env.TEST_SPACETIME_DB || "mela-v3-moments-0915")
      .withToken(token)
      .onConnect(resolve)
      .onConnectError((_c, e) => reject(e))
      .build(),
  );
  connections.push(c);
  await new Promise<void>((resolve, reject) =>
    c
      .subscriptionBuilder()
      .onApplied(() => resolve())
      .onError(reject)
      .subscribe(
        [
          "match",
          "arena_state",
          "arena_frame",
          "arena_challenge",
          "match_memory",
          "match_history",
          "mela_profile",
          "player_profile",
          "match_crowd",
          "my_arena_energy",
          "my_arena_crowd",
          "own_spectator_cooldown",
          "playground_rematch",
        ].map((t) => `SELECT * FROM ${t}`),
      ),
  );
  return c;
}
async function until(f: () => boolean, label: string) {
  const end = Date.now() + 12000;
  while (!f()) {
    if (Date.now() > end) throw Error(label);
    await new Promise((r) => setTimeout(r, 25));
  }
}
const latest = (c: DbConnection) =>
  [...c.db.match.iter()]
    .filter((m) => m.playerIdentity.isEqual(c.identity!))
    .sort((a, b) => Number(b.id - a.id))[0];
async function finish(c: DbConnection, id: bigint) {
  while (c.db.match.id.find(id)?.status === "active") {
    const r = c.db.arenaState.matchId.find(id)!;
    const s = JSON.parse(r.state) as ArenaState;
    if (r.phase === "planning")
      await c.reducers.playArena({
        matchId: id,
        revision: r.revision,
        side: 0,
        action: JSON.stringify(decideArena(s, 0, "runner")),
      });
    await until(
      () => c.db.arenaState.matchId.find(id)!.revision > r.revision,
      "scheduled move",
    );
  }
}
async function scenario(kind: string) {
  const original = await connect();
  await original.reducers.createArena({
    gameKind: kind,
    mode: "solo",
    leftPolicy: "runner",
    rightPolicy: "runner",
    courseId: 0n,
  });
  const source = latest(original).id;
  const outsider = await connect();
  const opening = [...original.db.arenaFrame.iter()].find(
    (f) => f.matchId === source,
  )!;
  await assert.rejects(() =>
    outsider.reducers.challengeArenaMoment({ frameId: opening.id }),
  );
  assert.equal(
    outsider.db.playerProfile.identity.find(outsider.identity!),
    null,
    "invalid challenge creates no guest",
  );
  await finish(original, source);
  const originalState = original.db.arenaState.matchId.find(source)!.state;
  const originalMemory = original.db.matchMemory.matchId.find(source)!;
  const originalFrames = [...original.db.arenaFrame.iter()].filter(
    (f) => f.matchId === source,
  );
  const frame = originalFrames.find(
    (f) => f.revision === Math.max(1, originalFrames.length - 3),
  )!;
  const final = originalFrames.find((f) => JSON.parse(f.state).winner)!;
  await assert.rejects(() =>
    outsider.reducers.challengeArenaMoment({ frameId: final.id }),
  );
  await assert.rejects(() =>
    outsider.reducers.challengeArenaMoment({ frameId: 999999999n }),
  );
  await Promise.all([
    outsider.reducers.challengeArenaMoment({ frameId: frame.id }),
    outsider.reducers.challengeArenaMoment({ frameId: frame.id }),
  ]);
  const attempt = latest(outsider).id;
  assert.notEqual(attempt, source);
  assert.equal(
    [...outsider.db.match.iter()].filter((m) =>
      m.playerIdentity.isEqual(outsider.identity!),
    ).length,
    1,
    "duplicate start idempotent",
  );
  const r = outsider.db.arenaState.matchId.find(attempt)!;
  assert.equal(r.agentIdentity, undefined);
  assert.equal(r.rightPolicy, CHALLENGE_POLICY);
  assert.deepEqual(
    JSON.parse(r.state),
    challengeCheckpoint(frame.state, kind, frame.revision),
  );
  assert.equal(outsider.db.matchCrowd.matchId.find(attempt)!.energy, 42);
  assert.equal(
    outsider.db.playgroundRematch.previousMatchId.find(source),
    null,
    "not stealing original rematch link",
  );
  const profile = outsider.db.melaProfile.identity.find(outsider.identity!)!;
  const a = await connect(),
    b = await connect();
  await a.reducers.joinMatchAsSpectator({ matchId: attempt });
  await b.reducers.joinMatchAsSpectator({ matchId: attempt });
  const ap = a.db.melaProfile.identity.find(a.identity!)!;
  const buys = await Promise.allSettled([
    a.reducers.arenaPower({ matchId: attempt, power: "spring" }),
    b.reducers.arenaPower({ matchId: attempt, power: "bridge" }),
  ]);
  assert.equal(buys.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    outsider.db.matchCrowd.matchId.find(attempt)!.energy,
    42,
    "pending cost hidden",
  );
  assert.equal([...outsider.db.myArenaCrowd.iter()].length, 0);
  await assert.rejects(() =>
    outsider.reducers.connectArenaAgent({
      matchId: attempt,
      agent: a.identity!,
    }),
  );
  const move = JSON.stringify(decideArena(JSON.parse(r.state), 0, "runner"));
  await assert.rejects(() =>
    a.reducers.playArena({
      matchId: attempt,
      revision: r.revision,
      side: 0,
      action: move,
    }),
  );
  await assert.rejects(() =>
    outsider.reducers.playArena({
      matchId: attempt,
      revision: r.revision,
      side: 1,
      action: move,
    }),
  );
  const s = JSON.parse(r.state) as ArenaState;
  await outsider.reducers.playArena({
    matchId: attempt,
    revision: r.revision,
    side: 0,
    action: JSON.stringify({
      action: "guard",
      x: s.pawns[0].x,
      y: s.pawns[0].y,
    }),
  });
  await assert.rejects(() =>
    outsider.reducers.playArena({
      matchId: attempt,
      revision: r.revision,
      side: 0,
      action: move,
    }),
  );
  await until(
    () => outsider.db.arenaState.matchId.find(attempt)!.revision > r.revision,
    "first challenge reveal",
  );
  await until(
    () =>
      a.db.arenaState.matchId.find(attempt)?.state ===
        outsider.db.arenaState.matchId.find(attempt)?.state &&
      b.db.arenaState.matchId.find(attempt)?.state ===
        outsider.db.arenaState.matchId.find(attempt)?.state,
    "three-client reveal",
  );
  const fresh = await connect(outsider.token);
  await finish(fresh, attempt);
  await until(
    () =>
      a.db.matchMemory.matchId.find(attempt) !== null &&
      b.db.matchMemory.matchId.find(attempt) !== null,
    "durable challenge memory",
  );
  assert.deepEqual(
    fresh.db.melaProfile.identity.find(fresh.identity!)!,
    profile,
    "practice does not farm player progression",
  );
  assert.deepEqual(
    a.db.melaProfile.identity.find(a.identity!)!,
    ap,
    "practice does not farm crowd influence or XP",
  );
  assert.equal(
    [...fresh.db.matchHistory.iter()].filter((h) => h.matchId === attempt)
      .length,
    1,
  );
  assert.match(
    fresh.db.matchMemory.matchId.find(attempt)!.notableMoment,
    /Unranked practice/,
  );
  assert.equal(fresh.db.matchMemory.matchId.find(attempt)!.crowdActions, 1);
  assert.equal(fresh.db.arenaState.matchId.find(source)!.state, originalState);
  assert.deepEqual(fresh.db.matchMemory.matchId.find(source), originalMemory);
  const recorded = [...fresh.db.arenaFrame.iter()].filter(
    (f) => f.matchId === attempt,
  );
  assert.equal(
    recorded.length,
    new Set(recorded.map((f) => f.revision)).size,
    "unique committed revisions",
  );
  assert.equal(Math.min(...recorded.map((f) => f.revision)), frame.revision);
  assert.equal(
    recorded.filter((f) => f.source.includes("External agent")).length,
    0,
  );
  await assert.rejects(() =>
    b.reducers.challengeArenaMoment({ frameId: recorded[0].id }),
  );
  await assert.rejects(() =>
    fresh.reducers.playArena({
      matchId: attempt,
      revision: r.revision,
      side: 0,
      action: move,
    }),
  );
  const stranger = await connect();
  assert.equal(
    stranger.db.matchMemory.matchId.find(attempt)!.winner,
    fresh.db.matchMemory.matchId.find(attempt)!.winner,
  );
  console.log(
    JSON.stringify({
      game: kind,
      source: String(source),
      frame: String(frame.id),
      start: frame.revision,
      attempt: String(attempt),
      result: fresh.db.matchMemory.matchId.find(attempt)!.winner,
      checks:
        "PASS: lifecycle, privacy, concurrent crowd, idempotency, reconnect, history, no XP",
    }),
  );
}
try {
  await Promise.all(ARENA_GAMES.map(scenario));
} finally {
  for (const c of connections) c.disconnect();
}
