import assert from "node:assert/strict";
import { DbConnection } from "../src/module_bindings";
const database = process.env.TEST_SPACETIME_DB || "mela-six-0906";
const clients: DbConnection[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(check: () => boolean, label: string, timeout = 20000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) throw new Error(`Timeout: ${label}`);
    await sleep(25);
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
  clients.push(c);
  await new Promise<void>((resolve, reject) =>
    c
      .subscriptionBuilder()
      .onApplied(() => resolve())
      .onError((e) => reject(e.event))
      .subscribe(
        [
          "match",
          "four_row_state",
          "last_stick_state",
          "match_crowd",
          "match_memory",
          "match_history",
          "mela_profile",
          "visible_crowd_effects",
          "own_spectator_cooldown",
          "live_event",
          "playground_rematch",
        ].map((t) => `SELECT * FROM ${t}`),
      ),
  );
  if (!token)
    await c.reducers.onboardWithEmail({
      displayName: name,
      email: `${name}-${Date.now()}@example.com`,
    });
  return c;
}
const serialize = (value: unknown) =>
  JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
try {
  const player = await connect("SixAsha"),
    a = await connect("SixNila"),
    b = await connect("SixIra");
  const events: string[] = [];
  player.db.liveEvent.onInsert((_c, e) => events.push(e.message));
  for (const kind of ["four_row", "last_stick"]) {
    await (kind === "four_row"
      ? player.reducers.createFourRow()
      : player.reducers.createLastStick());
    const id = [...player.db.match.iter()]
      .filter((m) => m.playerIdentity.isEqual(player.identity!))
      .sort((x, y) => Number(y.id - x.id))[0].id;
    const state = (c: DbConnection) =>
      (kind === "four_row"
        ? c.db.fourRowState
        : c.db.lastStickState
      ).matchId.find(id)!;
    const power = kind === "four_row" ? "sidewind" : "spark";
    await Promise.all(
      [a, b].map((c) => c.reducers.joinMatchAsSpectator({ matchId: id })),
    );
    await assert.rejects(() =>
      a.reducers.playStrategyMove({ matchId: id, revision: 0, choice: 1 }),
    );
    await assert.rejects(() =>
      player.reducers.playStrategyMove({
        matchId: id,
        revision: 0,
        choice: 99,
      }),
    );
    await assert.rejects(() =>
      player.reducers.useExperimentalCrowdPower({
        matchId: id,
        power,
        target: "human",
      }),
    );
    // Two 20-energy purchases race against one shared 42 pool, then no third
    // purchase is possible. No test bypass writes or special production reducer.
    const purchases = await Promise.allSettled([
      a.reducers.useExperimentalCrowdPower({
        matchId: id,
        power,
        target: "human",
      }),
      b.reducers.useExperimentalCrowdPower({
        matchId: id,
        power,
        target: "melabot",
      }),
    ]);
    assert.equal(purchases.filter((p) => p.status === "fulfilled").length, 2);
    await until(
      () =>
        [player, a, b].every(
          (c) => c.db.matchCrowd.matchId.find(id)?.energy === 2,
        ),
      "energy converges to 2",
    );
    assert.equal(
      [...player.db.visibleCrowdEffects.iter()].filter((e) => e.matchId === id)
        .length,
      0,
    );
    assert.equal(
      [...a.db.visibleCrowdEffects.iter()].filter((e) => e.matchId === id)
        .length,
      2,
    );
    await assert.rejects(() =>
      a.reducers.useExperimentalCrowdPower({
        matchId: id,
        power,
        target: "human",
      }),
    );
    const before = state(player);
    const duplicate = await Promise.allSettled(
      [1, 2].map(() =>
        player.reducers.playStrategyMove({
          matchId: id,
          revision: before.revision,
          choice: kind === "four_row" ? 0 : 1,
        }),
      ),
    );
    assert.equal(duplicate.filter((r) => r.status === "fulfilled").length, 1);
    if (kind === "four_row")
      assert.equal(player.db.fourRowState.matchId.find(id)!.board[36], "h");
    else assert.equal(player.db.lastStickState.matchId.find(id)!.remaining, 19);
    let humanMoves = 1;
    while (player.db.match.id.find(id)!.status === "active") {
      await until(
        () => state(player).turn !== "melabot",
        "automatic scheduled AI",
      );
      const s = state(player);
      if (s.turn === "complete") break;
      await until(
        () => [a, b].every((c) => serialize(state(c)) === serialize(s)),
        "turn converges",
      );
      const choice =
        kind === "four_row"
          ? [0, 1, 2, 3, 4, 5, 6].find(
              (c) => player.db.fourRowState.matchId.find(id)!.board[c] === ".",
            )!
          : 1;
      await player.reducers.playStrategyMove({
        matchId: id,
        revision: s.revision,
        choice,
      });
      humanMoves++;
      assert.ok(humanMoves <= 21);
      await assert.rejects(() =>
        player.reducers.playStrategyMove({
          matchId: id,
          revision: s.revision,
          choice,
        }),
      );
    }
    await until(
      () => [player, a, b].every((c) => !!c.db.matchMemory.matchId.find(id)),
      "durable result convergence",
    );
    for (const c of [a, b]) {
      assert.equal(serialize(state(c)), serialize(state(player)));
      assert.equal(
        serialize(c.db.matchMemory.matchId.find(id)),
        serialize(player.db.matchMemory.matchId.find(id)),
      );
    }
    const memory = player.db.matchMemory.matchId.find(id)!;
    assert.equal(memory.gameKind, kind);
    assert.equal(memory.crowdActions, 2);
    assert.equal(memory.crowdParticipants, 2);
    assert.equal(
      [...player.db.matchHistory.iter()].filter((h) => h.matchId === id).length,
      1,
    );
    assert.ok(events.some((e) => e.includes(power.toUpperCase())));
    await assert.rejects(() =>
      player.reducers.playStrategyMove({
        matchId: id,
        revision: state(player).revision,
        choice: 1,
      }),
    );
    const revision = state(player).revision;
    await sleep(4500);
    assert.equal(state(player).revision, revision);
    const restored = await connect("restored", player.token);
    assert.equal(serialize(state(restored)), serialize(state(player)));
    assert.ok(
      restored.db.melaProfile.identity.find(player.identity!)!.matchesPlayed >=
        1,
    );
    await assert.rejects(() => a.reducers.rematchPlayground({ matchId: id }));
    await Promise.all([
      player.reducers.rematchPlayground({ matchId: id }),
      player.reducers.rematchPlayground({ matchId: id }),
    ]);
    const next =
      player.db.playgroundRematch.previousMatchId.find(id)!.nextMatchId;
    await until(
      () =>
        a.db.playgroundRematch.previousMatchId.find(id)?.nextMatchId === next,
      "spectator rematch invitation",
    );
    await a.reducers.joinMatchAsSpectator({ matchId: next });
    assert.equal(
      serialize(memory),
      serialize(player.db.matchMemory.matchId.find(id)),
    );
    console.log(
      `${kind}: complete ${memory.winner}; ${humanMoves} human moves; 3-client convergence, crowd, duplicate/stale/role rejection, automatic AI, immutable memory, reconnect and rematch PASS`,
    );
  }
  const active = [...player.db.match.iter()].find(
    (m) => m.playerIdentity.isEqual(player.identity!) && m.status === "active",
  )!;
  await b.reducers.joinMatchAsSpectator({ matchId: active.id });
  const sameTarget = await Promise.allSettled(
    [a, b].map((c) =>
      c.reducers.useExperimentalCrowdPower({
        matchId: active.id,
        power: "spark",
        target: "human",
      }),
    ),
  );
  assert.equal(sameTarget.filter((r) => r.status === "fulfilled").length, 1);
  await until(
    () =>
      [...a.db.visibleCrowdEffects.iter()].filter(
        (e) => e.matchId === active.id,
      ).length === 1,
    "single pending effect",
  );
  await until(
    () =>
      [...a.db.visibleCrowdEffects.iter()].filter(
        (e) => e.matchId === active.id,
      ).length === 0,
    "discrete effect expiry",
    30000,
  );
  assert.equal(player.db.lastStickState.matchId.find(active.id)!.revision, 0);
  await player.reducers.playStrategyMove({
    matchId: active.id,
    revision: 0,
    choice: 1,
  });
  assert.equal(player.db.lastStickState.matchId.find(active.id)!.remaining, 20);
  await player.reducers.createFourRow();
  await sleep(4500);
  assert.equal(player.db.match.id.find(active.id)!.status, "abandoned");
  assert.equal(player.db.lastStickState.matchId.find(active.id)!.revision, 1);
  assert.equal(player.db.matchMemory.matchId.find(active.id), null);
  console.log(
    "Same-target race, discrete expiry without a game tick, no expired bonus, abandoned-match AI cancellation PASS",
  );
} finally {
  clients.forEach((c) => c.disconnect());
}
