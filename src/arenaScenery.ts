import * as THREE from "three";
import type { ArenaKind } from "../spacetimedb/src/arenaRules";

export const ARENA_THEMES = {
  crown_run: {
    sky: 0x383449,
    ground: 0x584858,
    tileA: 0xcaa382,
    tileB: 0xb38b71,
    obstacle: 0xb96345,
    light: 0xffd4a2,
    name: "Festival rooftops",
  },
  bridge_breakers: {
    sky: 0x17394a,
    ground: 0x236578,
    tileA: 0xa2b7b5,
    tileB: 0x829b9c,
    obstacle: 0x5a7479,
    light: 0xd7f2ec,
    name: "The turning crossing",
  },
  mela_heist: {
    sky: 0x211e36,
    ground: 0x34304b,
    tileA: 0x77718c,
    tileB: 0x5e5b75,
    obstacle: 0x786746,
    light: 0xe8d0ff,
    name: "The clockwork vault",
  },
} as const;

/** Authored stage dressing only. Board coordinates and colliders remain in arenaRules. */
export function createArenaScenery(scene: THREE.Scene, kind: ArenaKind) {
  const group = new THREE.Group();
  scene.add(group);
  const geometries: THREE.BufferGeometry[] = [],
    materials: THREE.Material[] = [];
  const mat = (color: number, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.68,
      metalness,
    });
    materials.push(m);
    return m;
  };
  const brass = mat(0xd4ad68, 0.6),
    dark = mat(0x344454),
    stone = mat(0x657c85),
    roof = mat(0xa26358),
    plaster = mat(0xac947e),
    light = mat(0xffdf9f),
    teal = mat(0x47cdbf);
  const add = (
    geo: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = group,
  ) => {
    geometries.push(geo);
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    parent: THREE.Object3D = group,
  ) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  // Two distinct banks make the actual three-cell movable crossing legible.
  for (const x of [-2.5, 2.5]) {
    box(x, -0.9, 0, 4, 0.9, 9.25, kind === "crown_run" ? plaster : stone);
    for (const z of [-4, 4])
      box(x, -1.8, z, 1.3, 1.4, 1.3, kind === "mela_heist" ? dark : stone);
  }
  const bridge = new THREE.Group();
  group.add(bridge);
  for (const x of [-0.51, 0.51]) {
    box(x, -0.2, 0, 0.07, 0.08, 3, brass, bridge);
    for (const z of [-1.35, 1.35])
      box(x, 0.05, z, 0.08, 0.5, 0.08, brass, bridge);
  }
  // Goals are visually distinct but occupy the same authoritative portal cells.
  for (const side of [-1, 1]) {
    const portal = new THREE.Group();
    portal.position.set(side * 4, 0, 0);
    group.add(portal);
    for (const z of [-0.48, 0.48])
      box(0, 0.47, z, 0.1, 1.1, 0.1, side < 0 ? brass : teal, portal);
    box(0, 1.02, 0, 0.12, 0.14, 1.05, side < 0 ? brass : teal, portal);
  }
  if (kind === "crown_run") {
    // Low skyline stays outside the selectable board and away from near-side sightlines.
    for (let i = 0; i < 8; i++) {
      const x = -6 + i * 1.7,
        height = 1.1 + (i % 3) * 0.55;
      box(x, -0.5, -6.2, 1.25, height, 1.15, plaster);
      box(x, height / 2 - 0.4, -6.2, 1.4, 0.18, 1.3, roof);
      box(x, -0.3, -5.61, 0.35, 0.5, 0.02, light);
    }
    for (let i = 0; i < 9; i++) {
      const x = -4.8 + i * 1.2;
      const flag = add(
        new THREE.ConeGeometry(0.16, 0.3, 3),
        i % 2 ? teal : brass,
        x,
        1.7 - Math.sin((i / 8) * Math.PI) * 0.5,
        -5.1,
      );
      flag.rotation.z = Math.PI;
    }
  } else if (kind === "bridge_breakers") {
    for (const x of [-5.25, 5.25]) {
      for (const z of [-3.6, 3.6]) {
        box(x, 0.2, z, 0.45, 2.1, 0.45, stone);
        box(x, 1.3, z, 0.7, 0.18, 0.7, brass);
      }
      box(x, -0.2, 0, 0.2, 0.2, 8, brass);
    }
    // Water markings remain static: no fake authoritative simulation tick.
    for (let i = 0; i < 14; i++)
      box(-0.2 + (i % 3) * 0.2, -1.01, -6 + i * 0.9, 0.35, 0.015, 0.25, teal);
    for (const x of [-2.5, 2.5]) {
      const wheel = add(
        new THREE.TorusGeometry(0.7, 0.09, 8, 24),
        brass,
        x,
        -1.1,
        -4.8,
      );
      wheel.rotation.y = Math.PI / 2;
      box(x, -1.1, -4.8, 0.14, 1.3, 0.12, brass);
    }
  } else {
    // Vault machinery frames the two switches; no tall wall occludes playable cells.
    for (const x of [-5.15, 5.15]) {
      box(x, -0.25, 0, 0.22, 0.65, 9.6, brass);
      for (const z of [-4.7, 4.7]) {
        add(new THREE.CylinderGeometry(0.24, 0.3, 1.25, 12), brass, x, 0.05, z);
        add(new THREE.SphereGeometry(0.18, 12, 8), teal, x, 0.78, z);
      }
    }
    for (const x of [-2.6, 0, 2.6]) {
      const gear = add(
        new THREE.TorusGeometry(0.6, 0.14, 8, 16),
        brass,
        x,
        0.4,
        -5.1,
      );
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const tooth = box(
          x + Math.cos(angle) * 0.67,
          0.4 + Math.sin(angle) * 0.67,
          -5.1,
          0.24,
          0.22,
          0.2,
          brass,
        );
        tooth.rotation.z = angle;
      }
      gear.rotation.z = 0.2;
    }
  }
  return {
    update(bridgeRow: number) {
      bridge.position.z = bridgeRow - 4;
    },
    dispose() {
      scene.remove(group);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
