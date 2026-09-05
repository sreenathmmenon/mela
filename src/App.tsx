import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { reducers, tables } from "./module_bindings";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import "./mela.css";

const POWER_CARDS = [
  {
    power: "boost",
    title: "BOOST",
    cost: 18,
    cooldown: "20s",
    copy: "+2 runs to the next non-wicket delivery.",
  },
  {
    power: "chaos",
    title: "CHAOS",
    cost: 20,
    cooldown: "25s",
    copy: "A high-variance next delivery. It can help or hurt.",
  },
  {
    power: "shield",
    title: "SHIELD",
    cost: 15,
    cooldown: "25s",
    copy: "Convert the next wicket into a dot ball.",
  },
  {
    power: "cheer",
    title: "CHEER",
    cost: 4,
    cooldown: "10s",
    copy: "Spend 4 to add 8 energy for everyone.",
  },
] as const;

function secondsRemaining(readyAtMicros: bigint | undefined, now: number) {
  if (!readyAtMicros) return 0;
  return Math.max(0, Math.ceil((Number(readyAtMicros / 1000n) - now) / 1000));
}

function App() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingPower, setPendingPower] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<"human" | "melabot">(
    "human",
  );
  const [now, setNow] = useState(Date.now());
  const [matchEvents, setMatchEvents] = useState<
    Array<{ id: bigint; matchId: bigint; message: string }>
  >([]);
  const onMatchEvent = useCallback(
    (event: { id: bigint; matchId: bigint; message: string }) =>
      setMatchEvents((feed) => [...feed, event].slice(-16)),
    [],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const conn = useSpacetimeDB();
  const { isActive: connected } = conn;
  const [worlds] = useTable(tables.world);
  const [profiles] = useTable(tables.playerProfile);
  const [presence] = useTable(tables.worldPresence);
  const [matches] = useTable(tables.match);
  const [participants] = useTable(tables.matchParticipant);
  const [states] = useTable(tables.bookCricketState);
  const [history] = useTable(tables.matchHistory);
  const [crowds] = useTable(tables.matchCrowd);
  const [spectators] = useTable(tables.matchSpectator);
  const [cooldowns] = useTable(tables.spectatorCooldown);
  const [effects] = useTable(tables.crowdEffect);
  useTable(tables.liveEvent, { onInsert: onMatchEvent });

  const me = useMemo(() => {
    const identity = conn.identity;
    return identity
      ? profiles.find((profile) => profile.identity.isEqual(identity))
      : undefined;
  }, [profiles, conn.identity]);
  const activeMatch = matches.find((match) => match.status === "active");
  const bookMatches = matches.filter(
    (match) => match.gameKind === "book_cricket",
  );
  const displayedMatch = activeMatch ?? bookMatches[bookMatches.length - 1];
  const matchState = displayedMatch
    ? states.find((state) => state.matchId === displayedMatch.id)
    : undefined;
  const crowd = displayedMatch
    ? crowds.find((row) => row.matchId === displayedMatch.id)
    : undefined;
  const matchSpectators = displayedMatch
    ? spectators.filter((row) => row.matchId === displayedMatch.id)
    : [];
  const matchEffects = displayedMatch
    ? effects.filter((row) => row.matchId === displayedMatch.id)
    : [];
  const identity = conn.identity;
  const ownsMatch = Boolean(
    activeMatch && identity && activeMatch.playerIdentity.isEqual(identity),
  );
  const isSpectator = Boolean(
    displayedMatch &&
    identity &&
    matchSpectators.some((row) => row.identity.isEqual(identity)),
  );
  const humanName = displayedMatch
    ? (participants.find(
        (row) => row.matchId === displayedMatch.id && row.actorKind === "human",
      )?.displayName ?? "Human")
    : "Human";
  const result = displayedMatch
    ? history.find((row) => row.matchId === displayedMatch.id)
    : undefined;

  const onboard = useReducer(reducers.onboard);
  const createMatch = useReducer(reducers.createBookCricket);
  const playBall = useReducer(reducers.playBall);
  const runBot = useReducer(reducers.runMelaBotTurn);
  const joinSpectator = useReducer(reducers.joinMatchAsSpectator);
  const useCrowdPower = useReducer(reducers.useCrowdPower);

  const submitOnboarding = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !connected) return;
    try {
      await onboard({ displayName: name });
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to join Mela.",
      );
    }
  };

  const activatePower = async (
    power: (typeof POWER_CARDS)[number]["power"],
  ) => {
    if (!displayedMatch || !isSpectator) return;
    setPendingPower(power);
    try {
      await useCrowdPower({
        matchId: displayedMatch.id,
        power,
        target: selectedTarget,
      });
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Power could not be used.",
      );
    } finally {
      setPendingPower(null);
    }
  };

  return (
    <main className="mela-shell">
      <header className="hero">
        <p className="eyebrow">MELA · LIVE PLAYGROUND</p>
        <div className="hero-row">
          <div>
            <h1>{worlds[0]?.name ?? "Mela Commons"}</h1>
            <p className="subtitle">
              One match. One crowd. Every move matters.
            </p>
          </div>
          <span className={`status ${connected ? "online" : "offline"}`}>
            {connected ? "● Live" : "● Reconnecting"}
          </span>
        </div>
      </header>

      {!me && (
        <form className="join-card" onSubmit={submitOnboarding}>
          <p className="eyebrow">STEP 1 OF 1</p>
          <h2>Enter the matchday crowd</h2>
          <p>Pick a name to play, watch, and influence the live world.</p>
          <label htmlFor="name">Your display name</label>
          <div className="join-row">
            <input
              id="name"
              placeholder="e.g. Maya"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!connected}
            />
            <button disabled={!connected}>Join Mela</button>
          </div>
        </form>
      )}
      {error && (
        <p className="feedback error" role="alert">
          {error}
        </p>
      )}

      {me && (
        <section className="identity">
          <span>
            Signed in as <strong>{me.displayName}</strong>
          </span>
          <span>
            {presence.filter((row) => row.state === "online").length} people in
            Mela
          </span>
        </section>
      )}
      {me && !activeMatch && (
        <button className="primary start" onClick={() => createMatch()}>
          Start Book Cricket vs MelaBot
        </button>
      )}

      {displayedMatch && matchState && (
        <>
          <section className="scoreboard" aria-label="Live Book Cricket score">
            <div className="match-kicker">
              <span>BOOK CRICKET · LIVE</span>
              <span>{matchSpectators.length} in the crowd</span>
            </div>
            <div className="score-row">
              <div>
                <span className="team">{humanName}</span>
                <strong>
                  {matchState.humanScore}/{matchState.humanWickets}
                </strong>
                <small>{matchState.humanBalls} balls</small>
              </div>
              <div className="versus">VS</div>
              <div>
                <span className="team">MelaBot</span>
                <strong>
                  {matchState.botScore}/{matchState.botWickets}
                </strong>
                <small>{matchState.botBalls} balls</small>
              </div>
            </div>
            <p className="match-state">
              Innings {matchState.innings} ·{" "}
              {matchState.target
                ? `Target ${matchState.target}`
                : "Set the target"}{" "}
              · <strong>{matchState.lastOutcome}</strong>
            </p>
            {displayedMatch.status === "complete" && (
              <p className="result">
                Result:{" "}
                {(result?.winner ?? displayedMatch.winner).toUpperCase()} wins
              </p>
            )}
            {ownsMatch && matchState.turn === "human" && (
              <div className="player-actions">
                <p>The crowd is watching. Pick your delivery.</p>
                <button
                  className="secondary"
                  onClick={() =>
                    playBall({ matchId: displayedMatch.id, style: "steady" })
                  }
                >
                  Steady flip
                </button>
                <button
                  className="primary"
                  onClick={() =>
                    playBall({ matchId: displayedMatch.id, style: "attack" })
                  }
                >
                  Attack flip
                </button>
              </div>
            )}
            {ownsMatch && matchState.turn === "bot" && (
              <button
                className="primary"
                onClick={() => runBot({ matchId: displayedMatch.id })}
              >
                Let MelaBot play
              </button>
            )}
          </section>

          {activeMatch && me && !ownsMatch && !isSpectator && (
            <section className="join-crowd">
              <p className="eyebrow">YOU'RE WATCHING LIVE</p>
              <h2>Make the crowd matter.</h2>
              <p>
                Join this match to spend shared Crowd Energy and shape the next
                delivery.
              </p>
              <button
                className="primary wide"
                onClick={() => joinSpectator({ matchId: activeMatch.id })}
              >
                Join the crowd
              </button>
            </section>
          )}

          {(isSpectator || ownsMatch) && crowd && (
            <section className="crowd-panel">
              <div className="crowd-header">
                <div>
                  <p className="eyebrow">SHARED CROWD ENERGY</p>
                  <h2>
                    {crowd.energy}
                    <span> / {crowd.maxEnergy}</span>
                  </h2>
                </div>
                <div
                  className="energy-bar"
                  aria-label={`${crowd.energy} of ${crowd.maxEnergy} Crowd Energy`}
                >
                  <i
                    style={{
                      width: `${(crowd.energy / crowd.maxEnergy) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <p className="crowd-note">
                Every power spends from one shared pool. Choose together, act
                fast.
              </p>
              {matchEffects.length > 0 && (
                <div className="active-effects">
                  {matchEffects.map((effect) => (
                    <span key={effect.id.toString()}>
                      {effect.power.toUpperCase()} → {effect.target}
                    </span>
                  ))}
                </div>
              )}
              {isSpectator && activeMatch && (
                <>
                  <fieldset className="target-picker">
                    <legend>Choose a side to influence</legend>
                    <button
                      className={selectedTarget === "human" ? "selected" : ""}
                      onClick={() => setSelectedTarget("human")}
                    >
                      {humanName}
                    </button>
                    <button
                      className={selectedTarget === "melabot" ? "selected" : ""}
                      onClick={() => setSelectedTarget("melabot")}
                    >
                      MelaBot
                    </button>
                  </fieldset>
                  <div className="power-grid">
                    {POWER_CARDS.map((card) => {
                      const cooldown = cooldowns.find(
                        (row) =>
                          displayedMatch.id === row.matchId &&
                          row.power === card.power &&
                          identity &&
                          row.identity.isEqual(identity),
                      );
                      const seconds = secondsRemaining(
                        cooldown?.readyAtMicros,
                        now,
                      );
                      const blocked =
                        pendingPower !== null ||
                        crowd.energy < card.cost ||
                        seconds > 0;
                      const label =
                        pendingPower === card.power
                          ? "Activating…"
                          : seconds > 0
                            ? `Ready in ${seconds}s`
                            : crowd.energy < card.cost
                              ? "Need more energy"
                              : `Use · ${card.cost} energy`;
                      return (
                        <article
                          className={`power-card ${blocked ? "blocked" : ""}`}
                          key={card.power}
                        >
                          <div>
                            <h3>{card.title}</h3>
                            <span>
                              {card.cost} energy · {card.cooldown} cooldown
                            </span>
                          </div>
                          <p>{card.copy}</p>
                          <button
                            disabled={blocked}
                            onClick={() => activatePower(card.power)}
                          >
                            {label}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
              {ownsMatch && (
                <p className="player-crowd-hint">
                  Player view: spectator powers and active effects appear here
                  in real time.
                </p>
              )}
            </section>
          )}

          <section className="feed">
            <div className="feed-header">
              <h2>Live match moments</h2>
              <span>Authoritative</span>
            </div>
            <ul>
              {matchEvents
                .filter((event) => event.matchId === displayedMatch.id)
                .slice(-8)
                .reverse()
                .map((event) => (
                  <li key={event.id.toString()}>{event.message}</li>
                ))}
              {matchEvents.filter(
                (event) => event.matchId === displayedMatch.id,
              ).length === 0 && <li>Waiting for the next moment…</li>}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

export default App;
