import test from "node:test";
import assert from "node:assert/strict";
import {
  boundedAim,
  canGrabPen,
  HUMAN_PEN_YAW,
  shotCue,
} from "../src/penFightInput";
import type { PenMotion } from "../spacetimedb/src/penFightMotion";

test("an edge diagonal retains its angle instead of clipping axes separately", () => {
  const from = { x: 950, y: 500 };
  assert.deepEqual(boundedAim(from, { x: 1, y: 1 }), { x: 1000, y: 550 });
  assert.deepEqual(boundedAim({ x: 50, y: 500 }, { x: -1, y: 1 }), {
    x: 0,
    y: 550,
  });
});
test("aim remains legal and collinear across board positions and directions", () => {
  for (const x of [20, 250, 500, 750, 980])
    for (const y of [20, 500, 980]) {
      for (let a = 0; a < Math.PI * 2; a += 0.13) {
        const direction = { x: Math.cos(a), y: Math.sin(a) };
        const aim = boundedAim({ x, y }, direction)!;
        assert.ok(aim.x >= 0 && aim.x <= 1000 && aim.y >= 0 && aim.y <= 1000);
        assert.ok(Number.isInteger(aim.x) && Number.isInteger(aim.y));
        // At most the half-pixel rounding error on each integer coordinate.
        assert.ok(
          Math.abs((aim.x - x) * direction.y - (aim.y - y) * direction.x) <
            0.72,
        );
      }
    }
});
test("outward edge aim, zero-length and nonfinite input do not become fallback shots", () => {
  assert.equal(boundedAim({ x: 1000, y: 500 }, { x: 1, y: 1 }), null);
  assert.equal(boundedAim({ x: 500, y: 500 }, { x: 0, y: 0 }), null);
  assert.equal(boundedAim({ x: 500, y: 500 }, { x: NaN, y: 1 }), null);
  assert.equal(boundedAim({ x: -1, y: 500 }, { x: 1, y: 0 }), null);
  assert.deepEqual(boundedAim({ x: 1000, y: 500 }, { x: -1, y: 0 }), {
    x: 400,
    y: 500,
  });
});
test("cap, barrel and tip all start a gesture, not just the centre ring", () => {
  const centre = { x: 260, y: 500 };
  for (const along of [-210, -150, 0, 150, 210]) {
    assert.equal(
      canGrabPen(
        {
          x: 260 + Math.sin(HUMAN_PEN_YAW) * along,
          y: 500 + Math.cos(HUMAN_PEN_YAW) * along,
        },
        centre,
      ),
      true,
    );
  }
});
test("the other pen and empty desk cannot initiate a flick", () => {
  assert.equal(canGrabPen({ x: 740, y: 500 }, { x: 260, y: 500 }), false);
  assert.equal(canGrabPen({ x: 400, y: 500 }, { x: 260, y: 500 }), false);
  assert.equal(canGrabPen({ x: 260, y: 100 }, { x: 260, y: 500 }), false);
});
const motion: PenMotion = {
  matchId: "1",
  sequence: "1:0:8",
  actor: "human",
  from: { x: 260, y: 500 },
  targetFrom: { x: 740, y: 500 },
  contact: { x: 674, y: 500 },
  end: { x: 700, y: 500 },
  targetEnd: { x: 1100, y: 500 },
  hit: true,
  actorOut: false,
  targetOut: true,
  guarded: false,
};
test("contact and knockout cues do not spoil the launch", () => {
  assert.equal(shotCue(motion, 0, "Asha"), "Asha flicks…");
  assert.equal(shotCue(motion, 0.37, "Asha"), "Asha flicks…");
  assert.equal(shotCue(motion, 0.4, "Asha"), "Contact! Let it settle…");
  assert.equal(shotCue(motion, 0.8, "Asha"), "Off the edge!");
  assert.equal(shotCue(motion, 1, "Asha"), "");
});
test("misses never announce contact, and crowd saves use committed flags", () => {
  assert.equal(
    shotCue(
      { ...motion, actor: "melabot", hit: false, targetOut: false },
      0.5,
      "Asha",
    ),
    "No contact · sliding…",
  );
  assert.equal(
    shotCue({ ...motion, guarded: true, targetOut: false }, 0.8, "Asha"),
    "Crowd save!",
  );
  assert.equal(
    shotCue({ ...motion, guarded: true }, 0.8, "Asha"),
    "Crowd save · one pen falls!",
  );
});
