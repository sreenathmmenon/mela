import type { DeskPoint, PenMotion } from "../spacetimedb/src/penFightMotion";

// One footprint for rendered pens, input targeting and authoritative contact.
import {
  PEN_LENGTH,
  PEN_SCALE,
  HUMAN_PEN_YAW,
} from "../spacetimedb/src/penGeometry";
export { PEN_LENGTH, PEN_SCALE, HUMAN_PEN_YAW };

/** Project a forgiving finger hit onto the actual pen spine. */
export function penGrip(point: DeskPoint, centre: DeskPoint, mirrored = false) {
  const yaw = mirrored ? -HUMAN_PEN_YAW : HUMAN_PEN_YAW;
  const half = (PEN_LENGTH * PEN_SCALE) / 2 - 24;
  const along = Math.max(
    -half,
    Math.min(
      half,
      (point.x - centre.x) * Math.sin(yaw) +
        (point.y - centre.y) * Math.cos(yaw),
    ),
  );
  return {
    x: centre.x + Math.sin(yaw) * along,
    y: centre.y + Math.cos(yaw) * along,
  };
}

/** Translate the signed lever arm into the existing authoritative contact-bias
 * input. This is an input choice, not a client-side collision or rigid-body solver. */
export function gripContact(
  grip: DeskPoint,
  centre: DeskPoint,
  direction: DeskPoint,
) {
  const length = Math.hypot(direction.x, direction.y);
  if (!Number.isFinite(length) || length < 1e-6) return 50;
  const lever =
    ((grip.x - centre.x) * direction.y - (grip.y - centre.y) * direction.x) /
    length;
  return Math.round(
    50 +
      50 *
        Math.max(-1, Math.min(1, lever / ((PEN_LENGTH * PEN_SCALE) / 2 - 24))),
  );
}

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
export function canGrabPen(
  point: DeskPoint,
  centre: DeskPoint,
  mirrored = false,
) {
  const dx = point.x - centre.x,
    dy = point.y - centre.y;
  const yaw = mirrored ? -HUMAN_PEN_YAW : HUMAN_PEN_YAW;
  const cross = dx * Math.cos(yaw) - dy * Math.sin(yaw);
  const along = dx * Math.sin(yaw) + dy * Math.cos(yaw);
  return (
    Math.hypot(
      cross,
      Math.max(0, Math.abs(along) - (PEN_LENGTH * PEN_SCALE) / 2),
    ) <= 72
  );
}

export function shotCue(
  motion: PenMotion,
  progress: number,
  human: string,
  bot = "MelaBot",
) {
  if (progress >= 1) return "";
  if (progress < 0.38)
    return `${motion.actor === "human" ? human : bot} flicks…`;
  if (progress >= 0.75) {
    if (motion.guarded)
      return motion.actorOut || motion.targetOut
        ? "Crowd save · one pen falls!"
        : "Crowd save!";
    if (motion.actorOut || motion.targetOut) return "Off the edge!";
  }
  return motion.hit ? "Contact! Let it settle…" : "No contact · sliding…";
}
