import { useState } from "react";
import { useReducer, useTable } from "spacetimedb/react";
import { reducers, tables } from "./module_bindings";
import { playSound } from "./sound";

export function GilliDanda({
  matchId,
  onBack,
}: {
  matchId: bigint;
  onBack: () => void;
}) {
  const [states] = useTable(tables.gilliDandaState);
  const [matches] = useTable(tables.match);
  const [power, setPower] = useState(2);
  const [timing, setTiming] = useState(55);
  const [busy, setBusy] = useState(false);
  const strike = useReducer(reducers.strikeGilli);
  const state = states.find((row) => row.matchId === matchId),
    match = matches.find((row) => row.id === matchId);
  if (!state || !match)
    return (
      <main className="mela-shell">
        <p>Drawing the chalk circle…</p>
      </main>
    );
  const humanTurn = state.turn === "human";
  return (
    <main className="mela-shell gilli-shell">
      <header className="hero">
        <button className="link-back" onClick={onBack}>
          ← Mela home
        </button>
        <p className="eyebrow">MELA · GILLI DANDA</p>
        <h1>Lift. Strike. Listen.</h1>
        <p className="subtitle">
          A good strike travels. A perfect one cracks across the ground.
        </p>
      </header>
      <section className="gilli-score">
        <div>
          <small>YOU</small>
          <strong>{state.humanScore}</strong>
        </div>
        <div className="gilli-turn">
          {humanTurn
            ? "Set your strike"
            : state.turn === "melabot"
              ? "MelaBot steps up…"
              : match.winner === "human"
                ? "You take the street."
                : "MelaBot takes the street."}
        </div>
        <div>
          <small>MELABOT</small>
          <strong>{state.botScore}</strong>
        </div>
      </section>
      <section className={`gilli-stage ${state.lastSound}`}>
        <span className="chalk">
          {state.lastDistance ? `${state.lastDistance} paces` : "chalk circle"}
        </span>
        <i className="gilli-stick" />
        <i className="gilli-piece" />
        <b className="gilli-impact">
          {state.lastSound === "crack"
            ? "CRACK!"
            : state.lastSound
              ? state.lastSound.toUpperCase()
              : ""}
        </b>
      </section>
      <section className="strike-controls">
        <label>
          Strength{" "}
          <input
            type="range"
            min="1"
            max="3"
            value={power}
            onChange={(e) => setPower(Number(e.target.value))}
            disabled={!humanTurn || busy}
          />
          <b>{["soft", "clean", "full"][power - 1]}</b>
        </label>
        <label>
          Strike timing{" "}
          <input
            type="range"
            min="0"
            max="100"
            value={timing}
            onChange={(e) => setTiming(Number(e.target.value))}
            disabled={!humanTurn || busy}
          />
          <b>{timing}</b>
        </label>
        <button
          className="primary wide"
          disabled={!humanTurn || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await strike({ matchId, power, timing });
              playSound("flick");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "STRIKING…" : "STRIKE THE GILLI"}
        </button>
      </section>
      <section className="game-moment">
        <strong>{state.lastOutcome}</strong>
        <span>Round {Math.ceil(state.round / 2)} of 5</span>
      </section>
    </main>
  );
}
