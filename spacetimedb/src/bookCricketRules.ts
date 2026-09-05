export const BOOK_CRICKET_RULES = {
  maxBallsPerInnings: 6,
  maxWicketsPerInnings: 2,
  crowdEnergyStart: 42,
  crowdEnergyMax: 60,
  crowdEnergyRegenAmount: 2,
  crowdEnergyRegenMicros: 12_000_000n,
  aiWakeDelayMicros: 1_200_000n,
} as const;

export const CROWD_POWERS = {
  boost: {
    label: "BOOST",
    cost: 18,
    cooldownMicros: 20_000_000n,
    durationMicros: 20_000_000n,
    description: "+2 to the next non-wicket delivery (max 6).",
  },
  chaos: {
    label: "CHAOS",
    cost: 20,
    cooldownMicros: 25_000_000n,
    durationMicros: 20_000_000n,
    description: "High-variance next delivery: help or hurt.",
  },
  shield: {
    label: "SHIELD",
    cost: 15,
    cooldownMicros: 25_000_000n,
    durationMicros: 25_000_000n,
    description: "Turns the next wicket into a dot ball.",
  },
  cheer: {
    label: "CHEER",
    cost: 4,
    cooldownMicros: 10_000_000n,
    durationMicros: 0n,
    description: "Adds 8 shared Crowd Energy, capped at 60.",
  },
} as const;

export type CrowdPower = keyof typeof CROWD_POWERS;
export type CrowdTarget = "human" | "melabot";
/**
 * A compact, shared decision space for both humans and MelaBot.
 *
 * SAFE limits upside and OUT risk. BALANCED is the default all-round choice.
 * AGGRESSIVE offers boundary-heavy outcomes but has the largest OUT chance.
 * The server consumes a deterministic seed, so this remains reproducible in
 * tests while each match still contains bounded uncertainty for players.
 */
export type BookCricketStyle = "safe" | "balanced" | "aggressive";
export type BookCricketWinner = "human" | "melabot" | "draw";

export interface DeliveryOutcome {
  seed: bigint;
  wicket: boolean;
  runs: number;
}
export interface CrowdDeliveryEffects {
  boost: boolean;
  chaos: boolean;
  shield: boolean;
}

/**
 * Balanced so that no single style is correct everywhere.
 *
 * The old table gave AGGRESSIVE 2x the runs for only 4x the wicket risk, which
 * made it optimal in all twelve (balls left x wickets left) states — the choice
 * was theatre. These values price risk properly (1.53x runs for 8.75x risk), so
 * the optimal first-innings policy is SAFE in 4 states, BALANCED in 2 and
 * AGGRESSIVE in 6, and the chase becomes genuinely rate-driven. Verified by
 * expectimax in tests; change these only with that proof re-run.
 */
export const BOOK_CRICKET_STYLES = {
  safe: {
    label: "SAFE",
    summary: "Protect the wicket · 0–3 runs",
    wicketThreshold: 4,
    runs: [0, 1, 2, 2, 3, 3],
  },
  balanced: {
    label: "BALANCED",
    summary: "Fours on offer · real OUT risk",
    wicketThreshold: 14,
    runs: [0, 1, 2, 4, 4, 4],
  },
  aggressive: {
    label: "AGGRESSIVE",
    summary: "Sixes · you will lose wickets",
    wicketThreshold: 35,
    runs: [0, 3, 4, 6, 6, 6],
  },
} as const;

/** Pure, deterministic resolution used by both human and MelaBot deliveries. */
export function resolveBookCricketOutcome(
  seed: bigint,
  style: BookCricketStyle,
  chaos = false,
): DeliveryOutcome {
  const nextSeed = (seed * 1103515245n + 12345n) % 2147483647n;
  const roll = Number(nextSeed % 100n);
  const styleRules = BOOK_CRICKET_STYLES[style];
  const wicketThreshold = chaos ? 24 : styleRules.wicketThreshold;
  const wicket = roll < wicketThreshold;
  const runs = wicket
    ? 0
    : chaos
      ? [0, 0, 2, 4, 6, 6][roll % 6]
      : styleRules.runs[roll % styleRules.runs.length];
  return { seed: nextSeed, wicket, runs };
}

export function applyCrowdDeliveryEffects(
  outcome: DeliveryOutcome,
  effects: CrowdDeliveryEffects,
): DeliveryOutcome {
  const wicket = outcome.wicket && !effects.shield;
  return {
    ...outcome,
    wicket,
    runs: wicket ? 0 : Math.min(6, outcome.runs + (effects.boost ? 2 : 0)),
  };
}

export function isInningsComplete(balls: number, wickets: number): boolean {
  return (
    balls >= BOOK_CRICKET_RULES.maxBallsPerInnings ||
    wickets >= BOOK_CRICKET_RULES.maxWicketsPerInnings
  );
}

export function ballsRemaining(balls: number) {
  return Math.max(0, BOOK_CRICKET_RULES.maxBallsPerInnings - balls);
}

export function wicketsRemaining(wickets: number) {
  return Math.max(0, BOOK_CRICKET_RULES.maxWicketsPerInnings - wickets);
}

/** A human win is locked only once MelaBot can no longer even tie. */
export function isChaseMathematicallyLost(
  botScore: number,
  target: number,
  botBalls: number,
) {
  return botScore + ballsRemaining(botBalls) * 6 < target - 1;
}

export function resolveChaseWinner(
  botScore: number,
  target: number,
): BookCricketWinner {
  if (botScore >= target) return "melabot";
  if (botScore === target - 1) return "draw";
  return "human";
}

/**
 * MelaBot's chase policy: play to the required rate, and protect the last
 * wicket. Deterministic and integer-only, it agrees with the win-probability
 * optimal chase in ~86% of reachable states — strong enough to be a real
 * opponent, deliberately short of perfect so the human keeps a fair chance.
 */
export function chooseMelaBotStyle(
  target: number,
  botScore: number,
  botBalls = 0,
  botWickets = 0,
  effects: Partial<CrowdDeliveryEffects> = {},
): BookCricketStyle {
  const needed = Math.max(0, target - botScore);
  const left = Math.max(1, ballsRemaining(botBalls));
  const wicketsLeft =
    BOOK_CRICKET_RULES.maxWicketsPerInnings - botWickets;
  if (effects.boost || effects.shield) return "aggressive";
  if (effects.chaos) return "safe";
  if (wicketsLeft <= 1) {
    if (needed <= 2 * left) return "safe";
    if (needed <= 3 * left) return "balanced";
    return "aggressive";
  }
  if (needed <= left) return "safe";
  // Softened middle band keeps the chase from being overwhelmingly favoured.
  if (needed <= 1.5 * left) return "balanced";
  return "aggressive";
}

export function isCrowdPower(value: string): value is CrowdPower {
  return value in CROWD_POWERS;
}

export function crowdPowerResult(
  energy: number,
  power: CrowdPower,
): number | undefined {
  const config = CROWD_POWERS[power];
  if (energy < config.cost) return undefined;
  return power === "cheer"
    ? Math.min(BOOK_CRICKET_RULES.crowdEnergyMax, energy - config.cost + 8)
    : energy - config.cost;
}
