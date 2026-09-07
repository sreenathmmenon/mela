import assert from "node:assert/strict";
import { DbConnection } from "../src/module_bindings";
import { AgentBridge } from "../src/agentTools";
import { decideFour } from "../spacetimedb/src/fourRules";

const clients: DbConnection[] = [];
const bridges: AgentBridge[] = [];
async function until(check: () => boolean, label: string, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (!check()) {
    if (Date.now() > deadline) throw Error(`Timeout: ${label}`);
    await new Promise((r) => setTimeout(r, 25));
  }
}
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
          "four_row_state",
          "pen_seat_presence",
          "match_memory",
          "match_history",
          "mela_profile",
          "match_participant",
          "match_crowd",
          "visible_crowd_effects",
          "agent_fallback_record",
          "live_event",
        ].map((t) => `SELECT * FROM ${t}`),
      ),
  );
  return c;
}
try {
  const host = await connect(),
    left = await connect(),
    crowd = await connect();
  let right = await connect();
  const lb = new AgentBridge(left);
  let rb = new AgentBridge(right);
  bridges.push(lb, rb);
  const events: string[] = [];
  crowd.db.liveEvent.onInsert((_c, e) => events.push(e.message));
  for (const mode of ["friends", "human_agent", "duel"]) {
    await host.reducers.createFourRowDuel({ mode });
    const id = [...host.db.match.iter()].filter(
      (m) => m.playerIdentity.isEqual(host.identity!) && m.status === "active",
    )[0].id;
    const arg = { matchId: id.toString() };
    assert.equal(host.db.agentDuel.matchId.find(id)?.phase, "lobby");
    await assert.rejects(() =>
      host.reducers.playStrategyMove({ matchId: id, revision: 0, choice: 0 }),
    );
    if (mode === "friends") await right.reducers.joinHumanSeat({ matchId: id });
    else
      await rb.execute("mela_claim_seat", {
        ...arg,
        side: "bot",
        name: "Column Rival",
      });
    if (mode === "duel")
      await lb.execute("mela_claim_seat", {
        ...arg,
        side: "human",
        name: "Column Challenger",
      });
    else
      await assert.rejects(() =>
        lb.execute("mela_claim_seat", {
          ...arg,
          side: "human",
          name: "Seat thief",
        }),
      );
    await until(
      () => host.db.agentDuel.matchId.find(id)?.phase === "waiting",
      "both seats ready",
    );
    await crowd.reducers.joinMatchAsSpectator({ matchId: id });
    await assert.rejects(() => crowd.reducers.joinHumanSeat({ matchId: id }));
    await assert.rejects(() =>
      right.reducers.joinMatchAsSpectator({ matchId: id }),
    );
    await assert.rejects(() =>
      crowd.reducers.playStrategyMove({ matchId: id, revision: 0, choice: 0 }),
    );
    await assert.rejects(() =>
      right.reducers.playStrategyMove({ matchId: id, revision: 0, choice: 0 }),
    );
    if (mode !== "duel")
      await crowd.reducers.useExperimentalCrowdPower({
        matchId: id,
        power: "sidewind",
        target: "human",
      });
    const mover = mode === "duel" ? left : host;
    await assert.rejects(() =>
      mover.reducers.useExperimentalCrowdPower({
        matchId: id,
        power: "sidewind",
        target: "human",
      }),
    );
    const submit = (
      c: DbConnection,
      revision: number,
      choice: number,
      agent: boolean,
    ) =>
      agent
        ? (c === left ? lb : rb).execute("mela_drop_four", {
            ...arg,
            revision,
            choice,
          })
        : c.reducers.playStrategyMove({ matchId: id, revision, choice });
    await assert.rejects(() => submit(mover, 0, 99, mode === "duel"));
    const race = await Promise.allSettled([
      submit(mover, 0, 0, mode === "duel"),
      submit(mover, 0, 0, mode === "duel"),
    ]);
    assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
    if (mode === "duel") {
      await until(
        () => crowd.db.agentDuel.matchId.find(id)?.phase === "intent",
        "committed crowd window",
      );
      assert.equal(crowd.db.fourRowState.matchId.find(id)?.revision, 0);
      await crowd.reducers.useExperimentalCrowdPower({
        matchId: id,
        power: "sidewind",
        target: "human",
      });
    }
    await until(
      () => crowd.db.fourRowState.matchId.find(id)?.revision === 1,
      "first move converges",
    );
    assert.equal(
      crowd.db.fourRowState.matchId.find(id)?.lastCell,
      36,
      "crowd shifts left seat column 0 to 1",
    );
    assert.equal(crowd.db.matchCrowd.matchId.find(id)?.energy, 22);
    if (mode === "friends") {
      await right.reducers.setRoomPresence({ matchId: id });
      await until(
        () => host.db.penSeatPresence.matchId.find(id)?.rightPresent === true,
        "right connected",
      );
      const token = right.token;
      right.disconnect();
      await until(
        () => host.db.penSeatPresence.matchId.find(id)?.rightPresent === false,
        "right disconnected",
      );
      right = await connect(token);
      rb.dispose();
      rb = new AgentBridge(right);
      bridges.push(rb);
      await right.reducers.joinHumanSeat({ matchId: id });
      await right.reducers.setRoomPresence({ matchId: id });
      await right.reducers.playStrategyMove({
        matchId: id,
        revision: 1,
        choice: 6,
      });
      await until(
        () => host.db.fourRowState.matchId.find(id)!.revision === 2,
        "rejoined move delivered to host",
      );
    }
    if (mode === "human_agent") {
      console.log("Checking a real 30-second missed-agent wake...");
      await until(
        () => host.db.fourRowState.matchId.find(id)!.revision === 2,
        "one fallback action",
        38000,
      );
      assert.equal(host.db.agentFallbackRecord.matchId.find(id)?.rightTurns, 1);
      await assert.rejects(() =>
        rb.execute("mela_drop_four", { ...arg, revision: 1, choice: 0 }),
      );
    }
    for (
      let n = 0;
      n < 45 && host.db.match.id.find(id)?.status === "active";
      n++
    ) {
      const state = host.db.fourRowState.matchId.find(id)!;
      const human = state.turn === "human";
      const c = human ? mover : right;
      const observed = human
        ? state.board.replace(/[hb]/g, (c) => (c === "h" ? "b" : "h"))
        : state.board;
      const choice = decideFour(observed);
      await submit(
        c,
        state.revision,
        choice,
        human ? mode === "duel" : mode !== "friends",
      );
      await until(
        () => host.db.fourRowState.matchId.find(id)!.revision > state.revision,
        "move committed",
      );
    }
    await until(
      () => crowd.db.matchMemory.matchId.find(id) !== undefined,
      "durable result",
    );
    assert.equal(host.db.match.id.find(id)?.status, "complete");
    assert.equal(host.db.agentDuel.matchId.find(id)?.phase, "complete");
    assert.equal(
      [...crowd.db.matchHistory.iter()].filter((m) => m.matchId === id).length,
      1,
    );
    assert.equal(
      crowd.db.fourRowState.matchId.find(id)?.board,
      host.db.fourRowState.matchId.find(id)?.board,
    );
    assert.equal(crowd.db.matchMemory.matchId.find(id)?.crowdActions, 1);
    if (mode === "human_agent")
      assert.match(
        crowd.db.matchMemory.matchId.find(id)!.notableMoment,
        /MelaBot covered 1 missed agent turns/,
      );
    await assert.rejects(() =>
      submit(
        mover,
        host.db.fourRowState.matchId.find(id)!.revision,
        0,
        mode === "duel",
      ),
    );
    if (mode === "friends") {
      assert.equal(
        host.db.melaProfile.identity.find(host.identity!)?.matchesPlayed,
        1,
      );
      assert.equal(
        host.db.melaProfile.identity.find(right.identity!)?.matchesPlayed,
        1,
      );
    }
    console.log(
      `PASS Four ${mode}: seats, roles, invalid/duplicate turns, crowd, complete result, subscription convergence`,
    );
  }
  assert.ok(events.some((e) => e.includes("SIDEWIND")));
  console.log(
    "PASS native Four seat integration, reconnect, fallback disclosure and memory",
  );
} finally {
  for (const b of bridges) b.dispose();
  for (const c of clients) c.disconnect();
}
