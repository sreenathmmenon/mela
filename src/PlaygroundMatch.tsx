import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import { tables, reducers } from "./module_bindings";
import {
  PLAYGROUND_POWERS,
  type PlaygroundPower,
} from "../spacetimedb/src/playgroundCrowdRules";
import { isMuted, toggleMuted, playSound } from "./sound";
import "./playground.css";

export function usePlaygroundMatch(matchId: bigint, screen = false) {
  const conn = useSpacetimeDB();
  const [links] = useTable(tables.myIdentityLink);
  const [matches] = useTable(tables.match);
  const [participants] = useTable(tables.matchParticipant);
  const [spectators] = useTable(tables.matchSpectator);
  const identity = links[0]?.canonicalIdentity ?? conn.identity;
  const match = matches.find((m) => m.id === matchId);
  const humanName =
    participants.find((p) => p.matchId === matchId && p.actorKind === "human")
      ?.displayName ?? "Player";
  const isPlayer =
    !screen && !!identity && !!match?.playerIdentity.isEqual(identity);
  const isSpectator =
    !screen &&
    !!identity &&
    spectators.some(
      (s) => s.matchId === matchId && s.identity.isEqual(identity),
    );
  return {
    match,
    identity,
    humanName,
    isPlayer,
    isSpectator,
    connected: conn.isActive,
    spectators: spectators.filter((s) => s.matchId === matchId),
  };
}

