import test from "node:test";
import assert from "node:assert/strict";
import { sweepPens, penAimPoint } from "../spacetimedb/src/penGeometry";
import { resolvePenFlick } from "../spacetimedb/src/penFightRules";
test("barrel and tip overlap cannot pass through the old centre-only collision", () => {
  for (const actorSide of ["human", "melabot"] as const) {
    for (const y of [350, 500, 650]) {
      const r = resolvePenFlick({
        actorSide,
        seed: 1n,
        actorX: 260,
        actorY: y,
        targetX: 740,
        targetY: 500,
        aimX: 740,
        aimY: y,
        force: 66,
        contact: 50,
        effects: { nudge: false, tilt: false, guard: false },
      });
      assert.equal(r.hit, true, `${actorSide} at ${y}`);
      assert.ok(r.motion.contactX < 740);
    }
  }
});
test("continuous sweep stops at first body contact even for a long flick", () => {
  // Pens' cross-sections at their common centre contain radius-24 discs.
  const r = sweepPens(
    { x: 100, y: 500 },
    { x: 740, y: 500 },
    { x: 1, y: 0 },
    1000,
    "human",
  )!;
  assert.ok(r.distance > 540 && r.distance < 592);
  assert.equal(
    sweepPens(
      { x: 100, y: 500 },
      { x: 740, y: 500 },
      { x: 1, y: 0 },
      r.distance - 0.01,
      "human",
    ),
    undefined,
  );
  assert.ok(
    sweepPens(
      { x: 100, y: 500 },
      { x: 740, y: 500 },
      { x: 1, y: 0 },
      r.distance + 0.01,
      "human",
    ),
  );
});
test("a clear miss and a shot away from the opponent remain misses", () => {
  assert.equal(
    sweepPens(
      { x: 100, y: 50 },
      { x: 740, y: 800 },
      { x: 1, y: 0 },
      1000,
      "human",
    ),
    undefined,
  );
  assert.equal(
    sweepPens(
      { x: 100, y: 500 },
      { x: 740, y: 500 },
      { x: -1, y: 0 },
      1000,
      "human",
    ),
    undefined,
  );
});
test("tip and cap markers use the same mirrored orientation as 3D pens", () => {
  const c = { x: 500, y: 500 };
  const human = penAimPoint(c, "human", 150),
    bot = penAimPoint(c, "melabot", 150);
  assert.equal(human.y, bot.y);
  assert.equal(human.x - c.x, c.x - bot.x);
  assert.deepEqual(penAimPoint(c, "melabot", 0), c);
});
