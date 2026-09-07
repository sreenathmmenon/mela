import type { DeskPoint, PenMotion } from "../spacetimedb/src/penFightMotion";
import {
  PEN_LENGTH,
  PEN_SCALE,
  penAimPoint,
} from "../spacetimedb/src/penGeometry";

const closest = (p: DeskPoint, a: DeskPoint, b: DeskPoint): DeskPoint => {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)),
  );
  return { x: a.x + dx * t, y: a.y + dy * t };
};

/** Locate the visible contact between two committed capsules. The motion's
 * `contact` is the moving pen's CENTRE, not the point where the barrels touch.
 * Never predict a hit or use this presentation result for game rules. */
export function contactFlashPoint(
  motion: PenMotion,
  mirrored = false,
): DeskPoint | null {
  if (!motion.hit) return null;
  const actorHuman = (motion.actor === "human") !== mirrored;
  const half = (PEN_LENGTH * PEN_SCALE) / 2 - 24;
  const side = actorHuman ? "human" : "melabot";
  const other = actorHuman ? "melabot" : "human";
  const a = penAimPoint(motion.contact, side, -half);
  const b = penAimPoint(motion.contact, side, half);
  const c = penAimPoint(motion.targetFrom, other, -half);
  const d = penAimPoint(motion.targetFrom, other, half);
  const pairs = [
    [a, closest(a, c, d)],
    [b, closest(b, c, d)],
    [closest(c, a, b), c],
    [closest(d, a, b), d],
  ];
  pairs.sort(
    (p, q) =>
      Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) -
      Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y),
  );
  const [p, q] = pairs[0];
  return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
}

/** Direction-only guide; deliberately independent of power and hidden crowd
 * effects. It ends at the selected aim point, not at a promised landing spot. */
export function directionGuide(from: DeskPoint, aim: DeskPoint) {
  const distance = Math.hypot(aim.x - from.x, aim.y - from.y);
  if (!Number.isFinite(distance) || distance < 1) return null;
  return {
    distance,
    x: (aim.x - from.x) / distance,
    y: (aim.y - from.y) / distance,
  };
}
