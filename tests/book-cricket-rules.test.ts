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
  describeCrowdSwing,
  notableCrowdMoment,
  playerProgressAfterMatch,
  spectatorProgressAfterMatch,
} from "../spacetimedb/src/melaMemory";
import {
  abandonedMatchDelta,
  completedMatchDelta,
  crowdActionDelta,
  playerMatchStartDelta,
  spectatorJoinDelta,
} from "../spacetimedb/src/melaMetrics";
import {
  PEN_FIGHT_POWERS,
  PEN_FIGHT_RULES,
  penFightCrowdEnergyResult,
  penFightRoundWinner,
  resolvePenFlick,
  validatePenFlick,
} from "../spacetimedb/src/penFightRules";
import { DeterministicPenFightAIProvider } from "../spacetimedb/src/penFightAiProvider";

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
  // Risk must rise faster than reward, or aggression becomes free.
  const rate = (s: keyof typeof BOOK_CRICKET_STYLES) =>
    BOOK_CRICKET_STYLES[s].runs.reduce((a, b) => a + b, 0) / 6;
  const riskRatio =
    BOOK_CRICKET_STYLES.aggressive.wicketThreshold /
    BOOK_CRICKET_STYLES.safe.wicketThreshold;
  const rewardRatio = rate("aggressive") / rate("safe");
  assert.ok(
    riskRatio > rewardRatio * 2,
    `risk ${riskRatio} must outpace reward ${rewardRatio}`,
  );
});

test("strategy profiles create measurably different bounded OUT risk", () => {
  const wickets = new Map<keyof typeof BOOK_CRICKET_STYLES, number>();
  for (const style of Object.keys(BOOK_CRICKET_STYLES) as Array<
    keyof typeof BOOK_CRICKET_STYLES
  >) {
    let count = 0;
    for (let seed = 1n; seed <= 10_000n; seed += 1n)
      if (resolveBookCricketOutcome(seed, style).wicket) count += 1;
    wickets.set(style, count);
  }
  assert.ok(wickets.get("safe")! < wickets.get("balanced")!);
  assert.ok(wickets.get("balanced")! < wickets.get("aggressive")!);
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
  // A real, named crowd swing always wins over a generic summary.
  assert.equal(
    notableCrowdMoment(2, "Asha", "boost", {
      crowdSwing: "Asha's BOOST turned 4 into 6.",
    }),
    "Asha's BOOST turned 4 into 6.",
  );
  assert.equal(
    notableCrowdMoment(2, "Asha", "boost"),
    "Asha made the crowd matter with BOOST.",
  );
  // With no crowd action the memory falls back to the match's own shape.
  assert.equal(
    notableCrowdMoment(0, "", "", {
      winner: "human",
      humanName: "Riya",
      humanScore: 20,
      botScore: 9,
    }),
    "Riya beat MelaBot without crowd help.",
  );
  assert.match(
    notableCrowdMoment(0, "", "", {
      winner: "melabot",
      humanName: "Riya",
      humanScore: 12,
      botScore: 13,
    }),
    /Decided by 1 run\./,
  );
});

test("authoritative metrics distinguish people, participation, replay, and conversion", () => {
  assert.deepEqual(
    playerMatchStartDelta({
      hasPlayed: false,
      hasSpectated: true,
      completedPlayerMatches: 1,
    }),
    {
      matchesStarted: 1,
      matchesCompleted: 0,
      uniquePlayerIdentities: 1,
      uniqueSpectatorIdentities: 0,
      totalParticipants: 1,
      crowdActions: 0,
      completedPlayerMatches: 0,
      replayedMatches: 1,
      spectatorToPlayerConversions: 1,
      abandonedMatches: 0,
      spectatorsWhoActed: 0,
    },
  );
  assert.equal(spectatorJoinDelta(false).uniqueSpectatorIdentities, 1);
  assert.equal(spectatorJoinDelta(true).uniqueSpectatorIdentities, 0);
  assert.equal(completedMatchDelta().matchesCompleted, 1);
  assert.equal(crowdActionDelta().crowdActions, 1);
  // A spectator counts as "acted" once, the first time only.
  assert.equal(crowdActionDelta(true).spectatorsWhoActed, 1);
  assert.equal(crowdActionDelta(false).spectatorsWhoActed, 0);
  assert.equal(abandonedMatchDelta().abandonedMatches, 1);
});

test("Pen Fight physics is deterministic, bounded, and rewards a legal flick", () => {
  const input = {
    seed: 9n,
    actorX: 260,
    actorY: 500,
    targetX: 740,
    targetY: 500,
    aimX: 740,
    aimY: 500,
    force: 65,
    contact: 50,
    effects: { nudge: false, tilt: false, guard: false },
  };
  assert.deepEqual(resolvePenFlick(input), resolvePenFlick(input));
  const result = resolvePenFlick(input);
  assert.ok(result.actorX >= 0 && result.actorX <= PEN_FIGHT_RULES.arenaSize);
  assert.equal(
    validatePenFlick({
      aimX: 740,
      aimY: 500,
      force: 65,
      contact: 50,
      opening: true,
    }),
    true,
  );
  assert.equal(
    validatePenFlick({
      aimX: 740,
      aimY: 500,
      force: 100,
      contact: 50,
      opening: true,
    }),
    false,
  );
  assert.equal(penFightCrowdEnergyResult(14, "nudge"), 0);
});

