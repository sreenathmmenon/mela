import test from "node:test";
import assert from "node:assert/strict";
import {
  FOUR_EMPTY,
  decideFour,
  fourWinner,
  fourWinningCells,
  resolveFour,
} from "../spacetimedb/src/fourRules";
test("Four full board draws, exposes the winning line only when present", () => {
  const draw = "hhbbhhbbbhhbbhhhbbhhbbbhhbbhhhbbhhbbbhhbbh";
  assert.equal(draw.length, 42);
  assert.equal(fourWinner(draw), "draw");
  assert.deepEqual(fourWinningCells(draw), []);
  assert.throws(() => resolveFour(draw, 0, "human"));
  assert.deepEqual(
    fourWinningCells(".".repeat(35) + "hhhh..."),
    [35, 36, 37, 38],
  );
});
import {
  decideLastStick,
  resolveLastStick,
} from "../spacetimedb/src/lastStickRules";
import {
  crowdPurchase,
  playgroundPower,
} from "../spacetimedb/src/playgroundCrowdRules";
function boardAt(cells: number[], token = "h") {
  const b = [...FOUR_EMPTY];
  cells.forEach((i) => (b[i] = token));
  return b.join("");
}
for (const [name, cells] of Object.entries({
  horizontal: [35, 36, 37, 38],
  vertical: [0, 7, 14, 21],
  diagonal: [0, 8, 16, 24],
  reverse: [6, 12, 18, 24],
})) {
  test(`Four detects ${name} wins for both actors`, () => {
    assert.equal(fourWinner(boardAt(cells)), "human");
    assert.equal(fourWinner(boardAt(cells, "b")), "melabot");
  });
}
test("Four gravity, full-column and invalid-action validation", () => {
  let b = FOUR_EMPTY;
  for (let i = 0; i < 6; i++) {
    const r = resolveFour(b, 0, i % 2 ? "melabot" : "human");
    assert.equal(r.cell, 35 - i * 7);
    b = r.board;
  }
  assert.throws(() => resolveFour(b, 0, "human"));
  for (const invalid of [-1, 7, 1.2, NaN])
    assert.throws(() => resolveFour(FOUR_EMPTY, invalid, "human"));
  assert.throws(() => resolveFour("bad", 0, "human"));
  assert.equal(fourWinner(boardAt([5, 6, 7, 8])), "");
});
test("Four SIDEWIND right shift, edge bounce, full-neighbour and win resolution", () => {
  assert.equal(resolveFour(FOUR_EMPTY, 2, "human", true).column, 3);
  assert.equal(resolveFour(FOUR_EMPTY, 6, "human", true).column, 5);
  const b = boardAt([1, 15, 29]);
  const c = [...b];
  [8, 22, 36].forEach((i) => (c[i] = "b"));
  assert.equal(resolveFour(c.join(""), 0, "human", true).column, 0);
  assert.equal(
    resolveFour(boardAt([35, 36, 37]), 2, "human", true).winner,
    "human",
  );
});
test("Four AI is deterministic, wins immediately and blocks a threat", () => {
  assert.equal(decideFour(boardAt([35, 36, 37], "b")), 3);
  assert.equal(decideFour(boardAt([35, 36, 37])), 3);
  assert.equal(decideFour(FOUR_EMPTY), decideFour(FOUR_EMPTY));
  assert.throws(() => decideFour(boardAt([35, 36, 37, 38])));
});
test("Four alternating human/AI games terminate with legal shared resolution", () => {
  for (let run = 0; run < 4; run++) {
    let board = FOUR_EMPTY,
      winner = "";
    for (let turn = 0; turn < 42 && !winner; turn++) {
      const side = turn % 2 ? "melabot" : "human";
      const legal = [0, 1, 2, 3, 4, 5, 6].filter((c) => board[c] === ".");
      const move =
        side === "melabot"
          ? decideFour(board)
          : legal[(turn + run) % legal.length];
      const r = resolveFour(board, move, side);
      board = r.board;
      winner = r.winner;
      assert.equal([...board].filter((c) => c !== ".").length, turn + 1);
    }
    assert.ok(winner);
    assert.throws(() => resolveFour(board, 0, "human"));
  }
});
test("Last Stick all legal takes, spark boundary and invalid inputs", () => {
  for (let n = 1; n <= 21; n++)
    for (let take = 1; take <= 3; take++) {
      if (take > n) {
        assert.throws(() => resolveLastStick(n, take));
        continue;
      }
      for (const spark of [false, true]) {
        const r = resolveLastStick(n, take, spark);
        assert.ok(r.remaining >= 0);
        assert.equal(r.removed + r.remaining, n);
        assert.equal(r.complete, r.remaining === 0);
      }
    }
  assert.equal(resolveLastStick(4, 3, true).complete, true);
  assert.equal(resolveLastStick(3, 3, true).bonus, 0);
  for (const n of [0, 22, -1, 1.2, NaN])
    assert.throws(() => resolveLastStick(n, 1));
  for (const take of [0, 4, -1, 1.2])
    assert.throws(() => resolveLastStick(21, take));
});
test("Last Stick provider is legal and deterministic for every relevant state", () => {
  for (let n = 1; n <= 21; n++) {
    const take = decideLastStick(n);
    assert.equal(take, decideLastStick(n));
    assert.ok(take <= 3 && take <= n);
    if (n % 4) assert.equal((n - take) % 4, 0);
  }
  assert.throws(() => decideLastStick(0));
});
test("Last Stick human/AI shared path terminates and conserves sticks with crowd", () => {
  for (let game = 0; game < 10; game++) {
    let remaining = 21,
      total = 0,
      turn = 0;
    while (remaining) {
      const take =
        turn % 2
          ? decideLastStick(remaining)
          : Math.min(remaining, (game % 3) + 1);
      const r = resolveLastStick(remaining, take, turn === 2);
      remaining = r.remaining;
      total += r.removed;
      turn++;
      assert.ok(turn <= 21);
    }
    assert.equal(total, 21);
  }
});
test("new crowd powers enforce game allowlists, costs, cooldown and stacking", () => {
  for (const [kind, power] of [
    ["four_row", "sidewind"],
    ["last_stick", "spark"],
  ]) {
    const p = playgroundPower(kind, power);
    const after = crowdPurchase(30, 60, 0n, 1n, p, false);
    assert.equal(after, 10);
    assert.throws(() => crowdPurchase(after, 60, 0n, 1n, p, false));
    assert.throws(() => crowdPurchase(60, 60, 2n, 1n, p, false));
    assert.throws(() => crowdPurchase(60, 60, 0n, 1n, p, true));
    assert.throws(() => playgroundPower("book_cricket", power));
    assert.throws(() => playgroundPower("pen_fight", power));
  }
  assert.throws(() => playgroundPower("four_row", "spark"));
});
