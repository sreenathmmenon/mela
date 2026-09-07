import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deskCamera,
  deskToScreen,
  screenToDesk,
  PEN_LENGTH,
  PEN_SCALE,
  DESK_VIEWS,
  readDeskView,
  penFollowCamera,
} from "../src/penDeskProjection";

test("perspective input round trips both pens and all board corners", () => {
  for (const view of DESK_VIEWS) {
    for (const aspect of [0.8, 1, 1.12, 1.7]) {
      const camera = deskCamera(aspect, view);
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
  }
});
test("behind-pen camera follows either seat without changing projection accuracy", () => {
  for (const human of [
    { x: 260, y: 500 },
    { x: 950, y: 900 },
    { x: 500, y: 500 },
  ]) {
    const bot = { x: 1000 - human.x, y: 1000 - human.y };
    const camera = deskCamera(0.8, "behind", { human, bot });
    for (const p of [human, bot]) {
      const screen = deskToScreen(camera, p),
        world = screenToDesk(camera, screen.x, screen.y)!;
      assert.ok(
        Math.abs(world.x - p.x) < 0.001 && Math.abs(world.y - p.y) < 0.001,
      );
    }
  }
});
test("pen camera follows a committed position and returns exactly to the aiming camera", () => {
  const rest = deskCamera(1.2, "behind");
  const start = deskCamera(1.2, "sideline");
  const entry = penFollowCamera(
    1.2,
    { x: 600, y: 500 },
    { x: 1, y: 0 },
    rest,
    0,
    start,
  );
  assert.ok(entry.position.distanceTo(start.position) < 0.0001);
  assert.ok(entry.quaternion.angleTo(start.quaternion) < 0.0001);
  for (const t of [0, 1]) {
    const c = penFollowCamera(1.2, { x: 600, y: 500 }, { x: 1, y: 0 }, rest, t);
    assert.ok(c.position.distanceTo(rest.position) < 0.0001);
    assert.ok(c.quaternion.angleTo(rest.quaternion) < 0.0001);
    assert.equal(c.fov, rest.fov);
  }
  const a = penFollowCamera(1.2, { x: 300, y: 500 }, { x: 1, y: 0 }, rest, 0.4);
  const b = penFollowCamera(1.2, { x: 600, y: 500 }, { x: 1, y: 0 }, rest, 0.4);
  assert.ok(Math.abs(b.position.x - a.position.x - 300) < 0.001);
  assert.ok(a.position.y > 100);
  assert.equal(readDeskView("bad-camera"), "desk");
  assert.equal(readDeskView(null), "desk");
  for (const view of DESK_VIEWS) assert.equal(readDeskView(view), view);
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
