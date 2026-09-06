import * as T from "three";
import {
  deskCamera,
  deskToScreen,
  PEN_LENGTH,
  PEN_SCALE,
  screenToDesk,
} from "./penDeskProjection";
import type { DeskPoint, PenMotion } from "../spacetimedb/src/penFightMotion";
import { HUMAN_PEN_YAW } from "./penFightInput";

export type DeskFrame = {
  pull?: DeskPoint | null;
  human: DeskPoint;
  bot: DeskPoint;
  aim: DeskPoint;
  power: number;
  interactive: boolean;
  aiming: boolean;
  pen: string;
  completed: boolean;
  motion?: PenMotion;
};

function material(
  color: T.ColorRepresentation,
  metalness = 0,
  roughness = 0.4,
) {
  return new T.MeshStandardMaterial({ color, metalness, roughness });
}
function mesh(
  geometry: T.BufferGeometry,
  mat: T.Material,
  parent: T.Object3D,
  x = 0,
  y = 0,
  z = 0,
) {
  const object = new T.Mesh(geometry, mat);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
function penModel(bot: boolean) {
  const group = new T.Group();
  const body = material(bot ? "#c84727" : "#f0eadb", 0.28, 0.25);
  const dark = material(bot ? "#531c19" : "#133c4d", 0.18, 0.28);
  const chrome = material("#cfdbdc", 0.72, 0.2);
  function cylinder(
    r1: number,
    r2: number,
    length: number,
    z: number,
    mat: T.Material,
  ) {
    const part = mesh(
      new T.CylinderGeometry(r1, r2, length, 24),
      mat,
      group,
      0,
      0,
      z,
    );
    part.rotation.x = Math.PI / 2;
  }
  cylinder(18, 16, 216, -14, body);
  cylinder(19, 19, 65, 105, dark);
  for (let i = 0; i < 8; i++) cylinder(19.8, 19.8, 2.5, 80 + i * 7, chrome);
  cylinder(3, 17, 36, 155, chrome);
  cylinder(3, 0.5, 8, PEN_LENGTH / 2, dark);
  cylinder(20, 18, 40, -137, dark);
  cylinder(14, 14, 14, -164, chrome);
  mesh(new T.BoxGeometry(8, 5, 95), chrome, group, 0, 23, -99);
  mesh(new T.BoxGeometry(8, 15, 8), chrome, group, 0, 17, -144);
  // Thin raised barrel stripe catches light as the pen rolls.
  mesh(new T.BoxGeometry(3, 2, 115), chrome, group, 0, 18, -13);
  group.scale.setScalar(PEN_SCALE);
  return { group, body };
}
function woodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#bc8954";
  c.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 620; i++) {
    c.strokeStyle = i % 3 ? "#57321914" : "#ffe3a025";
    c.lineWidth = 1 + (i % 3);
    c.beginPath();
    const y = i * 1.7;
    c.moveTo(0, y);
    c.bezierCurveTo(290, y + Math.sin(i) * 14, 650, y - 10, 1024, y + 8);
    c.stroke();
  }
  c.strokeStyle = "#5a341730";
  c.lineWidth = 3;
  for (const y of [256, 512, 768]) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(1024, y);
    c.stroke();
  }
  c.strokeStyle = "#fff2cc70";
  c.lineWidth = 3;
  c.strokeRect(16, 16, 992, 992);
  c.fillStyle = "#49341b90";
  c.font = "600 22px monospace";
  c.fillText("MELA  /  AFTER CLASS", 52, 74);
  c.font = "italic 21px Georgia";
  c.fillText("one more round?", 788, 962);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

