import { PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from "three";
import type { DeskPoint } from "../spacetimedb/src/penFightMotion";

// Presentation dimensions only. The authoritative game remains a 1000-unit board.
export { PEN_LENGTH, PEN_SCALE } from "./penFightInput";
export function deskCamera(aspect: number) {
  const camera = new PerspectiveCamera(38, aspect, 1, 6000);
  camera.position.set(90, 1450, 1000);
  camera.lookAt(0, -20, 0);
  camera.updateMatrixWorld();
  // Fit all four playable corners, including the nearer perspective corners.
  const corners = [-500, 500].flatMap((x) =>
    [-500, 500].map((z) => new Vector3(x, 0, z)),
  );
  for (let i = 0; i < 12; i++) {
    const extent = Math.max(
      ...corners.flatMap((p) => {
        const n = p.clone().project(camera);
        return [Math.abs(n.x) / 0.94, Math.abs(n.y) / 0.87];
      }),
    );
    if (Math.abs(extent - 1) < 0.002) break;
    camera.position.multiplyScalar(Math.max(0.8, Math.min(1.2, extent)));
    camera.lookAt(0, -20, 0);
    camera.updateMatrixWorld();
  }
  return camera;
}
export function deskToScreen(
  camera: PerspectiveCamera,
  point: DeskPoint,
  height = 0,
) {
  const p = new Vector3(point.x - 500, height, point.y - 500).project(camera);
  return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
}
export function screenToDesk(
  camera: PerspectiveCamera,
  x: number,
  y: number,
): DeskPoint | null {
  const ray = new Raycaster();
  ray.setFromCamera(new Vector2(x * 2 - 1, 1 - y * 2), camera);
  const hit = ray.ray.intersectPlane(
    new Plane(new Vector3(0, 1, 0), 0),
    new Vector3(),
  );
  return hit ? { x: hit.x + 500, y: hit.z + 500 } : null;
}
