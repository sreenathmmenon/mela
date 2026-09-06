/** Shared desk-space pen footprint. Rendering and collision use the same size. */
export const PEN_LENGTH = 350;
export const PEN_SCALE = 1.2;
export const HUMAN_PEN_YAW = 0.12;
const RADIUS = 24;
const HALF_SPINE = (PEN_LENGTH * PEN_SCALE) / 2 - RADIUS;
type Point = { x: number; y: number };
export function penAimPoint(
  centre: Point,
  side: "human" | "melabot",
  offset: number,
): Point {
  const yaw = side === "human" ? HUMAN_PEN_YAW : -HUMAN_PEN_YAW;
  return {
    x: centre.x + Math.sin(yaw) * offset,
    y: centre.y + Math.cos(yaw) * offset,
  };
}
function closest(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)),
  );
  return { x: a.x + t * dx, y: a.y + t * dy };
}
/** Continuous collision by conservative advancement of two capsule spines.
 * This is one bounded calculation per flick, never a world simulation tick. */
export function sweepPens(
  from: Point,
  target: Point,
  direction: Point,
  travel: number,
  side: "human" | "melabot",
) {
  const other = side === "human" ? "melabot" : "human";
  const c = penAimPoint(target, other, -HALF_SPINE),
    d = penAimPoint(target, other, HALF_SPINE);
  let t = 0;
  for (let i = 0; i < 160; i++) {
    const centre = { x: from.x + direction.x * t, y: from.y + direction.y * t };
    const a = penAimPoint(centre, side, -HALF_SPINE),
      b = penAimPoint(centre, side, HALF_SPINE);
    const pairs = [
      [a, closest(a, c, d)],
      [b, closest(b, c, d)],
      [closest(c, a, b), c],
      [closest(d, a, b), d],
    ];
    const cross = (u: Point, v: Point) => u.x * v.y - u.y * v.x;
    const ab = { x: b.x - a.x, y: b.y - a.y },
      cd = { x: d.x - c.x, y: d.y - c.y },
      ac = { x: c.x - a.x, y: c.y - a.y };
    const det = cross(ab, cd);
    if (Math.abs(det) > 1e-9) {
      const u = cross(ac, cd) / det,
        v = cross(ac, ab) / det;
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1)
        return { distance: t, normal: direction };
    }
    pairs.sort(
      (p, q) =>
        Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) -
        Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y),
    );
    const [p, q] = pairs[0],
      dx = q.x - p.x,
      dy = q.y - p.y,
      len = Math.hypot(dx, dy);
    const gap = len - 2 * RADIUS;
    if (gap <= 0.001)
      return {
        distance: t,
        normal: len > 1e-6 ? { x: dx / len, y: dy / len } : direction,
      };
    t += gap;
    if (t > travel) return undefined;
  }
  return undefined;
}
