import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { type Action, type ArenaState } from "../spacetimedb/src/arenaRules";

/** A projection of committed board coordinates. Rendering never resolves a move. */
export default function ArenaStage({
  state,
  choices,
  onChoose,
  camera,
}: {
  state: ArenaState;
  choices: Action[];
  onChoose: (a: Action) => void;
  camera: string;
}) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef({ state, choices, onChoose, camera });
  latest.current = { state, choices, onChoose, camera };
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError(true);
      return;
    }
    const element = host.current;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      cam = new THREE.OrthographicCamera(-7, 7, 7, -7, 0.1, 100);
    scene.background = new THREE.Color("#172b36");
    scene.fog = new THREE.Fog("#172b36", 25, 65);
    scene.add(new THREE.HemisphereLight(0xe1faff, 0x473127, 2.6));
    const sun = new THREE.DirectionalLight(0xffe4b3, 4);
    sun.position.set(-7, 15, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -9;
    sun.shadow.camera.right = 9;
    sun.shadow.camera.top = 9;
    sun.shadow.camera.bottom = -9;
    scene.add(sun);
    const materials: THREE.Material[] = [],
      geometries: THREE.BufferGeometry[] = [];
    const material = (color: number, metalness = 0) => {
      const m = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.65,
        metalness,
      });
      materials.push(m);
      return m;
    };
    const mesh = (
      g: THREE.BufferGeometry,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
      parent: THREE.Object3D = scene,
    ) => {
      geometries.push(g);
      const o = new THREE.Mesh(g, m);
      o.position.set(x, y, z);
      o.castShadow = true;
      o.receiveShadow = true;
      parent.add(o);
      return o;
    };
    const grass = material(0x48685e),
      stone = material(0x799284),
      water = material(0x214758, 0.35),
      wood = material(0xcfa77a),
      gold = material(0xffc259, 0.5),
      dark = material(0x17262f),
      cream = material(0xffead1),
      teal = material(0x50d3c7),
      amber = material(0xff965b),
      hint = material(0xabecb7);
    mesh(new THREE.BoxGeometry(12, 0.6, 12), water, 0, -1, 0);
    const tiles: THREE.Mesh[] = [],
      blocks: THREE.Mesh[] = [],
      highlights: THREE.Mesh[] = [];
    for (let y = 0; y < 9; y++)
      for (let x = 0; x < 9; x++) {
        tiles.push(
          mesh(
            new THREE.BoxGeometry(0.95, 0.38, 0.95),
            x === 4 ? wood : (x + y) % 2 ? grass : stone,
            x - 4,
            -0.3,
            y - 4,
          ),
        );
        const b = mesh(
          new THREE.BoxGeometry(0.82, 0.9, 0.82),
          wood,
          x - 4,
          0.25,
          y - 4,
        );
        blocks.push(b);
        const h = mesh(
          new THREE.BoxGeometry(0.82, 0.045, 0.82),
          hint,
          x - 4,
          -0.07,
          y - 4,
        );
        highlights.push(h);
      }
    for (const x of [-4, 4]) {
      mesh(
        new THREE.TorusGeometry(0.4, 0.08, 8, 32),
        x < 0 ? amber : teal,
        x,
        0.15,
        0,
      ).rotation.x = Math.PI / 2;
    }
    const switches = [10, 70].map((cell) => {
      const o = mesh(
        new THREE.CylinderGeometry(0.33, 0.36, 0.06, 16),
        gold,
        (cell % 9) - 4,
        -0.05,
        Math.floor(cell / 9) - 4,
      );
      return o;
    });
    function character(color: THREE.Material) {
      const g = new THREE.Group();
      scene.add(g);
      mesh(new THREE.CapsuleGeometry(0.22, 0.28, 4, 12), color, 0, 0.42, 0, g);
      mesh(new THREE.SphereGeometry(0.25, 16, 12), cream, 0, 0.8, 0, g);
      mesh(
        new THREE.SphereGeometry(0.27, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        color,
        0,
        0.83,
        0,
        g,
      );
      for (const x of [-0.09, 0.09]) {
        mesh(new THREE.SphereGeometry(0.032, 8, 8), dark, x, 0.81, 0.23, g);
        mesh(new THREE.BoxGeometry(0.14, 0.12, 0.25), dark, x, 0.07, 0.02, g);
      }
      mesh(new THREE.BoxGeometry(0.37, 0.09, 0.12), color, 0, 0.58, -0.2, g);
      return g;
    }
    const pawns = [character(amber), character(teal)];
    pawns[0].position.x = -4;
    pawns[1].position.x = 4;
    const crown = new THREE.Group();
    scene.add(crown);
    mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.18, 8), gold, 0, 0, 0, crown);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      mesh(
        new THREE.ConeGeometry(0.065, 0.2, 4),
        gold,
        Math.cos(a) * 0.19,
        0.15,
        Math.sin(a) * 0.19,
        crown,
      );
    }
    const ring = mesh(
      new THREE.TorusGeometry(0.48, 0.025, 5, 40),
      gold,
      0,
      0.15,
      0,
    );
    ring.rotation.x = Math.PI / 2;
    // Lanterns and a restrained fairground skyline frame the playable space.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2,
        x = Math.cos(a) * 6,
        z = Math.sin(a) * 6;
      mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.9, 6), wood, x, 0, z);
      mesh(new THREE.OctahedronGeometry(0.22), i % 2 ? gold : teal, x, 1.1, z);
    }
    const moon = mesh(new THREE.SphereGeometry(0.65, 20, 12), gold, -6, 3, -5);
    const kite = mesh(new THREE.OctahedronGeometry(0.5, 0), amber, 3, 2, -5);
    const cup = new THREE.Group();
    scene.add(cup);
    mesh(
      new THREE.CylinderGeometry(0.16, 0.12, 0.25, 12),
      cream,
      0,
      0.15,
      0,
      cup,
    );
    mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 12), gold, 0.18, 0.17, 0, cup);
    const owl = new THREE.Group();
    scene.add(owl);
    mesh(new THREE.SphereGeometry(0.25, 10, 10), gold, 0, 0, 0, owl);
    for (const x of [-0.1, 0.1]) {
      mesh(new THREE.SphereGeometry(0.085, 8, 8), cream, x, 0.05, 0.2, owl);
      mesh(new THREE.SphereGeometry(0.035, 6, 6), dark, x, 0.05, 0.27, owl);
    }
    owl.position.set(-5, 0.8, -4);
    const moths = Array.from({ length: 6 }, (_, i) =>
      mesh(new THREE.OctahedronGeometry(0.06), cream, 0, 0, i),
    );
    const ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    const click = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, cam);
      const hit = ray.intersectObjects(tiles.filter((t) => t.visible))[0];
      if (!hit) return;
      const x = Math.round(hit.object.position.x + 4),
        y = Math.round(hit.object.position.z + 4);
      const a = latest.current.choices.find(
        (v) =>
          v.x === x &&
          v.y === y &&
          (v.action === "move" || v.action === "dash"),
      );
      if (a) latest.current.onChoose(a);
    };
    renderer.domElement.addEventListener("pointerup", click);
    renderer.domElement.setAttribute(
      "aria-label",
      "3D arena. Use the move controls below or select a lit tile.",
    );
    const resize = () => {
      const w = element.clientWidth,
        h = element.clientHeight;
      renderer.setSize(w, h);
      const scale = 7;
      cam.left = (-scale * w) / h;
      cam.right = (scale * w) / h;
      cam.top = scale;
      cam.bottom = -scale;
      cam.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    let frame = 0,
      prior = performance.now();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function animate(time: number) {
      const dt = Math.min(0.1, (time - prior) / 1000);
      prior = time;
      const { state: s, choices, camera: view } = latest.current;
      const target =
        view === "top"
          ? new THREE.Vector3(0, 18, 0.01)
          : view === "side"
            ? new THREE.Vector3(12, 10, 9)
            : new THREE.Vector3(9, 13, 12);
      cam.position.lerp(target, reduced ? 1 : 1 - Math.exp(-dt * 6));
      cam.lookAt(0, 0, 0);
      for (let i = 0; i < 81; i++) {
        const x = i % 9,
          y = Math.floor(i / 9);
        tiles[i].visible = x !== 4 || Math.abs(y - s.bridge) <= 1;
        blocks[i].visible = s.walls.includes(i) && tiles[i].visible;
        highlights[i].visible = choices.some(
          (a) =>
            a.x === x &&
            a.y === y &&
            (a.action === "move" || a.action === "dash"),
        );
      }
      pawns.forEach((p, i) => {
        const a = s.pawns[i],
          same = a.x === s.pawns[1 - i].x && a.y === s.pawns[1 - i].y;
        const target = new THREE.Vector3(
          a.x - 4 + (same ? (i ? 0.18 : -0.18) : 0),
          0,
          a.y - 4,
        );
        p.position.lerp(target, reduced ? 1 : 1 - Math.exp(-dt * 8));
        p.rotation.y = i ? -0.35 : 0.35;
      });
      switches.forEach((o) => (o.visible = s.kind === "mela_heist"));
      crown.visible =
        s.kind !== "bridge_breakers" &&
        (s.kind !== "mela_heist" || s.switchMask === 3);
      const cp =
        s.crown.carrier >= 0
          ? pawns[s.crown.carrier].position
          : new THREE.Vector3(s.crown.x - 4, 0, s.crown.y - 4);
      crown.position.set(
        cp.x,
        s.crown.carrier >= 0
          ? 1.35
          : 0.55 + (reduced ? 0 : Math.sin(time * 0.002) * 0.07),
        cp.z,
      );
      crown.rotation.y = time * 0.0005;
      ring.visible = crown.visible;
      ring.position.x = cp.x;
      ring.position.z = cp.z;
      moon.rotation.y = time * 0.0001;
      kite.visible = s.eggs.includes("sky-route");
      kite.rotation.z = reduced ? 0.2 : Math.sin(time * 0.001) * 0.2;
      cup.visible = s.eggs.includes("tea-break");
      cup.position.copy(pawns[0].position).add(new THREE.Vector3(0.5, 0, 0.3));
      owl.visible = s.eggs.includes("silent-partners");
      owl.rotation.x = reduced ? 0 : Math.sin(time * 0.001) * 0.12;
      moths.forEach((m, i) => {
        m.visible = s.eggs.includes("moon-crown");
        const a = time * 0.0008 + i;
        m.position.set(
          cp.x + Math.cos(a) * 0.65,
          1.4 + Math.sin(a * 2) * 0.15,
          cp.z + Math.sin(a) * 0.65,
        );
      });
      if (s.eggs.includes("royal-bow"))
        pawns.forEach(
          (p) => (p.rotation.x = reduced ? 0 : Math.sin(time * 0.002) * 0.08),
        );
      if (s.eggs.includes("double-spark")) ring.visible = true;
      renderer.render(scene, cam);
      frame = requestAnimationFrame(animate);
    }
    cam.position.set(9, 13, 12);
    frame = requestAnimationFrame(animate);
    const lost = (e: Event) => {
      e.preventDefault();
      setError(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerup", click);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div className="arena-stage" ref={host}>
      {error && (
        <p className="arena-render-error">
          The 3D view could not open. Your match is safe; use the move controls
          below or reload to restore it.
        </p>
      )}
    </div>
  );
}
