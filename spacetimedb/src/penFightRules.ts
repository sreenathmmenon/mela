export const PEN_FIGHT_RULES = {
  arenaSize: 1000,
  penRadius: 58,
  openingForceMax: 65,
  minForce: 24,
  maxForce: 100,
  maxTurnsPerRound: 8,
  roundsToWin: 2,
  crowdEnergyStart: 42,
  crowdEnergyMax: 60,
  aiWakeDelayMicros: 1_100_000n,
} as const;

export type PenFightPower = "nudge" | "tilt" | "guard" | "cheer";
export type PenSide = "human" | "melabot";

export const PEN_FIGHT_POWERS = {
  nudge: {
    label: "NUDGE",
    cost: 14,
    cooldownMicros: 18_000_000n,
    durationMicros: 0n,
    description: "Adds a small push to your side's next flick.",
  },
  tilt: {
    label: "DESK TILT",
    cost: 18,
    cooldownMicros: 24_000_000n,
    durationMicros: 20_000_000n,
    description:
      "Adds a bounded sideways drift to the chosen side's next flick.",
  },
  guard: {
    label: "GUARD",
    cost: 16,
    cooldownMicros: 25_000_000n,
    durationMicros: 22_000_000n,
    description:
      "Keeps the chosen side just inside the desk on its next edge exit.",
  },
  cheer: {
    label: "CHEER",
    cost: 4,
    cooldownMicros: 10_000_000n,
    durationMicros: 0n,
    description: "Returns 8 shared Crowd Energy, capped at 60.",
  },
} as const;

export interface PenFightEffects {
  nudge: boolean;
  tilt: boolean;
  guard: boolean;
}
export interface PenFightResolution {
  seed: bigint;
  actorX: number;
  actorY: number;
  targetX: number;
  targetY: number;
  hit: boolean;
  actorOut: boolean;
  targetOut: boolean;
  nearEdge: boolean;
}

const clamp = (value: number) =>
  Math.max(0, Math.min(PEN_FIGHT_RULES.arenaSize, Math.round(value)));
const outside = (x: number, y: number) =>
  x < 0 ||
  y < 0 ||
  x > PEN_FIGHT_RULES.arenaSize ||
  y > PEN_FIGHT_RULES.arenaSize;
const distance = (x: number, y: number) => Math.hypot(x - 500, y - 500);

export function isPenFightPower(value: string): value is PenFightPower {
  return value in PEN_FIGHT_POWERS;
}
export function penFightCrowdEnergyResult(
  energy: number,
  power: PenFightPower,
): number | undefined {
  const rule = PEN_FIGHT_POWERS[power];
  if (energy < rule.cost) return undefined;
  return power === "cheer"
    ? Math.min(PEN_FIGHT_RULES.crowdEnergyMax, energy - rule.cost + 8)
    : energy - rule.cost;
}
export function penFightRoundWinner(input: {
  humanX: number;
  humanY: number;
  botX: number;
  botY: number;
  seed: bigint;
}): PenSide {
  const humanSafety = distance(input.humanX, input.humanY);
  const botSafety = distance(input.botX, input.botY);
  if (humanSafety !== botSafety)
    return humanSafety < botSafety ? "human" : "melabot";
  return input.seed % 2n === 0n ? "human" : "melabot";
}
export function resolvePenFlick(input: {
  seed: bigint;
  actorX: number;
  actorY: number;
  targetX: number;
  targetY: number;
  aimX: number;
  aimY: number;
  force: number;
  contact: number;
  effects: PenFightEffects;
}): PenFightResolution {
  const nextSeed = (input.seed * 1664525n + 1013904223n) % 4294967291n;
  const dx = input.aimX - input.actorX;
  const dy = input.aimY - input.actorY;
  const length = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / length;
  const uy = dy / length;
  const variation = Number(nextSeed % 9n) - 4;
  const contactOffset = (input.contact - 50) / 50;
  const power = input.force + (input.effects.nudge ? 12 : 0);
  const tilt = input.effects.tilt ? contactOffset * 20 : 0;
  const travel = power * 1.42;
  let actorX = input.actorX + ux * travel - ux * power * 0.13;
  let actorY =
    input.actorY + uy * travel - uy * power * 0.13 + tilt + variation * 0.35;
  const hit =
    Math.hypot(actorX - input.targetX, actorY - input.targetY) <=
    PEN_FIGHT_RULES.penRadius * 2;
  let targetX = input.targetX;
  let targetY = input.targetY;
  if (hit) {
    targetX += ux * (power * 1.58) - uy * contactOffset * 35;
    targetY += uy * (power * 1.58) + ux * contactOffset * 35 + variation;
  }
  let actorOut = outside(actorX, actorY);
  let targetOut = outside(targetX, targetY);
  if (input.effects.guard) {
    if (actorOut) {
      actorX = clamp(actorX);
      actorY = clamp(actorY);
      actorOut = false;
    }
    if (targetOut) {
      targetX = clamp(targetX);
      targetY = clamp(targetY);
      targetOut = false;
    }
  }
  const nearEdge = [actorX, actorY, targetX, targetY].some(
    (value) => value < 120 || value > 880,
  );
  return {
    seed: nextSeed,
    actorX: clamp(actorX),
    actorY: clamp(actorY),
    targetX: clamp(targetX),
    targetY: clamp(targetY),
    hit,
    actorOut,
    targetOut,
    nearEdge,
  };
}
export function validatePenFlick(input: {
  aimX: number;
  aimY: number;
  force: number;
  contact: number;
  opening: boolean;
}) {
  if (
    ![input.aimX, input.aimY, input.force, input.contact].every(
      Number.isInteger,
    )
  )
    return false;
  if (
    input.aimX < 0 ||
    input.aimX > 1000 ||
    input.aimY < 0 ||
    input.aimY > 1000
  )
    return false;
  if (
    input.contact < 0 ||
    input.contact > 100 ||
    input.force < PEN_FIGHT_RULES.minForce ||
    input.force > PEN_FIGHT_RULES.maxForce
  )
    return false;
  return !input.opening || input.force <= PEN_FIGHT_RULES.openingForceMax;
}
