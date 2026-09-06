import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useReducer, useTable } from "spacetimedb/react";
import { reducers, tables } from "./module_bindings";
import { PlaygroundMatch, usePlaygroundMatch } from "./PlaygroundMatch";
import { playSound } from "./sound";

export function GilliDanda({
  matchId,
  onBack,
  screen = false,
}: {
  matchId: bigint;
  onBack: () => void;
  screen?: boolean;
}) {
  const [states] = useTable(tables.gilliDandaState),
    [launches] = useTable(tables.gilliLaunch);
  const state = states.find((s) => s.matchId === matchId),
    launch = launches.find((s) => s.matchId === matchId);
  const { isPlayer, connected, humanName } = usePlaygroundMatch(
    matchId,
    screen,
  );
  const lift = useReducer(reducers.liftGilli),
    strike = useReducer(reducers.strikeGilli);
  const [power, setPower] = useState(2),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(0),
    [shot, setShot] = useState(false);
  const lastRound = useRef(state?.round);
  useEffect(() => {
    if (
      state &&
      lastRound.current !== undefined &&
      state.round !== lastRound.current
    ) {
      setShot(true);
      playSound(state.lastSound === "crack" ? "contact" : "out");
      const timer = setTimeout(() => setShot(false), 1800);
      lastRound.current = state.round;
      return () => clearTimeout(timer);
    }
    lastRound.current = state?.round;
  }, [state?.round]);
  useEffect(() => {
    if (!launch) {
      setProgress(0);
      return;
    }
    let frame = 0;
    const update = () => {
      setProgress(
        Math.min(
          1,
          Math.max(
            0,
            (Date.now() - Number(launch.startedAtMicros / 1000n)) / 2400,
          ),
        ),
      );
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [launch?.startedAtMicros]);
  const canPlay =
    connected && isPlayer && state?.turn === "human" && !busy && !shot;
  const hit = async () => {
    if (!canPlay || !state) return;
    setBusy(true);
    setError("");
    playSound("flick");
    try {
      if (launch) await strike({ matchId, round: state.round });
      else await lift({ matchId, round: state.round, power });
    } catch {
      setError(
        "The strike was not accepted. Wait for the live turn to settle, then try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <PlaygroundMatch
      matchId={matchId}
      screen={screen}
      title="Gilli Danda"
      onBack={onBack}
    >
      <section className="pg-title">
        <p className="eyebrow">THE WHOLE LANE IS WATCHING.</p>
        <h1>One beautiful strike.</h1>
        <p>Lift it. Catch the moment. Make the wood sing.</p>
      </section>
      {!state ? (
        <p role="status">Marking the chalk…</p>
      ) : (
        <>
          <section className="pg-score">
            <div>
              <span>{isPlayer ? "You" : humanName}</span>
              <strong>{state.humanScore}</strong>
              <small>PACES</small>
            </div>
            <p role="status">
              {state.turn === "complete"
                ? "The dust has settled."
                : state.turn === "melabot"
                  ? "MelaBot sizes up the shot…"
                  : isPlayer
                    ? launch
                      ? "Strike as the marker reaches gold!"
                      : "Your turn at the chalk."
                    : `${humanName} steps up`}
              <small>
                Strike {Math.min(5, Math.ceil(state.round / 2))} of 5 each
              </small>
            </p>
            <div>
              <span>MelaBot</span>
              <strong>{state.botScore}</strong>
              <small>PACES</small>
            </div>
          </section>
          <div
            className={`pg-courtyard ${shot ? "shot" : ""} ${launch ? "lifted" : ""}`}
            style={
              {
                "--lift": `${Math.sin(progress * Math.PI) * 105}px`,
                "--flight": `${Math.min(300, state.lastDistance * 4)}px`,
              } as CSSProperties
            }
            aria-label="Gilli Danda courtyard"
          >
            <svg
              viewBox="0 0 700 390"
              role="img"
              aria-label="A sunlit lane with chalk markings, a wooden danda and a flying gilli"
            >
              <defs>
                <linearGradient id="sky" x2="0" y2="1">
                  <stop stopColor="#f4d397" />
                  <stop offset="1" stopColor="#f9ebc7" />
                </linearGradient>
                <linearGradient id="earth" x2="0" y2="1">
                  <stop stopColor="#c9894b" />
                  <stop offset="1" stopColor="#91532e" />
                </linearGradient>
                <linearGradient id="wood">
                  <stop stopColor="#452a19" />
                  <stop offset=".4" stopColor="#bd7840" />
                  <stop offset=".7" stopColor="#e6b276" />
                  <stop offset="1" stopColor="#6f3b20" />
                </linearGradient>
              </defs>
              <rect width="700" height="390" fill="url(#sky)" />
              <circle cx="565" cy="70" r="36" fill="#fff5cf" />
              <path
                d="M0 150V90L130 78V162L220 151V105H335V170L450 141V78L590 89V164L700 140V390H0Z"
                fill="#d1a16a"
              />
              <path d="M0 186L700 157V390H0Z" fill="url(#earth)" />
              <path
                d="M0 50Q350 130 700 40"
                fill="none"
                stroke="#60472f"
                strokeWidth="2"
              />
              {[80, 180, 290, 400, 510, 620].map((x, i) => (
                <path
                  key={x}
                  d={`M${x} ${63 + Math.sin(i / 2) * 32}l25 4-16 28Z`}
                  fill={i % 2 ? "#287d71" : "#bf5b31"}
                />
              ))}
              <path
                d="M240 388L340 200M460 388L370 200"
                stroke="#f3dcc0"
                strokeWidth="3"
                opacity=".5"
              />
              {[240, 290, 350].map((y) => (
                <path
                  key={y}
                  d={`M${290 - (y - 240) / 3} ${y}h${130 + (y - 240) * 0.7}`}
                  stroke="#eed7b5"
                  strokeWidth="2"
                  opacity=".55"
                />
              ))}
              <ellipse
                cx="320"
                cy="328"
                rx="75"
                ry="23"
                fill="none"
                stroke="#fff0ce"
                strokeWidth="4"
                strokeDasharray="15 6"
              />
              <ellipse
                cx="340"
                cy="327"
                rx="32"
                ry="6"
                fill="#462516"
                opacity=".3"
              />
              <g className="pg-danda">
                <rect
                  x="115"
                  y="291"
                  width="225"
                  height="17"
                  rx="8"
                  fill="url(#wood)"
                  stroke="#5a301d"
                  strokeWidth="2"
                />
                <path
                  d="M132 295l140 3M160 304h85"
                  stroke="#eac28c"
                  opacity=".55"
                />
              </g>
              <g className="pg-flying-gilli">
                <path
                  d="M304 309l13-8h47l13 8-13 8h-47Z"
                  fill="url(#wood)"
                  stroke="#5b311c"
                  strokeWidth="2"
                />
                <path d="M320 305h38" stroke="#f3d4a0" strokeWidth="2" />
              </g>
              <text
                x="32"
                y="360"
                fill="#fbe9c6"
                fontSize="13"
                letterSpacing="3"
              >
                MELA • THE CHALK END
              </text>
            </svg>
            {shot && (
              <div className="pg-flight-result" role="status">
                <b>
                  {state.lastDistance === 0
                    ? "MISSED!"
                    : state.lastSound.toUpperCase() + "!"}
                </b>
                <span>{state.lastDistance} paces</span>
              </div>
            )}
          </div>
          {isPlayer && state.turn !== "complete" && (
            <section className="pg-strike">
              <fieldset disabled={!!launch || !canPlay}>
                <legend>Choose your swing</legend>
                {[1, 2, 3].map((p) => (
                  <button
                    key={p}
                    aria-pressed={power === p}
                    onClick={() => setPower(p)}
                  >
                    <strong>{["Gentle", "Clean", "Thunder"][p - 1]}</strong>
                    <small>
                      {
                        [
                          "Wide contact window",
                          "Reach with control",
                          "Big reach. Precise timing.",
                        ][p - 1]
                      }
                    </small>
                  </button>
                ))}
              </fieldset>
              <div
                className="pg-timing"
                aria-label="Strike timing: gold is the contact window"
              >
                <span className="pg-sweet" />
                <i style={{ left: `${progress * 100}%` }} />
              </div>
              <button
                className="primary pg-hit"
                disabled={!canPlay}
                onClick={hit}
              >
                {busy
                  ? "One moment…"
                  : state.turn === "melabot"
                    ? "MelaBot's turn"
                    : launch
                      ? "STRIKE!"
                      : "LIFT THE GILLI"}
              </button>
              <p>
                Lift first. Tap Strike when the marker reaches gold. A stronger
                swing needs cleaner timing.
              </p>
            </section>
          )}
          <p className="pg-moment">
            {state.lastOutcome.replace(/You/g, isPlayer ? "You" : humanName)}
          </p>
          {error && (
            <p role="alert" className="pg-alert">
              {error}
            </p>
          )}
          <details className="pg-how">
            <summary>How the lane is won</summary>
            <p>
              Five strikes each. Most total paces wins. Gentle swings offer a
              wide contact window; Thunder rewards precise timing and can miss
              completely. A lifted gilli lands after 2.4 seconds even if you
              leave. The crowd can give a rhythm boost or heckle either side.
            </p>
          </details>
        </>
      )}
    </PlaygroundMatch>
  );
}
