import { useMemo, useState } from "react";
import { useReducer, useTable } from "spacetimedb/react";
import { reducers, tables } from "./module_bindings";

const point = (dot: number) => ({
  x: 12 + (dot % 4) * 29,
  y: 12 + Math.floor(dot / 4) * 29,
});
const edge = (key: string) => key.split("-").map(Number) as [number, number];
const boardEdges = [
  ...Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 3 }, (_, col) => ({
      from: row * 4 + col,
      to: row * 4 + col + 1,
      horizontal: true,
      left: 9 + col * 29,
      top: 10 + row * 29,
    })),
  ).flat(),
  ...Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 4 }, (_, col) => ({
      from: row * 4 + col,
      to: (row + 1) * 4 + col,
      horizontal: false,
      left: 10 + col * 29,
      top: 9 + row * 29,
    })),
  ).flat(),
];

export function DotsBoxes({
  matchId,
  onBack,
}: {
  matchId: bigint;
  onBack: () => void;
}) {
  const [states] = useTable(tables.dotsBoxesState);
  const [matches] = useTable(tables.match);
  const [busy, setBusy] = useState<string | null>(null);
  const draw = useReducer(reducers.drawDotsEdge);
  const state = states.find((row) => row.matchId === matchId);
  const match = matches.find((row) => row.id === matchId);
  const owned = useMemo(
    () =>
      new Map(
        (state?.boxes || "")
          .split(",")
          .filter(Boolean)
          .map((item) => [
            Number(item.slice(0, -1)),
            item.endsWith("h") ? "human" : "bot",
          ]),
      ),
    [state?.boxes],
  );
  if (!state || !match)
    return (
      <main className="mela-shell">
        <p>Opening the notebook…</p>
      </main>
    );
  const edges = new Set((state.edges || "").split(",").filter(Boolean));
  return (
    <main className="mela-shell dots-shell">
      <header className="hero">
        <button className="link-back" onClick={onBack}>
          ← Mela home
        </button>
        <p className="eyebrow">MELA · DOTS & BOXES</p>
        <h1>Own the grid.</h1>
        <p className="subtitle">
          Complete a square and you keep the turn. The crowd watches every line.
        </p>
      </header>
      <section className="dots-score">
        <div>
          <small>YOU</small>
          <strong>{state.humanBoxes}</strong>
        </div>
        <p>
          {state.turn === "human"
            ? "Your line"
            : state.turn === "melabot"
              ? "MelaBot is drawing…"
              : match.winner === "human"
                ? "You own the notebook."
                : match.winner === "draw"
                  ? "A perfect grid tie."
                  : "MelaBot owns the grid."}
        </p>
        <div>
          <small>MELABOT</small>
          <strong>{state.botBoxes}</strong>
        </div>
      </section>
      <section className="dots-board-wrap" aria-label="Dots and Boxes board">
        <svg className="dots-board" viewBox="0 0 111 111" role="img">
          {[...owned.entries()].map(([box, side]) => (
            <rect
              key={box}
              x={14 + (box % 3) * 29}
              y={14 + Math.floor(box / 3) * 29}
              width="25"
              height="25"
              className={side === "human" ? "human-box" : "bot-box"}
            />
          ))}
          {[...edges].map((key) => {
            const [a, b] = edge(key),
              p = point(a),
              q = point(b);
            return (
              <line
                key={key}
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                className="drawn-edge"
              />
            );
          })}
          {Array.from({ length: 16 }, (_, dot) => {
            const p = point(dot);
            return (
              <circle key={dot} cx={p.x} cy={p.y} r="2.5" className="dot" />
            );
          })}
        </svg>
        <div className="dots-hit-grid">
          {boardEdges.map(({ from, to, horizontal, left, top }) => {
            const key = [Math.min(from, to), Math.max(from, to)].join("-");
            return (
              <button
                key={key}
                className={
                  horizontal ? "edge-hit horizontal" : "edge-hit vertical"
                }
                style={{ left: `${left}%`, top: `${top}%` }}
                disabled={
                  state.turn !== "human" || edges.has(key) || busy !== null
                }
                aria-label={`Draw line from dot ${from + 1} to ${to + 1}`}
                onClick={async () => {
                  setBusy(key);
                  try {
                    await draw({ matchId, from, to });
                  } finally {
                    setBusy(null);
                  }
                }}
              />
            );
          })}
        </div>
      </section>
      <section className="game-moment">
        <strong>{state.lastOutcome}</strong>
        <span>{state.humanBoxes + state.botBoxes}/9 boxes claimed</span>
      </section>
    </main>
  );
}
