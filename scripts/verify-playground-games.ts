import assert from "node:assert/strict";
import { DbConnection } from "../src/module_bindings";
import { decideDotsMove } from "../spacetimedb/src/dotsBoxesRules";
const database = process.env.TEST_SPACETIME_DB || "mela-games-final-0906";
const connections: DbConnection[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(check: () => boolean, label: string, timeout = 16000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) throw new Error(`Timed out: ${label}`);
    await sleep(30);
  }
}
async function connect(name: string, token?: string) {
  const c = await new Promise<DbConnection>((resolve, reject) =>
    DbConnection.builder()
      .withUri("http://127.0.0.1:3000")
      .withDatabaseName(database)
      .withToken(token)
      .onConnect((c) => resolve(c))
      .onConnectError((_c, e) => reject(e))
      .build(),
  );
  connections.push(c);
  await new Promise<void>((resolve, reject) =>
    c
      .subscriptionBuilder()
      .onApplied(() => resolve())
      .onError((e) => reject(e.event))
      .subscribe([
        "SELECT * FROM match",
        "SELECT * FROM dots_boxes_state",
        "SELECT * FROM gilli_danda_state",
        "SELECT * FROM gilli_launch",
        "SELECT * FROM match_crowd",
        "SELECT * FROM match_memory",
        "SELECT * FROM match_history",
        "SELECT * FROM mela_profile",
        "SELECT * FROM visible_crowd_effects",
        "SELECT * FROM own_spectator_cooldown",
        "SELECT * FROM live_event",
        "SELECT * FROM book_cricket_state",
        "SELECT * FROM pen_desk_state",
        "SELECT * FROM playground_rematch",
      ]),
  );
  if (!token)
    await c.reducers.onboardWithEmail({
      displayName: name,
      email: `${name.toLowerCase()}-${Date.now()}@example.com`,
    });
  return c;
}
try {
  const player = await connect("GridAsha"),
    a = await connect("CrowdNila"),
    b = await connect("CrowdIra");
  const firstClock = await player.procedures.playgroundClock({});
  const secondClock = await player.procedures.playgroundClock({});
  assert.ok(secondClock >= firstClock);
  assert.ok(Math.abs(Number(secondClock / 1000n) - Date.now()) < 5000);
  const events: string[] = [];
  player.db.liveEvent.onInsert((_c, e) => events.push(e.message));
  const latest = () =>
    [...player.db.match.iter()]
      .filter((m) => m.playerIdentity.isEqual(player.identity!))
      .sort((a, b) => Number(b.id - a.id))[0];
  await player.reducers.createDotsBoxes();
  const id = latest().id;
  await Promise.all([
    a.reducers.joinMatchAsSpectator({ matchId: id }),
    b.reducers.joinMatchAsSpectator({ matchId: id }),
  ]);
  await assert.rejects(() =>
    a.reducers.drawDotsEdge({ matchId: id, from: 0, to: 1, revision: 0 }),
  );
  await assert.rejects(() =>
    player.reducers.drawDotsEdge({ matchId: id, from: 0, to: 5, revision: 0 }),
  );
  const results = await Promise.allSettled([
    a.reducers.useExperimentalCrowdPower({
      matchId: id,
      power: "chain_break",
      target: "human",
    }),
    b.reducers.useExperimentalCrowdPower({
      matchId: id,
      power: "chain_break",
      target: "melabot",
    }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 2);
  await until(
    () =>
      [player, a, b].every(
        (c) => c.db.matchCrowd.matchId.find(id)?.energy === 10,
      ),
    "shared energy 42-16-16",
  );
  assert.equal([...player.db.visibleCrowdEffects.iter()].length, 0);
  assert.equal([...a.db.visibleCrowdEffects.iter()].length, 2);
  await assert.rejects(() =>
    a.reducers.useExperimentalCrowdPower({
      matchId: id,
      power: "chain_break",
      target: "human",
    }),
  );
  let dotsMoves = 0;
  while (player.db.match.id.find(id)?.status === "active") {
    await until(
      () => player.db.dotsBoxesState.matchId.find(id)?.turn !== "melabot",
      "automatic Dots AI",
      50000,
    );
    const s = player.db.dotsBoxesState.matchId.find(id)!;
    if (s.turn === "complete") break;
    const [from, to] = decideDotsMove(s.edges);
    await player.reducers.drawDotsEdge({
      matchId: id,
      from,
      to,
      revision: s.revision,
    });
    dotsMoves++;
    await assert.rejects(() =>
      player.reducers.drawDotsEdge({
        matchId: id,
        from,
        to,
        revision: s.revision,
      }),
    );
  }
  await until(
    () =>
      [player, a, b].every(
        (c) => c.db.matchMemory.matchId.find(id) !== undefined,
      ),
    "Dots memory convergence",
  );
  const ds = player.db.dotsBoxesState.matchId.find(id)!;
  assert.equal(ds.humanBoxes + ds.botBoxes, 9);
  assert.equal(ds.edges.split(",").length, 24);
  const compare = (c: DbConnection) =>
    JSON.stringify(c.db.matchMemory.matchId.find(id), (_k, v) =>
      typeof v === "bigint" ? v.toString() : v,
    );
  assert.equal(compare(player), compare(a));
  assert.equal(compare(a), compare(b));
  assert.equal(
    [...player.db.matchHistory.iter()].filter((h) => h.matchId === id).length,
    1,
  );
  console.log(
    `Dots complete: ${ds.humanBoxes}-${ds.botBoxes}; ${dotsMoves} human actions; crowd concurrency, hidden state, stale/invalid inputs and 3-client memory PASS`,
  );
  await player.reducers.createGilliDanda();
  const gid = latest().id;
  await Promise.all([
    a.reducers.joinMatchAsSpectator({ matchId: gid }),
    b.reducers.joinMatchAsSpectator({ matchId: gid }),
  ]);
  await a.reducers.useExperimentalCrowdPower({
    matchId: gid,
    power: "rhythm",
    target: "human",
  });
  await assert.rejects(() =>
    b.reducers.useExperimentalCrowdPower({
      matchId: gid,
      power: "heckle",
      target: "human",
    }),
  );
  await b.reducers.useExperimentalCrowdPower({
    matchId: gid,
    power: "heckle",
    target: "melabot",
  });
  await assert.rejects(() =>
    player.reducers.strikeGilli({ matchId: gid, round: 1 }),
  );
  await assert.rejects(() =>
    a.reducers.liftGilli({ matchId: gid, round: 1, power: 3 }),
  );
  for (let hit = 0; hit < 5; hit++) {
    await until(
      () => player.db.gilliDandaState.matchId.find(gid)?.turn === "human",
      "Gilli automatic bot",
    );
    const round = player.db.gilliDandaState.matchId.find(gid)!.round;
    await player.reducers.liftGilli({ matchId: gid, round, power: 2 });
    await assert.rejects(() =>
      player.reducers.liftGilli({ matchId: gid, round, power: 2 }),
    );
    if (hit === 1) {
      await until(
        () => player.db.gilliDandaState.matchId.find(gid)!.round > round,
        "unattended lift timeout",
      );
    } else {
      const started = Number(
        player.db.gilliLaunch.matchId.find(gid)!.startedAtMicros / 1000n,
      );
      await sleep(Math.max(0, started + 1320 - Date.now()));
      await player.reducers.strikeGilli({ matchId: gid, round });
    }
    await assert.rejects(() =>
      player.reducers.strikeGilli({ matchId: gid, round }),
    );
  }
  await until(
    () => [player, a, b].every((c) => !!c.db.matchMemory.matchId.find(gid)),
    "Gilli completes on scheduled bot turn",
  );
  const gs = player.db.gilliDandaState.matchId.find(gid)!;
  assert.equal(gs.round, 11);
  assert.equal(gs.turn, "complete");
  assert.equal(
    [...player.db.matchHistory.iter()].filter((h) => h.matchId === gid).length,
    1,
  );
  assert.ok(events.some((e) => e.includes("RHYTHM") && e.includes("changed")));
  assert.ok(events.some((e) => e.includes("HECKLE") && e.includes("changed")));
  for (const c of [a, b]) {
    const other = c.db.gilliDandaState.matchId.find(gid)!;
    assert.equal(other.humanScore, gs.humanScore);
    assert.equal(other.botScore, gs.botScore);
  }
  const token = player.token!;
  player.disconnect();
  const returning = await connect("ignored", token);
  assert.equal(
    returning.db.matchMemory.matchId.find(gid)!.humanScore,
    gs.humanScore,
  );
  assert.equal(
    returning.db.melaProfile.identity.find(returning.identity!)!.matchesPlayed,
    2,
  );
  assert.equal(a.db.melaProfile.identity.find(a.identity!)!.matchesWatched, 2);
  assert.equal(a.db.melaProfile.identity.find(a.identity!)!.crowdActions, 2);
  console.log(
    `Gilli complete ${gs.humanScore}-${gs.botScore}: lift/strike, missed timeout, latest crowd effects, automatic bot completion, memory, progression and reconnect PASS`,
  );
  // Existing Book Cricket completion against the same additive module.
  await returning.reducers.createBookCricket();
  const bid = [...returning.db.match.iter()].sort((a, b) =>
    Number(b.id - a.id),
  )[0].id;
  await assert.rejects(() =>
    returning.reducers.rematchPlayground({ matchId: gid }),
  );
  assert.equal(
    returning.db.match.id.find(bid)!.status,
    "active",
    "old rematch cannot abandon Book Cricket",
  );
  while (returning.db.bookCricketState.matchId.find(bid)?.turn === "human")
    await returning.reducers.playBall({ matchId: bid, style: "safe" });
  await until(
    () => !!returning.db.matchMemory.matchId.find(bid),
    "Book Cricket regression",
    30000,
  );
  console.log("Book Cricket full human/bot completion regression PASS");
  await assert.rejects(() => a.reducers.rematchPlayground({ matchId: gid }));
  await assert.rejects(() =>
    returning.reducers.rematchPlayground({ matchId: bid }),
  );
  const count = [...returning.db.match.iter()].length;
  await Promise.all([
    returning.reducers.rematchPlayground({ matchId: gid }),
    returning.reducers.rematchPlayground({ matchId: gid }),
  ]);
  const rematchId =
    returning.db.playgroundRematch.previousMatchId.find(gid)!.nextMatchId;
  assert.equal(
    [...returning.db.match.iter()].length,
    count + 1,
    "duplicate request creates exactly one match",
  );
  await until(
    () =>
      [a, b].every(
        (c) =>
          c.db.playgroundRematch.previousMatchId.find(gid)?.nextMatchId ===
          rematchId,
      ),
    "rematch invitation converges",
  );
  await a.reducers.joinMatchAsSpectator({ matchId: rematchId });
  await a.reducers.useExperimentalCrowdPower({
    matchId: rematchId,
    power: "rhythm",
    target: "human",
  });
  await assert.rejects(() =>
    returning.reducers.rematchPlayground({ matchId: rematchId }),
  );
  assert.equal(
    returning.db.matchMemory.matchId.find(gid)!.humanScore,
    gs.humanScore,
  );
  await returning.reducers.rematchPlayground({ matchId: gid });
  assert.equal(returning.db.match.id.find(rematchId)!.status, "active");
  console.log(
    "Read-only server clock; rematch ownership, duplicate, active-game protection, spectator invitation/follow/power and retained memory PASS",
  );
  console.log("All real-client playground checks PASS");
} finally {
  for (const c of connections) c.disconnect();
}
