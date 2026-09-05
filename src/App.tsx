import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { reducers, tables } from "./module_bindings";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import "./mela.css";
import { PenFight } from "./PenFight";

const POWER_CARDS = [
  {
    power: "boost",
    title: "BOOST",
    cost: 18,
    cooldown: "20s",
    copy: "Give your chosen side +2 runs on its next non-OUT ball.",
  },
  {
    power: "chaos",
    title: "CHAOS",
    cost: 20,
    cooldown: "25s",
    copy: "Make your chosen side’s next ball high-risk. It can help or hurt.",
  },
  {
    power: "shield",
    title: "SHIELD",
    cost: 15,
    cooldown: "25s",
    copy: "Protect your chosen side: its next OUT becomes a dot ball.",
  },
  {
    power: "cheer",
    title: "CHEER",
    cost: 4,
    cooldown: "10s",
    copy: "Spend 4 now to add 8 shared energy for another crowd move.",
  },
] as const;

const PLAY_CHOICES = [
  {
    style: "safe",
    title: "SAFE",
    risk: "Lower OUT risk · 0–3 runs",
    copy: "Protect your wicket when every ball matters.",
  },
  {
    style: "balanced",
    title: "BALANCED",
    risk: "Measured risk · 0–4 runs",
    copy: "The all-round choice for building a total.",
  },
  {
    style: "aggressive",
    title: "AGGRESSIVE",
    risk: "Higher OUT risk · up to 6 runs",
    copy: "Chase a boundary when you need a swing.",
  },
] as const;

