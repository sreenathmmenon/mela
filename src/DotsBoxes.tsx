import { useEffect, useRef, useState } from "react";
import { useReducer, useTable } from "spacetimedb/react";
import { reducers, tables } from "./module_bindings";
import { PlaygroundMatch, usePlaygroundMatch } from "./PlaygroundMatch";
import { playSound } from "./sound";

export function DotsBoxes({
  matchId,
  onBack,
  screen = false,
}: {
  matchId: bigint;
  onBack: () => void;
  screen?: boolean;
}) {
  const [states] = useTable(tables.dotsBoxesState),
    state = states.find((s) => s.matchId === matchId);
  const { isPlayer, connected, humanName } = usePlaygroundMatch(
    matchId,
    screen,
  );
  const draw = useReducer(reducers.drawDotsEdge);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const previous = useRef(state?.revision);
  useEffect(() => {
    if (
      state &&
      previous.current !== undefined &&
      state.revision !== previous.current
    )
      playSound(state.lastOutcome.includes("claimed") ? "six" : "flick");
    previous.current = state?.revision;
  }, [state]);
  const owned = new Map(
    (state?.boxes || "")
      .split(",")
      .filter(Boolean)
      .map((b) => [Number(b.slice(0, -1)), b.endsWith("h")]),
  );
  const edges = new Set((state?.edges || "").split(","));
  const lastEdge = state?.edges.split(",").slice(-1)[0];
  const canPlay = isPlayer && connected && state?.turn === "human" && !busy;
  return (
    <PlaygroundMatch
      matchId={matchId}
      screen={screen}
      title="Dots & Boxes"
      onBack={onBack}
    >
      <section className="pg-title">
        <p>Complete a box to score and play again.</p>
      </section>
      {!state ? (
        <p role="status">Opening the notebook…</p>
      ) : (
        <>
          <section className="pg-score">
            <div>
              <span>{isPlayer ? "You" : humanName}</span>
              <strong>{state.humanBoxes}</strong>
              <small>GOLD INK</small>
            </div>
            <p role="status">
              {state.turn === "complete"
                ? "Every square has a story."
                : state.turn === "melabot"
                  ? "MelaBot is planning…"
                  : isPlayer
                    ? "Your line. Make it count."
                    : `${humanName}'s line`}
            </p>
            <div>
              <span>MelaBot</span>
              <strong>{state.botBoxes}</strong>
              <small>TEAL INK</small>
            </div>
          </section>
          <div className="pg-notebook">
            <div className="pg-binding" aria-hidden="true">
              ○ ○ ○ ○ ○ ○ ○ ○
            </div>
            <div
              className="pg-grid"
              role="group"
              aria-label="Dots and Boxes board"
            >
              {Array.from({ length: 49 }, (_, cell) => {
                const row = Math.floor(cell / 7),
                  col = cell % 7;
                if (row % 2 === 0 && col % 2 === 0)
                  return (
                    <span key={cell} className="pg-dot" aria-hidden="true" />
                  );
                if (row % 2 === 1 && col % 2 === 1) {
                  const side = owned.get(
                    Math.floor(row / 2) * 3 + Math.floor(col / 2),
                  );
                  return (
                    <span
                      key={cell}
                      className={`pg-box ${side === undefined ? "" : side ? "gold" : "teal"}`}
                      aria-label={
                        side === undefined
                          ? "Unclaimed box"
                          : `${side ? humanName : "MelaBot"}'s box`
                      }
                    >
                      {side === undefined
                        ? ""
                        : side
                          ? humanName.slice(0, 1).toUpperCase()
                          : "M"}
                    </span>
                  );
                }
                const horizontal = row % 2 === 0,
                  from = Math.floor(row / 2) * 4 + Math.floor(col / 2),
                  to = from + (horizontal ? 1 : 4),
                  key = `${from}-${to}`,
                  taken = edges.has(key);
                return (
                  <button
                    key={cell}
                    className={`pg-edge ${horizontal ? "h" : "v"} ${taken ? "taken" : ""} ${key === lastEdge ? "latest" : ""}`}
                    aria-label={`${taken ? "Drawn" : "Draw"} line from dot ${from + 1} to ${to + 1}`}
                    disabled={!canPlay || taken}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        await draw({
                          matchId,
                          from,
                          to,
                          revision: state.revision,
                        });
                      } catch {
                        setError(
                          "That line was not accepted. Check whose turn it is and choose an open line.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <span />
                  </button>
                );
              })}
            </div>
            <p className="pg-paper-note">
              {state.humanBoxes + state.botBoxes} of 9 claimed · Close a box to
              keep the pencil.
            </p>
            <p className="pg-board-help">
              {canPlay
                ? "Tap a faint line · Tab + Enter also works"
                : state.turn === "melabot"
                  ? "Watch the highlighted line for MelaBot’s move"
                  : "The newest line is highlighted"}
            </p>
          </div>
          <p
            className="pg-moment"
            role="status"
            hidden={state.lastOutcome === "DRAW THE FIRST LINE"}
          >
            {state.lastOutcome.replace(/You/g, isPlayer ? "You" : humanName)}
          </p>
          {error && (
            <p className="pg-alert" role="alert">
              {error}
            </p>
          )}
          <details className="pg-how">
            <summary>How to play</summary>
            <p>
              Tap an empty space between neighbouring dots. Closing the fourth
              side earns the box and another turn. The most boxes wins. Avoid
              giving MelaBot a square with three sides. The crowd can interrupt
              a capture chain, but cannot take away boxes you already earned.
            </p>
          </details>
        </>
      )}
    </PlaygroundMatch>
  );
}
