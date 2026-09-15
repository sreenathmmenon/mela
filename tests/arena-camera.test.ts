import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { arenaFrustum } from "../src/arenaCamera";

test("all playable corners fit the three arena cameras on narrow phones and desktop", () => {
  for (const [width, height] of [
    [298, 390],
    [368, 390],
    [746, 520],
    [1048, 670],
  ]) {
    for (const position of [
      [9, 13, 12],
      [12, 10, 9],
      [0, 18, 0.01],
    ]) {
      const f = arenaFrustum(width, height);
      const camera = new THREE.OrthographicCamera(
        f.left,
        f.right,
        f.top,
        f.bottom,
        0.1,
        100,
      );
      camera.position.set(...(position as [number, number, number]));
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      for (const x of [-4.5, 4.5])
        for (const z of [-4.5, 4.5]) {
          const point = new THREE.Vector3(x, 0, z).project(camera);
          assert.ok(
            Math.abs(point.x) < 1 && Math.abs(point.y) < 1,
            `clipped tile at ${width}x${height}, camera ${position}`,
          );
        }
    }
  }
});
test("zero-size mounting containers keep finite camera bounds", () => {
  assert.ok(Object.values(arenaFrustum(0, 0)).every(Number.isFinite));
});
