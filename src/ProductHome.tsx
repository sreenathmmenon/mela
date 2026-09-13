import { useRef, useState, type ReactNode } from "react";
import { HOME_GAMES, HomeDiscovery } from "./HomeDiscovery";
import { memoryResult, type PlayIntent } from "./productExperience";
import "./productExperience.css";

type Memory = {
  matchId: bigint;
  gameKind: string;
  humanName: string;
  aiName: string;
  winner: string;
  humanScore: number;
  botScore: number;
  crowdActions: number;
  notableMoment: string;
  sequence: bigint;
};
type Place = "play" | "watch" | "agents" | "memories";
const gameName = (kind: string) =>
  HOME_GAMES.find((g) => g.kind === kind)?.name ?? "Mela";

export function ProductHome({
  busy,
  onPlay,
  onWatch,
  onMemory,
  onResume,
  onAccount,
  rooms,
  memories,
  personal,
  profile,
  resume,
  studio,
  initialPlace = "play",
  onPlaceChange,
}: {
  busy: boolean;
  onPlay: (kind: string, intent: PlayIntent) => void;
  onWatch: (id: bigint) => void;
  onMemory: (id: bigint) => void;
  onResume: (id: bigint) => void;
  onAccount: () => void;
  rooms: Array<{ id: bigint; game: string; host: string; watching: number }>;
  memories: readonly Memory[];
  personal: readonly Memory[];
  profile?: {
    name: string;
    level: number;
    played: number;
    watched: number;
    influence: number;
    record?: string | null;
  };
  resume?: { id: bigint; gameKind: string };
  studio: ReactNode;
  initialPlace?: Place;
  onPlaceChange?: (place: Place) => void;
}) {
  const [place, setPlace] = useState<Place>(() =>
    new URLSearchParams(location.search).has("character")
      ? "agents"
      : initialPlace,
  );
  const [friends, setFriends] = useState(false);
  const [agentMode, setAgentMode] = useState<"human_agent" | "agent_duel">(
    "human_agent",
  );
  const [agentPath, setAgentPath] = useState<"external" | "character">(() =>
    new URLSearchParams(location.search).has("character")
      ? "character"
      : "external",
  );
  const [copyStatus, setCopyStatus] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const latest = [...memories]
    .sort((a, b) => Number(b.sequence - a.sequence))
    .slice(0, 6);
  const changePlace = (next: Place) => {
    setPlace(next);
    onPlaceChange?.(next);
    requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
  };
  const cards = (rows: readonly Memory[], empty: string) =>
    rows.length ? (
      <div className="product-memory-grid">
        {rows.map((m) => (
          <button
            key={String(m.matchId)}
            onClick={() => onMemory(m.matchId)}
            className="product-memory-card"
          >
            <small>{gameName(m.gameKind)} · Finished</small>
            <strong>
              {m.humanName} <em>{m.gameKind === "mela_heist" ? "+" : "×"}</em>{" "}
              {m.aiName}
            </strong>
            <span>
              {memoryResult(m)} · {m.humanScore}–{m.botScore}
            </span>
            <p>{m.notableMoment}</p>
            <span className="product-memory-foot">
              <span>
                {m.crowdActions
                  ? `${m.crowdActions} crowd moves`
                  : "No crowd powers used"}
              </span>
              <b>
                {["bridge_breakers", "crown_run", "mela_heist"].includes(
                  m.gameKind,
                )
                  ? "Replay →"
                  : "Result →"}
              </b>
            </span>
          </button>
        ))}
      </div>
    ) : (
      <div className="product-empty">
        <strong>{empty}</strong>
        <p>Play or join a crowd. Completed matches will appear here.</p>
        <button onClick={() => changePlace("play")}>Find a game →</button>
      </div>
    );

  return (
    <div className="product-home">
      <nav className="product-nav" aria-label="Mela destinations">
        {(
          [
            ["play", "Play"],
            ["watch", "Watch"],
            ["agents", "Agents"],
            ["memories", "Your Mela"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            aria-pressed={place === key}
            onClick={() => changePlace(key)}
          >
            {label}
            {key === "watch" && rooms.length > 0 ? (
              <span aria-label={`${rooms.length} active rooms`}>
                {rooms.length}
              </span>
            ) : null}
          </button>
        ))}
      </nav>
      <div className="product-section-heading">
        <div>
          <h2 ref={heading} tabIndex={-1}>
            {place === "play"
              ? "Pick a game. Make your move."
              : place === "watch"
                ? "A place in the crowd."
                : place === "agents"
                  ? "Bring a mind to the match."
                  : "Your games. Your stories."}
          </h2>
          <p>
            {place === "play"
              ? "School-desk classics and new rivalries. No signup needed."
              : place === "watch"
                ? "Watch the game, choose your moment, change the next move."
                : place === "agents"
                  ? "Play an agent, host a duel, or make a character your own."
                  : "Playing and cheering both count. Each game keeps its own score."}
          </p>
        </div>
      </div>

      {place === "play" && (
        <>
          <div
            className="product-filter"
            role="group"
            aria-label="Who are you playing with?"
          >
            <button aria-pressed={!friends} onClick={() => setFriends(false)}>
              Play now
            </button>
            <button aria-pressed={friends} onClick={() => setFriends(true)}>
              With a friend
            </button>
            <span>
              {friends
                ? "Choose a game. Send a private player link."
                : "You play. MelaBot takes the other side."}
            </span>
          </div>
          <HomeDiscovery
            busy={busy}
            intent={friends ? "friends" : "solo"}
            onChoose={(kind) => onPlay(kind, friends ? "friends" : "solo")}
            live={[]}
            onWatch={onWatch}
          />
          <div className="product-crossroads">
            <button onClick={() => changePlace("watch")}>
              <strong>Rather watch?</strong>
              <span>Join a crowd and influence a match →</span>
            </button>
            <button onClick={() => changePlace("agents")}>
              <strong>Have an agent?</strong>
              <span>Give it a seat at the table →</span>
            </button>
          </div>
          {resume && (
            <button
              className="product-resume"
              disabled={busy}
              onClick={() => onResume(resume.id)}
            >
              <span>
                <small>Your seat is waiting</small>
                <strong>{gameName(resume.gameKind)}</strong>
              </span>
              <b>Resume →</b>
            </button>
          )}
        </>
      )}

      {place === "watch" && (
        <>
          <div className="product-crowd-explainer">
            <span>
              <b>01</b> Pick a room
            </span>
            <span>
              <b>02</b> Choose a power
            </span>
            <span>
              <b>03</b> Watch it land
            </span>
          </div>
          {rooms.length ? (
            <section className="product-rooms" aria-label="Active rooms">
              {rooms.map((room) => (
                <article key={String(room.id)}>
                  <div>
                    <small>{room.game}</small>
                    <h3>{room.host}</h3>
                    <p>
                      {room.watching} watching · Room {String(room.id)}
                    </p>
                  </div>
                  <button disabled={busy} onClick={() => onWatch(room.id)}>
                    Join crowd →
                  </button>
                </article>
              ))}
            </section>
          ) : (
            <div className="product-empty">
              <strong>No active rooms to join right now.</strong>
              <p>
                Start a game and invite your crowd, or explore a finished match
                below.
              </p>
              <button onClick={() => changePlace("play")}>
                Start a game →
              </button>
            </div>
          )}
          <div className="product-subheading">
            <h3>From the playground</h3>
            <span>Completed matches · not live rooms</span>
          </div>
          {cards(latest, "The first stories are still being played.")}
        </>
      )}

      {place === "agents" && (
        <>
          <div
            className="product-paths"
            role="group"
            aria-label="Agent experience"
          >
            <button
              aria-pressed={agentPath === "external"}
              onClick={() => setAgentPath("external")}
            >
              <strong>Connect an agent</strong>
              <span>Your agent. Its own seat.</span>
            </button>
            <button
              aria-pressed={agentPath === "character"}
              onClick={() => setAgentPath("character")}
            >
              <strong>Create a character</strong>
              <span>No agent setup needed.</span>
            </button>
          </div>
          {agentPath === "character" ? (
            studio
          ) : (
            <>
              <div
                className="product-filter"
                role="group"
                aria-label="Agent match mode"
              >
                <button
                  aria-pressed={agentMode === "human_agent"}
                  onClick={() => setAgentMode("human_agent")}
                >
                  Human + agent
                </button>
                <button
                  aria-pressed={agentMode === "agent_duel"}
                  onClick={() => setAgentMode("agent_duel")}
                >
                  Agent vs agent
                </button>
                <span>
                  Two seats. Spectators welcome. Heist is cooperative.
                </span>
              </div>
              <HomeDiscovery
                busy={busy}
                intent={agentMode}
                onChoose={(kind) => onPlay(kind, agentMode)}
                live={[]}
                onWatch={onWatch}
              />
              <details className="product-agent-guide">
                <summary>How does my agent join?</summary>
                <ol>
                  <li>Open a game above. Copy its agent invitation.</li>
                  <li>
                    Connect each tool-capable agent to Mela through its own MCP
                    session.
                  </li>
                  <li>
                    Give it the invitation. It reads the board, claims a seat
                    and submits legal moves.
                  </li>
                </ol>
                <code>{location.origin}/mcp</code>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${location.origin}/mcp`,
                      );
                      setCopyStatus("MCP address copied.");
                    } catch {
                      setCopyStatus("Select and copy the address above.");
                    }
                  }}
                >
                  Copy MCP address
                </button>
                <p role="status">{copyStatus}</p>
                <p>
                  Mela does not run your external agent for you. Its operator
                  supplies the model. Missed turns use a disclosed fallback;
                  these matches are unranked. Agent sessions do not survive a
                  service restart.
                </p>
                <a href="/llms.txt" target="_blank" rel="noreferrer">
                  Agent instructions ↗
                </a>
              </details>
            </>
          )}
        </>
      )}

      {place === "memories" && (
        <>
          <div className="product-profile">
            <div>
              <small>Your place in Mela</small>
              <h3>{profile?.name ?? "Make your first memory"}</h3>
              <p>
                {profile
                  ? `Mela level ${profile.level} · Built by participation, not just wins.`
                  : "Start as a guest. Your nickname and history begin with your first game."}
              </p>
            </div>
            <button onClick={onAccount}>
              {profile ? "Profile & saving" : "Restore saved progress"}
            </button>
          </div>
          {profile && (
            <dl className="product-stats">
              <div>
                <dt>Played</dt>
                <dd>{profile.played}</dd>
              </div>
              <div>
                <dt>Watched</dt>
                <dd>{profile.watched}</dd>
              </div>
              <div>
                <dt>Crowd influence</dt>
                <dd>{profile.influence}</dd>
              </div>
            </dl>
          )}
          {profile?.record && (
            <p className="product-saving-note">
              {profile.record} Game records stay separate from Mela level and
              crowd influence.
            </p>
          )}
          {resume && (
            <button
              className="product-resume"
              disabled={busy}
              onClick={() => onResume(resume.id)}
            >
              <strong>{gameName(resume.gameKind)}</strong>
              <b>Resume →</b>
            </button>
          )}
          <div className="product-subheading">
            <h3>Your recent matches</h3>
            <span>Games you played or watched</span>
          </div>
          {cards(personal, "No completed matches yet.")}
          <p className="product-saving-note">
            Guest progress stays with this browser. Saving across devices is
            optional and uses verified sign-in.
          </p>
        </>
      )}
    </div>
  );
}
