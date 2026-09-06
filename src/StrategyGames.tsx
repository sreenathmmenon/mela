import { useEffect, useRef, useState } from "react";
import { useReducer, useTable } from "spacetimedb/react";
import { reducers, tables } from "./module_bindings";
import { PlaygroundMatch, usePlaygroundMatch } from "./PlaygroundMatch";
import { playSound } from "./sound";
import { fourWinningCells } from "../spacetimedb/src/fourRules";
import "./strategyGames.css";

export function StrategyGames({
  matchId,
  onBack,
  screen = false,
}: {
  matchId: bigint;
  onBack: () => void;
  screen?: boolean;
}) {
  const { match, isPlayer, isSpectator, connected, humanName } =
    usePlaygroundMatch(matchId, screen);
  const [fours] = useTable(tables.fourRowState),
    [sticks] = useTable(tables.lastStickState);
  const four = fours.find((s) => s.matchId === matchId),
    stick = sticks.find((s) => s.matchId === matchId);
  const isFour = match?.gameKind === "four_row",
    state = isFour ? four : stick;
  const play = useReducer(reducers.playStrategyMove);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const previous = useRef(state?.revision);
  useEffect(() => {
    if (
      state &&
      previous.current !== undefined &&
      state.revision !== previous.current
    )
      playSound(state.turn === "complete" ? "six" : "flick");
    previous.current = state?.revision;
  }, [state?.revision, state?.turn]);
  const canPlay =
    isPlayer &&
    connected &&
    match?.status === "active" &&
    state?.turn === "human" &&
    !busy;
  // Decoration only, gated by committed completion; never chooses the winner.
  const winning =
    state?.turn === "complete" && four ? fourWinningCells(four.board) : [];
  async function move(choice: number) {
    if (!state || !canPlay) return;
    setBusy(true);
    setError("");
    try {
      await play({ matchId, revision: state.revision, choice });
    } catch {
      setError(
        "That move was not accepted. The live board is safe; check the turn and try an available move.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <PlaygroundMatch
      matchId={matchId}
      onBack={onBack}
      screen={screen}
      title={isFour ? "Four in a Row" : "Last Stick"}
    >
      <section className="pg-title strategy-intro">
        <p className="eyebrow">
          {isFour
            ? "A LITTLE PATIENCE. A PERFECT CONNECTION."
            : "ONE TINY PILE. A BIG BLUFF."}
        </p>
        <h1>{isFour ? "Find your four." : "Make the last one yours."}</h1>
        <p>
          {isFour
            ? "Drop a disc. Connect four. Outthink MelaBot."
            : "Take 1, 2 or 3. Whoever takes the last stick wins."}
        </p>
      </section>
      {match?.status === "abandoned" && (
        <p role="status" className="pg-alert">
          This table has closed because the player started another match.{" "}
          <button onClick={onBack}>Find a live game →</button>
        </p>
      )}
      {isSpectator && match?.status === "active" && (
        <button
          className="strategy-crowd-jump"
          onClick={() =>
            document
              .getElementById("playground-crowd")
              ?.scrollIntoView({ block: "start" })
          }
        >
          Your crowd powers ↓
        </button>
      )}
      {!state ? (
        <p role="status">Setting the table…</p>
      ) : (
        <>
          <section className="pg-score strategy-turn">
            <div>
              <span>{isPlayer ? "You" : humanName}</span>
              <strong aria-label="Gold player">●</strong>
              <small>GOLD</small>
            </div>
            <p role="status">
              {match?.status === "abandoned"
                ? "Table closed."
                : state.turn === "complete"
                  ? match?.winner === "draw"
                    ? "A worthy draw."
                    : `${match?.winner === "human" ? (isPlayer ? "You win!" : `${humanName} wins!`) : "MelaBot wins this one."}`
                  : busy
                    ? "Your move is on its way…"
                    : state.turn === "melabot"
                      ? "MelaBot is thinking…"
                      : isPlayer
                        ? "Your move."
                        : `${humanName}'s move.`}
            </p>
            <div>
              <span>MelaBot</span>
              <strong className="strategy-bot" aria-label="Teal opponent">
                ◆
              </strong>
              <small>TEAL</small>
            </div>
          </section>
          {isFour && four ? (
            <div className="four-cabinet">
              <div
                className="four-controls"
                role="group"
                aria-label="Choose a column"
              >
                {Array.from({ length: 7 }, (_, c) => (
                  <button
                    key={c}
                    disabled={!canPlay || four.board[c] !== "."}
                    aria-label={`Drop in column ${c + 1}`}
                    onClick={() => move(c)}
                  >
                    <span aria-hidden="true">↓</span>
                    <small>{c + 1}</small>
                  </button>
                ))}
              </div>
              <div
                className="four-board"
                role="img"
                aria-label={`Four in a Row board, top to bottom: ${Array.from({ length: 6 }, (_, r) => [...four.board.slice(r * 7, r * 7 + 7)].map((c) => (c === "." ? "empty" : c === "h" ? "gold" : "teal")).join(", ")).join("; ")}`}
              >
                {[...four.board].map((cell, i) => (
                  <span
                    key={i}
                    className={`four-slot ${cell === "h" ? "gold" : cell === "b" ? "teal" : ""} ${four.lastCell === i ? "new-disc" : ""} ${winning.includes(i) ? "winning-disc" : ""}`}
                  >
                    <i>{cell === "h" ? "●" : cell === "b" ? "◆" : ""}</i>
                  </span>
                ))}
              </div>
              <p className="strategy-caption">
                {state.turn === "complete"
                  ? "Every disc led to this moment."
                  : "Choose an arrow above · Discs fall to the lowest space"}
              </p>
            </div>
          ) : stick ? (
            <div className="stick-table">
              <div className="stick-count">
                <strong>{stick.remaining}</strong>
                <span>sticks left</span>
              </div>
              <div
                className="stick-pile"
                role="img"
                aria-label={`${stick.remaining} sticks remain`}
              >
                {Array.from({ length: 21 }, (_, i) => (
                  <span
                    key={i}
                    className={`wood-stick ${i >= stick.remaining ? "gone" : ""}`}
                    style={{ transform: `rotate(${((i % 3) - 1) * 5}deg)` }}
                  />
                ))}
              </div>
              <div
                className="stick-choices"
                role="group"
                aria-label="Choose how many sticks to take"
              >
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    disabled={!canPlay || stick.remaining < n}
                    onClick={() => move(n)}
                  >
                    <span aria-hidden="true">{"│".repeat(n)}</span>Take {n}
                  </button>
                ))}
              </div>
              <p className="strategy-caption">
                The last stick wins — not the biggest pile.
              </p>
            </div>
          ) : null}
          <p className="pg-moment" role="status">
            {state.lastOutcome}
          </p>
          {error && (
            <p role="alert" className="pg-alert">
              {error}
            </p>
          )}
          <details className="pg-how">
            <summary>
              {isFour
                ? "The little moves that win"
                : "A small pile, a clever trick"}
            </summary>
            <p>
              {isFour
                ? "Connect four gold discs horizontally, vertically or diagonally. Each arrow drops into its column. A full board without a line is a draw. MelaBot looks ahead, so watch its teal threats. The crowd can send a SIDEWIND: your next disc shifts one column right, or left at the right edge, unless that neighbour is full. The chosen column must be open."
                : "Start with 21 sticks and alternate taking one, two or three. Take the final stick to win. Try leaving multiples of four — but the crowd can change the arithmetic. SPARK removes one extra stick after the chosen take, if one remains. That extra stick counts for the same player, including the winning last stick."}
            </p>
            <p>
              Crowd effects are revealed when the move lands. Players and
              MelaBot follow the same rules. Keyboard: Tab to a move, then
              Enter.
            </p>
          </details>
        </>
      )}
    </PlaygroundMatch>
  );
}
