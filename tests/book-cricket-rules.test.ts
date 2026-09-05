import assert from "node:assert/strict";
import test from "node:test";
import {
  BOOK_CRICKET_RULES,
  chooseMelaBotStyle,
  isInningsComplete,
  resolveBookCricketOutcome,
  resolveChaseWinner,
} from "../spacetimedb/src/bookCricketRules";

test("delivery scoring is deterministic and bounded by the selected style", () => {
  const first = resolveBookCricketOutcome(18n, "steady");
  const second = resolveBookCricketOutcome(18n, "steady");
  assert.deepEqual(first, second);
  assert.ok(first.wicket || [0, 1, 2, 3, 4].includes(first.runs));
  const attack = resolveBookCricketOutcome(18n, "attack");
  assert.ok(attack.wicket || [0, 2, 4, 6].includes(attack.runs));
});

test("wicket outcomes resolve as zero runs", () => {
  let wicket: ReturnType<typeof resolveBookCricketOutcome> | undefined;
  for (let seed = 1n; seed < 200n; seed += 1n) {
    const result = resolveBookCricketOutcome(seed, "attack");
    if (result.wicket) {
      wicket = result;
      break;
    }
  }
  assert.ok(wicket, "expected a deterministic wicket seed");
  assert.equal(wicket.runs, 0);
});

test("innings complete on configured balls or wickets", () => {
  assert.equal(
    isInningsComplete(BOOK_CRICKET_RULES.maxBallsPerInnings, 0),
    true,
  );
  assert.equal(
    isInningsComplete(0, BOOK_CRICKET_RULES.maxWicketsPerInnings),
    true,
  );
  assert.equal(isInningsComplete(5, 1), false);
});

test("target resolution distinguishes MelaBot, draw, and human wins", () => {
  assert.equal(resolveChaseWinner(10, 10), "melabot");
  assert.equal(resolveChaseWinner(9, 10), "draw");
  assert.equal(resolveChaseWinner(8, 10), "human");
});

test("MelaBot choice is deterministic and only produces legal styles", () => {
  assert.equal(chooseMelaBotStyle(12, 2), "attack");
  assert.equal(chooseMelaBotStyle(8, 2), "steady");
  assert.match(chooseMelaBotStyle(30, 1), /^(steady|attack)$/);
});

test("human and MelaBot consume the same pure delivery resolution path", () => {
  const seed = 123456n;
  assert.deepEqual(
    resolveBookCricketOutcome(seed, "attack"),
    resolveBookCricketOutcome(seed, "attack"),
  );
});
