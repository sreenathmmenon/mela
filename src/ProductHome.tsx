import { useRef, useState, type ReactNode } from "react";
import { HOME_GAMES, HomeDiscovery } from "./HomeDiscovery";
import { memoryResult, type PlayIntent } from "./productExperience";
import { selectStories, storyCaption, type StoryMemory } from "./matchStories";
import { FeaturedMatch } from "./FeaturedMatch";
import { GameCover } from "./GameCover";
import { isArenaKind } from "../spacetimedb/src/arenaRules";
import "./productExperience.css";

function DestinationIcon({ place }: { place: string }) {
  const paths: Record<string, string> = {
    play: "m9 5 11 7-11 7z",
    watch:
      "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m13 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0",
    agents:
      "M12 3v3M7 6h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3m1 5v2m8-2v2m-7 4h6M1 11v4m22-4v4",
    memories: "M5 4h14v17l-7-4-7 4z",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[place]} />
    </svg>
  );
}

type Memory = StoryMemory;
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
  const [agentPath, setAgentPath] = useState<"external" | "character">(
    "character",
  );
  const [copyStatus, setCopyStatus] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const latest = selectStories(memories);
  const recentArenas = selectStories(
    memories.filter(
      (m) =>
        isArenaKind(m.gameKind) &&
        !m.notableMoment.startsWith("Unranked practice from match "),
    ),
  );
  const featured =
    recentArenas.find((m) => m.crowdActions > 0) ?? recentArenas[0];
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
            disabled={busy}
          >
            <span className="product-memory-art" aria-hidden="true">
              <GameCover kind={m.gameKind} />
            </span>
            <small>
              {gameName(m.gameKind)} ·{" "}
              {m.notableMoment.startsWith("Unranked practice from match ")
                ? "Practice"
                : "Finished"}
            </small>
            <strong>
              {m.humanName} <em>{m.gameKind === "mela_heist" ? "+" : "×"}</em>{" "}
              {m.aiName}
            </strong>
            <span>
              {memoryResult(m)} · {m.humanScore}–{m.botScore}
            </span>
            <p>{storyCaption(m)}</p>
            <span className="product-memory-foot">
              <span>
                {m.crowdActions
                  ? `${m.crowdActions} crowd ${m.crowdActions === 1 ? "move" : "moves"}`
                  : "Completed match"}
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
            <DestinationIcon place={key} />
            {label}
            {key === "watch" && rooms.length > 0 ? (
              <span aria-label={`${rooms.length} active rooms`}>
                {rooms.length}
              </span>
            ) : null}
          </button>
        ))}
      </nav>
      <div
        className={
          place === "play" ? "discovery-sr-only" : "product-section-heading"
        }
      >
        <div>
          <h2 ref={heading} tabIndex={-1}>
            {place === "play"
              ? "Games"
              : place === "watch"
                ? "Watch a match"
                : place === "agents"
                  ? "Play with agents"
                  : "Your Mela"}
          </h2>
          {place !== "play" && place !== "memories" && (
            <p>
              {place === "watch"
                ? "Join the crowd and influence the next move."
                : "Connect your own agent or create a character."}
            </p>
          )}
        </div>
      </div>

      {place === "play" && (
        <>
          <div className="product-mode-row">
            <div
              className="product-filter product-play-mode"
              role="group"
              aria-label="Who are you playing with?"
            >
              <button aria-pressed={!friends} onClick={() => setFriends(false)}>
                With MelaBot
              </button>
              <button aria-pressed={friends} onClick={() => setFriends(true)}>
                With a friend
              </button>
            </div>
            {friends ? (
              <span>Invite with a private link.</span>
            ) : !profile ? (
              <span>No signup needed</span>
            ) : null}
          </div>
          {!friends && featured && (
            <FeaturedMatch
              memory={featured}
              busy={busy}
              onWatch={onMemory}
              onPlay={(kind) => onPlay(kind, "solo")}
            />
          )}
          <HomeDiscovery
            busy={busy}
            intent={friends ? "friends" : "solo"}
            onChoose={(kind) => onPlay(kind, friends ? "friends" : "solo")}
            live={[]}
            onWatch={onWatch}
          />
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
              <strong>No active matches right now.</strong>
              <p>Start a game or explore a completed match below.</p>
              <button onClick={() => changePlace("play")}>
                Start a game →
              </button>
            </div>
          )}
          {featured && (
            <FeaturedMatch
              memory={featured}
              busy={busy}
              onWatch={onMemory}
              onPlay={(kind) => onPlay(kind, "solo")}
            />
          )}
          <div className="product-subheading">
            <h3>Recent matches</h3>
          </div>
          {cards(latest, "No completed matches yet.")}
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
              aria-pressed={agentPath === "character"}
              onClick={() => setAgentPath("character")}
            >
              <strong>Create a character</strong>
              <span>No external setup</span>
            </button>
            <button
              aria-pressed={agentPath === "external"}
              onClick={() => setAgentPath("external")}
            >
              <strong>Connect an agent</strong>
              <span>Requires an MCP-compatible agent</span>
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
                <span>Heist is cooperative.</span>
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
              <h3>{profile?.name ?? "Make your first memory"}</h3>
              <p>
                {profile
                  ? `Mela level ${profile.level} · Earned through participation`
                  : "Your profile starts with your first game."}
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
            <p className="product-saving-note">{profile.record}</p>
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
            <h3>Recently played or watched</h3>
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
