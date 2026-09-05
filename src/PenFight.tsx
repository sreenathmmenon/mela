import { useEffect, useRef, useState, type PointerEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import { reducers, tables } from "./module_bindings";
import { playSound } from "./sound";
import "./pens.css";

/**
 * Four pens off a school desk. They are purely cosmetic — every pen has exactly
 * the same physics. Simulation showed that giving pens different mass or
 * friction makes one strictly dominant (the heavy pen won 100% of matchups),
 * and real pen fight's worst quality is that the richest pen wins. Here the pen
 * is who you are, not how hard you hit.
 */
const PENS = [
  ["pen-reynolds", "Reynolds", "The one everybody had"],
  ["pen-gel", "Gel", "Smooth grip, bright barrel"],
  ["pen-metal", "Steel", "Heavy in the hand"],
  ["pen-fountain", "Ink pen", "Your dad's good one"],
] as const;
const PEN_KEY = "mela.pen";

const powers = [
  ["nudge", "NUDGE", 14, "Give your side's next flick a small extra push."],
  ["tilt", "DESK TILT", 18, "Add a gentle sideways drift to the next flick."],
  ["guard", "GUARD", 16, "Save a chosen pen from one edge exit."],
  ["cheer", "CHEER", 4, "Return 8 shared Energy for the crowd."],
] as const;
/**
 * A stable, position-derived tilt. Deterministic per position so every client
 * shows the same pen orientation without the server storing a rotation.
 */
function spinFor(matchId: bigint, x: number, y: number, base: number) {
  const mix = (Number(matchId % 7n) * 31 + x * 3 + y * 5) % 34;
  return base + mix - 17;
}
// Mirrors penFightRules.ts. The server validates every flick regardless, so a
// drift here can only ever cost the player a rejected shot, never an illegal one.
const MIN_FORCE = 20;
const MAX_FORCE = 100;
const OPENING_FORCE_MAX = 66;

const url = (id: bigint) =>
  `${(import.meta.env.VITE_PUBLIC_APP_URL || location.origin).replace(/\/$/, "")}/?join=${id}`;

export function PenFight({
  matchId,
  onBack,
}: {
  matchId?: bigint;
  onBack: () => void;
}) {
  const conn = useSpacetimeDB();
  const identity = conn.identity;
  const [matches] = useTable(tables.match);
  const [states] = useTable(tables.penFightState);
  const [participants] = useTable(tables.matchParticipant);
  const [crowds] = useTable(tables.matchCrowd);
  const [spectators] = useTable(tables.matchSpectator);
  const [effects] = useTable(tables.crowdEffect);
  const [profiles] = useTable(tables.playerProfile);
  const [memories] = useTable(tables.matchMemory);
  const [records] = useTable(tables.penFightRecord);
  const [aim, setAim] = useState({ x: 740, y: 500 });
  const [force, setForce] = useState(60);
  const [pullPoint, setPullPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [myPen, setMyPen] = useState<string>(() => {
    try {
      return localStorage.getItem(PEN_KEY) ?? PENS[0][0];
    } catch {
      return PENS[0][0];
    }
  });
  const choosePen = (id: string) => {
    setMyPen(id);
    try {
      localStorage.setItem(PEN_KEY, id);
    } catch {
      // Private mode: the choice simply lasts for this session.
    }
  };
  const [target, setTarget] = useState<"human" | "melabot">("human");
  const [note, setNote] = useState("");
  const [aiming, setAiming] = useState(false);
  const match =
    (matchId !== undefined
      ? matches.find((row) => row.id === matchId)
      : undefined) ??
    matches.find(
      (row) => row.status === "active" && row.gameKind === "pen_fight",
    ) ??
    matches.filter((row) => row.gameKind === "pen_fight").slice(-1)[0];
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
  const rematch = useReducer(reducers.createPenFight);
  const human = match
    ? (participants.find(
        (row) => row.matchId === match.id && row.actorKind === "human",
      )?.displayName ?? "Player")
    : "Player";
  const completed = match?.status === "complete";
  /**
   * One gesture sets the whole flick. Drag back from your pen like a
   * slingshot: the direction you pull is the direction it will NOT go, and how
   * far you pull is how hard it goes. This is the model Carrom Pool, 8 Ball and
   * Angry Birds all converged on, and it works identically for mouse and touch.
   */
  const PULL_MAX = 320; // arena units of pull that map to full power
  const pull = (event: PointerEvent<HTMLDivElement>) => {
    if (!state) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * 1000;
    const py = ((event.clientY - rect.top) / rect.height) * 1000;
    // Vector from the drag point back to the pen = the launch direction.
    const dx = state.humanX - px;
    const dy = state.humanY - py;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;
    const ux = dx / len;
    const uy = dy / len;
    const drawn = Math.min(PULL_MAX, len);
    setAim({
      x: Math.round(Math.max(0, Math.min(1000, state.humanX + ux * 600))),
      y: Math.round(Math.max(0, Math.min(1000, state.humanY + uy * 600))),
    });
    const ceiling =
      state.turnsInRound < 2 ? OPENING_FORCE_MAX : MAX_FORCE;
    setForce(
      Math.round(MIN_FORCE + (drawn / PULL_MAX) * (ceiling - MIN_FORCE)),
    );
    setPullPoint({ x: px, y: py });
  };
  // Presentation only: the desk reacts to what the server already resolved —
  // a shudder on contact, a gold flash when a round is decided.
  const lastOutcome = state?.lastOutcome;
  const [deskFx, setDeskFx] = useState({ impact: false, round: false });
  useEffect(() => {
    if (
      !lastOutcome ||
      lastOutcome === "START" ||
      lastOutcome === "AIM YOUR FIRST FLICK"
    )
      return;
    const round =
      lastOutcome.includes("TAKES ROUND") || lastOutcome.includes("WINS");
    // A knocked-off pen is the round ending; anything else that moved is a hit.
    if (round) playSound("fall");
    else if (lastOutcome.includes("CONTACT")) playSound("contact");
    setDeskFx({ impact: true, round });
    const timer = window.setTimeout(
      () => setDeskFx({ impact: false, round: false }),
      round ? 850 : 480,
    );
    return () => window.clearTimeout(timer);
  }, [lastOutcome]);
  // A pen close to the border is one nudge from ending the round.
  const nearEdge = (v: number) => v < 130 || v > 870;
  const humanTeeter = Boolean(
    state && (nearEdge(state.humanX) || nearEdge(state.humanY)),
  );
  const botTeeter = Boolean(
    state && (nearEdge(state.botX) || nearEdge(state.botY)),
  );
  const edgeDanger = humanTeeter || botTeeter;
  // The teeter tone sustains for ~385ms, so it fires once on ENTERING danger
  // and stays quiet while a pen sits there — otherwise it smears every frame.
  const wasInDanger = useRef(false);
  useEffect(() => {
    if (edgeDanger && !wasInDanger.current) playSound("teeter");
    wasInDanger.current = edgeDanger;
  }, [edgeDanger]);
  if (!match)
    return (
      <section className="pen-empty">
        <h2>Pen Fight is waiting for a live desk.</h2>
        <button onClick={onBack}>Back to Mela</button>
      </section>
    );
  if (!state)
    return (
      <section className="pen-empty" aria-live="polite">
        <h2>Setting the desk for this match…</h2>
        <p>Your live Pen Fight state is arriving from Mela.</p>
      </section>
    );
  // The opening flick is capped by the server for fairness; mirror that here so
  // the power bar cannot promise strength the reducer will refuse.
  const isOpening = state.turnsInRound < 2;
  const maxForceNow = isOpening ? OPENING_FORCE_MAX : MAX_FORCE;
  const cappedForce = Math.min(force, maxForceNow);
  // The bar fills against the power available RIGHT NOW. During the opening the
  // ceiling is lower, so a full bar honestly means "as hard as this flick can
  // legally go" rather than freezing part-way with no explanation.
  const powerPct = Math.round(
    ((cappedForce - MIN_FORCE) / Math.max(1, maxForceNow - MIN_FORCE)) * 100,
  );
  const nudgeAim = (dir: number) => {
    const dx = aim.x - state.humanX;
    const dy = aim.y - state.humanY;
    const len = Math.max(1, Math.hypot(dx, dy));
    const a = Math.atan2(dy, dx) + dir * 0.14;
    setAim({
      x: Math.round(Math.max(0, Math.min(1000, state.humanX + Math.cos(a) * len))),
      y: Math.round(Math.max(0, Math.min(1000, state.humanY + Math.sin(a) * len))),
    });
  };
  const commitFlick = async () => {
    playSound("flick");
    try {
      await flick({
        matchId: match.id,
        aimX: aim.x,
        aimY: aim.y,
        force: cappedForce,
        // Contact stays centred: one gesture beats two, and a spin control can
        // be added later as a dial if players actually ask for it.
        contact: 50,
      });
      setNote("Flick committed. Watch the desk.");
    } catch {
      setNote("That flick is not legal right now.");
    }
  };

  // MelaBot's intent, derived from the same public board state its own policy
  // reads. Its reasoning already reaches the event feed, but that scrolls away
  // from where the player is looking — the desk. This puts it on the desk.
  const edgeOf = (x: number, y: number) =>
    Math.min(x, y, 1000 - x, 1000 - y);
  const myMargin = state ? edgeOf(state.humanX, state.humanY) : 500;
  const botMargin = state ? edgeOf(state.botX, state.botY) : 500;
  const gap = state
    ? Math.hypot(state.botX - state.humanX, state.botY - state.humanY)
    : 999;
  const botPlan = !state
    ? ""
    : myMargin < 150
      ? "You are near the edge — MelaBot is going for the knockout."
      : botMargin < 150
        ? "MelaBot is cornered. It has to play its way back in."
        : gap < 260
          ? "You are in range. MelaBot is lining up a hit."
          : "Too far to reach — MelaBot is closing the gap.";
  const myPlan = !state
    ? ""
    : myMargin < 150
      ? "You are on the rim. A soft flick back to safety, or risk it?"
      : botMargin < 150
        ? "MelaBot is on the rim. One good hit ends the round."
        : gap < 260
          ? "In range. Pull back and aim through its middle."
          : "Out of reach. Pull further to close the gap.";

  const actor = state.turn === "human" ? human : "MelaBot";
  // Pens rotate toward where they last travelled, so a slide reads as a real
  // object with momentum rather than a token teleporting between points.
  const humanSpin = spinFor(state.matchId, state.humanX, state.humanY, -8);
  const botSpin = spinFor(state.matchId, state.botX, state.botY, 11);
  const memory = memories.find((row) => row.matchId === match.id);
  const record = identity
    ? records.find((row) => row.identity.isEqual(identity))
    : undefined;
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
      <section className={`pen-arena-wrap ${deskFx.round ? "round-won" : ""}`}>
        <div className="pen-turn">
          <strong>
            {completed ? "DUEL REMEMBERED" : `${actor.toUpperCase()}’S TURN`}
          </strong>
          <span>
            {completed
              ? state.lastOutcome
              : state.turn === "human"
                ? myPlan
                : botPlan}
          </span>
        </div>
        <div
          className={`pen-arena ${deskFx.impact ? "impact" : ""} ${edgeDanger ? "danger" : ""}`}
          onPointerDown={
            owns && state.turn === "human" && !completed
              ? (event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setAiming(true);
                  pull(event);
                }
              : undefined
          }
          onPointerMove={aiming ? pull : undefined}
          onPointerUp={() => {
            if (!aiming) return;
            setAiming(false);
            setPullPoint(null);
            void commitFlick();
          }}
          onPointerCancel={() => {
            setAiming(false);
            setPullPoint(null);
          }}
        >
          <i className="notebook-line l1" />
          <i className="notebook-line l2" />
          <i className="notebook-line l3" />
          <div className="danger-zone">EDGE</div>
          <div
            className={`pen-token human ${myPen} ${humanTeeter ? "teeter" : ""}`}
            style={{
              left: `${state.humanX / 10}%`,
              top: `${state.humanY / 10}%`,
              ["--pen-spin" as string]: `${humanSpin}deg`,
            }}
          >
            <i className="pen-shadow" />
            <span>{human.slice(0, 1).toUpperCase()}</span>
          </div>
          <div
            className={`pen-token bot pen-metal ${botTeeter ? "teeter" : ""}`}
            style={{
              left: `${state.botX / 10}%`,
              top: `${state.botY / 10}%`,
              ["--pen-spin" as string]: `${botSpin}deg`,
            }}
          >
            <i className="pen-shadow" />
            <span>M</span>
          </div>
          {owns && state.turn === "human" && !completed && (
            <>
              {/* The launch line: short and power-tinted, so it hints direction
                  without handing over a full trajectory. */}
              <div
                className={`aim-line ${aiming ? "live" : ""}`}
                style={{
                  left: `${state.humanX / 10}%`,
                  top: `${state.humanY / 10}%`,
                  width: `${12 + (powerPct / 100) * 22}%`,
                  transform: `rotate(${Math.atan2(aim.y - state.humanY, aim.x - state.humanX)}rad)`,
                  ["--power" as string]: `${powerPct}`,
                }}
              />
              {/* The rubber band back to your finger — this is what makes the
                  gesture read as a slingshot rather than a click. */}
              {aiming && pullPoint && (
                <div
                  className="pull-band"
                  style={{
                    left: `${state.humanX / 10}%`,
                    top: `${state.humanY / 10}%`,
                    width: `${Math.hypot(pullPoint.x - state.humanX, pullPoint.y - state.humanY) / 10}%`,
                    transform: `rotate(${Math.atan2(pullPoint.y - state.humanY, pullPoint.x - state.humanX)}rad)`,
                  }}
                />
              )}
            </>
          )}
        </div>
      </section>
      {owns && !completed && (
        <section className="pen-picker" aria-label="Choose your pen">
          <p className="eyebrow">YOUR PEN</p>
          <div className="pen-swatches">
            {PENS.map(([id, name, blurb]) => (
              <button
                key={id}
                className={`pen-swatch ${id} ${myPen === id ? "chosen" : ""}`}
                onClick={() => choosePen(id)}
                aria-pressed={myPen === id}
                title={`${name} — ${blurb}`}
              >
                <i aria-hidden="true" />
                <span>{name}</span>
              </button>
            ))}
          </div>
          <p className="pen-note">
            Every pen plays exactly the same. Pick the one that feels like yours.
          </p>
        </section>
      )}
      {owns && !completed && state.turn === "human" && (
        <section className="flick-controls">
          <p className="eyebrow">
            {aiming
              ? "RELEASE TO FLICK"
              : "PULL BACK FROM YOUR PEN, THEN LET GO"}
          </p>
          <div className="power-readout" aria-hidden="true">
            <i style={{ width: `${powerPct}%` }} />
          </div>
          {/* Keyboard path: holding a pointer down is a motor-accessibility
              barrier, so aim and power are also reachable with arrows + space. */}
          <div className="keyboard-flick">
            <button
              onClick={() => nudgeAim(-1)}
              aria-label="Aim left"
              title="Aim left"
            >
              ◀
            </button>
            <button
              onClick={() => setForce((f) => Math.max(MIN_FORCE, f - 8))}
              aria-label="Less power"
              title="Less power"
            >
              −
            </button>
            <button className="primary" onClick={() => void commitFlick()}>
              FLICK
            </button>
            <button
              onClick={() => setForce((f) => Math.min(maxForceNow, f + 8))}
              aria-label="More power"
              title="More power"
            >
              +
            </button>
            <button
              onClick={() => nudgeAim(1)}
              aria-label="Aim right"
              title="Aim right"
            >
              ▶
            </button>
          </div>
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
      {spectating && crowd && !completed && (
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
      {owns && crowd && !completed && (
        <section className="pen-crowd pen-player-crowd">
          <p className="eyebrow">
            THE CROWD IS WITH YOU · {crowd.energy}/{crowd.maxEnergy} ENERGY
          </p>
          <p>
            Spectators can alter the next flick’s conditions. Watch the desk for
            their NUDGE, TILT, and GUARD signals.
          </p>
          {effects.filter((e) => e.matchId === match.id).length > 0 && (
            <p className="active-effects">
              Active:{" "}
              {effects
                .filter((e) => e.matchId === match.id)
                .map((e) => `${e.power.toUpperCase()} → ${e.target}`)
                .join(" · ")}
            </p>
          )}
        </section>
      )}
      {completed && (
        <section className="pen-memory">
          <p className="eyebrow">THIS DUEL STAYS IN MELA</p>
          <h2>{memory?.notableMoment ?? state.lastOutcome}</h2>
          <p>
            {human} {state.humanRounds} · MelaBot {state.botRounds}
            {memory
              ? ` · ${memory.crowdParticipants} crowd hands · ${memory.crowdActions} crowd moves`
              : ""}
          </p>
          {owns && record && (
            <p>
              Your Pen Fight record: {record.wins} wins from{" "}
              {record.matchesPlayed} matches.
            </p>
          )}
          {owns && (
            <button
              className="primary wide"
              onClick={async () => {
                try {
                  await rematch();
                  setNote("Fresh desk. Your next duel starts now.");
                } catch {
                  setNote("A new desk could not be set up yet.");
                }
              }}
            >
              PLAY ANOTHER DESK
            </button>
          )}
        </section>
      )}
      <section className="pen-join">
        <QRCodeSVG value={url(match.id)} size={92} />
        <div>
          <strong>JOIN THE CROWD</strong>
          <span>Scan, name yourself, then shape the next flick.</span>
          <a href={url(match.id)}>Open crowd link</a>
        </div>
      </section>
    </main>
  );
}
