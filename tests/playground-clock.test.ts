import test from "node:test";
import assert from "node:assert/strict";
import {
  clockSample,
  estimatedServerMs,
  flightProgress,
} from "../src/playgroundClock";

test("clock sample anchors server time to request midpoint, not device wall clock", () => {
  const sample = clockSample(1_800_000_000_000_000n, 100, 300);
  assert.equal(sample.roundTrip, 200);
  assert.equal(estimatedServerMs(sample, 500), 1_800_000_000_300);
  assert.equal(estimatedServerMs(sample, 100), sample.serverMs);
});
test("flight projection clamps past/future and remains independent of a wrong phone clock", () => {
  assert.equal(flightProgress(1000, 2_000_000n), 0);
  assert.equal(flightProgress(3320, 2_000_000n), 0.55);
  assert.equal(flightProgress(6000, 2_000_000n), 1);
  assert.throws(() => clockSample(1n, 10, 9));
  assert.throws(() => clockSample(1n, NaN, 9));
});
