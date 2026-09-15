import { useTable } from "spacetimedb/react";
import { tables } from "./module_bindings";
import {
  featuredMoment,
  readArenaFrame,
  type StoryMemory,
} from "./matchStories";
import { ReplayBoard } from "./ReplayBoard";
import { memoryResult } from "./productExperience";
import { HOME_GAMES } from "./HomeDiscovery";
import { GameCover } from "./GameCover";

export function FeaturedMatch({
  memory,
  busy,
  onWatch,
  onPlay,
}: {
  memory: StoryMemory;
  busy: boolean;
  onWatch: (id: bigint) => void;
  onPlay: (kind: string) => void;
}) {
  const [frames] = useTable(
    tables.arenaFrame.where((r) => r.matchId.eq(memory.matchId)),
  );
  const moment = featuredMoment(frames);
  const frame = moment?.state ?? (frames[0] && readArenaFrame(frames[0]));
  const game = HOME_GAMES.find((g) => g.kind === memory.gameKind);
  if (!game) return null;
  return (
    <section className="featured-match" aria-label="A recorded Mela match">
      <button
        className="featured-match-picture"
        disabled={busy}
        onClick={() => onWatch(memory.matchId)}
        aria-label={
          frame
            ? `Replay · move ${frame.beat} — watch ${game.name}`
            : `Completed match — view ${game.name} result`
        }
      >
        <span aria-hidden="true" className="featured-match-board">
          {frame ? (
            <ReplayBoard state={frame} />
          ) : (
            <GameCover kind={memory.gameKind} />
          )}
        </span>
        <span className="featured-match-badge">
          {frame ? `Replay · move ${frame.beat}` : "Completed match"}
        </span>
        <span className="featured-match-play" aria-hidden="true" />
      </button>
      <div className="featured-match-copy">
        <small>{game.name}</small>
        <h3>
          {moment?.kind === "crowd"
            ? "The crowd had a hand in this."
            : memoryResult(memory)}
        </h3>
        <p>
          {moment?.detail ??
            `${memory.humanName} and ${memory.aiName}'s completed match.`}
        </p>
        <div className="featured-match-actions">
          <button disabled={busy} onClick={() => onWatch(memory.matchId)}>
            {frame ? "Watch replay →" : "View result →"}
          </button>
          <button disabled={busy} onClick={() => onPlay(memory.gameKind)}>
            Play {game.name}
          </button>
        </div>
      </div>
    </section>
  );
}
