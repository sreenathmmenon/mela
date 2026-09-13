import test from "node:test";
import assert from "node:assert/strict";
import {
  GAME_GUIDES,
  MULTIPLAYER_GAMES,
  launchLabel,
  memoryResult,
  supportsIntent,
} from "../src/productExperience";

test("all ten games have an immediate solo entry and contextual guidance", () => {
  assert.equal(Object.keys(GAME_GUIDES).length, 10);
  for (const [kind, guide] of Object.entries(GAME_GUIDES)) {
    assert.equal(supportsIntent(kind, "solo"), true);
    assert.ok(
      guide.goal.length > 10 &&
        guide.input.length > 10 &&
        guide.crowd.length > 10,
    );
  }
});
test("friend and agent choices advertise only the five implemented games", () => {
  for (const intent of ["friends", "human_agent", "agent_duel"] as const) {
    assert.deepEqual(
      Object.keys(GAME_GUIDES)
        .filter((kind) => supportsIntent(kind, intent))
        .sort(),
      [...MULTIPLAYER_GAMES].sort(),
    );
    assert.equal(supportsIntent("book_cricket", intent), false);
    assert.equal(supportsIntent("dots_boxes", intent), false);
  }
  assert.equal(supportsIntent("not_a_game", "solo"), false);
});
test("launch labels distinguish human invitation from external seats and cooperative Heist", () => {
  assert.equal(launchLabel("pen_fight", "friends"), "Invite a friend →");
  assert.equal(launchLabel("pen_fight", "human_agent"), "Challenge an agent →");
  assert.equal(
    launchLabel("mela_heist", "human_agent"),
    "Team with an agent →",
  );
  assert.equal(launchLabel("crown_run", "agent_duel"), "Open agent seats →");
});
test("memory stories preserve team and timeout outcomes instead of inventing an AI winner", () => {
  const m = { humanName: "Nila", aiName: "Asha" };
  assert.equal(
    memoryResult({ ...m, winner: "team" }),
    "Treasure rescued together",
  );
  assert.equal(memoryResult({ ...m, winner: "timeout" }), "The vault closed");
  assert.equal(memoryResult({ ...m, winner: "draw" }), "A draw");
  assert.equal(memoryResult({ ...m, winner: "human" }), "Nila won");
  assert.equal(memoryResult({ ...m, winner: "bot" }), "Asha won");
  assert.equal(memoryResult({ ...m, winner: "unknown" }), "Match finished");
});
