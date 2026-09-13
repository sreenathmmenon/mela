import test from "node:test";
import assert from "node:assert/strict";
import {
  CHARACTER_PRESETS,
  validateCharacter,
  characterBrief,
  characterEvents,
  decideCharacter,
  encodeCharacter,
  decodeCharacter,
} from "../spacetimedb/src/arenaCharacter";
import {
  ARENA_GAMES,
  initialArena,
  resolveArena,
  validateArenaAction,
} from "../spacetimedb/src/arenaRules";

test("character: event names are substituted once and treated as literal data", () => {
  const log = ["Amber dashed east. Teal guarded."];
  assert.deepEqual(characterEvents(log, "Teal Tiger", "Amber $&"), [
    "Teal Tiger dashed east. Amber $& guarded.",
  ]);
  assert.deepEqual(log, ["Amber dashed east. Teal guarded."]);
});

test("character: all trait combinations finish legal deterministic games without mutating inputs", () => {
  for (const kind of ARENA_GAMES)
    for (const pace of ["dash", "steady"] as const)
      for (const route of ["direct", "north", "south"] as const)
        for (const nerve of ["bold", "careful"] as const) {
          const c = { ...CHARACTER_PRESETS[0], pace, route, nerve };
          let s = initialArena(kind);
          while (!s.winner) {
            const before = structuredClone(s),
              a = decideCharacter(s, 0, c),
              b = decideCharacter(s, 1, CHARACTER_PRESETS[1]);
            assert.deepEqual(a, decideCharacter(s, 0, c));
            assert.deepEqual(s, before);
            validateArenaAction(s, 0, a);
            validateArenaAction(s, 1, b);
            s = resolveArena(s, [a, b]);
          }
          assert.ok(s.beat <= 24);
        }
});
test("character: pace affects actual moves, not just descriptive copy", () => {
  const s = initialArena("bridge_breakers");
  assert.equal(decideCharacter(s, 0, CHARACTER_PRESETS[0]).action, "dash");
  assert.equal(decideCharacter(s, 0, CHARACTER_PRESETS[1]).action, "move");
});
test("character: the default team can cooperate, unlock and deliver the Heist treasure", () => {
  let s = initialArena("mela_heist");
  while (!s.winner)
    s = resolveArena(s, [
      decideCharacter(s, 0, CHARACTER_PRESETS[0]),
      decideCharacter(s, 1, CHARACTER_PRESETS[1]),
    ]);
  assert.equal(s.winner, "team");
  assert.equal(s.switchMask, 3);
  assert.ok(
    s.beat < 24,
    "the default team is capable of a real cooperative win",
  );
});
test("character: route changes equal-length choices and careless input is rejected", () => {
  const s = initialArena("bridge_breakers");
  s.walls = [37];
  s.pawns[0].stamina = 0;
  assert.equal(
    decideCharacter(s, 0, { ...CHARACTER_PRESETS[0], route: "north" }).y,
    3,
  );
  assert.equal(
    decideCharacter(s, 0, { ...CHARACTER_PRESETS[0], route: "south" }).y,
    5,
  );
  for (const change of [
    { pace: "teleport" },
    { name: "" },
    { name: "<script>" },
    { name: "x".repeat(25) },
    { nerve: "win" },
    { route: "through-wall" },
    { look: "javascript" },
  ])
    assert.throws(() =>
      validateCharacter({ ...CHARACTER_PRESETS[0], ...change }),
    );
});
test("character: appearance and name never change competitive outcomes", () => {
  let a = initialArena("crown_run"),
    b = initialArena("crown_run");
  while (!a.winner) {
    const ca = CHARACTER_PRESETS[0],
      cb = { ...ca, name: "Another name", look: "robot" as const };
    a = resolveArena(a, [decideCharacter(a, 0, ca), decideCharacter(a, 1, ca)]);
    b = resolveArena(b, [decideCharacter(b, 0, cb), decideCharacter(b, 1, cb)]);
    assert.deepEqual(a, b);
  }
});
test("character: remixes round trip only bounded traits, not arbitrary prompts or secrets", () => {
  const c = validateCharacter({
    ...CHARACTER_PRESETS[0],
    name: "  Chai Fox  ",
    prompt: "private",
    token: "not-exported",
  });
  assert.equal(c.name, "Chai Fox");
  const url = new URL("https://example.com/?character=" + encodeCharacter(c));
  assert.deepEqual(decodeCharacter(url.searchParams.get("character")), c);
  assert.ok(!JSON.stringify(c).includes("private"));
  assert.equal(decodeCharacter("bad"), undefined);
  assert.equal(decodeCharacter("x".repeat(801)), undefined);
  assert.match(characterBrief(c), /north/);
});
