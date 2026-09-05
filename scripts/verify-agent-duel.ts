// Explicit local integration check: real SDK → reducers → subscriptions.
import assert from "node:assert/strict";
import { DbConnection } from "../src/module_bindings";
import { AgentBridge } from "../src/agentTools";
const url = process.env.TEST_SPACETIME_HOST || "http://127.0.0.1:3000";
const db = process.env.TEST_SPACETIME_DB || "mela-agent-duel-0906";
if (!url.includes("127.0.0.1"))
  throw new Error("This test creates local QA matches only.");
const connections: DbConnection[] = [];
async function connect(name: string, humanProfile = true) {
  const c = await new Promise<DbConnection>((resolve, reject) => {
    DbConnection.builder()
      .withUri(url)
      .withDatabaseName(db)
      .onConnect((c) => resolve(c))
      .onConnectError((_c, e) => reject(e))
      .build();
  });
  connections.push(c);
  await new Promise<void>((resolve, reject) =>
    c
      .subscriptionBuilder()
      .onApplied(() => resolve())
      .onError((e) => reject(e.event))
      .subscribe([
        "SELECT * FROM match",
        "SELECT * FROM agent_duel",
        "SELECT * FROM pen_desk_state",
        "SELECT * FROM match_memory",
        "SELECT * FROM visible_crowd_effects",
        "SELECT * FROM live_event",
      ]),
  );
  // Local rule fixtures only: this does not send or claim delivery of email.
  if (humanProfile)
    await c.reducers.onboardWithEmail({
      displayName: name,
      email: `${name.toLowerCase()}@example.com`,
    });
  return c;
}
async function until(check: () => boolean, timeout = 12000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout)
      throw new Error("Subscription assertion timed out");
    await new Promise((r) => setTimeout(r, 40));
  }
}
try {
  const host = await connect("DuelHost"),
    left = await connect("TealMind", false),
    right = await connect("RustMind", false),
    crowd = await connect("CrowdNila");
  await host.reducers.createAgentDuel({ mode: "duel" });
  const match = [...host.db.match.iter()]
    .filter((m) => m.playerIdentity.isEqual(host.identity!))
    .sort((a, b) => Number(b.id - a.id))[0];
  const id = match.id.toString();
  const teal = new AgentBridge(left),
    rust = new AgentBridge(right);
  await teal.execute("mela_claim_seat", {
    matchId: id,
    side: "human",
    name: "TealMind",
  });
  await rust.execute("mela_claim_seat", {
    matchId: id,
    side: "bot",
    name: "RustMind",
  });
  await assert.rejects(() =>
    rust.execute("mela_claim_seat", {
      matchId: id,
      side: "human",
      name: "SeatThief",
    }),
  );
  await crowd.reducers.joinMatchAsSpectator({ matchId: match.id });
  await assert.rejects(() =>
    left.reducers.joinMatchAsSpectator({ matchId: match.id }),
  );
  await assert.rejects(() =>
    host.reducers.flickPen({
      matchId: match.id,
      aimX: 740,
      aimY: 500,
      force: 60,
      contact: 50,
    }),
  );
  const before = await teal.execute("mela_get_desk", { matchId: id });
  assert.equal("seed" in before, false);
  assert.equal("effects" in before, false);
  const action = {
    matchId: id,
    round: before.round,
    turnNumber: before.turnNumber,
    aimX: 740,
    aimY: 500,
    force: 60,
    contact: 50,
    intent: "I will push through the centre.",
  };
  await assert.rejects(() => rust.execute("mela_flick", action), /turn/);
  await assert.rejects(
    () => teal.execute("mela_flick", { ...action, force: 100 }),
    /Illegal/,
  );
  await teal.execute("mela_flick", action);
  await assert.rejects(() => teal.execute("mela_flick", action), /committed/);
  await crowd.reducers.usePenFightCrowdPower({
    matchId: match.id,
    power: "tilt",
    target: "human",
  });
  await until(() =>
    [...crowd.db.visibleCrowdEffects.iter()].some(
      (e) => e.matchId === match.id,
    ),
  );
  assert.equal(
    [...left.db.visibleCrowdEffects.iter()].some((e) => e.matchId === match.id),
    false,
  );
  await until(
    () => left.db.penDeskState.matchId.find(match.id)?.turn === "bot",
  );
  await until(
    () => crowd.db.penDeskState.matchId.find(match.id)?.turn === "bot",
  );
  assert.deepEqual(
    left.db.penDeskState.matchId.find(match.id),
    crowd.db.penDeskState.matchId.find(match.id),
  );
  await assert.rejects(() => teal.execute("mela_flick", action), /Stale|turn/);
  const desk = await rust.execute("mela_get_desk", { matchId: id });
  assert.ok(desk.events.some((e) => e.includes("CrowdNila's DESK TILT")));
  // Let the disconnected rust seat time out; server fallback must advance.
  const timeoutEvents: string[] = [];
  left.db.liveEvent.onInsert((_ctx, row) => {
    if (row.matchId === match.id) timeoutEvents.push(row.message);
  });
  right.disconnect();
  await until(
    () => left.db.penDeskState.matchId.find(match.id)?.turn !== "bot",
    38000,
  );
  // A resolved turn's notice correctly names the NEXT actor. Timeout evidence
  // belongs to the transient feed, not a stale notice carried into that turn.
  assert.ok(timeoutEvents.some((message) => message.includes("timed out")));
  console.log(
    JSON.stringify({
      pass: true,
      matchId: id,
      checks: [
        "independent seats",
        "seat theft rejection",
        "spectator segregation",
        "human bypass rejection",
        "no private state",
        "off-turn",
        "illegal force",
        "duplicate",
        "crowd effect hidden",
        "committed crowd influence",
        "realtime convergence",
        "stale rejection",
        "disconnected fallback",
      ],
    }),
  );
  // Complete a second match through agent proposals and automatic MelaBot.
  await host.reducers.createAgentDuel({ mode: "melabot" });
  const next = [...host.db.match.iter()]
    .filter((m) => m.playerIdentity.isEqual(host.identity!))
    .sort((a, b) => Number(b.id - a.id))[0];
  await teal.execute("mela_claim_seat", {
    matchId: next.id.toString(),
    side: "human",
    name: "TealMind",
  });
  await crowd.reducers.joinMatchAsSpectator({ matchId: next.id });
  let influenced = false;
  for (let turn = 0; turn < 25; turn++) {
    await until(() => {
      const d = left.db.agentDuel.matchId.find(next.id);
      const s = left.db.penDeskState.matchId.find(next.id);
      return (
        d?.phase === "complete" ||
        (d?.phase === "waiting" && s?.turn === "human")
      );
    }, 15000);
    const d = await teal.execute("mela_get_desk", {
      matchId: next.id.toString(),
    });
    if (d.status === "complete") break;
    await teal.execute("mela_flick", {
      matchId: next.id.toString(),
      round: d.round,
      turnNumber: d.turnNumber,
      aimX: d.rust.x,
      aimY: d.rust.y,
      force: d.limits.forceMax,
      contact: 50,
      intent: "Aim through the other pen and press toward the edge.",
    });
    if (!influenced) {
      await crowd.reducers.usePenFightCrowdPower({
        matchId: next.id,
        power: "nudge",
        target: "human",
      });
      influenced = true;
    }
    await until(
      () =>
        left.db.agentDuel.matchId.find(next.id)?.revision !==
        BigInt(d.revision),
      12000,
    );
  }
  await until(
    () =>
      host.db.matchMemory.matchId.find(next.id) !== null &&
      host.db.matchMemory.matchId.find(next.id) !== undefined,
  );
  const memory = host.db.matchMemory.matchId.find(next.id)!;
  assert.equal(memory.humanName, "TealMind");
  assert.equal(memory.aiName, "MelaBot");
  assert.match(memory.notableMoment, /CrowdNila/);
  assert.deepEqual(
    host.db.penDeskState.matchId.find(next.id),
    crowd.db.penDeskState.matchId.find(next.id),
  );
  await assert.rejects(
    () =>
      teal.execute("mela_flick", { ...action, matchId: next.id.toString() }),
    /not active/,
  );
  console.log(
    JSON.stringify({
      completedMatch: next.id.toString(),
      winner: memory.winner,
      score: [memory.humanScore, memory.botScore],
      memory: memory.notableMoment,
      postCompletionRejected: true,
    }),
  );
} finally {
  for (const c of connections) c.disconnect();
}
