import { sweepPens } from "./penGeometry";
export const PEN_FIGHT_RULES = {
  arenaSize: 1000,
  /** Legacy presentation size; the 3D collision footprint lives in penGeometry. */
  penRadius: 58,
  /** AI approach-distance heuristic, not a collision boundary. */
  contactRadius: 66,
  openingForceMax: 66,
  minForce: 20,
  maxForce: 100,
  maxTurnsPerRound: 8,
  roundsToWin: 2,
  crowdEnergyStart: 42,
  crowdEnergyMax: 60,
  aiWakeDelayMicros: 1_100_000n,
} as const;

/**
 * Flick model.
 *
 * A pen travels `travelBase + travelPerForce * force`, so a full-strength flick
 * crosses the desk and a soft one falls short — force is the core risk dial.
 * Whatever travel is left after contact is transferred to the struck pen, which
 * is why hitting hard near an edge knocks the opponent off but can carry you
 * off too. `spinMax` is how much the contact point can bend the struck pen away
 * from head-on. The two jitter terms keep outcomes bounded but not perfectly
 * predictable, without ever making a well-aimed flick unfair.
 */
const PHYSICS = {
  travelBase: 30,
  travelPerForce: 8.2,
  transferBase: 0.92,
  transferPerForce: 0.0042,
  actorRetain: 0.12,
  followThrough: 0.4,
  actorDeflect: 0.85,
  spinMax: 0.85,
  varPct: 0.045,
  driftPct: 0.055,
  nudgeBonus: 10,
  nudgeCap: 112,
  tiltDrift: 0.06,
} as const;

export type PenFightPower = "nudge" | "tilt" | "guard" | "cheer";
export type PenSide = "human" | "melabot";

export const PEN_FIGHT_POWERS = {
  nudge: {
    label: "NUDGE",
    cost: 14,
    cooldownMicros: 18_000_000n,
    // A zero duration meant the expiry sweep was scheduled for the moment the
    // power was bought, so a NUDGE could be deleted before the player ever
    // flicked — 14 Energy spent on nothing. It waits like the others now.
    durationMicros: 20_000_000n,
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
    // Guard now also saves a pen from its own follow-through, so it costs more.
    label: "GUARD",
    cost: 20,
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
  motion: {
    contactX: number;
    contactY: number;
    actorX: number;
    actorY: number;
    targetX: number;
    targetY: number;
  };
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
/**
 * How much desk a pen still has under it: the distance to the nearest edge.
 * This is what "safer position" means on a real desk — a pen teetering on the
 * rim is losing even if it sits dead centre on one axis.
 */
const edgeMargin = (x: number, y: number) =>
  Math.min(x, y, PEN_FIGHT_RULES.arenaSize - x, PEN_FIGHT_RULES.arenaSize - y);

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
  // The pen with more desk under it survives the round.
  const humanSafety = edgeMargin(input.humanX, input.humanY);
  const botSafety = edgeMargin(input.botX, input.botY);
  if (humanSafety !== botSafety)
    return humanSafety > botSafety ? "human" : "melabot";
  return input.seed % 2n === 0n ? "human" : "melabot";
}

const lcg = (seed: bigint) => (seed * 1664525n + 1013904223n) % 4294967291n;

/** How far a flick of this strength carries, before jitter. */
export function penTravelForForce(force: number) {
  return PHYSICS.travelBase + PHYSICS.travelPerForce * force;
}

export function resolvePenFlick(input: {
  actorSide?: PenSide;
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
  const s1 = lcg(input.seed);
  const s2 = lcg(s1);

  // Aim direction, with a guard: a zero-length aim would otherwise produce NaN
  // and silently clamp to a corner.
  let dx = input.aimX - input.actorX;
  let dy = input.aimY - input.actorY;
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) < 1) {
    dx = input.targetX - input.actorX;
    dy = input.targetY - input.actorY;
  }
  if (Math.hypot(dx, dy) < 1) {
    dx = 1;
    dy = 0;
  }
  const aimLen = Math.hypot(dx, dy);
  const ux = dx / aimLen;
  const uy = dy / aimLen;

  const power = Math.min(
    PHYSICS.nudgeCap,
    input.force + (input.effects.nudge ? PHYSICS.nudgeBonus : 0),
  );
  const jitter = (Number(s1 % 2001n) / 1000 - 1) * PHYSICS.varPct;
  const drift =
    (Number(s2 % 2001n) / 1000 - 1) * PHYSICS.driftPct +
    // Desk tilt must also affect centred flicks (the player's gesture uses
    // contact=50). Direction is seeded, bounded, and shared by both actors.
    (input.effects.tilt ? (s2 % 2n === 0n ? 1 : -1) * PHYSICS.tiltDrift : 0);

  // Lateral drift bends the actual line of travel away from the aim.
  let vx = ux - uy * drift;
  let vy = uy + ux * drift;
  const vLen = Math.max(1e-6, Math.hypot(vx, vy));
  vx /= vLen;
  vy /= vLen;

  const travel = penTravelForForce(power) * (1 + jitter);

  // Sweep the two full pen bodies, using the renderer's mirrored orientations.
  const collision = sweepPens(
    { x: input.actorX, y: input.actorY },
    { x: input.targetX, y: input.targetY },
    { x: vx, y: vy },
    travel,
    input.actorSide ?? "human",
  );
  const hit = Boolean(collision);

  let actorX = input.actorX + vx * travel;
  let actorY = input.actorY + vy * travel;
  let targetX = input.targetX;
  let targetY = input.targetY;
  let contactX = actorX;
  let contactY = actorY;

  if (collision) {
    const contactT = collision.distance;
    const hitX = input.actorX + vx * contactT;
    const hitY = input.actorY + vy * contactT;
    contactX = hitX;
    contactY = hitY;
    const remaining = Math.max(0, travel - contactT);

    // Normal points from the touch point into the struck pen.
    let nx = collision.normal.x;
    let ny = collision.normal.y;
    const nLen = Math.max(1e-6, Math.hypot(nx, ny));
    nx /= nLen;
    ny /= nLen;
    const tanX = -ny;
    const tanY = nx;

    const spin = Math.max(
      -1,
      Math.min(
        1,
        vx * tanX + vy * tanY + ((input.contact - 50) / 50) * PHYSICS.spinMax,
      ),
    );
    const straight = Math.sqrt(Math.max(0, 1 - spin * spin));
    const transfer = PHYSICS.transferBase + PHYSICS.transferPerForce * power;

    targetX += (nx * straight + tanX * spin) * remaining * transfer;
    targetY += (ny * straight + tanY * spin) * remaining * transfer;

    // A square hit stops you dead behind the target; a glancing one carries you
    // on past it. This is what makes a hard hit near an edge genuinely risky.
    const squareness = Math.abs(straight);
    const deflect = (1 - squareness) * PHYSICS.actorDeflect;
    let awayX = vx - nx * deflect - tanX * spin * deflect;
    let awayY = vy - ny * deflect - tanY * spin * deflect;
    const awayLen = Math.max(1e-6, Math.hypot(awayX, awayY));
    awayX /= awayLen;
    awayY /= awayLen;
    const carry =
      remaining * (PHYSICS.actorRetain + PHYSICS.followThrough * squareness);
    actorX = hitX + awayX * carry;
    actorY = hitY + awayY * carry;
  }

  // Out is decided on raw floats: clamping first would erase the condition.
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
    motion: { contactX, contactY, actorX, actorY, targetX, targetY },
    seed: s2,
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
