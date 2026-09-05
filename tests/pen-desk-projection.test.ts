import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deskCamera,
  deskToScreen,
  screenToDesk,
  PEN_LENGTH,
  PEN_SCALE,
  completedPenExited,
} from "../src/penDeskProjection";

test("completed boundary centres stay off the desk without transient event replay", () => {
  assert.equal(completedPenExited({ x: 0, y: 0 }), true);
  assert.equal(completedPenExited({ x: 1000, y: 400 }), true);
  assert.equal(completedPenExited({ x: 21, y: 229 }), false);
  assert.equal(completedPenExited({ x: 500, y: 500 }), false);
});
test("perspective input round trips both pens and all board corners", () => {
  for (const aspect of [0.8, 1, 1.12, 1.7]) {
    const camera = deskCamera(aspect);
    for (const point of [
      { x: 260, y: 500 },
      { x: 740, y: 500 },
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 0, y: 1000 },
      { x: 1000, y: 1000 },
    ]) {
      const screen = deskToScreen(camera, point);
      const actual = screenToDesk(camera, screen.x, screen.y)!;
      assert.ok(Math.abs(actual.x - point.x) < 0.0001);
      assert.ok(Math.abs(actual.y - point.y) < 0.0001);
      assert.ok(screen.x > 0 && screen.x < 1 && screen.y > 0 && screen.y < 1);
    }
  }
});
test("phone pen silhouette exceeds 80px without cropping the playable board", () => {
  const camera = deskCamera(1.12);
  for (const x of [260, 740]) {
    const a = deskToScreen(
      camera,
      { x, y: 500 - (PEN_LENGTH * PEN_SCALE) / 2 },
      21,
    );
    const b = deskToScreen(
      camera,
      { x, y: 500 + (PEN_LENGTH * PEN_SCALE) / 2 },
      21,
    );
    const pixels = Math.hypot((b.x - a.x) * 364, ((b.y - a.y) * 364) / 1.12);
    assert.ok(pixels > 80, `pen too small: ${pixels}px`);
  }
});
test("pulling left through perspective produces a rightward world-space aim", () => {
  const camera = deskCamera(1.12);
  const origin = deskToScreen(camera, { x: 260, y: 500 });
  const pulled = screenToDesk(camera, origin.x - 0.1, origin.y)!;
  assert.ok(pulled.x < 260);
  assert.ok(Math.abs(pulled.y - 500) < 25);
});
