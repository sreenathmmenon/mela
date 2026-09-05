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
export type BookCricketStyle = "steady" | "attack";
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

/** Pure, deterministic resolution used by both human and MelaBot deliveries. */
export function resolveBookCricketOutcome(
  seed: bigint,
  style: BookCricketStyle,
  chaos = false,
): DeliveryOutcome {
  const nextSeed = (seed * 1103515245n + 12345n) % 2147483647n;
  const roll = Number(nextSeed % 100n);
  const wicketThreshold = chaos ? 24 : style === "attack" ? 18 : 7;
  const wicket = roll < wicketThreshold;
  const runs = wicket
    ? 0
    : chaos
      ? [0, 0, 2, 4, 6, 6][roll % 6]
      : style === "attack"
        ? [0, 2, 4, 4, 6, 6][roll % 6]
        : [0, 1, 1, 2, 3, 4][roll % 6];
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

export function resolveChaseWinner(
  botScore: number,
  target: number,
): BookCricketWinner {
  if (botScore >= target) return "melabot";
  if (botScore === target - 1) return "draw";
  return "human";
}

export function chooseMelaBotStyle(
  target: number,
  botScore: number,
): BookCricketStyle {
  return target - botScore > 6 ? "attack" : "steady";
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
