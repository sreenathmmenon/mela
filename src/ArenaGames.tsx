import { lazy, Suspense, useEffect, useState } from "react";
import { useReducer, useTable } from "spacetimedb/react";
import { Identity } from "spacetimedb";
import { QRCodeSVG } from "qrcode.react";
import { tables, reducers } from "./module_bindings";
import { usePlaygroundMatch } from "./PlaygroundMatch";
import { useRoomPresence } from "./useRoomPresence";
import { GameOrientation } from "./GameOrientation";
import {
  legalActions,
  ARENA_POWERS,
  POLICIES,
  DEFAULT_WALLS,
  type ArenaState,
} from "../spacetimedb/src/arenaRules";
import { playSound, isMuted, toggleMuted } from "./sound";
import { CharacterPortrait } from "./CharacterStudio";
import {
  characterBrief,
  encodeCharacter,
  type ArenaCharacter,
} from "../spacetimedb/src/arenaCharacter";
import { downloadArenaPostcard } from "./arenaPostcard";
import { ArenaRoomPanel } from "./ArenaRoomPanel";
import "./arena.css";
const Stage = lazy(() => import("./ArenaStage"));
export const ARENA_TITLES: Record<string, string> = {
  crown_run: "Crown Run",
  bridge_breakers: "Bridge Breakers",
  mela_heist: "Mela Heist",
};
const POWER_COPY = {
  bridge: "Move the crossing. A runner may have to change plans.",
  spring: "Refill both runners’ dash charge after this move.",
  lantern: "Protect both runners from shoves for one move.",
};
export function ArenaGames({
  matchId,
  onBack,
  onOpen,
  screen = false,
}: {
  matchId: bigint;
  onBack: () => void;
  onOpen?: (id: bigint) => void;
  screen?: boolean;
}) {
  const {
    match,
    identity,
    isPlayer: legacyPlayer,
    isSpectator,
    connected,
    humanName,
    spectators,
  } = usePlaygroundMatch(matchId, screen);
  const [roomRows] = useTable(
    tables.arenaRoom.where((r) => r.matchId.eq(matchId)),
  );
  const [ownMoves] = useTable(tables.myArenaMove);
  const [crowdEnergy] = useTable(tables.myArenaEnergy);
  const room = roomRows[0];
  const host = Boolean(identity && match?.playerIdentity.isEqual(identity));
  const mySide: 0 | 1 | undefined = room
    ? identity &&
      room.leftIdentity?.isEqual(identity) &&
      room.mode !== "agent_duel"
      ? 0
      : identity &&
          room.rightIdentity?.isEqual(identity) &&
          room.mode === "friends"
        ? 1
        : undefined
    : legacyPlayer
      ? 0
      : undefined;
  const isPlayer = !screen && mySide !== undefined;
  const ownLocked = ownMoves.some((m) => m.matchId === matchId);
  useRoomPresence(
    match?.status === "active" ? matchId : undefined,
    Boolean(isPlayer || isSpectator || host),
  );
  const [rows] = useTable(
      tables.arenaState.where((r) => r.matchId.eq(matchId)),
    ),
    [frames] = useTable(tables.arenaFrame.where((r) => r.matchId.eq(matchId))),
    [productions] = useTable(
      tables.arenaProduction.where((r) => r.matchId.eq(matchId)),
    ),
    [pools] = useTable(tables.matchCrowd.where((r) => r.matchId.eq(matchId))),
    [pending] = useTable(tables.myArenaCrowd),
    [rematches] = useTable(
      tables.playgroundRematch.where((r) => r.previousMatchId.eq(matchId)),
    ),
    [cooldowns] = useTable(tables.ownSpectatorCooldown),
    [courses] = useTable(tables.arenaCourse),
    [matches] = useTable(tables.match);
  const [followAfter, setFollowAfter] = useState<bigint>();
  useEffect(() => {
    if (followAfter === undefined) return;
    const next = matches
      .filter(
        (m) =>
          m.id > followAfter &&
          m.playerIdentity.isEqual(identity!) &&
          Boolean(ARENA_TITLES[m.gameKind]),
      )
      .sort((a, b) => Number(b.id - a.id))[0];
    if (next) {
      if (onOpen) onOpen(next.id);
      else location.assign(`/?join=${next.id}`);
    }
  }, [matches, identity, followAfter, onOpen]);
  const row = rows[0],
    production = productions[0],
    cast = production
      ? ([JSON.parse(production.amber), JSON.parse(production.teal)] as [
          ArenaCharacter,
          ArenaCharacter,
        ])
      : undefined,
    pool =
      (isSpectator
        ? crowdEnergy.find((p) => p.matchId === matchId)
        : undefined) ?? pools[0],
    state = row ? (JSON.parse(row.state) as ArenaState) : undefined;
  const play = useReducer(reducers.playArena),
    power = useReducer(reducers.arenaPower),
    create = useReducer(reducers.createArena),
    join = useReducer(reducers.joinMatchAsSpectator),
    publish = useReducer(reducers.publishArenaCourse),
    connectAgent = useReducer(reducers.connectArenaAgent);
  const produce = useReducer(reducers.createCharacterArena);
  const createRoom = useReducer(reducers.createArenaRoom);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [camera, setCamera] = useState("isometric"),
    [replay, setReplay] = useState<number | null>(null),
    [replaying, setReplaying] = useState(false),
    [muted, setMuted] = useState(isMuted()),
    [mode, setMode] = useState("solo"),
    [policy, setPolicy] = useState("runner"),
    [rival, setRival] = useState("trickster"),
    [prompt, setPrompt] = useState(""),
    [courseId, setCourseId] = useState("0"),
    [walls, setWalls] = useState<number[]>(DEFAULT_WALLS),
    [courseName, setCourseName] = useState("My crossing"),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []); // UI cooldown clock only; never fetches or mutates.
  useEffect(() => {
    if (row?.revision) playSound(row.phase === "complete" ? "six" : "flick");
    setMessage("");
  }, [row?.revision, row?.phase]);
  const sorted = [...frames].sort((a, b) => a.revision - b.revision);
  useEffect(() => {
    if (!replaying || !row) return;
    const timer = setInterval(
      () =>
        setReplay((previous) => {
          const next = (previous ?? 0) + 1;
          if (next >= row.revision) {
            setReplaying(false);
            return row.revision;
          }
          return next;
        }),
      1100,
    );
    return () => clearInterval(timer);
  }, [replaying, row?.revision]);
  const shown =
    replay === null
      ? state
      : (JSON.parse(
          sorted.find((f) => f.revision === replay)?.state ??
            row?.state ??
            "null",
        ) as ArenaState);
  const canPlay =
    connected &&
    isPlayer &&
    (room
      ? row?.phase === "planning" && !ownLocked
      : row?.mode === "solo" && row.phase === "planning") &&
    match?.status === "active" &&
    !busy &&
    replay === null;
  const side = mySide ?? 0;
  const choices = state && canPlay ? legalActions(state, side) : [];
  async function run(fn: () => Promise<unknown>, success = "") {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      if (success) setMessage(success);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "That action could not complete. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function nextGame(args: Parameters<typeof create>[0]) {
    const after = matches.reduce((n, m) => (m.id > n ? m.id : n), 0n);
    await create(args);
    setFollowAfter(after);
  }
  async function rematch() {
    if (room) {
      const after = matches.reduce((n, m) => (m.id > n ? m.id : n), 0n);
      await createRoom({
        gameKind: match!.gameKind,
        mode: room.mode,
        inviteCode:
          room.mode === "friends" ? crypto.randomUUID().replace(/-/g, "") : "",
      });
      setFollowAfter(after);
      return;
    }
    if (!production)
      return nextGame({
        gameKind: match!.gameKind,
        mode: row.mode,
        leftPolicy: row.leftPolicy,
        rightPolicy: row.rightPolicy,
        courseId: 0n,
      });
    const after = matches.reduce((n, m) => (m.id > n ? m.id : n), 0n);
    await produce({
      gameKind: match!.gameKind,
      mode: row.mode,
      amber: production.amber,
      teal: production.teal,
      courseId: production.courseId,
      agent: row.agentIdentity,
    });
    setFollowAfter(after);
  }
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set(state?.winner ? "memory" : "join", String(matchId));
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({
          title: ARENA_TITLES[match!.gameKind],
          text: "Your move. Come shape this Mela match.",
          url: url.href,
        });
      else {
        await navigator.clipboard.writeText(url.href);
        setMessage("Link copied. Anyone can watch this match.");
      }
    } catch {
      setMessage("Copy this match link: " + url.href);
    }
  }
  async function teach() {
    const response = await fetch("/api/arena/teach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || "The coach is unavailable.");
    setPolicy(result.policy);
    setMessage(
      result.summary + " · Strategy created by Astra; executed by MelaBot.",
    );
  }
  async function live() {
    const response = await fetch("/api/arena/status");
    const result = await response.json();
    if (!result.identity || !result.available)
      throw Error(
        "Live Astra is at capacity or offline. MelaBot remains available.",
      );
    await connectAgent({
      matchId,
      agent: Identity.fromString(result.identity),
    });
    setMessage(
      "Astra connected. It proposes legal moves from the same public board.",
    );
  }
  if (!row || !shown || !match)
    return (
      <main className="arena-shell">
        <button onClick={onBack}>← Games</button>
        <p role="status">Opening the arena…</p>
      </main>
    );
  const complete = Boolean(state?.winner),
    closed = match.status !== "active",
    cooldown = cooldowns.find((c) => c.matchId === matchId),
    remaining = cooldown
      ? Math.max(
          0,
          Math.ceil((Number(cooldown.readyAtMicros) / 1000 - now) / 1000),
        )
      : 0,
    queued = pending.find((p) => p.matchId === matchId);
  const outcome =
    state!.winner === "team"
      ? "You brought it home. Together."
      : state!.winner === "timeout"
        ? "The vault closed. One more plan?"
        : state!.winner === "draw"
          ? "A rivalry worth a rematch."
          : state!.winner === "human"
            ? `${room?.leftName ?? (row.mode === "agents" ? (cast?.[0].name ?? "Amber") : humanName)} wins this round.`
            : `${room?.rightName ?? cast?.[1].name ?? "Teal"} takes this one.`;
  return (
    <main
      className={`arena-shell arena-${match.gameKind} ${isSpectator ? "arena-audience" : ""} ${screen ? "arena-screen" : ""}`}
    >
      <header className="arena-header">
        <button onClick={onBack}>← Games</button>
        <div>
          <h1>{ARENA_TITLES[match.gameKind]}</h1>
        </div>
        <button onClick={() => setMuted(toggleMuted())}>
          {muted ? "Sound off" : "Sound on"}
        </button>
      </header>
      {!screen && (
        <GameOrientation
          game={match.gameKind}
          spectator={isSpectator}
          complete={match.status !== "active"}
        />
      )}
      <div className="arena-layout">
        <section className="arena-main">
          {room && row.phase === "lobby" && (
            <ArenaRoomPanel matchId={matchId} host={host} closed={closed} />
          )}
          <div className="arena-score">
            <div>
              <i className="amber-dot" />
              <strong>
                {room?.leftName ??
                  (row.mode === "agents"
                    ? (cast?.[0].name ?? "Amber · " + row.leftPolicy)
                    : humanName)}
              </strong>
              <b>{shown.pawns[0].score}</b>
            </div>
            <span>
              {replay !== null ? "REPLAY · " : ""}
              {shown.beat} / 24
            </span>
            <div>
              <b>{shown.pawns[1].score}</b>
              <strong>
                {room?.rightName ??
                  cast?.[1].name ??
                  (row.agentIdentity ? "Agent · Teal" : "MelaBot · Teal")}
              </strong>
              <i className="teal-dot" />
            </div>
          </div>
          {!isPlayer && !closed && !screen && (
            <button
              className="arena-crowd-shortcut"
              onClick={() =>
                document
                  .getElementById("arena-crowd-controls")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              {isSpectator
                ? "Your crowd powers ↓"
                : "Join the crowd · change the next move ↓"}
            </button>
          )}
          <div className="arena-stage-wrap">
            <Suspense
              fallback={
                <div className="arena-stage" role="status">
                  Setting the lanterns…
                </div>
              }
            >
              <Stage
                state={shown}
                choices={choices}
                onChoose={(a) =>
                  void run(
                    () =>
                      play({
                        matchId,
                        revision: row.revision,
                        side,
                        action: JSON.stringify(a),
                      }),
                    "Move locked. Watch both plans unfold.",
                  )
                }
                camera={camera}
                looks={cast?.map((c) => c.look)}
              />
            </Suspense>
            <div className="arena-camera">
              <label>
                View{" "}
                <select
                  value={camera}
                  onChange={(e) => setCamera(e.target.value)}
                >
                  <option value="isometric">Diorama</option>
                  <option value="top">Overhead</option>
                  <option value="side">Ringside</option>
                </select>
              </label>
            </div>
          </div>
          <div className="arena-call" role="status">
            <strong>
              {replay !== null && replay < row.revision
                ? `Replay · move ${replay}`
                : complete
                  ? outcome
                  : closed
                    ? "This arena has closed. There’s another game waiting."
                    : room && row.phase === "lobby"
                      ? "Your arena is ready. Share the invitation to begin."
                      : room && ownLocked && row.phase === "planning"
                        ? "Your move is locked. Waiting for your friend—no rush."
                        : room && isPlayer && row.phase === "planning"
                          ? `You’re ${side === 0 ? "Amber" : "Teal"}. Pick a lit tile or a move below.`
                          : room && row.phase === "thinking"
                            ? room.mode === "friends"
                              ? "Both moves are locked. Here comes the reveal."
                              : "Agents are choosing. Both plans reveal together."
                            : row.phase === "thinking"
                              ? row.agentIdentity
                                ? row.mode === "agents"
                                  ? "Two characters are choosing their next move."
                                  : `${cast?.[1].name ?? "Astra"} is choosing. Your plan is locked.`
                                : "Plans locked. The crowd has its moment."
                              : row.mode === "agents"
                                ? "Two strategies. One arena."
                                : isPlayer
                                  ? "Your move. Pick a lit tile."
                                  : "Watch the runners. Shape their next move."}
            </strong>
            <span>{shown.log.join(" ")}</span>
          </div>
          {closed && !complete && (
            <button onClick={onBack}>Choose your next game →</button>
          )}
          {closed && !isPlayer && rematches[0] && (
            <a
              className="arena-follow"
              href={`/?join=${rematches[0].nextMatchId}`}
            >
              Follow the next match →
            </a>
          )}
          {canPlay && (
            <div className="arena-controls" aria-label="Legal moves">
              <div className="arena-moves">
                {choices
                  .filter((a) => a.action === "move" || a.action === "dash")
                  .map((a, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        void run(() =>
                          play({
                            matchId,
                            revision: row.revision,
                            side,
                            action: JSON.stringify(a),
                          }),
                        )
                      }
                    >
                      {a.action === "dash" ? "Dash" : "Step"}{" "}
                      {a.x > state!.pawns[side].x
                        ? "→"
                        : a.x < state!.pawns[side].x
                          ? "←"
                          : a.y > state!.pawns[side].y
                            ? "↓"
                            : "↑"}
                    </button>
                  ))}
              </div>
              <div className="arena-specials">
                {choices
                  .filter(
                    (a) =>
                      a.action === "guard" ||
                      (a.action === "shove" &&
                        state!.kind !== "mela_heist" &&
                        Math.abs(state!.pawns[0].x - state!.pawns[1].x) +
                          Math.abs(state!.pawns[0].y - state!.pawns[1].y) <=
                          1) ||
                      (a.action === "interact" &&
                        state!.kind !== "bridge_breakers" &&
                        ((state!.crown.carrier < 0 &&
                          state!.pawns[side].x === state!.crown.x &&
                          state!.pawns[side].y === state!.crown.y &&
                          (state!.kind !== "mela_heist" ||
                            state!.switchMask === 3)) ||
                          (state!.crown.carrier === side &&
                            state!.pawns[side].x === (side === 0 ? 0 : 8) &&
                            state!.pawns[side].y === 4))),
                  )
                  .map((a) => (
                    <button
                      key={a.action}
                      onClick={() =>
                        void run(() =>
                          play({
                            matchId,
                            revision: row.revision,
                            side,
                            action: JSON.stringify(a),
                          }),
                        )
                      }
                    >
                      {a.action === "interact"
                        ? "Pick up / deliver"
                        : a.action === "guard"
                          ? "Guard · recharge"
                          : "Shove rival"}
                    </button>
                  ))}
              </div>
              <small>
                Dash charge {state!.pawns[side].stamina}/2 · Both moves resolve
                together. A tied pickup alternates by move number.
              </small>
            </div>
          )}
          {!connected && (
            <p role="alert">
              Connection lost. Your committed moves are safe. Reconnecting…
            </p>
          )}
          {message && (
            <p className="arena-message" role="status">
              {message}
            </p>
          )}
          {complete && (
            <section className="arena-result">
              <span className="arena-overline">A MELA MEMORY</span>
              <h2>{outcome}</h2>
              <p>
                {shown.eggs.length
                  ? `${shown.eggs.length} little discoveries along the way.`
                  : "Every crossing told a different story."}{" "}
                This match and its crowd moves are saved.
              </p>
              <div className="arena-result-actions">
                <button
                  className="arena-primary"
                  disabled={busy}
                  onClick={() => void run(rematch)}
                >
                  Play again →
                </button>
                <button onClick={() => void share()}>Share this story</button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () =>
                        downloadArenaPostcard(
                          state!,
                          ARENA_TITLES[match.gameKind],
                          [
                            room?.leftName ??
                              (row.mode === "agents"
                                ? (cast?.[0].name ?? "Amber")
                                : humanName),
                            room?.rightName ?? cast?.[1].name ?? "Teal",
                          ],
                          url.href,
                        ),
                      "Postcard downloaded. The replay link is printed on it.",
                    )
                  }
                >
                  Save match postcard ↓
                </button>
              </div>
              <label>
                Replay the match{" "}
                <input
                  aria-label="Replay move"
                  type="range"
                  min={0}
                  max={row.revision}
                  value={replay ?? row.revision}
                  onChange={(e) => {
                    setReplaying(false);
                    setReplay(Number(e.target.value));
                  }}
                />
              </label>
              <button
                onClick={() => {
                  if (replaying) setReplaying(false);
                  else {
                    if (replay === null || replay >= row.revision) setReplay(0);
                    setReplaying(true);
                  }
                }}
              >
                {replaying ? "Pause replay" : "Play replay"}
              </button>{" "}
              <button
                onClick={() => {
                  setReplaying(false);
                  setReplay(null);
                }}
              >
                Final moment
              </button>
            </section>
          )}
        </section>
        <aside className="arena-sidebar">
          {room && row.phase !== "lobby" && (
            <ArenaRoomPanel matchId={matchId} host={host} closed={closed} />
          )}
          {cast && !room && (
            <section className="arena-card arena-cast">
              <h2 className="arena-overline">THE CHARACTERS</h2>
              {cast.map((c, i) => (
                <div className="arena-cast-member" key={i}>
                  <CharacterPortrait character={c} teal={i === 1} />
                  <div>
                    <h3>{c.name}</h3>
                    <p>
                      {i === 0 && row.mode === "solo"
                        ? `${isPlayer ? "You choose" : `${humanName} chooses`} every move. These tactics apply only when the character plays autonomously.`
                        : characterBrief(c)}
                    </p>
                    <a
                      href={`/?character=${encodeCharacter(c)}&arena=${match.gameKind}`}
                    >
                      Remix this character ↗
                    </a>
                  </div>
                </div>
              ))}
              <small>
                {row.agentIdentity
                  ? "Live agent proposals. Any timed-out move is labeled MelaBot fallback in the notebook."
                  : "Character tactics run deterministically in Mela. No live model calls."}
              </small>
            </section>
          )}
          <section className="arena-card">
            <span className="arena-overline">THE OBJECTIVE</span>
            <h2>
              {match.gameKind === "crown_run"
                ? "Steal. Escape. Return."
                : match.gameKind === "bridge_breakers"
                  ? "Find your way across."
                  : "Nobody wins alone."}
            </h2>
            <p>
              {match.gameKind === "crown_run"
                ? "Pick up the crown at the centre. Carry it to your starting portal and deliver. First to two wins—or the most after 24 moves. Guard against shoves."
                : match.gameKind === "bridge_breakers"
                  ? "Reach the opposite portal first. Save charge for a dash, and watch the crowd-controlled crossing. Simultaneous finishes tie."
                  : "Stand on the two gold switches together. Then one partner picks up the treasure and delivers it to their own portal. Finish together in 24 moves."}
            </p>
            <small>
              Amber starts left. Teal starts right.{" "}
              {match.gameKind === "bridge_breakers"
                ? "Your finish is the opposite portal."
                : "Move, then use Pick up / deliver on the goal tile."}
            </small>
          </section>
          <section id="arena-crowd-controls" className="arena-card arena-crowd">
            <div className="arena-card-top">
              <h2>The crowd</h2>
              <span>{spectators.length} joined</span>
            </div>
            <strong className="arena-energy">
              {pool?.energy ?? 0}
              <small> / {pool?.maxEnergy ?? 60} shared energy</small>
            </strong>
            <p>
              One crowd choice per move. +3 energy after each reveal.
              {!isSpectator && " Energy shown is from the last reveal."}
            </p>
            {!isPlayer && !isSpectator && !closed && !screen && (
              <button
                className="arena-primary"
                disabled={busy || !connected}
                onClick={() =>
                  void run(
                    () => join({ matchId }),
                    "You're in. Your first crowd move is ready.",
                  )
                }
              >
                Join the crowd →
              </button>
            )}
            {isSpectator && !closed && (
              <>
                <p role="status">
                  {queued
                    ? `${queued.actor} chose ${ARENA_POWERS[queued.power as keyof typeof ARENA_POWERS]?.label}. Revealed with the next move.`
                    : remaining
                      ? `Your next power in ${remaining}s`
                      : "Your move is ready."}
                </p>
                {Object.entries(ARENA_POWERS).map(([key, value]) => (
                  <button
                    className="arena-power"
                    key={key}
                    disabled={
                      busy ||
                      !connected ||
                      remaining > 0 ||
                      Boolean(queued) ||
                      (pool?.energy ?? 0) < value.cost
                    }
                    onClick={() =>
                      void run(
                        () => power({ matchId, power: key }),
                        "Power accepted. Watch the next reveal.",
                      )
                    }
                  >
                    <span>
                      <strong>{value.label}</strong>
                      <small>
                        {POWER_COPY[key as keyof typeof POWER_COPY]}
                      </small>
                    </span>
                    <b>{value.cost}</b>
                  </button>
                ))}
              </>
            )}
            {isPlayer && !closed && (
              <p>The crowd’s choice stays hidden until your moves resolve.</p>
            )}
            <button onClick={() => void share()}>
              {closed ? "Share the replay ↗" : "Invite a spectator ↗"}
            </button>
            <details>
              <summary>Show crowd QR</summary>
              <QRCodeSVG value={url.href} size={156} marginSize={2} />
              <a className="arena-crowd-link" href={url.href}>
                {closed ? "Open this replay" : "Open the crowd link"} ↗
              </a>
            </details>
          </section>
          {isPlayer && row.revision === 0 && !closed && !production && (
            <section className="arena-card">
              <h2>Meet your rival</h2>
              <p>
                MelaBot always works. Connect Astra for live decisions from the
                same board.
              </p>
              <button
                disabled={busy || Boolean(row.agentIdentity)}
                onClick={() => void run(live)}
              >
                {row.agentIdentity
                  ? "Agent connected"
                  : "Play against live Astra"}
              </button>
            </section>
          )}
          <details className="arena-card">
            <summary>Classic strategies & custom courses</summary>
            {production && (
              <p>
                These settings start a classic strategy match. Use Play again to
                keep these characters, or remix a character above.
              </p>
            )}
            <label>
              Mode
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="solo">You + MelaBot</option>
                <option value="agents">Strategy vs strategy</option>
              </select>
            </label>
            <label>
              Amber strategy
              <select
                value={policy}
                onChange={(e) => setPolicy(e.target.value)}
              >
                {POLICIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              Teal strategy
              <select value={rival} onChange={(e) => setRival(e.target.value)}>
                {POLICIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              Teach a character
              <textarea
                maxLength={400}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Take the long way. Save a dash for the escape."
              />
            </label>
            <button
              disabled={busy || prompt.trim().length < 4}
              onClick={() => void run(teach)}
            >
              Ask Astra to choose a strategy
            </button>
            <small>
              Astra maps your idea to a tested runner, defender or trickster
              policy. No arbitrary code.
            </small>
            {match.gameKind === "bridge_breakers" && (
              <label>
                Course
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                >
                  <option value="0">Lantern crossing</option>
                  {courses.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              disabled={busy || !connected}
              onClick={() =>
                void run(() =>
                  nextGame({
                    gameKind: match.gameKind,
                    mode,
                    leftPolicy: policy,
                    rightPolicy: rival,
                    courseId: BigInt(courseId),
                  }),
                )
              }
            >
              Start this match →
            </button>
          </details>
          {match.gameKind === "bridge_breakers" && (
            <details className="arena-card">
              <summary>Build a crossing</summary>
              <p>
                Tap to place up to 14 blocks. Every open tile must stay
                reachable.
              </p>
              <div className="arena-editor">
                {Array.from({ length: 81 }, (_, i) => (
                  <button
                    aria-label={`Tile ${i + 1}${walls.includes(i) ? ", blocked" : ""}`}
                    aria-pressed={walls.includes(i)}
                    disabled={[36, 44, 40, 10, 70].includes(i)}
                    key={i}
                    onClick={() =>
                      setWalls(
                        walls.includes(i)
                          ? walls.filter((n) => n !== i)
                          : [...walls, i].slice(0, 14),
                      )
                    }
                  >
                    {walls.includes(i) ? "■" : "·"}
                  </button>
                ))}
              </div>
              <label>
                Course name
                <input
                  maxLength={40}
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                />
              </label>
              <button
                disabled={busy || !connected}
                onClick={() =>
                  void run(
                    () =>
                      publish({
                        name: courseName,
                        walls: JSON.stringify(walls),
                      }),
                    "Course published. Choose it in Classic strategies & custom courses.",
                  )
                }
              >
                Publish crossing
              </button>
            </details>
          )}
          <details className="arena-card">
            <summary>Match notebook</summary>
            <p>{row.provenance}. No hidden crowd plans are sent to an agent.</p>
            <ol className="arena-notebook">
              {sorted
                .slice(-8)
                .reverse()
                .map((f) => (
                  <li key={f.revision}>
                    <b>{f.revision === 0 ? "Opening" : `Move ${f.revision}`}</b>
                    <span>
                      {(JSON.parse(f.state) as ArenaState).log.join(" ")}
                    </span>
                    <small>{f.source}</small>
                  </li>
                ))}
            </ol>
          </details>
        </aside>
      </div>
    </main>
  );
}