export function PlaygroundMatch({
  matchId,
  screen = false,
  title,
  children,
  onBack,
}: {
  matchId: bigint;
  screen?: boolean;
  title: string;
  children: ReactNode;
  onBack: () => void;
}) {
  const {
    match,
    identity,
    humanName,
    isPlayer,
    isSpectator,
    connected,
    spectators,
  } = usePlaygroundMatch(matchId, screen);
  const [crowds] = useTable(tables.matchCrowd);
  const [cooldowns] = useTable(tables.ownSpectatorCooldown);
  const [effects] = useTable(tables.visibleCrowdEffects);
  const [memories] = useTable(tables.matchMemory);
  const [profiles] = useTable(tables.melaProfile);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [matchId]);
  const [rematches] = useTable(tables.playgroundRematch);
  const [matches] = useTable(tables.match);
  const [ownAfter, setOwnAfter] = useState<bigint>();
  const nextMatchId = rematches.find(
    (r) => r.previousMatchId === matchId,
  )?.nextMatchId;
  const nextMatch = matches.find((m) => m.id === nextMatchId);
  useEffect(() => {
    if (ownAfter === undefined) return;
    const created = matches.find(
      (m) =>
        m.id > ownAfter &&
        identity?.isEqual(m.playerIdentity) &&
        m.status === "active",
    );
    if (created)
      location.assign(`${import.meta.env.BASE_URL}?join=${created.id}`);
  }, [matches, ownAfter, identity]);
  const rematch = useReducer(reducers.rematchPlayground);
  const [requestedRematch, setRequestedRematch] = useState(false);
  useEffect(() => {
    if (requestedRematch && nextMatchId)
      location.assign(`${import.meta.env.BASE_URL}?join=${nextMatchId}`);
  }, [requestedRematch, nextMatchId]);
  const [events, setEvents] = useState<Array<{ key: string; message: string }>>(
    [],
  );
  const onInsert = useCallback(
    (event: {
      matchId: bigint;
      message: string;
      id: bigint;
      occurredAt: { microsSinceUnixEpoch: bigint };
    }) => {
      if (
        event.matchId !== matchId ||
        event.message.startsWith("Crowd Energy +")
      )
        return;
      const key = `${event.occurredAt.microsSinceUnixEpoch}:${event.id}:${event.message}`;
      setEvents((old) =>
        old.some((e) => e.key === key)
          ? old
          : [...old, { key, message: event.message }].slice(-6),
      );
    },
    [matchId],
  );
  useTable(tables.liveEvent, { onInsert });
  const usePower = useReducer(reducers.useExperimentalCrowdPower);
  const join = useReducer(reducers.joinMatchAsSpectator);
  const dots = useReducer(reducers.createDotsBoxes),
    gilli = useReducer(reducers.createGilliDanda),
    four = useReducer(reducers.createFourRow),
    stick = useReducer(reducers.createLastStick);
  const [target, setTarget] = useState("human"),
    [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const [now, setNow] = useState(Date.now()),
    [muted, setMuted] = useState(isMuted);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const crowd = crowds.find((c) => c.matchId === matchId),
    memory = memories.find((m) => m.matchId === matchId);
  useEffect(() => {
    setNotice("");
    setError("");
  }, [memory?.matchId]);
  const myProfile = profiles.find((p) => identity?.isEqual(p.identity));
  const powers: PlaygroundPower[] =
    match?.gameKind === "dots_boxes"
      ? ["chain_break", "cheer"]
      : match?.gameKind === "four_row"
        ? ["sidewind", "cheer"]
        : match?.gameKind === "last_stick"
          ? ["spark", "cheer"]
          : ["rhythm", "heckle", "cheer"];
  const pending = effects.filter(
    (e) => e.matchId === matchId && Number(e.expiresAtMicros / 1000n) > now,
  );
  const url = `${location.origin}${import.meta.env.BASE_URL}?join=${matchId}`;
  const action = async (
    key: string,
    work: () => Promise<unknown>,
    success: string,
  ) => {
    setBusy(key);
    setError("");
    try {
      await work();
      setNotice(success);
    } catch {
      setError(
        "That move could not be accepted. Check the live turn, energy and cooldown, then try again.",
      );
    } finally {
      setBusy("");
    }
  };
  return (
    <main className={`playground-shell ${screen ? "playground-screen" : ""}`}>
      <header className="pg-header">
        <button onClick={onBack} className="link-back">
          ← Mela
        </button>
        <span>
          {title} · #{matchId.toString()}
        </span>
        <button
          onClick={() => {
            const m = toggleMuted();
            setMuted(m);
            if (!m) playSound("flick");
          }}
        >
          {muted ? "Sound off" : "Sound on"}
        </button>
      </header>
      {!connected && (
        <p role="status" className="pg-alert">
          Reconnecting… Your place is saved. Controls resume when the world is
          live.
        </p>
      )}
      {children}
      {error && (
        <p role="alert" className="pg-alert">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="pg-notice">
          {notice}
        </p>
      )}
      {memory ? (
        <section className="pg-memory">
          <p className="eyebrow">THIS ONE STAYS WITH MELA</p>
          <h2>
            {memory.winner === "draw"
              ? "A story shared."
              : `${memory.winner === "human" ? memory.humanName : memory.aiName} takes this one.`}
          </h2>
          <p>{memory.notableMoment.replace(/You/g, memory.humanName)}</p>
          <p>
            {memory.humanName} {memory.humanScore} · {memory.aiName}{" "}
            {memory.botScore} · {memory.crowdActions} crowd{" "}
            {memory.crowdActions === 1 ? "move" : "moves"}
          </p>
          {!screen && myProfile && (
            <p className="pg-personal-memory">
              {isSpectator
                ? `You were part of this crowd. ${myProfile.matchesWatched} ${myProfile.matchesWatched === 1 ? "match" : "matches"} watched · ${myProfile.crowdInfluence} crowd influence.`
                : `Your Mela journey continues. Level ${myProfile.melaLevel} · ${myProfile.matchesPlayed} ${myProfile.matchesPlayed === 1 ? "match" : "matches"} played.`}
            </p>
          )}
          {nextMatchId ? (
            <div className="pg-next-match">
              <p className="eyebrow">THE SAME CROWD. A FRESH CHALLENGE.</p>
              <h3>{humanName} has opened the rematch.</h3>
              <p>
                Your saved result stays here. Join the next match when you’re
                ready.
              </p>
              <a
                className="primary pg-next-link"
                href={
                  screen
                    ? `/#/screen?match=${nextMatchId}`
                    : `${import.meta.env.BASE_URL}?${nextMatch?.status === "active" ? "join" : "memory"}=${nextMatchId}`
                }
              >
                {screen
                  ? "Show the rematch →"
                  : nextMatch?.status !== "active"
                    ? "See the next result →"
                    : isPlayer
                      ? "Enter your rematch →"
                      : "Follow the rematch →"}
              </a>
            </div>
          ) : isPlayer && !screen ? (
            <button
              className="primary"
              disabled={!!busy || !connected}
              onClick={() =>
                action(
                  "rematch",
                  async () => {
                    await rematch({ matchId });
                    setRequestedRematch(true);
                  },
                  "Your rematch is ready. The crowd has been invited.",
                )
              }
            >
              Rematch · invite this crowd →
            </button>
          ) : (
            !screen && (
              <div className="pg-next-match">
                <h3>Stay for the next one.</h3>
                <p>
                  If {humanName} starts a rematch, your invitation will appear
                  here. No new QR needed.
                </p>
              </div>
            )
          )}
          {!screen && !isPlayer && myProfile && (
            <button
              disabled={!!busy || !connected}
              onClick={() =>
                action(
                  "play",
                  async () => {
                    const latest = matches.reduce(
                      (max, m) => (m.id > max ? m.id : max),
                      0n,
                    );
                    await (match?.gameKind === "dots_boxes"
                      ? dots()
                      : match?.gameKind === "four_row"
                        ? four()
                        : match?.gameKind === "last_stick"
                          ? stick()
                          : gilli());
                    setOwnAfter(latest);
                  },
                  "Your own match is ready.",
                )
              }
            >
              Your turn to play →
            </button>
          )}
          {!screen && !myProfile && (
            <button className="primary" onClick={onBack}>
              Join Mela to play →
            </button>
          )}
          <button
            onClick={() =>
              action(
                "share",
                () =>
                  navigator.clipboard.writeText(
                    `${location.origin}/?memory=${matchId}`,
                  ),
                "Memory link copied.",
              )
            }
          >
            Copy this memory
          </button>
        </section>
      ) : (
        <section className="pg-crowd" id="playground-crowd">
          <div className="pg-crowd-heading">
            <div>
              <p className="eyebrow">
                {isSpectator ? "YOU ARE THE CROWD" : "MAKE ROOM FOR THE CROWD"}
              </p>
              <h2>
                {isSpectator
                  ? "Your moment to interfere."
                  : `${spectators.length} watching. Every move matters.`}
              </h2>
            </div>
            <div className="pg-energy">
              <strong>{crowd?.energy ?? "—"}</strong>
              <span>
                / {crowd?.maxEnergy ?? 60}
                <br />
                shared energy
              </span>
            </div>
          </div>
          {isSpectator ? (
            <>
              <p>
                Powers stay hidden from the players until their move reveals the
                effect. Everyone watching shares this energy pool.
              </p>
              <fieldset className="pg-target">
                <legend>Choose a side</legend>
                {["human", "melabot"].map((side) => (
                  <button
                    key={side}
                    aria-pressed={target === side}
                    onClick={() => setTarget(side)}
                  >
                    {side === "human" ? humanName : "MelaBot"}
                  </button>
                ))}
              </fieldset>
              <div className="pg-powers">
                {powers.map((power) => {
                  const rule = PLAYGROUND_POWERS[power];
                  const remaining = Math.max(
                    0,
                    Math.ceil(
                      (Number(
                        cooldowns.find(
                          (c) => c.matchId === matchId && c.power === power,
                        )?.readyAtMicros ?? 0n,
                      ) /
                        1000 -
                        now) /
                        1000,
                    ),
                  );
                  const waiting =
                    power !== "cheer" &&
                    pending.some((e) => e.target === target);
                  const unavailable =
                    match?.status !== "active" ||
                    !connected ||
                    !!busy ||
                    remaining > 0 ||
                    waiting ||
                    (crowd?.energy ?? 0) < rule.cost;
                  return (
                    <button
                      key={power}
                      disabled={unavailable}
                      onClick={() =>
                        action(
                          power,
                          () => usePower({ matchId, power, target }),
                          `${rule.label} accepted${power === "cheer" ? ". The pool has refreshed." : ` for ${target === "human" ? humanName : "MelaBot"}. Watch the next move.`}`,
                        )
                      }
                    >
                      <small>
                        {rule.cost} ENERGY · {rule.cooldown}s REST
                      </small>
                      <strong>{rule.label}</strong>
                      <span>{rule.copy}</span>
                      <b>
                        {busy === power
                          ? "Sending…"
                          : remaining
                            ? `Ready in ${remaining}s`
                            : waiting
                              ? "Effect already waiting"
                              : (crowd?.energy ?? 0) < rule.cost
                                ? "Needs more energy"
                                : "Use power →"}
                      </b>
                    </button>
                  );
                })}
              </div>
              {pending.length > 0 && (
                <p className="pg-queued">
                  Waiting:{" "}
                  {pending
                    .map(
                      (e) =>
                        `${e.actorName}'s ${e.power.replace(/_/g, " ")} → ${e.target === "human" ? humanName : "MelaBot"}`,
                    )
                    .join(" · ")}
                </p>
              )}
            </>
          ) : (
            <div className="pg-invite">
              <QRCodeSVG value={url} size={132} />
              <div>
                <h3>Scan. Join. Change the game.</h3>
                <p>One phone per spectator. Same match, live.</p>
                {!screen && (
                  <button
                    onClick={() =>
                      action(
                        "copy",
                        () => navigator.clipboard.writeText(url),
                        "Crowd link copied.",
                      )
                    }
                  >
                    Copy crowd link
                  </button>
                )}
                {!isPlayer && !screen && (
                  <button
                    disabled={!!busy || !connected}
                    onClick={() =>
                      action(
                        "join",
                        () => join({ matchId }),
                        "You joined the crowd.",
                      )
                    }
                  >
                    Join this crowd
                  </button>
                )}
                <a
                  href={`/#/screen?match=${matchId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open big screen ↗
                </a>
              </div>
            </div>
          )}
        </section>
      )}
      <section className="pg-feed">
        <p className="eyebrow">FROM THE MATCH</p>
        {events.length ? (
          <ol>
            {[...events].reverse().map((e) => (
              <li key={e.key}>{e.message.replace(/You/g, humanName)}</li>
            ))}
          </ol>
        ) : (
          <p>
            The next move starts the story. Earlier results live in match
            memory.
          </p>
        )}
      </section>
    </main>
  );
}
