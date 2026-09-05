/** Versioned transient presentation data, emitted only after rule resolution.
 * Never an input to scoring, collision detection or AI decisions. */
export const PEN_MOTION_PREFIX = "@pen-motion/1:";
export interface DeskPoint {
  x: number;
  y: number;
}
export interface PenMotion {
  matchId: string;
  sequence: string;
  actor: "human" | "melabot";
  from: DeskPoint;
  targetFrom: DeskPoint;
  contact: DeskPoint;
  end: DeskPoint;
  targetEnd: DeskPoint;
  hit: boolean;
  actorOut: boolean;
  targetOut: boolean;
  guarded: boolean;
}
export function readPenMotion(message: string): PenMotion | undefined {
  if (!message.startsWith(PEN_MOTION_PREFIX)) return;
  try {
    const value = JSON.parse(message.slice(PEN_MOTION_PREFIX.length));
    if (
      !value ||
      typeof value.matchId !== "string" ||
      !/^\d+$/.test(value.matchId) ||
      typeof value.sequence !== "string" ||
      !["human", "melabot"].includes(value.actor)
    )
      return;
    for (const key of ["from", "targetFrom", "contact", "end", "targetEnd"]) {
      if (
        !value[key] ||
        ![value[key].x, value[key].y].every(
          (n) =>
            typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 10000,
        )
      )
        return;
    }
    if (
      ![value.hit, value.actorOut, value.targetOut, value.guarded].every(
        (b) => typeof b === "boolean",
      )
    )
      return;
    return value;
  } catch {
    return;
  }
}
