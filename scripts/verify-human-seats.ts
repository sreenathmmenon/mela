import assert from "node:assert/strict";
import { DbConnection } from "../src/module_bindings";
import { AgentBridge } from "../src/agentTools";
const clients: DbConnection[] = [];
async function connect(token?: string) {
  const c = await new Promise<DbConnection>((resolve, reject) =>
    DbConnection.builder()
      .withUri("http://127.0.0.1:3000")
      .withDatabaseName(process.env.TEST_SPACETIME_DB || "mela-guest-0906")
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
      .onError((e) => reject(e.event))
      .subscribe(
        [
          "match",
          "agent_duel",
          "pen_desk_state",
          "pen_seat_presence",
          "match_memory",
          "mela_profile",
          "match_participant",
        ].map((t) => `SELECT * FROM ${t}`),
      ),
  );
  return c;
}
async function until(f: () => boolean) {
  const deadline = Date.now() + 10000;
  while (!f()) {
    if (Date.now() > deadline) throw Error("Subscription timeout");
    await new Promise((r) => setTimeout(r, 25));
  }
}
try {
  const a = await connect(),
    b = await connect(),
    x = await connect();
  await a.reducers.createAgentDuel({ mode: "friends" });
  const m = [...a.db.match.iter()].find((m) =>
    m.playerIdentity.isEqual(a.identity!),
  )!;
  const id = m.id;
  assert.equal(a.db.agentDuel.matchId.find(id)?.phase, "lobby");
  await assert.rejects(() =>
    x.reducers.claimAgentSeat({ matchId: id, side: "bot", name: "Intruder" }),
  );
  await assert.rejects(() => a.reducers.joinHumanPenSeat({ matchId: id }));
  await b.reducers.joinHumanPenSeat({ matchId: id });
  await b.reducers.joinHumanPenSeat({ matchId: id });
  await assert.rejects(() => x.reducers.joinHumanPenSeat({ matchId: id }));
  await assert.rejects(() => b.reducers.joinMatchAsSpectator({ matchId: id }));
  await a.reducers.setRoomPresence({ matchId: id });
  await b.reducers.setRoomPresence({ matchId: id });
  await until(
    () => x.db.penSeatPresence.matchId.find(id)?.rightPresent === true,
  );
  const initial = a.db.penDeskState.matchId.find(id)!;
  const action = {
    matchId: id,
    round: initial.round,
    turnNumber: initial.turnsInRound,
    aimX: initial.botX,
    aimY: initial.botY,
    force: 66,
    contact: 50,
  };
  await assert.rejects(() => b.reducers.humanPenFlick(action));
  const race = await Promise.allSettled([
    a.reducers.humanPenFlick(action),
    a.reducers.humanPenFlick(action),
  ]);
  assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
  const token = b.token;
  b.disconnect();
  await until(
    () => x.db.penSeatPresence.matchId.find(id)?.rightPresent === false,
  );
  const rejoined = await connect(token);
  await rejoined.reducers.joinHumanPenSeat({ matchId: id });
  await rejoined.reducers.setRoomPresence({ matchId: id });
  await until(
    () => x.db.penSeatPresence.matchId.find(id)?.rightPresent === true,
  );
  for (let n = 0; n < 180 && a.db.match.id.find(id)?.status === "active"; n++) {
    const s = a.db.penDeskState.matchId.find(id)!;
    const c = s.turn === "human" ? a : rejoined;
    await c.reducers.humanPenFlick({
      matchId: id,
      round: s.round,
      turnNumber: s.turnsInRound,
      aimX: s.turn === "human" ? s.botX : s.humanX,
      aimY: s.turn === "human" ? s.botY : s.humanY,
      force: s.turnsInRound === 0 ? 66 : 80,
      contact: 50,
    });
    await until(
      () =>
        a.db.penDeskState.matchId.find(id)?.turnsInRound !== s.turnsInRound ||
        a.db.penDeskState.matchId.find(id)?.round !== s.round ||
        a.db.match.id.find(id)?.status === "complete",
    );
  }
  await until(() => x.db.matchMemory.matchId.find(id) !== undefined);
  assert.equal(a.db.match.id.find(id)?.status, "complete");
  assert.equal(
    [...a.db.matchMemory.iter()].filter((m) => m.matchId === id).length,
    1,
  );
  assert.equal(a.db.melaProfile.identity.find(a.identity!)?.matchesPlayed, 1);
  assert.equal(
    a.db.melaProfile.identity.find(rejoined.identity!)?.matchesPlayed,
    1,
  );
  await assert.rejects(() => rejoined.reducers.humanPenFlick(action));
  await a.reducers.createAgentDuel({ mode: "human_agent" });
  const h = [...a.db.match.iter()].filter(
    (m) => m.playerIdentity.isEqual(a.identity!) && m.status === "active",
  )[0];
  await assert.rejects(() =>
    x.reducers.claimAgentSeat({
      matchId: h.id,
      side: "human",
      name: "Intruder",
    }),
  );
  const agent = new AgentBridge(x);
  const discovery: any = await agent.execute("mela_list_matches", {});
  assert.ok(
    discovery.matches.some(
      (m: any) =>
        m.matchId === h.id.toString() && m.availableSeats.includes("bot"),
    ),
  );
  await agent.execute("mela_claim_seat", {
    matchId: h.id.toString(),
    side: "bot",
    name: "Agent Rival",
  });
  await until(() => a.db.agentDuel.matchId.find(h.id)?.phase === "waiting");
  const hs = a.db.penDeskState.matchId.find(h.id)!;
  await a.reducers.humanPenFlick({
    matchId: h.id,
    round: hs.round,
    turnNumber: hs.turnsInRound,
    aimX: hs.botX,
    aimY: hs.botY,
    force: 66,
    contact: 50,
  });
  await until(() => x.db.penDeskState.matchId.find(h.id)?.turn === "bot");
  const desk: any = await agent.execute("mela_get_desk", {
    matchId: h.id.toString(),
  });
  assert.equal(desk.mode, "human_agent");
  await agent.execute("mela_flick", {
    matchId: h.id.toString(),
    round: desk.round,
    turnNumber: desk.turnNumber,
    aimX: desk.teal.x,
    aimY: desk.teal.y,
    force: 66,
    contact: 50,
    intent: "Aim for the opposing pen.",
  });
  await until(
    () =>
      a.db.agentDuel.matchId.find(h.id)?.phase === "waiting" &&
      a.db.penDeskState.matchId.find(h.id)?.turn === "human",
  );
  for (
    let n = 0;
    n < 180 && a.db.match.id.find(h.id)?.status === "active";
    n++
  ) {
    const s = a.db.penDeskState.matchId.find(h.id)!;
    const human = s.turn === "human";
    const next = {
      matchId: h.id,
      round: s.round,
      turnNumber: s.turnsInRound,
      aimX: human ? s.botX : s.humanX,
      aimY: human ? s.botY : s.humanY,
      force: s.turnsInRound === 0 ? 66 : 80,
      contact: 50,
    };
    if (human) await a.reducers.humanPenFlick(next);
    else
      await agent.execute("mela_flick", {
        ...next,
        matchId: h.id.toString(),
        intent: "Challenge the opposing pen under the normal rules.",
      });
    await until(
      () =>
        a.db.match.id.find(h.id)?.status === "complete" ||
        (a.db.agentDuel.matchId.find(h.id)?.phase === "waiting" &&
          (a.db.penDeskState.matchId.find(h.id)?.round !== s.round ||
            a.db.penDeskState.matchId.find(h.id)?.turnsInRound !==
              s.turnsInRound)),
    );
  }
  await until(() => Boolean(x.db.matchMemory.matchId.find(h.id)));
  assert.equal(x.db.matchMemory.matchId.find(h.id)?.aiName, "Agent Rival");
  assert.equal(a.db.melaProfile.identity.find(a.identity!)?.matchesPlayed, 2);
  assert.equal(
    a.db.melaProfile.identity.find(x.identity!)?.matchesPlayed ?? 0,
    0,
    "agent seat does not earn human progression",
  );
  agent.dispose();
  console.log(
    "PASS: two independent human seats, lobby, seat theft and role rejection, duplicate/stale turn safety, disconnect/reconnect ownership, complete human-human and human-agent matches, named memories and human-only progression.",
  );
} finally {
  for (const c of clients) c.disconnect();
}
