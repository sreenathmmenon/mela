import test from "node:test";
import assert from "node:assert/strict";
import {
  arenaSeatKind,
  humansReady,
  roomNextPhase,
  validateArenaInvite,
} from "../spacetimedb/src/arenaSeats";
test("arena seats distinguish humans, external agents and host ownership", () => {
  assert.deepEqual(
    [0, 1].map((s) => arenaSeatKind("friends", s)),
    ["human", "human"],
  );
  assert.deepEqual(
    [0, 1].map((s) => arenaSeatKind("human_agent", s)),
    ["human", "agent"],
  );
  assert.deepEqual(
    [0, 1].map((s) => arenaSeatKind("agent_duel", s)),
    ["agent", "agent"],
  );
  assert.throws(() => arenaSeatKind("solo", 0));
  assert.throws(() => arenaSeatKind("friends", 2));
});
test("human turns cannot be replaced by scheduled agent fallbacks", () => {
  assert.equal(humansReady("friends", [0]), false);
  assert.equal(humansReady("friends", [1]), false);
  assert.equal(humansReady("friends", [0, 1]), true);
  assert.equal(humansReady("human_agent", [1]), false);
  assert.equal(humansReady("human_agent", [0]), true);
  assert.equal(humansReady("agent_duel", []), true);
});
test("lobbies do not run and simultaneous human moves retain their planning window", () => {
  for (const mode of ["friends", "human_agent", "agent_duel"])
    assert.equal(roomNextPhase(mode, false, [0, 1]), "lobby");
  assert.equal(roomNextPhase("friends", true, [0]), "planning");
  assert.equal(roomNextPhase("friends", true, [0, 1]), "thinking");
  assert.equal(roomNextPhase("agent_duel", true, []), "thinking");
});
test("friend invitation capability has a bounded 128-bit format, not a guessable match code", () => {
  assert.doesNotThrow(() => validateArenaInvite("ab".repeat(16)));
  for (const code of [
    "",
    "42",
    "ab".repeat(15),
    "x".repeat(32),
    "ab".repeat(17),
  ])
    assert.throws(() => validateArenaInvite(code));
});
