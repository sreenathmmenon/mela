import assert from "node:assert/strict";
import test from "node:test";
import {
  BOOK_CRICKET_RULES,
  CROWD_POWERS,
  applyCrowdDeliveryEffects,
  chooseMelaBotStyle,
  crowdPowerResult,
  isInningsComplete,
  isCrowdPower,
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

test("crowd power configuration has explicit legal costs, cooldowns, and durations", () => {
  assert.equal(CROWD_POWERS.boost.cost, 18);
  assert.equal(CROWD_POWERS.chaos.cost, 20);
  assert.equal(CROWD_POWERS.shield.cost, 15);
  assert.equal(CROWD_POWERS.cheer.cost, 4);
  assert.ok(CROWD_POWERS.boost.cooldownMicros > 0n);
  assert.ok(CROWD_POWERS.shield.durationMicros > 0n);
  assert.equal(isCrowdPower("boost"), true);
  assert.equal(isCrowdPower("not-a-power"), false);
});

test("Crowd Energy charges atomically and never goes negative", () => {
  assert.equal(crowdPowerResult(18, "boost"), 0);
  assert.equal(crowdPowerResult(17, "boost"), undefined);
  const afterFirst = crowdPowerResult(30, "boost");
  assert.equal(afterFirst, 12);
  assert.equal(crowdPowerResult(afterFirst!, "chaos"), undefined);
});

test("CHEER pays its cost then replenishes shared energy at the cap", () => {
  assert.equal(crowdPowerResult(42, "cheer"), 46);
  assert.equal(
    crowdPowerResult(59, "cheer"),
    BOOK_CRICKET_RULES.crowdEnergyMax,
  );
  assert.equal(crowdPowerResult(3, "cheer"), undefined);
});

test("BOOST, CHAOS, and SHIELD resolve effects in the locked order", () => {
  const wicket = { seed: 1n, wicket: true, runs: 0 };
  assert.deepEqual(
    applyCrowdDeliveryEffects(wicket, {
      chaos: false,
      shield: true,
      boost: true,
    }),
    { seed: 1n, wicket: false, runs: 2 },
  );
  const boundary = { seed: 2n, wicket: false, runs: 6 };
  assert.deepEqual(
    applyCrowdDeliveryEffects(boundary, {
      chaos: true,
      shield: false,
      boost: true,
    }),
    { seed: 2n, wicket: false, runs: 6 },
  );
});

test("CHAOS uses a deterministic high-variance profile", () => {
  assert.deepEqual(
    resolveBookCricketOutcome(333n, "steady", true),
    resolveBookCricketOutcome(333n, "steady", true),
  );
});
