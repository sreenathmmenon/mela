import { useState, type PointerEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import { reducers, tables } from "./module_bindings";

const powers = [
  ["nudge", "NUDGE", 14, "Give your side's next flick a small extra push."],
  ["tilt", "DESK TILT", 18, "Add a gentle sideways drift to the next flick."],
  ["guard", "GUARD", 16, "Save a chosen pen from one edge exit."],
  ["cheer", "CHEER", 4, "Return 8 shared Energy for the crowd."],
] as const;
const url = (id: bigint) =>
  `${(import.meta.env.VITE_PUBLIC_APP_URL || location.origin).replace(/\/$/, "")}/?join=${id}`;

export function PenFight({ onBack }: { onBack: () => void }) {
  const conn = useSpacetimeDB();
  const identity = conn.identity;
  const [matches] = useTable(tables.match);
  const [states] = useTable(tables.penFightState);
  const [participants] = useTable(tables.matchParticipant);
  const [crowds] = useTable(tables.matchCrowd);
  const [spectators] = useTable(tables.matchSpectator);
  const [effects] = useTable(tables.crowdEffect);
  const [profiles] = useTable(tables.playerProfile);
  const [aim, setAim] = useState({ x: 740, y: 500 });
  const [force, setForce] = useState(60);
  const [contact, setContact] = useState(50);
  const [target, setTarget] = useState<"human" | "melabot">("human");
  const [note, setNote] = useState("");
  const match =
    matches.find(
      (row) => row.status === "active" && row.gameKind === "pen_fight",
    ) ?? matches.filter((row) => row.gameKind === "pen_fight").slice(-1)[0];
  const state = match
    ? states.find((row) => row.matchId === match.id)
    : undefined;
  const crowd = match
    ? crowds.find((row) => row.matchId === match.id)
    : undefined;
  const me = identity
    ? profiles.find((row) => row.identity.isEqual(identity))
    : undefined;
  const owns = Boolean(
    match && identity && match.playerIdentity.isEqual(identity),
  );
  const spectating = Boolean(
    match &&
    identity &&
    spectators.some(
      (row) => row.matchId === match.id && row.identity.isEqual(identity),
    ),
  );
  const flick = useReducer(reducers.flickPen);
  const join = useReducer(reducers.joinMatchAsSpectator);
  const power = useReducer(reducers.usePenFightCrowdPower);
  const human = match
    ? (participants.find(
        (row) => row.matchId === match.id && row.actorKind === "human",
      )?.displayName ?? "Player")
    : "Player";
  const completed = match?.status === "complete";
  const place = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setAim({
      x: Math.round(((event.clientX - rect.left) / rect.width) * 1000),
      y: Math.round(((event.clientY - rect.top) / rect.height) * 1000),
    });
  };
  if (!match || !state)
    return (
      <section className="pen-empty">
        <h2>Pen Fight is waiting for a live desk.</h2>
        <button onClick={onBack}>Back to Mela</button>
      </section>
    );
  const actor = state.turn === "human" ? human : "MelaBot";
  return (
    <main className="pen-shell">
      <header className="pen-top">
        <div>
          <p className="eyebrow">MELA · PEN FIGHT</p>
          <h1>Flick. Hit. Survive.</h1>
          <p>Win two rounds by knocking the other pen off the desk.</p>
        </div>
        <button className="secondary" onClick={onBack}>
          Choose game
        </button>
      </header>
      <section className="pen-score">
        <span>
          {human} <strong>{state.humanRounds}</strong>
        </span>
        <b>ROUND {state.round} · FIRST TO 2</b>
        <span>
          <strong>{state.botRounds}</strong> MelaBot
        </span>
      </section>
      <section className="pen-arena-wrap">
        <div className="pen-turn">
          <strong>
            {completed ? "DUEL REMEMBERED" : `${actor.toUpperCase()}’S TURN`}
          </strong>
          <span>
            {completed
              ? state.lastOutcome
              : state.turn === "human"
                ? "Aim at the other pen, set force, then flick."
                : "MelaBot is reading the desk…"}
          </span>
        </div>
        <div
          className="pen-arena"
          onPointerDown={owns && state.turn === "human" ? place : undefined}
        >
          <i className="notebook-line l1" />
          <i className="notebook-line l2" />
          <i className="notebook-line l3" />
          <div className="danger-zone">EDGE</div>
          <div
            className="pen-token human"
            style={{
              left: `${state.humanX / 10}%`,
              top: `${state.humanY / 10}%`,
            }}
          >
            <span>{human.slice(0, 1)}</span>
          </div>
          <div
            className="pen-token bot"
            style={{ left: `${state.botX / 10}%`, top: `${state.botY / 10}%` }}
          >
            <span>M</span>
          </div>
          {owns && state.turn === "human" && (
            <>
              <div
                className="aim-line"
                style={{
                  left: `${state.humanX / 10}%`,
                  top: `${state.humanY / 10}%`,
                  width: `${Math.hypot(aim.x - state.humanX, aim.y - state.humanY) / 10}%`,
                  transform: `rotate(${Math.atan2(aim.y - state.humanY, aim.x - state.humanX)}rad)`,
                }}
              />
              <div
                className="aim-dot"
                style={{ left: `${aim.x / 10}%`, top: `${aim.y / 10}%` }}
              />
            </>
          )}
        </div>
      </section>
      {owns && !completed && state.turn === "human" && (
        <section className="flick-controls">
          <p className="eyebrow">
            1 AIM ON THE DESK · 2 SET YOUR FLICK · 3 RELEASE
          </p>
          <label>
            Force{" "}
            <input
              type="range"
              min="24"
              max="100"
              value={force}
              onChange={(e) => setForce(Number(e.target.value))}
            />
            <b>{force}</b>
          </label>
          <label>
            Contact{" "}
            <input
              type="range"
              min="0"
              max="100"
              value={contact}
              onChange={(e) => setContact(Number(e.target.value))}
            />
            <b>{contact < 35 ? "LEFT" : contact > 65 ? "RIGHT" : "CENTER"}</b>
          </label>
          <button
            className="primary wide"
            onClick={async () => {
              try {
                await flick({
                  matchId: match.id,
                  aimX: aim.x,
                  aimY: aim.y,
                  force,
                  contact,
                });
                setNote("Flick committed. Watch the desk.");
              } catch {
                setNote("That flick is not legal right now.");
              }
            }}
          >
            FLICK THE PEN
          </button>
        </section>
      )}
      <p className="pen-result" role="status">
        {note || state.lastOutcome}
        {state.turnsInRound >= 6 && !completed
          ? " · Final exchanges—safer positioning decides the round at 8 turns."
          : ""}
      </p>
      {!owns && me && !spectating && !completed && (
        <button
          className="primary wide"
          onClick={() => join({ matchId: match.id })}
        >
          Join {human}'s crowd
        </button>
      )}
      {(spectating || owns) && crowd && !completed && (
        <section className="pen-crowd">
          <p className="eyebrow">
            HANDS AROUND THE DESK · {crowd.energy}/{crowd.maxEnergy} ENERGY
          </p>
          <p>
            {state.turn === "human"
              ? `${human} is lining up a flick. Help now or save it for the edge.`
              : "MelaBot is acting next. Shift the desk conditions, not the outcome."}
          </p>
          <div className="target-picker">
            <button
              className={target === "human" ? "selected" : ""}
              onClick={() => setTarget("human")}
            >
              Help {human}
            </button>
            <button
              className={target === "melabot" ? "selected" : ""}
              onClick={() => setTarget("melabot")}
            >
              Help MelaBot
            </button>
          </div>
          <div className="power-grid">
            {powers.map(([key, label, cost, copy]) => (
              <article className="power-card" key={key}>
                <h3>
                  {label} · {cost}
                </h3>
                <p>{copy}</p>
                <button
                  disabled={crowd.energy < cost}
                  onClick={async () => {
                    try {
                      await power({ matchId: match.id, power: key, target });
                      setNote(`${label} is now part of the desk.`);
                    } catch {
                      setNote("That crowd move is unavailable.");
                    }
                  }}
                >
                  {crowd.energy < cost ? "Need Energy" : "Use now"}
                </button>
              </article>
            ))}
          </div>
          {effects.filter((e) => e.matchId === match.id).length > 0 && (
            <p>
              Waiting effects:{" "}
              {effects
                .filter((e) => e.matchId === match.id)
                .map((e) => `${e.power} → ${e.target}`)
                .join(" · ")}
            </p>
          )}
        </section>
      )}
      <section className="pen-join">
        <QRCodeSVG value={url(match.id)} size={92} />
        <div>
          <strong>JOIN THE CROWD</strong>
          <span>Scan, name yourself, then shape the next flick.</span>
        </div>
      </section>
    </main>
  );
}
