import { PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from "three";
import type { DeskPoint } from "../spacetimedb/src/penFightMotion";

// Shared pen dimensions. The authoritative game remains a 1000-unit board.
export { PEN_LENGTH, PEN_SCALE } from "./penFightInput";
import type { DeskView } from "./penCameraSettings";
export { DESK_VIEWS, readDeskView, type DeskView } from "./penCameraSettings";
export type CameraBoard = { human: DeskPoint; bot: DeskPoint };
export function deskCamera(
  aspect: number,
  view: DeskView = "desk",
  board?: CameraBoard,
) {
  const camera = new PerspectiveCamera(38, aspect, 1, 6000);
  if (view === "overhead") camera.position.set(0, 1900, 1);
  else if (view === "sideline") camera.position.set(1550, 650, 400);
  else if (view === "behind" || view === "pen") {
    const h = board?.human ?? { x: 260, y: 500 },
      b = board?.bot ?? { x: 740, y: 500 };
    const dx = b.x - h.x,
      dy = b.y - h.y,
      len = Math.hypot(dx, dy) || 1;
    camera.position.set((-dx / len) * 1500, 800, (-dy / len) * 1500);
  } else if (aspect > 1.4) camera.position.set(90, 1100, 1450);
  else camera.position.set(90, 1450, 1000);
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

/** Close chase shot using committed presentation coordinates only. Never used
 * for input while motion is playing. Return to the fitted aiming camera before
 * the next turn; no saved state or authoritative motion is changed. */
export function penFollowCamera(
  aspect: number,
  actor: DeskPoint,
  direction: DeskPoint,
  resting: PerspectiveCamera,
  progress: number,
  starting: PerspectiveCamera = resting,
) {
  const camera = new PerspectiveCamera(48, aspect, 1, 6000);
  const len = Math.hypot(direction.x, direction.y) || 1;
  const dx = direction.x / len,
    dy = direction.y / len;
  camera.position.set(actor.x - 500 - dx * 560, 340, actor.y - 500 - dy * 560);
  camera.lookAt(actor.x - 500 + dx * 180, 18, actor.y - 500 + dy * 180);
  const t = Math.max(0, Math.min(1, (progress - 0.7) / 0.3));
  const enter = Math.max(0, Math.min(1, progress / 0.13));
  const entry = 1 - enter * enter * (3 - 2 * enter);
  camera.position.lerp(starting.position, entry);
  camera.quaternion.slerp(starting.quaternion, entry);
  camera.fov += (starting.fov - camera.fov) * entry;
  const blend = t * t * (3 - 2 * t);
  camera.position.lerp(resting.position, blend);
  camera.quaternion.slerp(resting.quaternion, blend);
  camera.fov += (resting.fov - camera.fov) * blend;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
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