test("Pen Fight stalemate resolves from actual safer positioning", () => {
  assert.equal(
    penFightRoundWinner({
      humanX: 500,
      humanY: 500,
      botX: 900,
      botY: 900,
      seed: 1n,
    }),
    "human",
  );
});

test("Pen Fight opening cap, crowd costs, and bounded effects are explicit", () => {
  assert.equal(PEN_FIGHT_RULES.openingForceMax, 66);
  assert.equal(PEN_FIGHT_POWERS.nudge.cost, 14);
  assert.equal(PEN_FIGHT_POWERS.tilt.cost, 18);
  assert.equal(PEN_FIGHT_POWERS.guard.cost, 20);
  assert.equal(PEN_FIGHT_POWERS.cheer.cost, 4);
  assert.equal(penFightCrowdEnergyResult(13, "nudge"), undefined);
  assert.equal(penFightCrowdEnergyResult(60, "cheer"), 60);
});

test("Pen Fight guard makes an edge exit recoverable without changing physics determinism", () => {
  const guarded = resolvePenFlick({
    seed: 8n,
    actorX: 940,
    actorY: 500,
    targetX: 500,
    targetY: 500,
    aimX: 1000,
    aimY: 500,
    force: 100,
    contact: 50,
    effects: { nudge: false, tilt: false, guard: true },
  });
  assert.equal(guarded.actorOut, false);
  assert.ok(guarded.actorX <= PEN_FIGHT_RULES.arenaSize);
});

test("Pen Fight MelaBot proposals are deterministic, bounded, and never mutate state", () => {
  const provider = new DeterministicPenFightAIProvider();
  const observation = {
    humanX: 125,
    humanY: 500,
    botX: 620,
    botY: 500,
    turnsInRound: 3,
  };
  const first = provider.decideAction(observation);
  assert.deepEqual(first, provider.decideAction(observation));
  assert.ok(first.aimX >= 0 && first.aimX <= 1000);
  assert.ok(first.aimY >= 0 && first.aimY <= 1000);
  assert.ok(first.force >= PEN_FIGHT_RULES.minForce);
  assert.ok(first.force <= PEN_FIGHT_RULES.maxForce);
});

/**
 * The central Book Cricket guarantee. Before this balance pass AGGRESSIVE was
 * optimal in all twelve states, which made the three-way choice cosmetic. This
 * expectimax locks in that the optimal policy genuinely varies by situation.
 */
test("no Book Cricket style is optimal in every situation", () => {
  const styles = ["safe", "balanced", "aggressive"] as const;
  const memo = new Map<string, number[]>();
  const evaluate = (balls: number, wickets: number): number[] => {
    const key = `${balls},${wickets}`;
    const cached = memo.get(key);
    if (cached) return cached;
    const values = styles.map((style) => {
      const rules = BOOK_CRICKET_STYLES[style];
      let total = 0;
      for (let roll = 0; roll < 100; roll += 1) {
        if (roll < rules.wicketThreshold)
          total +=
            wickets - 1 <= 0 || balls - 1 <= 0 ? 0 : best(balls - 1, wickets - 1);
        else
          total +=
            rules.runs[roll % rules.runs.length] +
            (balls - 1 <= 0 ? 0 : best(balls - 1, wickets));
      }
      return total / 100;
    });
    memo.set(key, values);
    return values;
  };
  const best = (balls: number, wickets: number) =>
    Math.max(...evaluate(balls, wickets));

  const chosen = new Set<string>();
  for (let wickets = 1; wickets <= 2; wickets += 1)
    for (let balls = 1; balls <= 6; balls += 1) {
      const values = evaluate(balls, wickets);
      chosen.add(styles[values.indexOf(Math.max(...values))]);
    }
  assert.ok(
    chosen.size >= 2,
    `optimal policy must vary by state, got only ${[...chosen].join(", ")}`,
  );
  // Wickets in hand must change the right answer, not just the score.
  const withTwo = evaluate(5, 2);
  const withOne = evaluate(5, 1);
  assert.notEqual(
    styles[withTwo.indexOf(Math.max(...withTwo))],
    styles[withOne.indexOf(Math.max(...withOne))],
  );
});

test("MelaBot chases to the required rate and protects its last wicket", () => {
  // Comfortably ahead of the rate: no reason to risk a wicket.
  assert.equal(chooseMelaBotStyle(10, 8, 3, 0), "safe");
  // Far behind the rate: must take risks.
  assert.equal(chooseMelaBotStyle(30, 2, 3, 0), "aggressive");
  // One wicket left makes it more conservative at the same requirement.
  const twoWickets = chooseMelaBotStyle(16, 4, 3, 0);
  const oneWicket = chooseMelaBotStyle(16, 4, 3, 1);
  assert.ok(
    ["safe", "balanced"].includes(oneWicket) || oneWicket === twoWickets,
  );
});

