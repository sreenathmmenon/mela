import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateAgentAction,
  wakeIsCurrent,
} from "../spacetimedb/src/agentDuelRules";
import { AGENT_TOOLS } from "../src/agentTools";
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
