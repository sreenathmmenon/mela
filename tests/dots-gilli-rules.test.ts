import test from "node:test";
import assert from "node:assert/strict";
import {
  decideDotsMove,
  legalDotsEdge,
  resolveDotsMove,
} from "../spacetimedb/src/dotsBoxesRules";
import { resolveGilliStrike } from "../spacetimedb/src/gilliDandaRules";

test("Dots accepts only neighbouring grid dots and rejects a duplicate line", () => {
  assert.equal(legalDotsEdge(0, 1), true);
  assert.equal(legalDotsEdge(0, 5), false);
  const first = resolveDotsMove({
    edges: "",
    boxes: "",
    from: 0,
    to: 1,
    side: "human",
  });
  assert.equal(first.nextTurn, "melabot");
  assert.throws(
    () => resolveDotsMove({ ...first, from: 1, to: 0, side: "melabot" }),
    /already/,
  );
});

test("Dots box capture retains the actor turn and assigns ownership", () => {
  const result = resolveDotsMove({
    edges: "0-1,0-4,1-5",
    boxes: "",
    from: 4,
    to: 5,
    side: "human",
  });
  assert.equal(result.claimed, 1);
  assert.equal(result.nextTurn, "human");
  assert.equal(result.boxes, "0h");
});

test("Dots bot choice is legal and deterministic", () => {
  assert.deepEqual(decideDotsMove(""), [0, 1]);
  assert.deepEqual(decideDotsMove("0-1"), [0, 4]);
});

test("Gilli strike is deterministic and validates player input", () => {
  assert.deepEqual(
    resolveGilliStrike(7n, 3, 55),
    resolveGilliStrike(7n, 3, 55),
  );
  assert.equal(resolveGilliStrike(7n, 3, 55).sound, "crack");
  assert.throws(() => resolveGilliStrike(7n, 4, 55), /legal/);
});