/** A renderer, never a physics engine. Every animated endpoint is a committed server event. */
export function createDeskScene(
  host: HTMLDivElement,
  labels: [HTMLSpanElement, HTMLSpanElement],
) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  host.prepend(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");
  const scene = new T.Scene();
  scene.add(new T.HemisphereLight("#fff4da", "#414f50", 1.8));
  const light = new T.DirectionalLight("#fff0d1", 3);
  light.position.set(-500, 1100, 350);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, {
    left: -850,
    right: 850,
    top: 850,
    bottom: -850,
    near: 1,
    far: 2500,
  });
  light.shadow.bias = -0.0003;
  light.shadow.normalBias = 1;
  scene.add(light);
  const fill = new T.DirectionalLight("#b5dce8", 1.5);
  fill.position.set(600, 500, -500);
  scene.add(fill);
  const texture = woodTexture();
  const side = material("#70442b", 0, 0.7);
  const top = new T.MeshStandardMaterial({
    map: texture,
    roughness: 0.63,
    bumpMap: texture,
    bumpScale: 0.6,
  });
  const desk = new T.Mesh(new T.BoxGeometry(1000, 60, 1000), [
    side,
    side,
    top,
    side,
    side,
    side,
  ]);
  desk.position.y = -30;
  desk.receiveShadow = desk.castShadow = true;
  scene.add(desk);
  mesh(new T.BoxGeometry(970, 18, 970), material("#3e3027"), scene, 0, -66, 0);
  for (const x of [-410, 410])
    for (const z of [-390, 390])
      mesh(
        new T.BoxGeometry(38, 210, 38),
        material("#293a38", 0.5),
        scene,
        x,
        -165,
        z,
      );
  const floor = mesh(
    new T.PlaneGeometry(5000, 5000),
    new T.ShadowMaterial({ opacity: 0.2 }),
    scene,
    0,
    -270,
    0,
  );
  floor.rotation.x = -Math.PI / 2;
  const human = penModel(false),
    bot = penModel(true);
  scene.add(human.group, bot.group);
  const ring = mesh(
    new T.RingGeometry(53, 59, 64),
    new T.MeshBasicMaterial({ color: "#087e83", side: T.DoubleSide }),
    scene,
  );
  ring.rotation.x = -Math.PI / 2;
  ring.castShadow = false;
  const arrow = new T.ArrowHelper(
    new T.Vector3(1, 0, 0),
    new T.Vector3(),
    200,
    0x087e83,
    35,
    24,
  );
  scene.add(arrow);
  const aimMarker = mesh(
    new T.RingGeometry(12, 17, 32),
    new T.MeshBasicMaterial({
      color: "#fff8dd",
      side: T.DoubleSide,
      depthTest: false,
    }),
    scene,
  );
  aimMarker.rotation.x = -Math.PI / 2;
  aimMarker.renderOrder = 21;
  aimMarker.castShadow = false;
  const shaft = mesh(
    new T.CylinderGeometry(3, 3, 1, 8),
    new T.MeshBasicMaterial({ color: "#087e83" }),
    scene,
  );
  shaft.castShadow = false;
  // The direction guide is an input overlay, not another desk object. A soft
  // shot along the barrel must not hide its arrowhead underneath the pen.
  for (const guide of [arrow.line, arrow.cone, shaft]) {
    guide.renderOrder = 20;
    const materials = Array.isArray(guide.material)
      ? guide.material
      : [guide.material];
    for (const material of materials) {
      material.depthTest = false;
      material.depthWrite = false;
    }
  }
  const tether = mesh(
    new T.CylinderGeometry(2, 2, 1, 8),
    new T.MeshBasicMaterial({ color: "#fff8dd" }),
    scene,
  );
  const finger = mesh(
    new T.RingGeometry(16, 22, 32),
    new T.MeshBasicMaterial({ color: "#fff8dd", side: T.DoubleSide }),
    scene,
  );
  tether.castShadow = finger.castShadow = false;
  finger.rotation.x = -Math.PI / 2;
  const impact = mesh(
    new T.RingGeometry(30, 36, 48),
    new T.MeshBasicMaterial({
      color: "#fff2b3",
      transparent: true,
      side: T.DoubleSide,
    }),
    scene,
  );
  impact.rotation.x = -Math.PI / 2;
  impact.castShadow = false;
  let camera = deskCamera(1),
    width = 1,
    height = 1;
  let current: DeskFrame | undefined;
  let lastProgress = 1;
  const resize = () => {
    width = host.clientWidth;
    height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera = deskCamera(width / height);
    if (current) draw(current, lastProgress);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  function place(group: T.Group, point: DeskPoint, side: number, fall = 0) {
    group.position.set(point.x - 500, 21 - fall * fall * 250, point.y - 500);
    group.rotation.set(fall * 2, side * HUMAN_PEN_YAW + fall * 2, fall * 1.4);
    group.visible = fall < 0.97;
  }
  function draw(frame: DeskFrame, progress = 1) {
    current = frame;
    lastProgress = progress;
    let h = frame.human,
      b = frame.bot,
      hFall = 0,
      bFall = 0;
    const m = frame.motion;
    const mix = (a: DeskPoint, z: DeskPoint, t: number) => ({
      x: a.x + (z.x - a.x) * t,
      y: a.y + (z.y - a.y) * t,
    });
    if (m && progress < 1) {
      const before = Math.min(1, progress / 0.38);
      const after = Math.max(0, (progress - 0.38) / 0.62);
      const ease = 1 - (1 - after) ** 3;
      const contact = m.hit ? m.contact : m.end;
      const a =
        progress < 0.38
          ? mix(m.from, contact, 1 - (1 - before) ** 2)
          : mix(contact, m.end, ease);
      const t = mix(m.targetFrom, m.targetEnd, ease);
      h = m.actor === "human" ? a : t;
      b = m.actor === "human" ? t : a;
      const falling = Math.max(0, (progress - 0.7) / 0.3);
      hFall = (m.actor === "human" ? m.actorOut : m.targetOut) ? falling : 0;
      bFall = (m.actor === "melabot" ? m.actorOut : m.targetOut) ? falling : 0;
    }
    place(human.group, h, 1, hFall);
    place(bot.group, b, -1, bFall);
    if (m?.hit && progress > 0.38 && progress < 1) {
      // Brief surface recoil, not persistent orientation or collision physics.
      const recoil = Math.sin(((progress - 0.38) / 0.62) * Math.PI) * 0.13;
      const struck = m.actor === "human" ? bot.group : human.group;
      struck.rotation.z += recoil;
      struck.rotation.y += recoil * (m.actor === "human" ? 1 : -1);
    }
    if (frame.completed && m && progress >= 1) {
      human.group.visible = !(m.actor === "human" ? m.actorOut : m.targetOut);
      bot.group.visible = !(m.actor === "melabot" ? m.actorOut : m.targetOut);
    }
    // Without live out flags, render recorded positions. A boundary centre may
    // be a GUARD save, so coordinates alone cannot prove that this pen fell.
    human.body.color.set(
      frame.pen === "pen-gel"
        ? "#11a9aa"
        : frame.pen === "pen-metal"
          ? "#94b3bd"
          : frame.pen === "pen-fountain"
            ? "#233a70"
            : "#f0eadb",
    );
    ring.visible =
      arrow.visible =
      shaft.visible =
        frame.interactive && progress >= 1;
    ring.position.set(h.x - 500, 2, h.y - 500);
    aimMarker.visible = frame.interactive && progress >= 1;
    aimMarker.position.set(frame.aim.x - 500, 26, frame.aim.y - 500);
    ring.scale.setScalar(frame.aiming ? 1.12 : 1);
    finger.visible = tether.visible =
      frame.aiming && !!frame.pull && progress >= 1;
    if (frame.pull) {
      const delta = new T.Vector3(frame.pull.x - h.x, 0, frame.pull.y - h.y);
      tether.scale.y = delta.length();
      tether.position.set(
        (frame.pull.x + h.x) / 2 - 500,
        5,
        (frame.pull.y + h.y) / 2 - 500,
      );
      if (delta.length() > 0)
        tether.quaternion.setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          delta.normalize(),
        );
      finger.position.set(frame.pull.x - 500, 5, frame.pull.y - 500);
    }
    const direction = new T.Vector3(frame.aim.x - h.x, 0, frame.aim.y - h.y);
    if (direction.length() < 1) direction.set(1, 0, 0);
    arrow.position.set(h.x - 500, 5, h.y - 500);
    arrow.setDirection(direction.normalize());
    arrow.setLength(110 + frame.power * 1.9, 32, 23);
    arrow.setColor(frame.power > 75 ? 0xd64726 : 0x087e83);
    const shaftLength = 110 + frame.power * 1.9 - 24;
    shaft.scale.y = shaftLength;
    shaft.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction);
    shaft.position
      .copy(arrow.position)
      .addScaledVector(direction, shaftLength / 2);
    (shaft.material as T.MeshBasicMaterial).color.set(
      frame.power > 75 ? 0xd64726 : 0x087e83,
    );
    impact.visible = !!m?.hit && progress > 0.38 && progress < 0.7;
    if (m) {
      impact.position.set(m.contact.x - 500, 4, m.contact.y - 500);
      impact.scale.setScalar(1 + Math.max(0, progress - 0.38) * 9);
    }
    // Names belong in the clear upper margin, never over a pen or its aim line.
    labels.forEach((label, i) => {
      label.style.left = i ? "78%" : "22%";
      label.style.top = "5%";
      labels[i].hidden =
        progress < 1 || !(i ? bot.group.visible : human.group.visible);
    });
    host.dataset.human = `${h.x.toFixed(1)},${h.y.toFixed(1)}`;
    host.dataset.bot = `${b.x.toFixed(1)},${b.y.toFixed(1)}`;
    host.dataset.animating = String(progress < 1);
    host.dataset.aim = `${frame.aim.x},${frame.aim.y}`;
    renderer.render(scene, camera);
  }
  resize();
  return {
    draw,
    project: (point: DeskPoint) => deskToScreen(camera, point),
    point: (clientX: number, clientY: number) => {
      const rect = host.getBoundingClientRect();
      return screenToDesk(
        camera,
        (clientX - rect.left) / rect.width,
        (clientY - rect.top) / rect.height,
      );
    },
    dispose: () => {
      observer.disconnect();
      const geometries = new Set<T.BufferGeometry>(),
        materials = new Set<T.Material>();
      scene.traverse((object) => {
        if (object instanceof T.Mesh || object instanceof T.Line) {
          geometries.add(object.geometry);
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((m) => materials.add(m));
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
