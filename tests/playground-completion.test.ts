import test from "node:test";
import assert from "node:assert/strict";
import {
  decideDotsMove,
  resolveDotsMove,
} from "../spacetimedb/src/dotsBoxesRules";
import {
  resolveGilliStrike,
  gilliTimingAt,
  GILLI_FLIGHT_MICROS,
} from "../spacetimedb/src/gilliDandaRules";
import {
  crowdPurchase,
  playgroundPower,
} from "../spacetimedb/src/playgroundCrowdRules";
test("Dots completes exactly nine unique boxes in 24 moves using the shared human/AI path", () => {
  let edges = "",
    boxes = "",
    side: "human" | "melabot" = "human";
  for (let i = 0; i < 24; i++) {
    const [from, to] = decideDotsMove(edges);
    const next = resolveDotsMove({ edges, boxes, side, from, to });
    edges = next.edges;
    boxes = next.boxes;
    side = next.nextTurn;
    assert.equal(next.complete, i === 23);
    if (i === 23) assert.ok(next.winner);
  }
  assert.equal(new Set(boxes.split(",").map((b) => b.slice(0, -1))).size, 9);
  assert.throws(() => decideDotsMove(edges));
});
test("one edge captures two boxes while old ownership cannot be counted again", () => {
  const next = resolveDotsMove({
    edges: "0-1,0-4,4-5,1-2,2-6,5-6",
    boxes: "",
    side: "human",
    from: 1,
    to: 5,
  });
  assert.equal(next.claimed, 2);
  assert.equal(next.boxes, "0h,1h");
  const after = resolveDotsMove({ ...next, side: "melabot", from: 2, to: 3 });
  assert.equal(after.claimed, 0);
  assert.equal(after.boxes, next.boxes);
});
test("Gilli strong swings trade forgiveness for distance; server elapsed time validates contact", () => {
  assert.ok(
    resolveGilliStrike(10n, 3, 55).distance >
      resolveGilliStrike(10n, 1, 55).distance,
  );
  assert.ok(
    resolveGilliStrike(10n, 1, 80).distance >
      resolveGilliStrike(10n, 3, 80).distance,
  );
  assert.equal(gilliTimingAt(1320000n), 55);
  assert.throws(() => gilliTimingAt(-1n));
  assert.throws(() => gilliTimingAt(GILLI_FLIGHT_MICROS + 1n));
});
test("crowd transactions cannot double spend, stack or bypass cooldown", () => {
  let energy = crowdPurchase(30, 60, 0n, 0n, "chain_break", false);
  assert.equal(energy, 14);
  assert.throws(() => crowdPurchase(energy, 60, 0n, 0n, "chain_break", false));
  assert.throws(() => crowdPurchase(60, 60, 2n, 1n, "rhythm", false));
  assert.throws(() => crowdPurchase(60, 60, 0n, 1n, "rhythm", true));
  assert.equal(crowdPurchase(59, 60, 0n, 1n, "cheer", false), 60);
  assert.throws(() => playgroundPower("dots_boxes", "heckle"));
});
