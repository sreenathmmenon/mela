import assert from "node:assert/strict";
import test from "node:test";
import {
  BOOK_CRICKET_RULES,
  BOOK_CRICKET_STYLES,
  CROWD_POWERS,
  applyCrowdDeliveryEffects,
  chooseMelaBotStyle,
  crowdPowerResult,
  isInningsComplete,
  isChaseMathematicallyLost,
  isCrowdPower,
  resolveBookCricketOutcome,
  resolveChaseWinner,
} from "../spacetimedb/src/bookCricketRules";
import {
  DeterministicAIProvider,
  shouldExecuteScheduledAIWake,
} from "../spacetimedb/src/aiProvider";
import {
  crowdInfluenceForPower,
  levelForProgress,
  nextBookCricketRecord,
  notableCrowdMoment,
  playerProgressAfterMatch,
  spectatorProgressAfterMatch,
} from "../spacetimedb/src/melaMemory";

test("delivery scoring is deterministic and bounded by each selected strategy", () => {
  const first = resolveBookCricketOutcome(18n, "balanced");
  const second = resolveBookCricketOutcome(18n, "balanced");
  assert.deepEqual(first, second);
  for (const style of Object.keys(BOOK_CRICKET_STYLES) as Array<
    keyof typeof BOOK_CRICKET_STYLES
  >) {
    for (let seed = 1n; seed < 120n; seed += 1n) {
      const outcome = resolveBookCricketOutcome(seed, style);
      assert.ok(
        outcome.wicket ||
          BOOK_CRICKET_STYLES[style].runs.includes(outcome.runs),
      );
    }
  }
});

test("wicket outcomes resolve as zero runs", () => {
  let wicket: ReturnType<typeof resolveBookCricketOutcome> | undefined;
  for (let seed = 1n; seed < 200n; seed += 1n) {
    const result = resolveBookCricketOutcome(seed, "aggressive");
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

test("MelaBot choice is deterministic and only produces legal shared strategies", () => {
  assert.equal(chooseMelaBotStyle(30, 2), "aggressive");
  assert.equal(chooseMelaBotStyle(5, 2), "safe");
  assert.match(chooseMelaBotStyle(30, 1), /^(safe|balanced|aggressive)$/);
  assert.equal(chooseMelaBotStyle(12, 2, 4, 0, { chaos: true }), "safe");
});

test("human and MelaBot consume the same pure delivery resolution path", () => {
  const seed = 123456n;
  assert.deepEqual(
    resolveBookCricketOutcome(seed, "aggressive"),
    resolveBookCricketOutcome(seed, "aggressive"),
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
    resolveBookCricketOutcome(333n, "balanced", true),
    resolveBookCricketOutcome(333n, "balanced", true),
  );
});

test("DeterministicAIProvider returns the same legal proposal for identical state", () => {
  const provider = new DeterministicAIProvider();
  const observation = {
    target: 16,
    botScore: 4,
    botBalls: 3,
    botWickets: 1,
    effects: {},
  };
  assert.deepEqual(
    provider.decideAction(observation),
    provider.decideAction(observation),
  );
  assert.match(
    provider.decideAction(observation).style,
    /^(safe|balanced|aggressive)$/,
  );
});

test("scheduled AI wakes only execute for the exact active bot turn", () => {
  assert.equal(
    shouldExecuteScheduledAIWake({
      matchStatus: "active",
      turn: "bot",
      botBalls: 2,
      expectedBotBalls: 2,
    }),
    true,
  );
  assert.equal(
    shouldExecuteScheduledAIWake({
      matchStatus: "complete",
      turn: "bot",
      botBalls: 2,
      expectedBotBalls: 2,
    }),
    false,
  );
  assert.equal(
    shouldExecuteScheduledAIWake({
      matchStatus: "active",
      turn: "human",
      botBalls: 2,
      expectedBotBalls: 2,
    }),
    false,
  );
  assert.equal(
    shouldExecuteScheduledAIWake({
      matchStatus: "active",
      turn: "bot",
      botBalls: 3,
      expectedBotBalls: 2,
    }),
    false,
  );
});

test("a chase ends early only once MelaBot cannot even tie", () => {
  assert.equal(isChaseMathematicallyLost(5, 20, 5), true);
  assert.equal(isChaseMathematicallyLost(13, 20, 5), false);
  assert.equal(isChaseMathematicallyLost(18, 20, 5), false);
});

test("safe, balanced, and aggressive make the risk trade-off explicit", () => {
  assert.ok(
    BOOK_CRICKET_STYLES.safe.wicketThreshold <
      BOOK_CRICKET_STYLES.balanced.wicketThreshold,
  );
  assert.ok(
    BOOK_CRICKET_STYLES.balanced.wicketThreshold <
      BOOK_CRICKET_STYLES.aggressive.wicketThreshold,
  );
  assert.equal(Math.max(...BOOK_CRICKET_STYLES.safe.runs), 3);
  assert.equal(Math.max(...BOOK_CRICKET_STYLES.balanced.runs), 4);
  assert.equal(Math.max(...BOOK_CRICKET_STYLES.aggressive.runs), 6);
});

test("Mela progression rewards player participation, wins, and crowd presence separately", () => {
  assert.deepEqual(playerProgressAfterMatch(20, false), {
    progressPoints: 30,
    melaLevel: 2,
  });
  assert.deepEqual(playerProgressAfterMatch(20, true), {
    progressPoints: 35,
    melaLevel: 2,
  });
  assert.deepEqual(spectatorProgressAfterMatch(26), {
    progressPoints: 30,
    melaLevel: 2,
  });
  assert.equal(levelForProgress(59), 2);
  assert.equal(crowdInfluenceForPower("chaos"), 3);
});

test("Book Cricket skill remains a game-specific record", () => {
  assert.deepEqual(
    nextBookCricketRecord(
      { matchesPlayed: 2, wins: 1, runsScored: 11, highestScore: 7 },
      9,
      true,
    ),
    { matchesPlayed: 3, wins: 2, runsScored: 20, highestScore: 9 },
  );
});

test("durable memory tells a crowd story without depending on transient events", () => {
  assert.equal(
    notableCrowdMoment(0, "", ""),
    "The crowd stayed close for every ball.",
  );
  assert.equal(
    notableCrowdMoment(2, "Asha", "boost"),
    "Asha made the crowd matter with BOOST.",
  );
});
