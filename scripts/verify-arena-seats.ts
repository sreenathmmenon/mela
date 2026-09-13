import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DbConnection } from "../src/module_bindings";
import { AgentBridge } from "../src/agentTools";
import {
  CHARACTER_PRESETS,
  decideCharacter,
} from "../spacetimedb/src/arenaCharacter";
const clients: DbConnection[] = [];
async function connect(token?: string) {
  const c = await new Promise<DbConnection>((resolve, reject) =>
    DbConnection.builder()
      .withUri("http://127.0.0.1:3000")
      .withDatabaseName(process.env.TEST_SPACETIME_DB || "mela-arena-0912")
      .withToken(token)
      .onConnect(resolve)
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
          "match",
          "arena_room",
          "arena_state",
          "arena_frame",
          "my_arena_move",
          "my_arena_invitation",
          "my_arena_energy",
          "my_arena_crowd",
          "match_crowd",
          "match_history",
          "match_memory",
          "mela_profile",
          "arena_seat_presence",
          "agent_fallback_record",
        ].map((t) => `SELECT * FROM ${t}`),
      ),
  );
  return c;
}
async function until(f: () => boolean, label: string, ms = 35000) {
  const end = Date.now() + ms;
  while (!f()) {
    if (Date.now() > end) throw Error(label);
    await new Promise((r) => setTimeout(r, 30));
  }
}
async function scenario(game: string, mode: string) {
  const host = await connect(),
    a = mode === "agent_duel" ? await connect() : host;
  let b = await connect();
  const crowd = await connect(),
    crowdB = await connect();
  const code = randomUUID().replace(/-/g, "");
  await host.reducers.createArenaRoom({
    gameKind: game,
    mode,
    inviteCode: code,
  });
  const id = [...host.db.match.iter()]
    .filter((m) => m.playerIdentity.isEqual(host.identity!))
    .sort((a, b) => Number(b.id - a.id))[0].id;
  const row = () => host.db.arenaState.matchId.find(id)!;
  assert.equal(row().phase, "lobby");
  assert.equal(
    [...crowd.db.myArenaInvitation.iter()].some((r) => r.matchId === id),
    false,
  );
  if (mode === "friends") {
    await assert.rejects(() =>
      b.reducers.claimArenaSeat({
        matchId: id,
        side: 1,
        name: "",
        inviteCode: "",
      }),
    );
    await b.reducers.claimArenaSeat({
      matchId: id,
      side: 1,
      name: "",
      inviteCode: code,
    });
    await b.reducers.claimArenaSeat({
      matchId: id,
      side: 1,
      name: "",
      inviteCode: "",
    });
  } else {
    const bridge = new AgentBridge(b);
    await bridge.execute("mela_join_arena", {
      matchId: String(id),
      side: 1,
      name: "Independent Teal",
    });
    if (mode === "agent_duel")
      await new AgentBridge(a).execute("mela_join_arena", {
        matchId: String(id),
        side: 0,
        name: "Independent Amber",
      });
    await assert.rejects(() =>
      bridge.execute("mela_join_arena", {
        matchId: String(id),
        side: 0,
        name: "Both seats",
      }),
    );
  }
  await assert.rejects(() =>
    crowd.reducers.claimArenaSeat({
      matchId: id,
      side: 1,
      name: "Thief",
      inviteCode: code,
    }),
  );
  await assert.rejects(() => b.reducers.joinMatchAsSpectator({ matchId: id }));
  await a.reducers.setRoomPresence({ matchId: id });
  await b.reducers.setRoomPresence({ matchId: id });
  await until(
    () =>
      [...host.db.arenaSeatPresence.iter()].find((r) => r.matchId === id)
        ?.rightPresent === true,
    "presence",
  );
  if (mode === "friends") {
    const token = b.token;
    b.disconnect();
    await until(
      () =>
        [...host.db.arenaSeatPresence.iter()].find((r) => r.matchId === id)
          ?.rightPresent === false,
      "disconnect",
    );
    b = await connect(token);
    await b.reducers.claimArenaSeat({
      matchId: id,
      side: 1,
      name: "",
      inviteCode: "",
    });
    await b.reducers.setRoomPresence({ matchId: id });
  }
  await crowd.reducers.joinMatchAsSpectator({ matchId: id });
  await crowdB.reducers.joinMatchAsSpectator({ matchId: id });
  const buys = await Promise.allSettled([
    crowd.reducers.arenaPower({ matchId: id, power: "spring" }),
    crowdB.reducers.arenaPower({ matchId: id, power: "bridge" }),
  ]);
  assert.equal(buys.filter((r) => r.status === "fulfilled").length, 1);
  await until(
    () =>
      [...crowd.db.myArenaEnergy.iter()].some(
        (p) => p.matchId === id && p.energy < 42,
      ),
    "private energy",
  );
  assert.equal(
    host.db.matchCrowd.matchId.find(id)!.energy,
    42,
    "public energy hides current spend",
  );
  assert.equal(
    [...a.db.myArenaEnergy.iter()].some((r) => r.matchId === id),
    false,
  );
  assert.equal(
    [...b.db.myArenaCrowd.iter()].some((r) => r.matchId === id),
    false,
  );
  const first = row();
  await assert.rejects(() =>
    a.reducers.playArena({
      matchId: id,
      side: 1,
      revision: first.revision,
      action: '{"action":"guard","x":8,"y":4}',
    }),
  );
  await assert.rejects(() =>
    a.reducers.playArena({
      matchId: id,
      side: 0,
      revision: first.revision,
      action: '{"action":"move","x":8,"y":4}',
    }),
  );
  const agentA = new AgentBridge(a),
    agentB = new AgentBridge(b);
  while (row().phase !== "complete") {
    const old = row(),
      state = JSON.parse(old.state);
    for (const side of [0, 1] as const) {
      const connection = side === 0 ? a : b;
      const action = decideCharacter(state, side, CHARACTER_PRESETS[side]);
      const isAgent =
        mode === "agent_duel" || (mode === "human_agent" && side === 1);
      if (isAgent)
        await (side === 0 ? agentA : agentB).execute("mela_arena_move", {
          matchId: String(id),
          revision: old.revision,
          side,
          ...action,
        });
      else
        await connection.reducers.playArena({
          matchId: id,
          revision: old.revision,
          side,
          action: JSON.stringify(action),
        });
      await assert.rejects(() =>
        connection.reducers.playArena({
          matchId: id,
          revision: old.revision,
          side,
          action: JSON.stringify(action),
        }),
      );
      if (side === 0 && old.revision === 0) {
        assert.equal(row().revision, 0, "no outcome before both moves");
        assert.equal(
          [...b.db.myArenaMove.iter()].some((r) => r.matchId === id),
          false,
          "opponent intent private",
        );
      }
    }
    await until(() => row().revision > old.revision, "reveal");
  }
  await until(
    () =>
      b.db.arenaState.matchId.find(id)?.state === row().state &&
      crowd.db.arenaState.matchId.find(id)?.state === row().state &&
      crowdB.db.arenaState.matchId.find(id)?.state === row().state,
    "four-client convergence",
  );
  const frames = [...host.db.arenaFrame.iter()].filter((f) => f.matchId === id);
  assert.equal(frames.length, row().revision + 1);
  assert.equal(new Set(frames.map((f) => f.revision)).size, frames.length);
  assert.equal(
    [...host.db.matchHistory.iter()].filter((h) => h.matchId === id).length,
    1,
  );
  assert.equal(
    host.db.matchMemory.matchId.find(id)!.humanName,
    host.db.arenaRoom.matchId.find(id)!.leftName,
  );
  assert.equal(
    host.db.matchMemory.matchId.find(id)!.aiName,
    host.db.arenaRoom.matchId.find(id)!.rightName,
  );
  assert.ok(host.db.matchMemory.matchId.find(id)!.crowdActions === 1);
  assert.equal(
    a.db.melaProfile.identity.find(a.identity!)!.matchesPlayed,
    mode === "agent_duel" ? 0 : 1,
  );
  assert.equal(
    b.db.melaProfile.identity.find(b.identity!)!.matchesPlayed,
    mode === "friends" ? 1 : 0,
  );
  await assert.rejects(() =>
    a.reducers.playArena({
      matchId: id,
      side: 0,
      revision: row().revision,
      action: '{"action":"guard","x":0,"y":4}',
    }),
  );
  const fresh = await connect();
  assert.equal(fresh.db.arenaState.matchId.find(id)!.state, row().state);
  console.log(
    JSON.stringify({
      game,
      mode,
      match: String(id),
      beats: row().revision,
      result: JSON.parse(row().state).winner,
      independentSeats: true,
      privatePlansAndEnergy: true,
      concurrentCrowd: true,
      uniqueHistory: true,
      convergence: true,
    }),
  );
  [host, a, b, crowd, crowdB, fresh].forEach((c) => c.disconnect());
}
try {
  await Promise.all(
    ["crown_run", "bridge_breakers", "mela_heist"].flatMap((game) =>
      ["friends", "human_agent", "agent_duel"].map((mode) =>
        scenario(game, mode),
      ),
    ),
  );
  const host = await connect(),
    b = await connect();
  const bridge = new AgentBridge(host);
  const created = (await bridge.execute("mela_create_arena", {
    gameKind: "bridge_breakers",
  })) as any;
  const id = BigInt(created.matchId);
  await bridge.execute("mela_join_arena", {
    matchId: String(id),
    side: 0,
    name: "Sleepy Amber",
  });
  await new AgentBridge(b).execute("mela_join_arena", {
    matchId: String(id),
    side: 1,
    name: "Sleepy Teal",
  });
  await until(
    () => host.db.arenaState.matchId.find(id)!.revision === 1,
    "scheduled fallback",
    35000,
  );
  assert.equal(host.db.agentFallbackRecord.matchId.find(id)!.leftTurns, 1);
  assert.equal(host.db.agentFallbackRecord.matchId.find(id)!.rightTurns, 1);
  assert.equal(
    host.db.arenaState.matchId.find(id)!.provenance,
    "MelaBot fallback / MelaBot fallback",
  );
  await host.reducers.createArenaRoom({
    gameKind: "bridge_breakers",
    mode: "friends",
    inviteCode: randomUUID().replace(/-/g, ""),
  });
  console.log(
    "PASS agent-created room and real scheduled, durably disclosed missed-agent substitutions; previous room closed by normal host rematch.",
  );
} finally {
  clients.forEach((c) => c.disconnect());
}