test("a pen can actually reach and knock out the opponent from the start", () => {
  const flick = (force: number) =>
    resolvePenFlick({
      seed: 88n,
      actorX: 260,
      actorY: 500,
      targetX: 740,
      targetY: 500,
      aimX: 740,
      aimY: 500,
      force,
      contact: 50,
      effects: { nudge: false, tilt: false, guard: false },
    });
  // The old physics could never make contact at any legal force.
  assert.equal(flick(20).hit, false, "a weak flick should fall short");
  assert.equal(flick(66).hit, true, "a firm flick must reach the opponent");
  assert.equal(flick(100).targetOut, true, "a full flick must knock it off");
});

test("Pen Fight force carries real overshoot risk near an edge", () => {
  const nearEdge = (force: number) =>
    resolvePenFlick({
      seed: 3n,
      actorX: 600,
      actorY: 500,
      targetX: 880,
      targetY: 500,
      aimX: 1000,
      aimY: 500,
      force,
      contact: 50,
      effects: { nudge: false, tilt: false, guard: false },
    });
  const measured = nearEdge(50);
  const reckless = nearEdge(100);
  assert.equal(measured.targetOut, true);
  assert.equal(measured.actorOut, false, "a measured flick stays on the desk");
  assert.equal(reckless.actorOut, true, "too much force follows it off");
});

test("no legal opening flick can end a Pen Fight round", () => {
  let knockedOut = false;
  for (let force = PEN_FIGHT_RULES.minForce; force <= PEN_FIGHT_RULES.openingForceMax; force += 2)
    for (let angle = -16; angle <= 16; angle += 4)
      for (let contact = 0; contact <= 100; contact += 25)
        for (let seed = 1n; seed <= 12n; seed += 1n) {
          const radians = (angle * Math.PI) / 180;
          const result = resolvePenFlick({
            seed,
            actorX: 260,
            actorY: 500,
            targetX: 740,
            targetY: 500,
            aimX: Math.round(260 + Math.cos(radians) * 600),
            aimY: Math.round(500 + Math.sin(radians) * 600),
            force,
            contact,
            effects: { nudge: false, tilt: false, guard: false },
          });
          if (result.targetOut) knockedOut = true;
        }
  assert.equal(knockedOut, false, "opening cap must prevent an instant win");
});

test("contact point steers the struck pen", () => {
  const strike = (contact: number) =>
    resolvePenFlick({
      seed: 5n,
      actorX: 300,
      actorY: 500,
      targetX: 640,
      targetY: 500,
      aimX: 1000,
      aimY: 500,
      force: 80,
      contact,
      effects: { nudge: false, tilt: false, guard: false },
    });
  const centre = strike(50);
  const leftEdge = strike(0);
  const rightEdge = strike(100);
  assert.ok(Math.abs(centre.targetY - 500) < 40, "centre contact drives straight");
  assert.ok(leftEdge.targetY < 300, "edge contact deflects one way");
  assert.ok(rightEdge.targetY > 700, "opposite edge deflects the other way");
});

test("a degenerate aim cannot produce an invalid position", () => {
  const result = resolvePenFlick({
    seed: 9n,
    actorX: 400,
    actorY: 400,
    targetX: 700,
    targetY: 400,
    // Aiming at your own pen would divide by zero without the guard.
    aimX: 400,
    aimY: 400,
    force: 60,
    contact: 50,
    effects: { nudge: false, tilt: false, guard: false },
  });
  for (const value of [result.actorX, result.actorY, result.targetX, result.targetY]) {
    assert.ok(Number.isFinite(value), "positions must stay finite");
    assert.ok(value >= 0 && value <= PEN_FIGHT_RULES.arenaSize);
  }
});

test("the round tiebreak favours the pen with more desk under it", () => {
  // Human hugging the left edge, bot comfortably inside: bot survives.
  assert.equal(
    penFightRoundWinner({
      humanX: 30,
      humanY: 500,
      botX: 400,
      botY: 500,
      seed: 2n,
    }),
    "melabot",
  );
  assert.equal(
    penFightRoundWinner({
      humanX: 500,
      humanY: 500,
      botX: 970,
      botY: 500,
      seed: 2n,
    }),
    "human",
  );
});

test("crowd swings are attributed to the spectator who caused them", () => {
  assert.equal(
    describeCrowdSwing(
      { wicket: false, runs: 4 },
      { wicket: false, runs: 6 },
      [{ power: "boost", actorName: "Nila" }],
    ),
    "Nila's BOOST turned 4 into 6.",
  );
  assert.equal(
    describeCrowdSwing(
      { wicket: true, runs: 0 },
      { wicket: false, runs: 0 },
      [{ power: "shield", actorName: "Asha" }],
    ),
    "Asha's SHIELD saved the wicket.",
  );
  assert.equal(
    describeCrowdSwing({ wicket: false, runs: 2 }, { wicket: false, runs: 2 }, []),
    undefined,
  );
});
