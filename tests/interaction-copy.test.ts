import test from "node:test";
import assert from "node:assert/strict";
import { agentInvitation, playgroundActionError } from "../src/interactionCopy";
import { memoryResult, GAME_GUIDES } from "../src/productExperience";

test("invitations use the actual game's tools and preserve human seat ownership", () => {
  for (const four of [true, false]) {
    const text = agentInvitation(
      "https://mela.example",
      "42",
      four,
      "human_agent",
    );
    assert.match(text, /https:\/\/mela.example\/mcp/);
    assert.ok(text.includes(four ? "mela_get_board" : "mela_get_desk"));
    assert.ok(text.includes(four ? "mela_drop_four" : "mela_flick"));
    assert.match(text, /Use side "bot"; the human seat is reserved/);
    assert.match(text, /never claim both sides/);
    assert.match(text, /substitute/);
  }
  assert.match(
    agentInvitation("https://mela.example", "42", false, "duel"),
    /side "human" or side "bot"/,
  );
});
test("clipboard and navigation failures do not give irrelevant game-rule advice", () => {
  for (const key of ["copy", "share", "join", "rematch", "play"]) {
    assert.doesNotMatch(playgroundActionError(key), /cooldown/);
  }
  assert.match(playgroundActionError("copy"), /Select the crowd link/);
  assert.match(playgroundActionError("share"), /Select the result link/);
  assert.match(playgroundActionError("cheer"), /shared energy/);
});
test("cricket presentation explains the book and names the winner without declaring a draw winner", () => {
  assert.match(GAME_GUIDES.book_cricket.input, /last digit/);
  assert.match(GAME_GUIDES.book_cricket.input, /zero can also be a dot ball/);
  assert.match(GAME_GUIDES.book_cricket.input, /Crowd effects/);
  assert.equal(
    memoryResult({ winner: "draw", humanName: "Nila", aiName: "MelaBot" }),
    "A draw",
  );
  assert.equal(
    memoryResult({ winner: "human", humanName: "Nila", aiName: "MelaBot" }),
    "Nila won",
  );
});
