import { useEffect, useState } from "react";
import { useReducer, useTable } from "spacetimedb/react";
import { Identity } from "spacetimedb";
import { tables, reducers } from "./module_bindings";
import {
  momentLink,
  playableMoments,
  recommendedCheckpoint,
} from "./challengePresentation";
import type { ReplayFrame } from "./matchStories";
import { memoryResult } from "./productExperience";

export function MomentChallenge({
  matchId,
  frames,
  revision,
  onSelect,
  onOpen,
  identity,
  connected,
}: {
  matchId: bigint;
  frames: readonly (ReplayFrame & { id: bigint })[];
  revision: number | null;
  onSelect: (revision: number) => void;
  onOpen: (id: bigint) => void;
  identity?: Identity;
  connected: boolean;
}) {
  const [attempts] = useTable(
    tables.arenaChallenge.where((r) => r.sourceMatchId.eq(matchId)),
  );
  const [matches] = useTable(tables.match);
  const create = useReducer(reducers.challengeArenaMoment);
  const [pending, setPending] = useState<bigint>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const options = playableMoments(frames);
  const selected =
    options.find((f) => f.revision === revision) ??
    recommendedCheckpoint(frames);
  const active = attempts.find(
    (a) =>
      a.sourceFrameId === selected?.id &&
      matches.some(
        (m) =>
          m.id === a.matchId &&
          m.status === "active" &&
          identity &&
          m.playerIdentity.isEqual(identity),
      ),
  );
  useEffect(() => {
    if (pending === undefined) return;
    const attempt = attempts.find(
      (a) =>
        a.sourceFrameId === pending &&
        matches.some(
          (m) =>
            m.id === a.matchId &&
            m.status === "active" &&
            identity &&
            m.playerIdentity.isEqual(identity),
        ),
    );
    if (attempt) onOpen(attempt.matchId);
  }, [pending, attempts, matches, identity, onOpen]);
  if (!selected) return null;
  async function begin() {
    if (busy || !selected) return;
    if (active) {
      onOpen(active.matchId);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await create({ frameId: selected.id });
      setPending(selected.id);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Couldn't start this moment. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    const url = momentLink(location.href, matchId, selected!.revision);
    try {
      if (navigator.share)
        await navigator.share({
          title: "What would you do next? · Mela",
          text: "Same position. Your decision.",
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        setMessage("Moment link copied. They can play without signing up.");
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setMessage(`Copy this moment: ${url}`);
    }
  }
  return (
    <section className="moment-challenge" aria-label="Play a recorded moment">
      <div className="moment-challenge-copy">
        <span className="arena-overline">SAME POSITION. YOUR DECISION.</span>
        <h2>What would you do next?</h2>
        <p>
          Take Amber’s place. MelaBot makes new moves. Your crowd can change the
          ending.
        </p>
      </div>
      <label className="moment-selector">
        Start after move
        <select
          name="challenge-start-move"
          value={selected.revision}
          disabled={busy}
          onChange={(e) => onSelect(Number(e.target.value))}
        >
          {options.map((f) => (
            <option key={f.revision} value={f.revision}>
              {f.revision} · {24 - f.revision} moves left
            </option>
          ))}
        </select>
      </label>
      <div className="moment-challenge-actions">
        <button
          className="arena-primary"
          disabled={busy || !connected}
          onClick={() => void begin()}
        >
          {busy
            ? "Opening your version…"
            : active
              ? "Continue your version →"
              : "Play this moment →"}
        </button>
        <button
          onClick={() => {
            onSelect(selected.revision);
            document
              .querySelector(".arena-stage-wrap")
              ?.scrollIntoView({ block: "center" });
          }}
        >
          Preview position
        </button>
        <button onClick={() => void share()}>Challenge a friend ↗</button>
      </div>
      <small>
        A separate practice match. No ranking or XP. The original stays
        unchanged.
      </small>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

export function ChallengeComparison({
  sourceMatchId,
  startRevision,
  complete,
  winner,
  onRetry,
}: {
  sourceMatchId: bigint;
  startRevision: number;
  complete: boolean;
  winner: string;
  onRetry?: () => void;
}) {
  const [memories] = useTable(
    tables.matchMemory.where((r) => r.matchId.eq(sourceMatchId)),
  );
  const original = memories[0];
  return (
    <section className="challenge-comparison" aria-label="Practice match">
      <div>
        <span className="arena-overline">A NEW VERSION · PRACTICE</span>
        <strong>
          {complete
            ? winner === "human" || winner === "team"
              ? "A winning way through."
              : winner === "draw"
                ? "A different path. A draw."
                : "Another decision to try?"
            : `A fresh start after move ${startRevision}.`}
        </strong>
        <p>
          {complete
            ? "Your result is saved separately. No ranking or XP changed."
            : "MelaBot chooses fresh moves. This is not a rematch against the original player."}
        </p>
      </div>
      <div className="challenge-original">
        <small>ORIGINAL MATCH #{String(sourceMatchId)}</small>
        <strong>
          {original ? memoryResult(original) : "Loading the original result…"}
        </strong>
        <a href={momentLink(location.href, sourceMatchId, startRevision)}>
          See the original moment ↗
        </a>
        {complete && onRetry && (
          <button onClick={onRetry}>Try another decision →</button>
        )}
      </div>
    </section>
  );
}
