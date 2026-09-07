import test from "node:test";
import assert from "node:assert/strict";
import {
  contactFlashPoint,
  directionGuide,
} from "../src/penContactPresentation";
import { resolvePenFlick } from "../spacetimedb/src/penFightRules";
import { canGrabPen, HUMAN_PEN_YAW } from "../src/penFightInput";
import type { PenMotion } from "../spacetimedb/src/penFightMotion";

test("contact feedback locates actual barrel contact and is invariant across seat perspective", () => {
  let hits = 0;
  for (const side of ["human", "melabot"] as const)
    for (const y of [300, 500, 700]) {
      const input = {
        seed: 1n,
        actorSide: side,
        actorX: side === "human" ? 260 : 740,
        actorY: 500,
        targetX: side === "human" ? 740 : 260,
        targetY: y,
        aimX: side === "human" ? 740 : 260,
        aimY: y,
        force: 80,
        contact: 50,
        effects: { nudge: false, tilt: false, guard: false },
      };
      const r = resolvePenFlick(input);
      const m: PenMotion = {
        matchId: "1",
        sequence: "test",
        actor: side,
        from: { x: input.actorX, y: 500 },
        targetFrom: { x: input.targetX, y },
        contact: { x: r.motion.contactX, y: r.motion.contactY },
        end: { x: r.motion.actorX, y: r.motion.actorY },
        targetEnd: { x: r.motion.targetX, y: r.motion.targetY },
        hit: r.hit,
        actorOut: r.actorOut,
        targetOut: r.targetOut,
        guarded: false,
      };
      const flash = contactFlashPoint(m);
      assert.deepEqual(
        flash,
        contactFlashPoint(
          { ...m, actor: side === "human" ? "melabot" : "human" },
          true,
        ),
      );
      if (r.hit) {
        hits++;
        assert.ok(flash);
        assert.ok(
          Math.hypot(flash.x - m.contact.x, flash.y - m.contact.y) > 10,
          "not the actor centre",
        );
        assert.ok(
          Math.hypot(flash.x - input.targetX, flash.y - y) < 235,
          "within the struck pen silhouette",
        );
      }
    }
  assert.equal(hits, 6);
});
test("no hit produces no contact flash; direction guide promises no power-dependent endpoint", () => {
  assert.equal(contactFlashPoint({ hit: false } as PenMotion), null);
  assert.deepEqual(directionGuide({ x: 100, y: 200 }, { x: 400, y: 600 }), {
    distance: 500,
    x: 0.6,
    y: 0.8,
  });
  assert.equal(directionGuide({ x: 100, y: 200 }, { x: 100, y: 200 }), null);
  assert.equal(directionGuide({ x: 100, y: 200 }, { x: NaN, y: 200 }), null);
});
test("right-seat input follows its mirrored authoritative pen, including cap and tip edges", () => {
  for (const along of [-210, -150, 0, 150, 210]) {
    const point = {
      x: 740 - Math.sin(HUMAN_PEN_YAW) * along,
      y: 500 + Math.cos(HUMAN_PEN_YAW) * along,
    };
    assert.equal(canGrabPen(point, { x: 740, y: 500 }, true), true);
  }
  assert.equal(canGrabPen({ x: 260, y: 500 }, { x: 740, y: 500 }, true), false);
});
