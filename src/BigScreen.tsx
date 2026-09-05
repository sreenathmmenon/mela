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

  if (!displayedMatch || !state)
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
  const completed = displayedMatch.status === "complete";
  const winner = memory?.winner ?? result?.winner ?? displayedMatch.winner;

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
          <small>{state.humanBalls} balls</small>
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
          <small>{state.botBalls} balls</small>
        </div>
      </section>

      <section className={`screen-turn ${completed ? "complete" : ""}`}>
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
            <h2>MelaBot is making its move.</h2>
            <p>Every action resolves in the same authoritative world.</p>
          </>
        ) : (
          <>
            <p className="eyebrow">PLAYER’S TURN</p>
            <h2>{humanName} has the book.</h2>
            <p>The crowd can still shape the next delivery.</p>
          </>
        )}
      </section>

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
