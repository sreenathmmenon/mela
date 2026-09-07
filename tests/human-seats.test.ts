import test from "node:test";
import assert from "node:assert/strict";
import {
  seatKind,
  validateAgentAction,
} from "../spacetimedb/src/agentDuelRules";

test("each Pen Fight mode reserves explicit human, agent and deterministic seats", () => {
  assert.deepEqual(
    ["human", "bot"].map((s) => seatKind("friends", s)),
    ["human", "human"],
  );
  assert.deepEqual(
    ["human", "bot"].map((s) => seatKind("human_agent", s)),
    ["human", "agent"],
  );
  assert.deepEqual(
    ["human", "bot"].map((s) => seatKind("duel", s)),
    ["agent", "agent"],
  );
  assert.deepEqual(
    ["human", "bot"].map((s) => seatKind("melabot", s)),
    ["agent", "bot"],
  );
});
test("the same revision and legal-input validator accepts either current seat", () => {
  const a = {
    round: 1,
    turnNumber: 0,
    aimX: 260,
    aimY: 500,
    force: 66,
    contact: 50,
    intent: "Human flick",
  };
  for (const side of ["human", "bot"]) {
    const s = { round: 1, turnsInRound: 0, turn: side };
    assert.doesNotThrow(() => validateAgentAction(s, a, side));
    assert.throws(() => validateAgentAction(s, { ...a, force: 100 }, side));
    assert.throws(() => validateAgentAction(s, { ...a, turnNumber: 1 }, side));
    assert.throws(() =>
      validateAgentAction(s, a, side === "human" ? "bot" : "human"),
    );
  }
});
