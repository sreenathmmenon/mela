import { useCallback, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTable } from "spacetimedb/react";
import { tables } from "./module_bindings";

function publicJoinUrl(matchId: bigint) {
  const base = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
  return `${base.replace(/\/$/, "")}/?join=${matchId.toString()}`;
}

function requestedMatchId() {
  const hashQuery = window.location.hash.split("?")[1] ?? "";
  const value =
    new URLSearchParams(window.location.search).get("match") ??
    new URLSearchParams(hashQuery).get("match");
  if (!value || !/^\d+$/.test(value)) return undefined;
  return BigInt(value);
}

export default function BigScreen() {
  const [events, setEvents] = useState<
    Array<{ id: bigint; matchId: bigint; message: string }>
  >([]);
  const onEvent = useCallback(
    (event: { id: bigint; matchId: bigint; message: string }) =>
      setEvents((feed) =>
        feed.some((existing) => existing.id === event.id)
          ? feed
          : [...feed, event].slice(-12),
      ),
    [],
  );
  const [matches] = useTable(tables.match);
  const [states] = useTable(tables.bookCricketState);
  const [penStates] = useTable(tables.penFightState);
  const [participants] = useTable(tables.matchParticipant);
  const [crowds] = useTable(tables.matchCrowd);
  const [spectators] = useTable(tables.matchSpectator);
  const [effects] = useTable(tables.crowdEffect);
  const [history] = useTable(tables.matchHistory);
  const [memories] = useTable(tables.matchMemory);
  const [aiCharacters] = useTable(tables.aiCharacter);
  useTable(tables.liveEvent, { onInsert: onEvent });

  const requestedId = requestedMatchId();
  const activeMatch = matches.find((match) => match.status === "active");
  const latestBookMatch = matches
    .filter((match) => match.gameKind === "book_cricket")
    .slice(-1)[0];
  const displayedMatch =
    (requestedId
      ? matches.find((match) => match.id === requestedId)
      : undefined) ??
    activeMatch ??
    latestBookMatch;
  const state = displayedMatch
    ? states.find((row) => row.matchId === displayedMatch.id)
    : undefined;
  const penState = displayedMatch
    ? penStates.find((row) => row.matchId === displayedMatch.id)
    : undefined;
  const humanName = displayedMatch
    ? (participants.find(
        (row) => row.matchId === displayedMatch.id && row.actorKind === "human",
      )?.displayName ?? "Player")
    : "Player";
  const aiName =
    aiCharacters.find((character) => character.characterKey === "melabot")
      ?.displayName ?? "MelaBot";
  const crowd = displayedMatch
    ? crowds.find((row) => row.matchId === displayedMatch.id)
    : undefined;
  const matchSpectators = displayedMatch
    ? spectators.filter((row) => row.matchId === displayedMatch.id)
    : [];
  const activeEffects = displayedMatch
    ? effects.filter((row) => row.matchId === displayedMatch.id)
    : [];
  const memory = displayedMatch
    ? memories.find((row) => row.matchId === displayedMatch.id)
    : undefined;
  const result = displayedMatch
    ? history.find((row) => row.matchId === displayedMatch.id)
    : undefined;
  const moments = useMemo(
    () =>
      displayedMatch
        ? events
            .filter((event) => event.matchId === displayedMatch.id)
            .slice(-5)
            .reverse()
        : [],
    [events, displayedMatch],
  );

  if (!displayedMatch || (!state && !penState))
    return (
      <main className="screen-shell screen-empty">
        <p className="eyebrow">MELA · BIG SCREEN</p>
        <h1>Waiting for the next match.</h1>
        <p>
          Start Book Cricket from a player device and this stage will come
          alive.
        </p>
      </main>
    );

  const joinUrl = publicJoinUrl(displayedMatch.id);
  if (displayedMatch.gameKind === "pen_fight" && penState)
    return (
      <main className="screen-shell pen-screen">
        <header className="screen-header">
          <div>
            <p className="eyebrow">MELA · PEN FIGHT</p>
            <h1>Two pens. One desk. One crowd.</h1>
          </div>
          <div className="screen-join">
            <QRCodeSVG value={joinUrl} size={148} />
            <div>
              <strong>JOIN THE CROWD</strong>
              <span>Scan · name yourself · shape the next flick</span>
            </div>
          </div>
        </header>
        <section className="screen-score">
          <div>
            <span>{humanName}</span>
            <strong>{penState.humanRounds}</strong>
            <small>rounds won</small>
          </div>
          <div className="screen-versus">
            <span>BEST OF 3</span>
            <strong>ROUND {penState.round}</strong>
            <small>{matchSpectators.length} around the desk</small>
          </div>
          <div>
            <span>{aiName}</span>
            <strong>{penState.botRounds}</strong>
            <small>rounds won</small>
          </div>
        </section>
        <section className="screen-turn">
          <p className="eyebrow">
            {displayedMatch.status === "complete"
              ? "DUEL REMEMBERED"
              : penState.turn === "human"
                ? "PLAYER'S FLICK"
                : "MELABOT'S FLICK"}
          </p>
          <h2>
            {displayedMatch.status === "complete"
              ? `${displayedMatch.winner === "human" ? humanName : aiName} wins the desk.`
              : penState.turn === "human"
                ? `${humanName} is aiming.`
                : "MelaBot is lining up a response."}
          </h2>
          <p>{penState.lastOutcome}</p>
        </section>
        <section className="screen-pen-arena" aria-label="Live Pen Fight desk">
          <span className="screen-edge">EDGE</span>
          <div
            className="screen-pen-token human"
            style={{
              left: `${penState.humanX / 10}%`,
              top: `${penState.humanY / 10}%`,
            }}
          >
            {humanName.slice(0, 1)}
          </div>
          <div
            className="screen-pen-token bot"
            style={{
              left: `${penState.botX / 10}%`,
              top: `${penState.botY / 10}%`,
            }}
          >
            M
          </div>
        </section>
        <section className="screen-lower">
          <article className="screen-crowd">
            <p className="eyebrow">SHARED CROWD ENERGY</p>
            <h2>
              {crowd?.energy ?? 0}
              <span> / {crowd?.maxEnergy ?? 0}</span>
            </h2>
            <p>
              Hands around the desk can nudge, tilt, or guard the next flick.
            </p>
          </article>
          <article className="screen-moments">
            <p className="eyebrow">LIVE DESK MOMENTS</p>
            <ul>
              {moments.map((event) => (
                <li key={event.id.toString()}>{event.message}</li>
              ))}
            </ul>
          </article>
        </section>
      </main>
    );
  if (!state) return null;
  const completed = displayedMatch.status === "complete";
  const winner = memory?.winner ?? result?.winner ?? displayedMatch.winner;
  const botRunsNeeded = Math.max(0, state.target - state.botScore);
  const botBallsLeft = Math.max(0, 6 - state.botBalls);
  const humanBallsLeft = Math.max(0, 6 - state.humanBalls);
  const humanWicketsLeft = Math.max(0, 2 - state.humanWickets);
  const botWicketsLeft = Math.max(0, 2 - state.botWickets);
  const tense =
    state.turn !== "complete" &&
    ((state.innings === 1 && (humanBallsLeft <= 2 || humanWicketsLeft <= 1)) ||
      (state.innings === 2 && (botBallsLeft <= 2 || botWicketsLeft <= 1)));

  return (
    <main className="screen-shell">
      <header className="screen-header">
        <div>
          <p className="eyebrow">MELA · BOOK CRICKET · LIVE WORLD</p>
          <h1>One match. One crowd. Every move matters.</h1>
        </div>
        <div className="screen-join">
          <QRCodeSVG value={joinUrl} size={148} level="M" includeMargin />
          <div>
            <strong>JOIN THE CROWD</strong>
            <span>Scan · name yourself · influence the next ball</span>
          </div>
        </div>
      </header>

      <section className="screen-score" aria-label="Book Cricket shared score">
        <div>
          <span>{humanName}</span>
          <strong>
            {state.humanScore}/{state.humanWickets}
          </strong>
          <small>
            Ball {state.humanBalls}/6 · {humanWicketsLeft} wickets left
          </small>
        </div>
        <div className="screen-versus">
          <span>VS</span>
          <strong>
            {state.target ? `TARGET ${state.target}` : "SET THE TARGET"}
          </strong>
          <small>{matchSpectators.length} in the crowd</small>
        </div>
        <div>
          <span>{aiName}</span>
          <strong>
            {state.botScore}/{state.botWickets}
          </strong>
          <small>
            Ball {state.botBalls}/6 · {botWicketsLeft} wickets left
          </small>
        </div>
      </section>

      <section
        className={`screen-turn ${completed ? "complete" : ""} ${tense ? "tension" : ""}`}
      >
        {completed ? (
          <>
            <p className="eyebrow">MATCH REMEMBERED</p>
            <h2>
              {winner === "draw"
                ? "A shared finish."
                : `${winner === "human" ? humanName : aiName} wins.`}
            </h2>
            <p>{memory?.notableMoment ?? "The result is now part of Mela."}</p>
          </>
        ) : state.turn === "bot" ? (
          <>
            <p className="eyebrow">MELABOT’S TURN</p>
            <h2>
              MelaBot needs {botRunsNeeded} from {botBallsLeft}.
            </h2>
            <p>
              {botWicketsLeft === 1
                ? "One wicket remains. The crowd can still shape this ball."
                : "MelaBot is choosing an approach in the same shared world."}
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow">PLAYER’S TURN</p>
            <h2>{humanName} has the book.</h2>
            <p>
              {state.innings === 1
                ? `${humanBallsLeft} balls and ${humanWicketsLeft} wickets remain to set the target.`
                : `The chase is live: MelaBot needs ${botRunsNeeded} from ${botBallsLeft}.`}
            </p>
          </>
        )}
      </section>

      {state.lastOutcome !== "START" && (
        <section
          className={`screen-outcome ${state.lastOutcome.includes("OUT") ? "out" : ""} ${state.lastCrowdSwing ? "crowd" : ""}`}
          aria-label="Latest authoritative match outcome"
        >
          <span>LATEST MOMENT</span>
          <strong>
            {state.lastOutcome.startsWith("6")
              ? "SIX!"
              : state.lastOutcome.startsWith("4")
                ? "FOUR!"
                : state.lastOutcome}
          </strong>
          {/* The crowd's swing is named here so the room sees who changed it. */}
          <small>
            {state.lastCrowdSwing
              ? state.lastCrowdSwing
              : tense
                ? "Pressure is on."
                : "The whole world just updated."}
          </small>
        </section>
      )}

      {(state.humanTimeline || state.botTimeline) && (
        <section className="screen-timeline" aria-label="Ball by ball">
          <div>
            <span>{humanName}</span>
            <em>
              {(state.humanTimeline || "—").split(",").map((ball, index) => (
                <b
                  key={index}
                  className={
                    ball === "W"
                      ? "w"
                      : ball === "6" || ball === "4"
                        ? "boundary"
                        : ""
                  }
                >
                  {ball}
                </b>
              ))}
            </em>
          </div>
          {state.botTimeline && (
            <div>
              <span>{aiName}</span>
              <em>
                {state.botTimeline.split(",").map((ball, index) => (
                  <b
                    key={index}
                    className={
                      ball === "W"
                        ? "w"
                        : ball === "6" || ball === "4"
                          ? "boundary"
                          : ""
                    }
                  >
                    {ball}
                  </b>
                ))}
              </em>
            </div>
          )}
        </section>
      )}

      <section className="screen-lower">
        <article className="screen-crowd">
          <p className="eyebrow">SHARED CROWD ENERGY</p>
          <h2>
            {crowd?.energy ?? 0}
            <span> / {crowd?.maxEnergy ?? 0}</span>
          </h2>
          <div className="energy-bar">
            <i
              style={{
                width: `${crowd ? (crowd.energy / crowd.maxEnergy) * 100 : 0}%`,
              }}
            />
          </div>
          <p>
            {activeEffects.length
              ? activeEffects
                  .map(
                    (effect) =>
                      `${effect.power.toUpperCase()} → ${effect.target}`,
                  )
                  .join(" · ")
              : "The crowd is ready for its next moment."}
          </p>
        </article>
        <article className="screen-moments">
          <p className="eyebrow">LIVE MATCH MOMENTS</p>
          <ul>
            {moments.length ? (
              moments.map((event) => (
                <li key={event.id.toString()}>{event.message}</li>
              ))
            ) : (
              <li>Waiting for the next moment…</li>
            )}
          </ul>
        </article>
      </section>
    </main>
  );
}
