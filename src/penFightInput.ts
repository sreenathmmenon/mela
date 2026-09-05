import type { DeskPoint, PenMotion } from "../spacetimedb/src/penFightMotion";

// Shared presentation geometry, not authoritative collision dimensions.
export const PEN_LENGTH = 350;
export const PEN_SCALE = 1.2;
export const HUMAN_PEN_YAW = 0.12;

/** Intersect the whole ray with the board, rather than clipping its axes
 * separately. Axis clipping changes the angle precisely where aim matters most. */
export function boundedAim(
  from: DeskPoint,
  direction: DeskPoint,
): DeskPoint | null {
  if (![from.x, from.y].every((n) => Number.isFinite(n) && n >= 0 && n <= 1000))
    return null;
  const length = Math.hypot(direction.x, direction.y);
  if (!Number.isFinite(length) || length < 1e-6) return null;
  const x = direction.x / length,
    y = direction.y / length;
  let distance = 600;
  if (x > 0) distance = Math.min(distance, (1000 - from.x) / x);
  if (x < 0) distance = Math.min(distance, -from.x / x);
  if (y > 0) distance = Math.min(distance, (1000 - from.y) / y);
  if (y < 0) distance = Math.min(distance, -from.y / y);
  if (distance < 1) return null;
  const aim = {
    x: Math.round(from.x + x * distance),
    y: Math.round(from.y + y * distance),
  };
  return Math.hypot(aim.x - from.x, aim.y - from.y) >= 1 ? aim : null;
}

/** Forgiving input capsule covering the visible cap, barrel and tip. This
 * decides whether a gesture starts on your pen; it never decides a collision. */
export function canGrabPen(point: DeskPoint, centre: DeskPoint) {
  const dx = point.x - centre.x,
    dy = point.y - centre.y;
  const cross = dx * Math.cos(HUMAN_PEN_YAW) - dy * Math.sin(HUMAN_PEN_YAW);
  const along = dx * Math.sin(HUMAN_PEN_YAW) + dy * Math.cos(HUMAN_PEN_YAW);
  return (
    Math.hypot(
      cross,
      Math.max(0, Math.abs(along) - (PEN_LENGTH * PEN_SCALE) / 2),
    ) <= 72
  );
}

export function shotCue(motion: PenMotion, progress: number, human: string) {
  if (progress >= 1) return "";
  if (progress < 0.38)
    return `${motion.actor === "human" ? human : "MelaBot"} flicks…`;
  if (progress >= 0.75) {
    if (motion.guarded)
      return motion.actorOut || motion.targetOut
        ? "Crowd save · one pen falls!"
        : "Crowd save!";
    if (motion.actorOut || motion.targetOut) return "Off the edge!";
  }
  return motion.hit ? "Contact! Let it settle…" : "No contact · sliding…";
}