function plural(value: number, singular: string, pluralWord = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralWord}`;
}

function secondsRemaining(readyAtMicros: bigint | undefined, now: number) {
  if (!readyAtMicros) return 0;
  return Math.max(0, Math.ceil((Number(readyAtMicros / 1000n) - now) / 1000));
}

function matchIdFromJoinLink() {
  const value = new URLSearchParams(window.location.search).get("join");
  if (!value || !/^\d+$/.test(value)) return undefined;
  return BigInt(value);
}

function joinUrlFor(matchId: bigint) {
  const base = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
  return `${base.replace(/\/$/, "")}/?join=${matchId.toString()}`;
}

function App() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingStyle, setPendingStyle] = useState<string | null>(null);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [pendingPower, setPendingPower] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<"human" | "melabot">(
    "human",
  );
  const [now, setNow] = useState(Date.now());
  const [matchEvents, setMatchEvents] = useState<
    Array<{ id: bigint; matchId: bigint; message: string }>
  >([]);
  const requestedJoinMatchId = useMemo(matchIdFromJoinLink, []);
  const showOperatorMetrics = useMemo(
    () =>
      new URLSearchParams(window.location.search).get("operator") === "metrics",
    [],
  );
  const onMatchEvent = useCallback(
    (event: { id: bigint; matchId: bigint; message: string }) =>
      setMatchEvents((feed) =>
        feed.some((existing) => existing.id === event.id)
          ? feed
          : [...feed, event].slice(-16),
      ),
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
  const [melaProfiles] = useTable(tables.melaProfile);
  const [presence] = useTable(tables.worldPresence);
  const [matches] = useTable(tables.match);
  const [participants] = useTable(tables.matchParticipant);
  const [states] = useTable(tables.bookCricketState);
  const [history] = useTable(tables.matchHistory);
  const [memories] = useTable(tables.matchMemory);
  const [records] = useTable(tables.bookCricketRecord);
  const [crowds] = useTable(tables.matchCrowd);
  const [spectators] = useTable(tables.matchSpectator);
  const [cooldowns] = useTable(tables.spectatorCooldown);
  const [effects] = useTable(tables.crowdEffect);
  const [aiCharacters] = useTable(tables.aiCharacter);
  const [melaMetrics] = useTable(tables.melaMetrics);
  useTable(tables.liveEvent, { onInsert: onMatchEvent });

  const me = useMemo(() => {
    const identity = conn.identity;
    return identity
      ? profiles.find((profile) => profile.identity.isEqual(identity))
      : undefined;
  }, [profiles, conn.identity]);
  const myMelaProfile = useMemo(() => {
    const identity = conn.identity;
    return identity
      ? melaProfiles.find((profile) => profile.identity.isEqual(identity))
      : undefined;
  }, [melaProfiles, conn.identity]);
  const myBookCricketRecord = useMemo(() => {
    const identity = conn.identity;
    return identity
      ? records.find((record) => record.identity.isEqual(identity))
      : undefined;
  }, [records, conn.identity]);
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
  const memory = displayedMatch
    ? memories.find((row) => row.matchId === displayedMatch.id)
    : undefined;
  const recentMemories = memories
    .filter((row) => row.gameKind === "book_cricket")
    .sort((a, b) => Number(b.sequence - a.sequence))
    .slice(0, 3);
  const leaderboard = records
    .slice()
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.runsScored - a.runsScored ||
        a.displayName.localeCompare(b.displayName),
    )
    .slice(0, 3);
  const melaBot = aiCharacters.find(
    (character) => character.characterKey === "melabot",
  );
  const humanBallsLeft = matchState
    ? Math.max(0, 6 - matchState.humanBalls)
    : 0;
  const humanWicketsLeft = matchState
    ? Math.max(0, 2 - matchState.humanWickets)
    : 0;
  const botBallsLeft = matchState ? Math.max(0, 6 - matchState.botBalls) : 0;
  const botWicketsLeft = matchState
    ? Math.max(0, 2 - matchState.botWickets)
    : 0;
  const botRunsNeeded = matchState
    ? Math.max(0, matchState.target - matchState.botScore)
    : 0;
  const wicketsLeftForCurrentInnings =
    matchState?.innings === 1 ? humanWicketsLeft : botWicketsLeft;
  const isTenseFinish = Boolean(
    matchState &&
    ((matchState.innings === 1 &&
      (humanBallsLeft <= 2 || humanWicketsLeft <= 1)) ||
      (matchState.innings === 2 && (botBallsLeft <= 2 || botWicketsLeft <= 1))),
  );
  const spectatorSituation =
    matchState?.turn === "human"
      ? humanWicketsLeft === 1
        ? `${humanName} has one wicket left with ${plural(humanBallsLeft, "ball")} to set a target.`
        : `${humanName} has ${plural(humanBallsLeft, "ball")} to set MelaBot a target.`
      : matchState?.turn === "bot"
        ? `MelaBot needs ${plural(botRunsNeeded, "run")} from ${plural(botBallsLeft, "ball")}.`
        : "This match is now part of Mela memory.";
  const currentMetrics = melaMetrics[0];

  const onboard = useReducer(reducers.onboard);
  const createMatch = useReducer(reducers.createBookCricket);
  const createPenFight = useReducer(reducers.createPenFight);
  const playBall = useReducer(reducers.playBall);
  const joinSpectator = useReducer(reducers.joinMatchAsSpectator);
  const useCrowdPower = useReducer(reducers.useCrowdPower);

  const submitOnboarding = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !connected) return;
    try {
      await onboard({ displayName: name });
      if (requestedJoinMatchId) {
        const requestedMatch = matches.find(
          (match) => match.id === requestedJoinMatchId,
        );
        if (!requestedMatch || requestedMatch.status !== "active")
          throw new Error(
            "That match has ended. Start a fresh match or scan a live crowd QR.",
          );
        await joinSpectator({ matchId: requestedJoinMatchId });
      }
      setError(null);
      setFeedback(
        requestedJoinMatchId
          ? "You joined the crowd. Watch the next ball, then decide whether this is the moment to intervene."
          : "You are in Mela. Start a match or join the live crowd.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to join Mela.",
      );
    }
  };

  const startMatch = async () => {
    setCreatingMatch(true);
    try {
      await createMatch();
      setError(null);
      setFeedback(
        "Your match is live. Set a target in six balls—every choice carries risk.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to start a match.",
      );
    } finally {
      setCreatingMatch(false);
    }
  };
  const startPenFight = async () => {
    setCreatingMatch(true);
    try {
      await createPenFight();
      setError(null);
      setFeedback("The desk is live. Aim, choose force, and flick your pen.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to set up the desk.",
      );
    } finally {
      setCreatingMatch(false);
    }
  };

  const playDelivery = async (
    style: (typeof PLAY_CHOICES)[number]["style"],
  ) => {
    if (!displayedMatch) return;
    setPendingStyle(style);
    try {
      await playBall({ matchId: displayedMatch.id, style });
      setError(null);
      setFeedback(
        `${style.toUpperCase()} locked in. The world has resolved your ball.`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "That ball could not be played.",
      );
    } finally {
      setPendingStyle(null);
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
      setFeedback(
        `${power.toUpperCase()} is committed for ${selectedTarget === "human" ? humanName : "MelaBot"}'s next ball. Everyone watching can see it now.`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Power could not be used.",
      );
    } finally {
      setPendingPower(null);
    }
  };

  if (me && displayedMatch?.gameKind === "pen_fight")
    return (
      <PenFight
        onBack={() => window.location.assign(window.location.pathname)}
      />
    );

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
          <p className="eyebrow">
            {requestedJoinMatchId
              ? "YOU’VE BEEN INVITED TO THE CROWD"
              : "STEP 1 OF 1"}
          </p>
          <h2>
            {requestedJoinMatchId
              ? "Name yourself and join live."
              : "Enter the matchday crowd"}
          </h2>
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
      {feedback && (
        <p className="feedback success" role="status">
          {feedback}
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
        <section className="game-picker">
          <p className="eyebrow">CHOOSE YOUR GAME</p>
          <div>
            <button
              className="primary"
              onClick={startMatch}
              disabled={creatingMatch}
            >
              <strong>BOOK CRICKET</strong>
              <span>Fast strategy + uncertainty</span>
            </button>
            <button
              className="pen-start"
              onClick={startPenFight}
              disabled={creatingMatch}
            >
              <strong>PEN FIGHT</strong>
              <span>Flick. Hit. Survive.</span>
            </button>
          </div>
        </section>
      )}

      {displayedMatch && matchState && (
        <>
          <section className="scoreboard" aria-label="Live Book Cricket score">
            <div className="match-kicker">
              <span>BOOK CRICKET · FIRST TO THE TARGET</span>
              <span>{matchSpectators.length} in the crowd</span>
            </div>
            <div className="score-row">
              <div>
                <span className="team">{humanName}</span>
                <strong>
                  {matchState.humanScore}/{matchState.humanWickets}
                </strong>
                <small>
                  Ball {matchState.humanBalls}/6 · {humanWicketsLeft} wickets
                  left
                </small>
              </div>
              <div className="versus">VS</div>
              <div>
                <span className="team">MelaBot</span>
                <strong>
                  {matchState.botScore}/{matchState.botWickets}
                </strong>
                <small>
                  Ball {matchState.botBalls}/6 · {botWicketsLeft} wickets left
                </small>
              </div>
            </div>
            <p className={`match-state ${isTenseFinish ? "tension" : ""}`}>
              {matchState.turn === "human"
                ? `${plural(humanBallsLeft, "ball")} and ${plural(humanWicketsLeft, "wicket")} left to set MelaBot a target.`
                : matchState.turn === "bot"
                  ? `MelaBot needs ${botRunsNeeded} run${botRunsNeeded === 1 ? "" : "s"} from ${botBallsLeft} ball${botBallsLeft === 1 ? "" : "s"}.`
                  : `Target ${matchState.target} · match complete.`}
            </p>
            {matchState.lastOutcome !== "START" && (
              <div
                className={`delivery-result ${matchState.lastOutcome.includes("OUT") ? "out" : ""}`}
                role="status"
              >
                <strong>{matchState.lastOutcome}</strong>
                <span>
                  {matchState.lastOutcome.includes("OUT")
                    ? `${wicketsLeftForCurrentInnings ? "The innings continues while wickets remain." : "No wickets remain."}`
                    : "The score, target, and next decision have updated for everyone."}
                </span>
              </div>
            )}
            {displayedMatch.status === "complete" && (
              <p className="result">
                Result:{" "}
                {(result?.winner ?? displayedMatch.winner).toUpperCase()} wins
              </p>
            )}
            {ownsMatch && matchState.turn === "human" && (
              <div className="player-actions">
                {matchState.humanBalls === 0 && (
                  <p className="how-to-play">
                    Score more than MelaBot. You have 6 balls and 2 wickets:
                    every ball is your choice plus controlled uncertainty.
                  </p>
                )}
                <p className="eyebrow">
                  YOUR NEXT BALL · CHOOSE HOW TO PLAY IT
                </p>
                <div className="choice-grid">
                  {PLAY_CHOICES.map((choice) => (
                    <button
                      className={`choice-card ${choice.style}`}
                      key={choice.style}
                      disabled={pendingStyle !== null}
                      onClick={() => playDelivery(choice.style)}
                    >
                      <strong>{choice.title}</strong>
                      <span>{choice.risk}</span>
                      <small>
                        {pendingStyle === choice.style
                          ? "Resolving your choice…"
                          : choice.copy}
                      </small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {matchState.turn === "bot" && (
              <div className="ai-turn" role="status">
                <span className="ai-pulse" aria-hidden="true" />
                <div>
                  <strong>
                    {melaBot?.displayName ?? "MelaBot"} is making its move
                  </strong>
                  <p>
                    {melaBot?.persona ??
                      "Cool under pressure. Reckless when behind."}
                  </p>
                </div>
              </div>
            )}
            {ownsMatch && activeMatch && (
              <div className="join-qr">
                <QRCodeSVG
                  value={joinUrlFor(activeMatch.id)}
                  size={96}
                  level="M"
                  includeMargin
                />
                <div>
                  <p className="eyebrow">BRING IN THE CROWD</p>
                  <strong>Scan to join this match</strong>
                  <span>
                    Guests choose a name, then influence the same live world.
                  </span>
                  <a
                    href={`/#/screen?match=${activeMatch.id.toString()}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open big screen
                  </a>
                </div>
              </div>
            )}
          </section>

          {displayedMatch.status === "complete" && memory && (
            <section
              className="memory-hero"
              aria-label="Completed match memory"
            >
              <p className="eyebrow">NOW PART OF MELA</p>
              <h2>
                {memory.winner === "draw"
                  ? "A shared finish."
                  : `${memory.winner === "human" ? memory.humanName : memory.aiName} takes the story.`}
              </h2>
              <p className="memory-story">{memory.notableMoment}</p>
              <div className="memory-facts">
                <span>
                  {memory.humanName} {memory.humanScore}/{memory.humanWickets}
                </span>
                <span>
                  {memory.aiName} {memory.botScore}/{memory.botWickets}
                </span>
                <span>{memory.crowdActions} crowd moves</span>
              </div>
              <button className="primary wide" onClick={() => createMatch()}>
                Play again vs MelaBot
              </button>
            </section>
          )}

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
                {spectatorSituation} The crowd changes the next delivery—not the
                final result. Spend together when the situation calls for it.
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
                    <legend>
                      Choose whose next ball the crowd will influence
                    </legend>
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
                          <small className="power-why">
                            {card.power === "boost"
                              ? "Useful when a few runs change the chase."
                              : card.power === "chaos"
                                ? "Use when the match needs a swing."
                                : card.power === "shield"
                                  ? "Most valuable when a wicket would end an innings."
                                  : "Use to unlock a stronger crowd move."}
                          </small>
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

          {me && myMelaProfile && (
            <section className="profile-glance" aria-label="Your Mela profile">
              <div>
                <p className="eyebrow">YOUR MELA STORY</p>
                <h2>
                  Level {myMelaProfile.melaLevel} · {me.displayName}
                </h2>
                <p>
                  {myMelaProfile.matchesPlayed} played ·{" "}
                  {myMelaProfile.matchesWatched} watched ·{" "}
                  {myMelaProfile.crowdInfluence} Crowd Influence
                </p>
              </div>
              <div
                className="progress-orbit"
                aria-label={`${myMelaProfile.progressPoints} progress points`}
              >
                <strong>{myMelaProfile.progressPoints}</strong>
                <span>progress</span>
              </div>
            </section>
          )}

          {me && (
            <section className="memory-grid" aria-label="Mela memory">
              <article className="recent-history">
                <div className="feed-header">
                  <h2>Recent memories</h2>
                  <span>Remembered</span>
                </div>
                {recentMemories.length === 0 ? (
                  <p>Your next match will start a story worth returning to.</p>
                ) : (
                  <ul>
                    {recentMemories.map((entry) => (
                      <li key={entry.matchId.toString()}>
                        <strong>
                          {entry.humanName} {entry.humanScore}/
                          {entry.humanWickets} · {entry.aiName} {entry.botScore}
                          /{entry.botWickets}
                        </strong>
                        <span>
                          {entry.winner === "draw"
                            ? "Draw"
                            : `${entry.winner === "human" ? entry.humanName : entry.aiName} won`}
                          {entry.crowdActions > 0
                            ? ` · ${entry.crowdActions} crowd moves`
                            : " · crowd present"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
              <article className="leaderboard-card">
                <div className="feed-header">
                  <h2>Book Cricket form</h2>
                  <span>Game skill</span>
                </div>
                {leaderboard.length === 0 ? (
                  <p>The first completed innings writes the board.</p>
                ) : (
                  <ol>
                    {leaderboard.map((entry, index) => (
                      <li key={entry.identity.toHexString()}>
                        <span>{index + 1}</span>
                        <strong>{entry.displayName}</strong>
                        <small>
                          {entry.wins} wins · {entry.runsScored} runs
                        </small>
                      </li>
                    ))}
                  </ol>
                )}
                {myBookCricketRecord && (
                  <p className="personal-form">
                    Your form: {myBookCricketRecord.wins} wins from{" "}
                    {myBookCricketRecord.matchesPlayed} matches · best{" "}
                    {myBookCricketRecord.highestScore}
                  </p>
                )}
              </article>
            </section>
          )}
          {showOperatorMetrics && currentMetrics && (
            <section
              className="operator-metrics"
              aria-label="Mela operator metrics"
            >
              <div className="feed-header">
                <h2>Mela pulse</h2>
                <span>Authoritative aggregates</span>
              </div>
              <p>
                Safe totals for demo operators—identities and sessions stay
                private.
              </p>
              <div>
                <span>
                  <strong>{currentMetrics.matchesCompleted.toString()}</strong>{" "}
                  completed matches
                </span>
                <span>
                  <strong>
                    {currentMetrics.uniquePlayerIdentities.toString()}
                  </strong>{" "}
                  unique players
                </span>
                <span>
                  <strong>
                    {currentMetrics.uniqueSpectatorIdentities.toString()}
                  </strong>{" "}
                  unique crowd members
                </span>
                <span>
                  <strong>
                    {currentMetrics.spectatorToPlayerConversions.toString()}
                  </strong>{" "}
                  crowd-to-player conversions
                </span>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

export default App;
