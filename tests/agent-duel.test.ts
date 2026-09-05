import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateAgentAction,
  wakeIsCurrent,
} from "../spacetimedb/src/agentDuelRules";
import { AGENT_TOOLS, AgentBridge } from "../src/agentTools";
const state = { round: 1, turnsInRound: 0, turn: "human" };
const action = {
  round: 1,
  turnNumber: 0,
  aimX: 740,
  aimY: 500,
  force: 60,
  contact: 50,
  intent: "Press the centre without overrunning the desk.",
};
test("agents use normal legal flick limits, with no opening knockout bypass", () => {
  assert.doesNotThrow(() => validateAgentAction(state, action, "human"));
  for (const bad of [
    { force: 100 },
    { aimX: 1001 },
    { contact: 101 },
    { force: 19 },
  ])
    assert.throws(
      () => validateAgentAction(state, { ...action, ...bad }, "human"),
      /Illegal flick/,
    );
});
test("stale, wrong-turn and abusive intent proposals are refused", () => {
  assert.throws(
    () => validateAgentAction(state, { ...action, round: 2 }, "human"),
    /Stale/,
  );
  assert.throws(
    () => validateAgentAction(state, action, "bot"),
    /not your turn/,
  );
  for (const intent of ["", "<script>", "a".repeat(161)])
    assert.throws(
      () => validateAgentAction(state, { ...action, intent }, "human"),
      /intent/,
    );
});
test("duplicate, stale and wrong-phase schedules cannot advance a turn", () => {
  assert.equal(
    wakeIsCurrent({ revision: 4n, phase: "intent" }, 4n, "intent"),
    true,
  );
  assert.equal(
    wakeIsCurrent({ revision: 4n, phase: "intent" }, 3n, "intent"),
    false,
  );
  assert.equal(
    wakeIsCurrent({ revision: 4n, phase: "complete" }, 4n, "intent"),
    false,
  );
});
test("both transports have exactly the same minimal tool contract and no creation tool", () => {
  assert.deepEqual(
    AGENT_TOOLS.map((t) => t.name),
    ["mela_get_desk", "mela_claim_seat", "mela_flick"],
  );
  for (const tool of AGENT_TOOLS)
    assert.equal(tool.inputSchema.additionalProperties, false);
});

test("overlapping subscriptions deliver each public event once and omit motion internals", async () => {
  let listener: any;
  let applied: any;
  const find = (row: any) => ({ matchId: { find: () => row } });
  const connection: any = {
    db: {
      liveEvent: {
        onInsert: (fn: any) => (listener = fn),
        removeOnInsert: () => {},
      },
      penDeskState: find({
        round: 1,
        turnsInRound: 0,
        turn: "human",
        humanX: 260,
        humanY: 500,
        botX: 740,
        botY: 500,
        humanRounds: 0,
        botRounds: 0,
      }),
      agentDuel: find({
        phase: "waiting",
        revision: 1n,
        deadlineMicros: 0n,
        leftName: "A",
        rightName: "B",
      }),
      match: { id: { find: () => ({ status: "active", winner: "" }) } },
    },
    subscriptionBuilder: () => {
      const builder = {
        onApplied: (fn: any) => {
          applied = fn;
          return builder;
        },
        onError: () => builder,
        subscribe: () => {
          applied();
          return { unsubscribe: () => {} };
        },
      };
      return builder;
    },
  };
  const bridge = new AgentBridge(connection);
  const row = { id: 1n, matchId: 5n, message: "Nila changed the flick" };
  listener({}, row);
  listener({}, row);
  listener({}, { ...row, id: 2n, message: "@pen-motion/1:hidden" });
  const desk = await bridge.execute("mela_get_desk", { matchId: "5" });
  assert.deepEqual(desk.events, ["Nila changed the flick"]);
  bridge.dispose();
});
