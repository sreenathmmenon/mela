import test from "node:test";
import assert from "node:assert/strict";
import { initialArena } from "../spacetimedb/src/arenaRules";
import { arenaBoardDescription, arenaMoveLabel } from "../src/arenaDescription";

test("board text describes committed coordinates, crossings and objective without mutation", () => {
  const state = initialArena("mela_heist");
  const before = JSON.stringify(state);
  const text = arenaBoardDescription(state, ["Nila", "Asha"]);
  assert.match(text.positions, /Amber \(Nila\): column 1, row 5/);
  assert.match(text.positions, /column 2, row 2 and column 8, row 8/);
  assert.match(text.positions, /Vault locked/);
  assert.match(text.layout, /rows 4, 5 and 6/);
  assert.equal(JSON.stringify(state), before);
  state.bridge = 2;
  state.crown.carrier = 1;
  state.switchMask = 3;
  const next = arenaBoardDescription(state, ["Nila", "Asha"]);
  assert.match(next.positions, /Treasure carried by Teal/);
  assert.match(next.positions, /Vault open/);
  assert.match(next.layout, /rows 2, 3 and 4/);
});
test("move names retain visible action and add direction and destination", () => {
  const pawn = { x: 0, y: 4, score: 0, stamina: 2 };
  assert.equal(
    arenaMoveLabel({ action: "dash", x: 2, y: 4 }, pawn),
    "Dash right to column 3, row 5",
  );
  assert.equal(
    arenaMoveLabel({ action: "move", x: 0, y: 3 }, pawn),
    "Step up to column 1, row 4",
  );
});
