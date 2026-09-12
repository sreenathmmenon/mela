import test from "node:test";
import assert from "node:assert/strict";
import {
  ARENA_GAMES,
  ARENA_POWERS,
  POLICIES,
  initialArena,
  legalActions,
  decideArena,
  resolveArena,
  validateArenaAction,
  validateCourse,
  type Action,
  type ArenaState,
} from "../spacetimedb/src/arenaRules";
import { parseAstraJSON } from "../remote/arena";
const guard = (s: ArenaState, side: 0 | 1): Action => ({
  action: "guard",
  x: s.pawns[side].x,
  y: s.pawns[side].y,
});
test("arena: every policy proposes legal deterministic actions through all three game lifecycles", () => {
  for (const kind of ARENA_GAMES)
    for (const left of POLICIES)
      for (const right of POLICIES) {
        let s = initialArena(kind);
        while (!s.winner) {
          const a = decideArena(s, 0, left),
            b = decideArena(s, 1, right);
          assert.deepEqual(a, decideArena(s, 0, left));
          validateArenaAction(s, 0, a);
          validateArenaAction(s, 1, b);
          const copy = structuredClone(s);
          const n = resolveArena(s, [a, b]);
          assert.deepEqual(s, copy, "input is immutable");
          assert.equal(n.beat, s.beat + 1);
          s = n;
        }
        assert.ok(s.beat <= 24);
        assert.equal(legalActions(s, 0).length, 0);
      }
});
test("arena: illegal coordinates, diagonals, teleport, actions and exhausted dashes rejected", () => {
  const s = initialArena("crown_run");
  for (const a of [
    { action: "move", x: 8, y: 4 },
    { action: "move", x: 1, y: 5 },
    { action: "move", x: -1, y: 4 },
    { action: "win", x: 0, y: 4 },
  ])
    assert.throws(() => validateArenaAction(s, 0, a as Action));
  s.pawns[0].stamina = 0;
  assert.throws(() =>
    validateArenaAction(s, 0, { action: "dash", x: 2, y: 4 }),
  );
});
test("arena: crown pickup, carry restriction, bank and winning result", () => {
  let s = initialArena("crown_run");
  s.pawns[0].x = 4;
  s = resolveArena(s, [{ action: "interact", x: 4, y: 4 }, guard(s, 1)]);
  assert.equal(s.crown.carrier, 0);
  assert.ok(legalActions(s, 0).every((a) => a.action !== "dash"));
  s.pawns[0].x = 0;
  s.pawns[0].score = 1;
  s = resolveArena(s, [{ action: "interact", x: 0, y: 4 }, guard(s, 1)]);
  assert.equal(s.winner, "human");
  assert.equal(s.pawns[0].score, 2);
});
test("arena: simultaneous pickup uses documented alternating tie break, never deadlocks", () => {
  for (const beat of [0, 1]) {
    let s = initialArena("crown_run");
    s.beat = beat;
    s.pawns.forEach((p) => (p.x = 4));
    s = resolveArena(s, [
      { action: "interact", x: 4, y: 4 },
      { action: "interact", x: 4, y: 4 },
    ]);
    assert.equal(s.crown.carrier, (beat + 1) % 2);
  }
});
test("arena: crowd lantern blocks a shove, expires after exactly one resolution", () => {
  const s = initialArena("crown_run");
  s.pawns[0].x = 3;
  s.pawns[1].x = 4;
  s.crown.carrier = 1;
  const moves: [Action, Action] = [
    { action: "shove", x: 3, y: 4 },
    { action: "interact", x: 4, y: 4 },
  ];
  assert.equal(resolveArena(s, moves).crown.carrier, -1);
  assert.equal(
    resolveArena(s, moves, { power: "lantern", actor: "Nila" }).crown.carrier,
    1,
  );
  assert.equal(resolveArena(s, moves).crown.carrier, -1);
});
test("arena: bridge power blocks a previously legal crossing and spring restores charge", () => {
  const s = initialArena("bridge_breakers");
  s.pawns[0].x = 3;
  const n = resolveArena(s, [{ action: "move", x: 4, y: 4 }, guard(s, 1)], {
    power: "bridge",
    actor: "Asha",
  });
  assert.equal(n.bridge, 2);
  assert.equal(n.pawns[0].x, 3);
  const charged = resolveArena(
    initialArena("bridge_breakers"),
    [
      { action: "dash", x: 2, y: 4 },
      { action: "dash", x: 6, y: 4 },
    ],
    { power: "spring", actor: "Asha" },
  );
  assert.equal(charged.pawns[0].stamina, 2);
  assert.equal(charged.pawns[1].stamina, 2);
  assert.equal(ARENA_POWERS.bridge.cost, 20);
});
test("arena: heist switches require cooperation, treasure needs delivery, team wins", () => {
  let s = initialArena("mela_heist");
  s.pawns[0] = { x: 1, y: 1, stamina: 2, score: 0 };
  s.pawns[1] = { x: 7, y: 7, stamina: 2, score: 0 };
  s = resolveArena(s, [guard(s, 0), guard(s, 1)]);
  assert.equal(s.switchMask, 3);
  s.pawns[0].x = 4;
  s.pawns[0].y = 4;
  s = resolveArena(s, [{ action: "interact", x: 4, y: 4 }, guard(s, 1)]);
  assert.equal(s.crown.carrier, 0);
  s.pawns[0].x = 0;
  s = resolveArena(s, [{ action: "interact", x: 0, y: 4 }, guard(s, 1)]);
  assert.equal(s.winner, "team");
});
test("arena: racing has simultaneous finish ties and heist timeout is not a win", () => {
  let s = initialArena("bridge_breakers");
  s.pawns[0].x = 7;
  s.pawns[1].x = 1;
  s = resolveArena(s, [
    { action: "move", x: 8, y: 4 },
    { action: "move", x: 0, y: 4 },
  ]);
  assert.equal(s.winner, "draw");
  s = initialArena("mela_heist");
  s.beat = 23;
  s = resolveArena(s, [guard(s, 0), guard(s, 1)]);
  assert.equal(s.winner, "timeout");
});
test("arena: two harmless discoveries per game remain unique", () => {
  let s = initialArena("mela_heist");
  s = resolveArena(s, [guard(s, 0), guard(s, 1)]);
  s = resolveArena(s, [guard(s, 0), guard(s, 1)]);
  assert.deepEqual(s.eggs, ["tea-break"]);
  assert.equal(s.pawns[0].score, 0);
  s = initialArena("crown_run");
  s.pawns[0].x = 3;
  s.pawns[1].x = 5;
  s = resolveArena(s, [guard(s, 0), guard(s, 1)]);
  assert.ok(s.eggs.includes("royal-bow"));
  s = initialArena("bridge_breakers");
  s = resolveArena(s, [
    { action: "dash", x: 2, y: 4 },
    { action: "dash", x: 6, y: 4 },
  ]);
  assert.ok(s.eggs.includes("double-spark"));
});
test("arena: creator cannot block goals, trap tiles or submit unbounded courses", () => {
  assert.deepEqual(validateCourse([12, 12, 21]), [12, 21]);
  assert.throws(() => validateCourse([36]));
  assert.throws(() => validateCourse([1, 9]));
  assert.throws(() => validateCourse(Array.from({ length: 15 }, (_, i) => i)));
  assert.throws(() => validateCourse([NaN]));
  assert.throws(() => validateCourse("script"));
});
test("arena: Astra parsing rejects refusals, incomplete and missing responses", () => {
  assert.deepEqual(
    parseAstraJSON({
      status: "completed",
      output: [{ content: [{ type: "output_text", text: '{"choice":2}' }] }],
    }),
    { choice: 2 },
  );
  for (const body of [
    { status: "incomplete" },
    { status: "completed", output: [{ content: [{ type: "refusal" }] }] },
  ])
    assert.throws(() => parseAstraJSON(body));
});
