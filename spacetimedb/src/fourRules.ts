export type FourSide = "human" | "melabot";
export const FOUR_EMPTY = ".".repeat(42);
export const FOUR_ORDER = [3, 2, 4, 1, 5, 0, 6];
export function fourWinningCells(board: string): number[] {
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 7; c++) {
      const token = board[r * 7 + c];
      if (token === ".") continue;
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
      ]) {
        const cells = Array.from({ length: 4 }, (_, i) => [
          r + dr * i,
          c + dc * i,
        ]);
        if (
          cells.every(
            ([y, x]) =>
              y >= 0 && y < 6 && x >= 0 && x < 7 && board[y * 7 + x] === token,
          )
        )
          return cells.map(([y, x]) => y * 7 + x);
      }
    }
  return [];
}
export function fourWinner(board: string): string {
  const cells = fourWinningCells(board);
  return cells.length
    ? board[cells[0]] === "h"
      ? "human"
      : "melabot"
    : board.includes(".")
      ? ""
      : "draw";
}
export function resolveFour(
  board: string,
  column: number,
  side: FourSide,
  wind = false,
) {
  if (board.length !== 42 || /[^.hb]/.test(board) || fourWinner(board))
    throw new Error("This board is not active.");
  if (
    !Number.isInteger(column) ||
    column < 0 ||
    column > 6 ||
    board[column] !== "."
  )
    throw new Error("Choose an open column.");
  let landing = column;
  if (wind) {
    const neighbour = column === 6 ? 5 : column + 1;
    if (board[neighbour] === ".") landing = neighbour;
  }
  let row = 5;
  while (board[row * 7 + landing] !== ".") row--;
  const cell = row * 7 + landing;
  const next =
    board.slice(0, cell) +
    (side === "human" ? "h" : "b") +
    board.slice(cell + 1);
  return {
    board: next,
    cell,
    column: landing,
    shifted: landing !== column,
    winner: fourWinner(next),
  };
}
// Bounded lookahead; no randomness or state mutation. Crowd effects are resolved
// later by the same domain function, not secretly read by this provider.
export function decideFour(board: string): number {
  if (board.length !== 42 || fourWinner(board))
    throw new Error("No legal AI move.");
  function search(
    b: string,
    depth: number,
    side: FourSide,
    alpha: number,
    beta: number,
  ): number {
    const winner = fourWinner(b);
    if (winner)
      return winner === "draw"
        ? 0
        : winner === "melabot"
          ? 10000 + depth
          : -10000 - depth;
    if (!depth)
      return [...b].reduce(
        (sum, token, i) =>
          sum +
          (i % 7 === 3 ? (token === "b" ? 3 : token === "h" ? -3 : 0) : 0),
        0,
      );
    let best = side === "melabot" ? -Infinity : Infinity;
    for (const c of FOUR_ORDER.filter((c) => b[c] === ".")) {
      const value = search(
        resolveFour(b, c, side).board,
        depth - 1,
        side === "human" ? "melabot" : "human",
        alpha,
        beta,
      );
      best = side === "melabot" ? Math.max(best, value) : Math.min(best, value);
      if (side === "melabot") alpha = Math.max(alpha, best);
      else beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let chosen = -1,
    best = -Infinity;
  for (const column of FOUR_ORDER.filter((c) => board[c] === ".")) {
    const score = search(
      resolveFour(board, column, "melabot").board,
      4,
      "human",
      -Infinity,
      Infinity,
    );
    if (score > best) {
      best = score;
      chosen = column;
    }
  }
  return chosen;
}
