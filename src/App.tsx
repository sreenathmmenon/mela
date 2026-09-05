import { FormEvent, useMemo, useState } from "react";
import { tables, reducers } from "./module_bindings";
import { useSpacetimeDB, useTable, useReducer } from "spacetimedb/react";

function App() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const conn = useSpacetimeDB();
  const { isActive: connected } = conn;

  const [worlds] = useTable(tables.world);
  const [profiles] = useTable(tables.playerProfile);
  const [presence] = useTable(tables.worldPresence);
  const [activity] = useTable(tables.worldActivity);
  const [matches] = useTable(tables.match);
  const [participants] = useTable(tables.matchParticipant);
  const [states] = useTable(tables.bookCricketState);
  const [history] = useTable(tables.matchHistory);
  const [matchEvents, setMatchEvents] = useState<
    Array<{ id: bigint; matchId: bigint; message: string }>
  >([]);
  useTable(tables.liveEvent, {
    onInsert: (event) => setMatchEvents((feed) => [...feed, event].slice(-12)),
  });
  const me = useMemo(() => {
    const identity = conn.identity;
    return identity
      ? profiles.find((profile) => profile.identity.isEqual(identity))
      : undefined;
  }, [profiles, conn.identity]);

  const onboard = useReducer(reducers.onboard);
  const createMatch = useReducer(reducers.createBookCricket);
  const playBall = useReducer(reducers.playBall);
  const runBot = useReducer(reducers.runMelaBotTurn);
  const activeMatch = matches.find((match) => match.status === "active");
  const bookCricketMatches = matches.filter(
    (match) => match.gameKind === "book_cricket",
  );
  const displayedMatch =
    activeMatch ?? bookCricketMatches[bookCricketMatches.length - 1];
  const ownsMatch = Boolean(
    activeMatch &&
    conn.identity &&
    activeMatch.playerIdentity.isEqual(conn.identity),
  );
  const matchState = displayedMatch
    ? states.find((state) => state.matchId === displayedMatch.id)
    : undefined;
  const humanName = displayedMatch
    ? (participants.find(
        (participant) =>
          participant.matchId === displayedMatch.id &&
          participant.actorKind === "human",
      )?.displayName ?? "Human")
    : "Human";
  const result = displayedMatch
    ? history.find((entry) => entry.matchId === displayedMatch.id)
    : undefined;

  const submitOnboarding = async (e: FormEvent) => {
    e.preventDefault();
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

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "system-ui",
      }}
    >
      <p style={{ letterSpacing: 2, color: "#7c3aed" }}>
        MELA • LIVING PLAYGROUND
      </p>
      <h1>{worlds[0]?.name ?? "Mela Commons"}</h1>

      <div style={{ marginBottom: "1rem" }}>
        Status:{" "}
        <strong style={{ color: connected ? "green" : "red" }}>
          {connected ? "Connected" : "Disconnected"}
        </strong>
      </div>

      {!me && (
        <form onSubmit={submitOnboarding} style={{ marginBottom: "2rem" }}>
          <h2>Enter the world</h2>
          <input
            type="text"
            placeholder="Choose your display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: "0.5rem", marginRight: "0.5rem" }}
            disabled={!connected}
          />
          <button
            type="submit"
            style={{ padding: "0.5rem 1rem" }}
            disabled={!connected}
          >
            Join Mela
          </button>
          {error && <p role="alert">{error}</p>}
        </form>
      )}

      {me && (
        <p>
          Welcome back, <strong>{me.displayName}</strong>. Your Mela identity
          persists across reloads.
        </p>
      )}
      {me && !activeMatch && (
        <button onClick={() => createMatch()}>
          Start Book Cricket vs MelaBot
        </button>
      )}
      {displayedMatch && matchState && (
        <section>
          <h2>Book Cricket</h2>
          <p>
            {humanName} {matchState.humanScore}/{matchState.humanWickets} (
            {matchState.humanBalls}) · MelaBot {matchState.botScore}/
            {matchState.botWickets} ({matchState.botBalls})
          </p>
          <p>
            Innings {matchState.innings} · {matchState.turn} ·{" "}
            {matchState.target ? `Target ${matchState.target}` : "Set a target"}{" "}
            · {matchState.lastOutcome}
          </p>
          {displayedMatch.status === "complete" && (
            <p>
              <strong>
                Result: {result?.winner ?? displayedMatch.winner} wins
              </strong>
            </p>
          )}
          {ownsMatch && matchState.turn === "human" && (
            <>
              <button
                onClick={() =>
                  playBall({ matchId: displayedMatch.id, style: "steady" })
                }
              >
                Steady flip
              </button>
              <button
                onClick={() =>
                  playBall({ matchId: displayedMatch.id, style: "attack" })
                }
              >
                Attack flip
              </button>
            </>
          )}
          {matchState.turn === "bot" && (
            <button onClick={() => runBot({ matchId: displayedMatch.id })}>
              Let MelaBot play
            </button>
          )}
          <ul>
            {matchEvents
              .filter((event) => event.matchId === displayedMatch.id)
              .slice(-6)
              .reverse()
              .map((event) => (
                <li key={event.id.toString()}>{event.message}</li>
              ))}
          </ul>
        </section>
      )}
      <section>
        <h2>
          In Mela now ({presence.filter((row) => row.state === "online").length}
          )
        </h2>
        <ul>
          {profiles.map((profile) => (
            <li key={profile.identity.toHexString()}>{profile.displayName}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Live world activity</h2>
        <ul>
          {activity
            .slice(-8)
            .reverse()
            .map((item) => (
              <li key={item.id.toString()}>{item.message}</li>
            ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
