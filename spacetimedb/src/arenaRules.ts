/** Versioned deterministic rules. No networking, clock, model, or client authority. */
export const ARENA_GAMES = [
  "crown_run",
  "bridge_breakers",
  "mela_heist",
] as const;
export type ArenaKind = (typeof ARENA_GAMES)[number];
export type Side = 0 | 1;
export type Action = {
  action: "move" | "dash" | "guard" | "shove" | "interact";
  x: number;
  y: number;
};
export type Policy = "runner" | "defender" | "trickster";
export type Pawn = { x: number; y: number; score: number; stamina: number };
export type ArenaState = {
  version: 1;
  kind: ArenaKind;
  beat: number;
  pawns: [Pawn, Pawn];
  crown: { x: number; y: number; carrier: number };
  bridge: number;
  walls: number[];
  switchMask: number;
  treasure: boolean;
  winner: string;
  log: string[];
  eggs: string[];
  visited: number[];
};
export const SIZE = 9;
export const MAX_BEATS = 24;
export const POLICIES: Policy[] = ["runner", "defender", "trickster"];
export const DEFAULT_WALLS = [12, 21, 57, 66];
export const encodeCell = (x: number, y: number) => y * SIZE + x;
export function isArenaKind(v: string): v is ArenaKind {
  return (ARENA_GAMES as readonly string[]).includes(v);
}
export function validateCourse(walls: unknown): number[] {
  if (
    !Array.isArray(walls) ||
    walls.length > 14 ||
    walls.some((v) => !Number.isInteger(v) || v < 0 || v >= 81)
  )
    throw Error("Use up to 14 course blocks.");
  const out = [...new Set(walls)] as number[];
  for (const cell of [36, 44, 40, 10, 70])
    if (out.includes(cell))
      throw Error("Keep starts, crown and switches clear.");
  // Every tile must be reachable from a start. No inaccessible traps or goals.
  const seen = new Set([36]);
  const queue = [36];
  while (queue.length) {
    const c = queue.shift()!;
    const x = c % 9,
      y = Math.floor(c / 9);
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        n = encodeCell(nx, ny);
      if (
        nx >= 0 &&
        nx < 9 &&
        ny >= 0 &&
        ny < 9 &&
        (nx !== 4 || Math.abs(ny - 4) <= 1) &&
        !out.includes(n) &&
        !seen.has(n)
      ) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  const reachableTiles = Array.from({ length: 81 }, (_, i) => i).filter(
    (i) =>
      !out.includes(i) && (i % 9 !== 4 || Math.abs(Math.floor(i / 9) - 4) <= 1),
  ).length;
  if (seen.size !== reachableTiles)
    throw Error("Every open tile needs a path to the finish.");
  return out.sort((a, b) => a - b);
}
export function initialArena(
  kind: ArenaKind,
  walls: number[] = DEFAULT_WALLS,
): ArenaState {
  return {
    version: 1,
    kind,
    beat: 0,
    pawns: [
      { x: 0, y: 4, score: 0, stamina: 2 },
      { x: 8, y: 4, score: 0, stamina: 2 },
    ],
    crown: { x: 4, y: 4, carrier: -1 },
    bridge: 4,
    walls: validateCourse(walls),
    switchMask: 0,
    treasure: false,
    winner: "",
    log: [
      kind === "mela_heist"
        ? "Stand on both gold switches together. Then bring the treasure home."
        : kind === "bridge_breakers"
          ? "Race to the opposite portal. Avoid the blocks."
          : "Grab the crown. Bring it to your portal. First to two.",
    ],
    eggs: [],
    visited: [],
  };
}
function open(s: ArenaState, x: number, y: number) {
  return (
    x >= 0 &&
    x < 9 &&
    y >= 0 &&
    y < 9 &&
    !s.walls.includes(encodeCell(x, y)) &&
    (x !== 4 || Math.abs(y - s.bridge) <= 1)
  );
}
export function legalActions(s: ArenaState, side: Side): Action[] {
  if (s.winner) return [];
  const p = s.pawns[side],
    out: Action[] = [
      { action: "guard", x: p.x, y: p.y },
      { action: "interact", x: p.x, y: p.y },
      { action: "shove", x: p.x, y: p.y },
    ];
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const x = p.x + dx,
      y = p.y + dy;
    if (!open(s, x, y)) continue;
    out.push({ action: "move", x, y });
    if (p.stamina >= 2 && s.crown.carrier !== side && open(s, x + dx, y + dy))
      out.push({ action: "dash", x: x + dx, y: y + dy });
  }
  return out;
}
export function validateArenaAction(s: ArenaState, side: Side, a: Action) {
  if (
    !a ||
    !legalActions(s, side).some(
      (v) => v.action === a.action && v.x === a.x && v.y === a.y,
    )
  )
    throw Error("That move is no longer available. Choose a highlighted tile.");
}
export type CrowdMove = {
  power: "bridge" | "spring" | "lantern";
  actor: string;
};
export const ARENA_POWERS = {
  bridge: { cost: 20, cooldown: 20000000n, label: "Turn bridge" },
  spring: { cost: 15, cooldown: 15000000n, label: "Spring charge" },
  lantern: { cost: 10, cooldown: 12000000n, label: "Lantern lift" },
} as const;
export function resolveArena(
  s: ArenaState,
  actions: [Action, Action],
  crowd?: CrowdMove,
): ArenaState {
  validateArenaAction(s, 0, actions[0]);
  validateArenaAction(s, 1, actions[1]);
  const n: ArenaState = JSON.parse(JSON.stringify(s));
  n.beat++;
  n.log = [];
  if (crowd?.power === "bridge") {
    n.bridge = s.bridge === 4 ? 2 : s.bridge === 2 ? 6 : 4;
    n.log.push(`${crowd.actor} turned the bridge.`);
  }
  if (crowd?.power === "spring") {
    n.pawns.forEach((p) => (p.stamina = 2));
    n.log.push(`${crowd.actor} recharged both runners.`);
  }
  if (crowd?.power === "lantern") {
    n.log.push(`${crowd.actor} protected both runners from shoves this beat.`);
  }
  for (const side of [0, 1] as Side[]) {
    const a = actions[side],
      p = n.pawns[side];
    if (a.action === "move" || a.action === "dash") {
      // Validate again after the crowd changes the course. A closed crossing
      // holds the move; it cannot teleport a runner through a removed bridge.
      const steps = a.action === "dash" ? 2 : 1,
        dx = Math.sign(a.x - p.x),
        dy = Math.sign(a.y - p.y);
      if (
        Array.from({ length: steps }, (_, i) =>
          open(n, p.x + dx * (i + 1), p.y + dy * (i + 1)),
        ).every(Boolean)
      ) {
        p.x = a.x;
        p.y = a.y;
        n.log.push(
          `${side === 0 ? "Amber" : "Teal"} ${a.action === "dash" ? "dashed" : "stepped"} ${dx > 0 ? "east" : dx < 0 ? "west" : dy > 0 ? "south" : "north"}.`,
        );
        p.stamina = a.action === "dash" ? 0 : Math.min(2, p.stamina + 1);
      } else
        n.log.push(
          `${side === 0 ? "Amber" : "Teal"} waited at the closed crossing.`,
        );
    } else {
      p.stamina = Math.min(2, p.stamina + 1);
      if (a.action === "guard")
        n.log.push(`${side === 0 ? "Amber" : "Teal"} guarded and recharged.`);
    }
  }
  if (crowd?.power === "spring") n.pawns.forEach((p) => (p.stamina = 2));
  const distance =
    Math.abs(n.pawns[0].x - n.pawns[1].x) +
    Math.abs(n.pawns[0].y - n.pawns[1].y);
  if (s.kind !== "mela_heist" && crowd?.power !== "lantern")
    for (const side of [0, 1] as Side[]) {
      const other = (1 - side) as Side;
      if (
        actions[side].action === "shove" &&
        distance <= 1 &&
        actions[other].action !== "guard" &&
        actions[other].action !== "shove"
      ) {
        const p = n.pawns[other];
        if (n.crown.carrier === other) {
          n.crown = { x: p.x, y: p.y, carrier: -1 };
          n.log.push(
            `${side === 0 ? "Amber" : "Teal"} knocked the crown loose!`,
          );
        }
        const x = p.x + (side === 0 ? 1 : -1);
        if (open(n, x, p.y)) p.x = x;
      }
    }
  if (s.kind === "bridge_breakers") {
    for (const side of [0, 1] as Side[])
      if (n.pawns[side].x === (side === 0 ? 8 : 0) && n.pawns[side].y === 4)
        n.pawns[side].score = 1;
    if (n.pawns[0].score || n.pawns[1].score)
      n.winner =
        n.pawns[0].score === n.pawns[1].score
          ? "draw"
          : n.pawns[0].score
            ? "human"
            : "melabot";
    if (n.pawns.some((p) => p.y === 0) && !n.eggs.includes("sky-route")) {
      n.eggs.push("sky-route");
      n.log.push("A paper kite followed your high road.");
    }
    if (
      actions.every((a) => a.action === "dash") &&
      !n.eggs.includes("double-spark")
    ) {
      n.eggs.push("double-spark");
      n.log.push("Twin trails! Two comets crossed the course.");
    }
  } else {
    if (s.kind === "mela_heist") {
      const cells = n.pawns.map((p) => encodeCell(p.x, p.y));
      if (cells.includes(10) && cells.includes(70)) {
        n.switchMask = 3;
        n.log.push("Both switches opened the treasure vault!");
      }
      if (
        actions.every((a) => a.action === "guard") &&
        !n.eggs.includes("tea-break")
      ) {
        n.eggs.push("tea-break");
        n.log.push("The watchman takes a tiny chai break with you.");
      }
      if (
        n.switchMask === 3 &&
        n.beat <= 10 &&
        !n.eggs.includes("silent-partners")
      ) {
        n.eggs.push("silent-partners");
        n.log.push("Silent partners: the brass owl bows.");
      }
    }
    const contenders = ([0, 1] as Side[]).filter((side) => {
      const p = n.pawns[side];
      return (
        n.crown.carrier < 0 &&
        p.x === n.crown.x &&
        p.y === n.crown.y &&
        actions[side].action === "interact" &&
        (s.kind !== "mela_heist" || n.switchMask === 3)
      );
    });
    if (contenders.length === 1) {
      n.crown.carrier = contenders[0];
      n.log.push(
        `${contenders[0] === 0 ? "Amber" : "Teal"} picked up the ${s.kind === "mela_heist" ? "treasure" : "crown"}!`,
      );
    }
    if (contenders.length === 2) {
      n.crown.carrier = n.beat % 2;
      n.log.push(
        `A shared reach! ${n.crown.carrier === 0 ? "Amber" : "Teal"} takes the alternating tie-break.`,
      );
    }
    if (n.crown.carrier >= 0) {
      const side = n.crown.carrier as Side,
        p = n.pawns[side];
      n.crown.x = p.x;
      n.crown.y = p.y;
      if (
        p.x === (side === 0 ? 0 : 8) &&
        p.y === 4 &&
        actions[side].action === "interact"
      ) {
        p.score++;
        n.log.push(`${side === 0 ? "Amber" : "Teal"} brought it home!`);
        n.crown = { x: 4, y: 4, carrier: -1 };
        if (s.kind === "mela_heist") {
          n.treasure = true;
          n.winner = "team";
        } else if (p.score >= 2) n.winner = side === 0 ? "human" : "melabot";
      }
    }
    if (s.kind === "crown_run") {
      if (
        n.pawns.every((p) => Math.abs(p.x - 4) + Math.abs(p.y - 4) <= 1) &&
        actions.every((a) => a.action === "guard") &&
        !n.eggs.includes("royal-bow")
      ) {
        n.eggs.push("royal-bow");
        n.log.push("Royal courtesy: even rivals can bow.");
      }
      if (
        n.crown.carrier >= 0 &&
        n.pawns[n.crown.carrier].y === 0 &&
        !n.eggs.includes("moon-crown")
      ) {
        n.eggs.push("moon-crown");
        n.log.push("The moon moths salute their wandering monarch.");
      }
    }
  }
  if (!n.winner && n.beat >= MAX_BEATS)
    n.winner =
      s.kind === "mela_heist"
        ? "timeout"
        : n.pawns[0].score === n.pawns[1].score
          ? "draw"
          : n.pawns[0].score > n.pawns[1].score
            ? "human"
            : "melabot";
  if (n.winner)
    n.log.push(
      n.winner === "team"
        ? "Treasure rescued. Together."
        : n.winner === "timeout"
          ? "The vault closes. Try a new plan."
          : n.winner === "draw"
            ? "Evenly matched. A draw."
            : `${n.winner === "human" ? "Amber" : "Teal"} wins.`,
    );
  if (!n.log.length) n.log.push("Both plans are in motion.");
  n.visited = [
    ...new Set([...n.visited, ...n.pawns.map((p) => encodeCell(p.x, p.y))]),
  ];
  return n;
}
function pathDistance(
  s: ArenaState,
  x: number,
  y: number,
  gx: number,
  gy: number,
) {
  const q: [[number, number], number][] = [[[x, y], 0]],
    seen = new Set<number>();
  while (q.length) {
    const [[cx, cy], d] = q.shift()!;
    if (cx === gx && cy === gy) return d;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cx + dx,
        ny = cy + dy,
        id = encodeCell(nx, ny);
      if (open(s, nx, ny) && !seen.has(id)) {
        seen.add(id);
        q.push([[nx, ny], d + 1]);
      }
    }
  }
  return 99;
}
export function decideArena(
  s: ArenaState,
  side: Side,
  policy: Policy = "runner",
): Action {
  const p = s.pawns[side],
    other = s.pawns[1 - side];
  let gx = 4,
    gy = 4;
  if (s.kind === "bridge_breakers") {
    gx = side === 0 ? 8 : 0;
  } else if (s.kind === "mela_heist" && s.switchMask !== 3) {
    gx = side === 0 ? 1 : 7;
    gy = side === 0 ? 1 : 7;
  } else if (s.crown.carrier === side) {
    gx = side === 0 ? 0 : 8;
  } else if (s.crown.carrier >= 0) {
    gx = other.x;
    gy = other.y;
  } else {
    gx = s.crown.x;
    gy = s.crown.y;
  }
  if (s.kind !== "bridge_breakers" && p.x === gx && p.y === gy)
    return {
      action:
        s.kind === "mela_heist" && s.switchMask !== 3 ? "guard" : "interact",
      x: p.x,
      y: p.y,
    };
  if (
    s.kind === "crown_run" &&
    s.crown.carrier === 1 - side &&
    Math.abs(p.x - other.x) + Math.abs(p.y - other.y) <= 1
  )
    return { action: "shove", x: p.x, y: p.y };
  if (
    policy === "defender" &&
    s.kind === "crown_run" &&
    s.crown.carrier < 0 &&
    s.beat < 3
  ) {
    gx = side === 0 ? 3 : 5;
    gy = 4;
  }
  const choices = legalActions(s, side).filter(
    (a) => a.action === "move" || a.action === "dash",
  );
  return (
    choices.sort(
      (a, b) =>
        pathDistance(s, a.x, a.y, gx, gy) -
        pathDistance(s, b.x, b.y, gx, gy) +
        (policy === "trickster" ? (b.y - a.y) * 0.02 : 0),
    )[0] ?? { action: "guard", x: p.x, y: p.y }
  );
}
