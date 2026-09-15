import test from "node:test";
import assert from "node:assert/strict";
import {
  challengeCheckpoint,
  CHALLENGE_POLICY,
} from "../spacetimedb/src/arenaChallenge";
import {
  initialArena,
  resolveArena,
  decideArena,
  ARENA_GAMES,
  type ArenaState,
} from "../spacetimedb/src/arenaRules";
import {
  playableMoments,
  recommendedCheckpoint,
  requestedMoment,
  momentLink,
} from "../src/challengePresentation";
import { matchLocation } from "../src/matchNavigation";

for (const kind of ARENA_GAMES)
  test(`${kind}: checkpoint preserves authoritative position, clock, score and deterministic resolution`, () => {
    let original = initialArena(kind);
    original = resolveArena(original, [
      decideArena(original, 0, "runner"),
      decideArena(original, 1, "runner"),
    ]);
    const raw = JSON.stringify(original),
      restored = challengeCheckpoint(raw, kind, original.beat);
    assert.deepEqual(restored.pawns, original.pawns);
    assert.deepEqual(restored.crown, original.crown);
    assert.equal(restored.beat, original.beat);
    assert.deepEqual(restored.walls, original.walls);
    assert.deepEqual(restored.eggs, []);
    assert.deepEqual(restored.visited, []);
    const actions = [
      decideArena(restored, 0, "runner"),
      decideArena(restored, 1, CHALLENGE_POLICY),
    ] as const;
    const next = resolveArena(restored, [...actions]);
    assert.deepEqual(next, resolveArena(restored, [...actions]));
    assert.equal(next.beat, original.beat + 1);
    assert.equal(JSON.stringify(original), raw);
  });
test("checkpoint rejects unsupported, finished, malformed and mismatched records", () => {
  const s = initialArena("crown_run");
  for (const raw of [
    "null",
    "no",
    JSON.stringify({ ...s, version: 2 }),
    JSON.stringify({ ...s, winner: "human" }),
    JSON.stringify({ ...s, beat: 24 }),
    JSON.stringify({ ...s, bridge: 999 }),
    JSON.stringify({ ...s, pawns: [] }),
    JSON.stringify({ ...s, crown: { ...s.crown, carrier: 5 } }),
    JSON.stringify({ ...s, walls: [40] }),
    JSON.stringify({
      ...s,
      pawns: [{ ...s.pawns[0], stamina: 5 }, s.pawns[1]],
    }),
  ])
    assert.throws(() => challengeCheckpoint(raw, "crown_run", 0));
  assert.throws(() => challengeCheckpoint(JSON.stringify(s), "mela_heist", 0));
  assert.throws(() => challengeCheckpoint(JSON.stringify(s), "crown_run", 1));
});
test("practice retains the original final-move limit, not another 24 turns", () => {
  const s = { ...initialArena("crown_run"), beat: 23 };
  const restored = challengeCheckpoint(JSON.stringify(s), s.kind, s.beat);
  const next = resolveArena(restored, [
    decideArena(restored, 0, "runner"),
    decideArena(restored, 1, "runner"),
  ]);
  assert.equal(next.beat, 24);
  assert.ok(next.winner);
});
test("moment selection uses the position BEFORE a recorded turning point", () => {
  const s = initialArena("bridge_breakers");
  const n = resolveArena(
    s,
    [decideArena(s, 0, "runner"), decideArena(s, 1, "runner")],
    { power: "spring", actor: "Nila" },
  );
  const f = (s: ArenaState) => ({
    id: BigInt(s.beat + 1),
    revision: s.beat,
    state: JSON.stringify(s),
  });
  const frames = [f(s), f(n), f({ ...n, beat: 2, winner: "draw" })];
  assert.equal(recommendedCheckpoint(frames)?.revision, 0);
  assert.deepEqual(
    playableMoments(frames).map((f) => f.revision),
    [0, 1],
  );
  assert.equal(recommendedCheckpoint([]), undefined);
});
test("moment links preserve base path, discard private capabilities, and navigation clears stale moments", () => {
  const link = momentLink(
    "https://example.com/mela/?seat=3&invite=private#secret",
    5n,
    2,
  );
  assert.equal(link, "https://example.com/mela/?memory=5&moment=2");
  assert.equal(requestedMoment("?moment=0"), 0);
  for (const v of ["-1", "24", "1.5", "NaN", "999"])
    assert.equal(requestedMoment(`?moment=${v}`), null);
  assert.equal(
    new URL(matchLocation(link, { kind: "match", id: 6n })).search,
    "?match=6",
  );
  assert.equal(new URL(matchLocation(link, { kind: "home" })).search, "");
});
