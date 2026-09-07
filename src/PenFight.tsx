import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { QRCodeSVG } from "qrcode.react";
import { AgentDuelPanel } from "./AgentDuel";
import { EmailRecap } from "./EmailRecap";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import { reducers, tables } from "./module_bindings";
import { isMuted, playSound, toggleMuted } from "./sound";
import {
  PEN_FIGHT_POWERS,
  PEN_FIGHT_RULES,
  type PenFightPower,
} from "../spacetimedb/src/penFightRules";
import {
  duelShare,
  isIntentionalDrag,
  powerAvailability,
  rivalry,
} from "./penFightExperience";
import "./pens.css";
import "./penFightExperience.css";
import { PenDesk, SHOT_DURATION, type DeskInput } from "./PenDesk";
import { boundedAim, canGrabPen } from "./penFightInput";
import { penAimPoint } from "../spacetimedb/src/penGeometry";
import { saveDuelCard } from "./penDuelCard";
import { readDeskView, type DeskView } from "./penCameraSettings";
import { seatKind } from "../spacetimedb/src/agentDuelRules";
import {
  PEN_MOTION_PREFIX,
  readPenMotion,
  type PenMotion,
} from "../spacetimedb/src/penFightMotion";

/**
 * Four pens off a school desk. They are purely cosmetic — every pen has exactly
 * the same physics. Simulation showed that giving pens different mass or
 * friction makes one strictly dominant (the heavy pen won 100% of matchups),
 * and real pen fight's worst quality is that the richest pen wins. Here the pen
 * is who you are, not how hard you hit.
 */
const PENS = [
  ["pen-reynolds", "Reynolds", "The one everybody had"],
  ["pen-gel", "Gel", "Smooth grip, bright barrel"],
  ["pen-metal", "Steel", "Heavy in the hand"],
  ["pen-fountain", "Ink pen", "Your dad's good one"],
] as const;
const PEN_KEY = "mela.pen";

/**
 * What each crowd power does, phrased for the person watching the desk rather
 * than for the spectator who bought it. The desk badge has to explain itself
 * in a glance to someone who never opened the crowd panel.
 */
const EFFECT_ON_DESK: Record<string, { label: string; effect: string }> = {
  nudge: { label: "NUDGE", effect: "extra push" },
  tilt: { label: "DESK TILT", effect: "sideways drift" },
  guard: { label: "GUARD", effect: "saved from the edge" },
  cheer: { label: "CHEER", effect: "energy returned" },
};

const powers = Object.entries(PEN_FIGHT_POWERS) as [
  PenFightPower,
  (typeof PEN_FIGHT_POWERS)[PenFightPower],
][];
/**
 * A stable, position-derived tilt. Deterministic per position so every client
 * shows the same pen orientation without the server storing a rotation.
 */
// Mirrors penFightRules.ts. The server validates every flick regardless, so a
// drift here can only ever cost the player a rejected shot, never an illegal one.
const MIN_FORCE = PEN_FIGHT_RULES.minForce;
const MAX_FORCE = PEN_FIGHT_RULES.maxForce;
const OPENING_FORCE_MAX = PEN_FIGHT_RULES.openingForceMax;

const url = (id: bigint, remembered = false) =>
  `${(import.meta.env.VITE_PUBLIC_APP_URL || location.origin).replace(/\/$/, "")}/?${remembered ? "memory" : "join"}=${id}`;

export function PenFight({
  matchId,
  onBack,
  onRematch,
}: {
  matchId?: bigint;
  onBack: () => void;
  onRematch?: () => void;
}) {
  const conn = useSpacetimeDB();
  const [identityLinks] = useTable(tables.myIdentityLink);
  const identity = identityLinks[0]?.canonicalIdentity ?? conn.identity;
  const [matches] = useTable(tables.match);
  const [rooms] = useTable(tables.roomActivity);
  const [duels] = useTable(tables.agentDuel);
  const [states] = useTable(tables.penDeskState);
  const [participants] = useTable(tables.matchParticipant);
  const [crowds] = useTable(tables.matchCrowd);
  const [spectators] = useTable(tables.matchSpectator);
  const [effects] = useTable(tables.visibleCrowdEffects);
  const [profiles] = useTable(tables.playerProfile);
  const [memories] = useTable(tables.matchMemory);
  const [records] = useTable(tables.penFightRecord);
  const [cooldowns] = useTable(tables.ownSpectatorCooldown);
  const [melaProfiles] = useTable(tables.melaProfile);
  const [motion, setMotion] = useState<PenMotion>();
  const [moving, setMoving] = useState(false);
  const [deskView, setDeskView] = useState<DeskView>(() => {
    try {
      return readDeskView(localStorage.getItem("mela.pen.camera"));
    } catch {
      return "desk";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("mela.pen.camera", deskView);
    } catch {
      /* Cosmetic preference is optional. */
    }
  }, [deskView]);
  const [focusedDesk, setFocusedDesk] = useState(false);
  useEffect(() => {
    if (!focusedDesk) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [focusedDesk]);
  const [replayKey, setReplayKey] = useState(0);
  const [savingCard, setSavingCard] = useState(false);
  const [feed, setFeed] = useState<
    { key: string; matchId: bigint; message: string }[]
  >([]);
  const onEvent = useCallback(
    (event: {
      id: bigint;
      matchId: bigint;
      message: string;
      occurredAt: { microsSinceUnixEpoch: bigint };
    }) => {
      if (event.message.startsWith(PEN_MOTION_PREFIX)) {
        const action = readPenMotion(event.message);
        if (action && event.matchId === matchId)
          setMotion((previous) =>
            previous?.sequence === action.sequence &&
            previous.matchId === action.matchId
              ? previous
              : action,
          );
        return;
      }
      if (event.message.startsWith("Crowd Energy +")) return;
      const key = `${event.occurredAt.microsSinceUnixEpoch}:${event.id}:${event.message}`;
      setFeed((rows) =>
        rows.some((row) => row.key === key)
          ? rows
          : [
              ...rows,
              { key, matchId: event.matchId, message: event.message },
            ].slice(-24),
      );
    },
    [matchId],
  );
  useTable(tables.liveEvent, { onInsert: onEvent });
  const [now, setNow] = useState(Date.now);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [muted, setMuted] = useState(isMuted);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const deskInput = useRef<DeskInput | null>(null);
  const dragRevision = useRef<string>();
  const shot = useRef<{ x: number; y: number; force: number } | null>(null);
  const memoryCard = useRef<HTMLElement>(null);
  const lastAnimatedRevision = useRef<string>();
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const [aim, setAim] = useState({ x: 740, y: 500 });
  const [force, setForce] = useState(60);
  const [shotContact, setShotContact] = useState(50);
  const [pullPoint, setPullPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [myPen, setMyPen] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(PEN_KEY);
      return PENS.find(([id]) => id === saved)?.[0] ?? PENS[0][0];
    } catch {
      return PENS[0][0];
    }
  });
  const choosePen = (id: string) => {
    setMyPen(id);
    try {
      localStorage.setItem(PEN_KEY, id);
    } catch {
      // Private mode: the choice simply lasts for this session.
    }
  };
  const [target, setTarget] = useState<"human" | "melabot">("human");
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!note) return;
    const timer = window.setTimeout(() => setNote(""), 6000);
    return () => window.clearTimeout(timer);
  }, [note]);
  const [aiming, setAiming] = useState(false);
  const match =
    (matchId !== undefined
      ? matches.find((row) => row.id === matchId)
      : undefined) ??
    matches.find(
      (row) => row.status === "active" && row.gameKind === "pen_fight",
    ) ??
    matches.filter((row) => row.gameKind === "pen_fight").slice(-1)[0];
  const rawState = match
    ? states.find((row) => row.matchId === match.id)
    : undefined;
  const crowd = match
    ? crowds.find((row) => row.matchId === match.id)
    : undefined;
  const me = identity
    ? profiles.find((row) => row.identity.isEqual(identity))
    : undefined;
  const duel = duels.find((row) => row.matchId === match?.id);
  const seat =
    identity && duel?.leftIdentity?.isEqual(identity)
      ? "human"
      : identity && duel?.rightIdentity?.isEqual(identity)
        ? "bot"
        : undefined;
  const rightHuman =
    seat === "bot" && duel && seatKind(duel.mode, seat) === "human";
  const perspective =
    rawState && rightHuman
      ? {
          ...rawState,
          humanX: rawState.botX,
          humanY: rawState.botY,
          botX: rawState.humanX,
          botY: rawState.humanY,
          humanRounds: rawState.botRounds,
          botRounds: rawState.humanRounds,
          turn:
            rawState.turn === "human"
              ? "bot"
              : rawState.turn === "bot"
                ? "human"
                : rawState.turn,
        }
      : rawState;
  const state =
    perspective && duel && ["lobby", "intent"].includes(duel.phase)
      ? { ...perspective, turn: "waiting" }
      : perspective;
  const owns = Boolean(
    duel
      ? seat && seatKind(duel.mode, seat) === "human"
      : match && identity && match.playerIdentity.isEqual(identity),
  );
  const displayMotion = useMemo(
    () =>
      rightHuman && motion
        ? {
            ...motion,
            actor:
              motion.actor === "human"
                ? ("melabot" as const)
                : ("human" as const),
          }
        : motion,
    [rightHuman, motion],
  );
  /** Crowd effects standing on this match right now, oldest first. */
  const liveEffects = useMemo(
    () => (match ? effects.filter((row) => row.matchId === match.id) : []),
    [effects, match],
  );
  const spectating = Boolean(
    match &&
    identity &&
    spectators.some(
      (row) => row.matchId === match.id && row.identity.isEqual(identity),
    ),
  );
  const flick = useReducer(reducers.flickPen);
  const seatFlick = useReducer(reducers.humanPenFlick);
  const join = useReducer(reducers.joinMatchAsSpectator);
  const power = useReducer(reducers.usePenFightCrowdPower);
  const rematch = useReducer(reducers.createPenFight);
  const rematchSeats = useReducer(reducers.createAgentDuel);
  const human =
    (rightHuman ? duel?.rightName : duel?.leftName) ??
    (match
      ? (participants.find(
          (row) => row.matchId === match.id && row.role === "player",
        )?.displayName ?? "Player")
      : "Player");
  const completed = match?.status === "complete";
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setShotContact(50);
    setReplayKey(0);
  }, [match?.id]);
  // Start each authoritative human turn from the opponent's CURRENT position,
  // not the opening coordinate left over from the previous exchange.
  useEffect(() => {
    if (!state || state.turn !== "human" || completed) return;
    setAim({ x: state.botX, y: state.botY });
    setForce((f) =>
      Math.min(f, state.turnsInRound < 2 ? OPENING_FORCE_MAX : MAX_FORCE),
    );
    if (dragStart.current) setNote("The desk moved. Line up your next flick.");
    setAiming(false);
    setPullPoint(null);
    dragStart.current = null;
    shot.current = null;
  }, [
    state?.matchId,
    state?.round,
    state?.turnsInRound,
    state?.turn,
    state?.botX,
    state?.botY,
    completed,
  ]);
  useEffect(() => {
    if (!completed) return;
    setFocusedDesk(false);
    const timer = window.setTimeout(
      () =>
        memoryCard.current?.scrollIntoView({
          block: "center",
          behavior: "auto",
        }),
      SHOT_DURATION + 180,
    );
    return () => window.clearTimeout(timer);
  }, [completed]);
  /**
   * One gesture sets the whole flick. Drag back from your pen like a
   * slingshot: the direction you pull is the direction it will NOT go, and how
   * far you pull is how hard it goes. This is the model Carrom Pool, 8 Ball and
   * Angry Birds all converged on, and it works identically for mouse and touch.
   */
  const PULL_MAX = 320; // arena units of pull that map to full power
  const pull = (event: PointerEvent<HTMLDivElement>) => {
    if (!state) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = deskInput.current?.(event.clientX, event.clientY) ?? {
      x: ((event.clientX - rect.left) / rect.width) * 1000,
      y: ((event.clientY - rect.top) / rect.height) * 1000,
    };
    // Vector from the drag point back to the pen = the launch direction.
    if (!dragStart.current) return;
    const start = deskInput.current?.(
      dragStart.current.x,
      dragStart.current.y,
    ) ?? {
      x: ((dragStart.current.x - rect.left) / rect.width) * 1000,
      y: ((dragStart.current.y - rect.top) / rect.height) * 1000,
    };
    const dx = start.x - point.x;
    const dy = start.y - point.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) {
      shot.current = null;
      return;
    }
    const ux = dx / len;
    const uy = dy / len;
    const drawn = Math.min(PULL_MAX, len);
    const nextAim = boundedAim(
      { x: state.humanX, y: state.humanY },
      { x: ux, y: uy },
    );
    if (!nextAim) {
      shot.current = null;
      return;
    }
    setAim(nextAim);
    const ceiling = state.turnsInRound < 2 ? OPENING_FORCE_MAX : MAX_FORCE;
    const nextForce = Math.round(
      MIN_FORCE + (drawn / PULL_MAX) * (ceiling - MIN_FORCE),
    );
    setForce(nextForce);
    shot.current = { ...nextAim, force: nextForce };
    setPullPoint(point);
  };
  // Presentation only: the desk reacts to what the server already resolved.
  // The contact callback from PenDesk is timed to the committed motion, rather
  // than to subscription arrival, so the visual weight lands when the pens do.
  const lastOutcome = state?.lastOutcome;
  const revision = state
    ? `${state.matchId}:${state.round}:${state.turnsInRound}:${state.turn}`
    : undefined;
  const [deskFx, setDeskFx] = useState({
    impact: false,
    round: false,
    knockout: false,
  });
  const deskFxTimer = useRef<number>();
  const clearDeskFx = useCallback(() => {
    window.clearTimeout(deskFxTimer.current);
    setDeskFx({ impact: false, round: false, knockout: false });
  }, []);
  useEffect(() => () => window.clearTimeout(deskFxTimer.current), []);
  const showImpact = useCallback(() => {
    window.clearTimeout(deskFxTimer.current);
    setDeskFx({
      impact: true,
      round: false,
      knockout: false,
    });
    deskFxTimer.current = window.setTimeout(clearDeskFx, 260);
  }, [clearDeskFx]);
  const showFall = useCallback(
    (motion: PenMotion) => {
      window.clearTimeout(deskFxTimer.current);
      setDeskFx({
        impact: false,
        round: true,
        knockout: motion.actorOut || motion.targetOut,
      });
      deskFxTimer.current = window.setTimeout(clearDeskFx, 850);
    },
    [clearDeskFx],
  );
  useEffect(() => {
    if (!revision || revision === lastAnimatedRevision.current) return;
    const previous = lastAnimatedRevision.current;
    lastAnimatedRevision.current = revision;
    // Subscribing to a remembered or in-progress desk is not a new shot.
    if (!previous) return;
    if (
      !lastOutcome ||
      lastOutcome === "START" ||
      lastOutcome === "AIM YOUR FIRST FLICK"
    )
      return;
    // A server update may arrive before its replay starts. Reset stale visual
    // state here; PenDesk invokes showImpact/showFall at the actual frame.
    clearDeskFx();
  }, [lastOutcome, revision, clearDeskFx]);
  // A pen close to the border is one nudge from ending the round.
  const nearEdge = (v: number) => v < 130 || v > 870;
  const humanTeeter = Boolean(
    state && (nearEdge(state.humanX) || nearEdge(state.humanY)),
  );
  const botTeeter = Boolean(
    state && (nearEdge(state.botX) || nearEdge(state.botY)),
  );
  const edgeDanger = humanTeeter || botTeeter;
  // The teeter tone sustains for ~385ms, so it fires once on ENTERING danger
  // and stays quiet while a pen sits there — otherwise it smears every frame.
  const wasInDanger = useRef(false);
  useEffect(() => {
    if (edgeDanger && !wasInDanger.current && !completed) playSound("teeter");
    wasInDanger.current = edgeDanger;
  }, [edgeDanger, completed]);
  if (!match)
    return (
      <section className="pen-empty">
        <h2>Pen Fight is waiting for a live desk.</h2>
        <button onClick={onBack}>Back to Mela</button>
      </section>
    );
  if (!state)
    return (
      <main className="pen-shell game-loading" aria-busy="true">
        <section className="pen-empty" role="status">
          <h1>Pen Fight</h1>
          <p>Preparing the desk…</p>
          <button onClick={onBack}>← Games</button>
          <div className="game-loading-board" aria-hidden="true" />
        </section>
      </main>
    );
  if (match.status !== "active" && match.status !== "complete")
    return (
      <main className="pen-shell">
        <h1>Pen Fight</h1>
        <p>
          This match closed before a result. Your profile and earlier results
          are safe.
        </p>
        <button onClick={onBack}>← Games</button>
      </main>
    );
  // The opening flick is capped by the server for fairness; mirror that here so
  // the power bar cannot promise strength the reducer will refuse.
  const isOpening = state.turnsInRound < 2;
  const maxForceNow = isOpening ? OPENING_FORCE_MAX : MAX_FORCE;
  const cappedForce = Math.min(force, maxForceNow);
  // The bar fills against the power available RIGHT NOW. During the opening the
  // ceiling is lower, so a full bar honestly means "as hard as this flick can
  // legally go" rather than freezing part-way with no explanation.
  const powerPct = Math.round(
    ((cappedForce - MIN_FORCE) / Math.max(1, maxForceNow - MIN_FORCE)) * 100,
  );
  const nudgeAim = (dir: number) => {
    const dx = aim.x - state.humanX;
    const dy = aim.y - state.humanY;
    const a = Math.atan2(dy, dx) + dir * 0.14;
    const nextAim = boundedAim(
      { x: state.humanX, y: state.humanY },
      { x: Math.cos(a), y: Math.sin(a) },
    );
    if (nextAim) setAim(nextAim);
    else setNote("Aim back across the desk from this edge.");
  };
  const commitFlick = async (gesture?: {
    x: number;
    y: number;
    force: number;
  }) => {
    if (
      busy.current ||
      moving ||
      !conn.isActive ||
      !owns ||
      completed ||
      state.turn !== "human"
    )
      return;
    if (
      Math.hypot(
        (gesture?.x ?? aim.x) - state.humanX,
        (gesture?.y ?? aim.y) - state.humanY,
      ) < 1
    ) {
      setNote("Choose a direction across the desk first.");
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      const action = {
        matchId: match.id,
        aimX: gesture?.x ?? aim.x,
        aimY: gesture?.y ?? aim.y,
        force: gesture?.force ?? cappedForce,
        contact: shotContact,
      };
      if (duel)
        await seatFlick({
          ...action,
          round: rawState!.round,
          turnNumber: rawState!.turnsInRound,
        });
      else await flick(action);
      setNote("");
    } catch {
      setNote("That flick is not legal right now.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  // MelaBot's intent, derived from the same public board state its own policy
  // reads. Its reasoning already reaches the event feed, but that scrolls away
  // from where the player is looking — the desk. This puts it on the desk.
  const opponent = (rightHuman ? duel?.leftName : duel?.rightName) ?? "MelaBot";
  const edgeOf = (x: number, y: number) => Math.min(x, y, 1000 - x, 1000 - y);
  const myMargin = state ? edgeOf(state.humanX, state.humanY) : 500;
  const botMargin = state ? edgeOf(state.botX, state.botY) : 500;
  const gap = state
    ? Math.hypot(state.botX - state.humanX, state.botY - state.humanY)
    : 999;
  const botPlan = !state
    ? ""
    : myMargin < 150
      ? "You are near the edge — MelaBot is going for the knockout."
      : botMargin < 150
        ? "MelaBot is cornered. It has to play its way back in."
        : gap < 260
          ? "You are in range. MelaBot is lining up a hit."
          : "MelaBot is lining up its next flick.";
  const myPlan = !state
    ? ""
    : myMargin < 150
      ? "You are on the rim. A soft flick back to safety, or risk it?"
      : botMargin < 150
        ? `${opponent} is on the rim. One good hit could end the round.`
        : gap < 260
          ? "In range. Pull back and aim through its middle."
          : "Pull back, release. A longer pull means more force.";

  const actor = state.turn === "human" ? human : opponent;
  // Pens rotate toward where they last travelled, so a slide reads as a real
  // object with momentum rather than a token teleporting between points.
  const memory = memories.find((row) => row.matchId === match.id);
  const record = identity
    ? records.find((row) => row.identity.isEqual(identity))
    : undefined;
  const personal = identity
    ? melaProfiles.find((row) => row.identity.isEqual(identity))
    : undefined;
  const penName = PENS.find(([id]) => id === myPen)?.[1] ?? "Reynolds";
  const matchFeed = feed
    .filter((row) => row.matchId === match.id)
    .slice(-6)
    .reverse();
  const crowdCount =
    rooms.find((room) => room.matchId === match.id)?.spectators ?? 0;
  const share = async () => {
    const text = duelShare({
      human,
      opponent,
      humanRounds: state.humanRounds,
      botRounds: state.botRounds,
      crowdActions: memory?.crowdActions ?? 0,
      moment: memory?.notableMoment ?? state.lastOutcome,
    });
    try {
      if (navigator.share)
        await navigator.share({
          title: "A desk worth remembering · Mela",
          text,
          url: url(match.id, true),
        });
      else {
        await navigator.clipboard.writeText(`${text}\n${url(match.id, true)}`);
        setNote(
          "Duel story and link copied. Share it wherever your people are.",
        );
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError"))
        setNote(
          "Sharing is unavailable here. You can copy the match link below.",
        );
    }
  };
  const spectatorPanel = spectating && crowd && !completed && (
    <section className="pen-crowd" id="pen-crowd">
      <div className="pen-energy">
        <strong>
          {crowd.energy}
          <small>/{crowd.maxEnergy} shared Energy</small>
        </strong>
        <span>
          {crowdCount} around the desk · Every move uses the same pool.
        </span>
      </div>
      <p>
        {state.turn === "human"
          ? `${human} is lining up a flick. Help now or save it for the edge.`
          : `${opponent} is acting next. Shift the desk conditions, not the outcome.`}
      </p>
      <div className="target-picker">
        <button
          className={target === "human" ? "selected" : ""}
          onClick={() => setTarget("human")}
        >
          Affect {human}
        </button>
        <button
          className={target === "melabot" ? "selected" : ""}
          onClick={() => setTarget("melabot")}
        >
          Affect {opponent}
        </button>
      </div>
      <div className="power-grid">
        {powers.map(([key, rule]) => {
          const cooldown = cooldowns.find(
            (row) =>
              row.matchId === match.id &&
              row.power === key &&
              identity &&
              row.identity.isEqual(identity),
          );
          const availability = powerAvailability({
            power: key,
            energy: crowd.energy,
            readyAtMicros: cooldown?.readyAtMicros,
            now,
            waiting: liveEffects.some(
              (row) => row.power === key && row.target === target,
            ),
            pending,
            connected: conn.isActive,
          });
          return (
            <article className="power-card" key={key}>
              <h3>
                {rule.label} <small>{rule.cost} Energy</small>
              </h3>
              <p>{rule.description}</p>
              <small>
                {key === "cheer"
                  ? "Immediate · up to +4 net Energy"
                  : `One effect per pen · lasts ${Number(rule.durationMicros / 1_000_000n)}s`}
              </small>
              <button
                disabled={availability.disabled}
                onClick={async () => {
                  if (busy.current) return;
                  busy.current = true;
                  setPending(true);
                  try {
                    await power({ matchId: match.id, power: key, target });
                    setNote(
                      key === "cheer"
                        ? "Your CHEER returned Energy to everyone's pool."
                        : `You played ${rule.label} on ${target === "human" ? human : opponent}'s pen. Follow its effect on the desk.`,
                    );
                  } catch {
                    setNote(
                      "The desk changed before your move landed. Check Energy and cooldown, then try again.",
                    );
                  } finally {
                    busy.current = false;
                    setPending(false);
                  }
                }}
              >
                {availability.label}
              </button>
            </article>
          );
        })}
      </div>
      {effects.filter((e) => e.matchId === match.id).length > 0 && (
        <p>
          Waiting effects:{" "}
          {effects
            .filter((e) => e.matchId === match.id)
            .map((e) => `${e.power} → ${e.target}`)
            .join(" · ")}
        </p>
      )}
    </section>
  );
  const crowdInvite = (
    <section
      className="pen-join pen-join-visible"
      id="pen-invite"
      aria-label="Invite the crowd"
    >
      <QRCodeSVG
        value={url(match.id, completed)}
        size={116}
        aria-label={
          completed
            ? "QR code to revisit this duel"
            : "QR code to join this match as a spectator"
        }
      />
      <div>
        <strong>{completed ? "KEEP THIS MATCH" : "INVITE YOUR CROWD"}</strong>
        <span>
          {completed
            ? "Scan to revisit this duel."
            : "Scan to watch. Tap to influence."}
        </span>
        <a href={url(match.id, completed)}>
          {completed ? "Open remembered duel" : "Open crowd link"}
        </a>
        <button
          className="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url(match.id, completed));
              setNote("Desk link copied. Invite your crowd.");
            } catch {
              setNote("Copy the match link above to invite a friend.");
            }
          }}
        >
          Copy invite
        </button>
      </div>
    </section>
  );
  return (
    <main className={`pen-shell pen-studio ${focusedDesk ? "pen-focus" : ""}`}>
      <header className="pen-top">
        <div>
          <h1>Pen Fight</h1>
          <p>The school-desk classic. First to two.</p>
        </div>
        <button className="secondary" onClick={onBack}>
          ← Games
        </button>
        <button
          className="secondary"
          aria-pressed={!muted}
          onClick={() => setMuted(toggleMuted())}
        >
          Sound {muted ? "off" : "on"}
        </button>
      </header>
      {spectating &&
        match.status === "active" &&
        !duel &&
        rooms.find((r) => r.matchId === match.id)?.hostPresent === false && (
          <p className="game-room-notice" role="status">
            The host has left this room. You can stay or choose another game.
          </p>
        )}
      <a className="game-invite-link" href="#pen-invite">
        Invite friends ↗
      </a>
      <AgentDuelPanel matchId={match.id} />
      {!conn.isActive && (
        <p role="status">
          Reconnecting to your desk. Your next move will wait.
        </p>
      )}
      {!owns && !completed && (
        <a className="pen-crowd-shortcut" href="#pen-crowd">
          {spectating
            ? `Shape the next flick · ${crowd?.energy ?? 0} shared Energy ↓`
            : "Join the crowd ↓"}
        </a>
      )}
      <div className="pen-play-layout">
        <div className="pen-stage-column">
          <section
            className="pen-score"
            aria-label={`Round ${state.round}. ${human} ${state.humanRounds}, ${opponent} ${state.botRounds}. First to two.`}
          >
            <span
              className={
                state.turn === "human" && !completed ? "seat-active" : ""
              }
            >
              <small>{owns ? "YOU" : "CHALLENGER"}</small>
              <strong>{state.humanRounds}</strong>
              <span className="seat-name">{human}</span>
              <i className="round-pips" aria-hidden="true">
                {[0, 1].map((n) => (
                  <i
                    key={n}
                    className={state.humanRounds > n ? "earned" : ""}
                  />
                ))}
              </i>
            </span>
            <b>
              <small>{completed ? "FINAL" : `ROUND ${state.round}`}</small>
              <em>VS</em>
              <small>FIRST TO 2</small>
            </b>
            <span
              className={
                state.turn !== "human" && !completed ? "seat-active" : ""
              }
            >
              <small>THE RIVAL</small>
              <strong>{state.botRounds}</strong>
              <span className="seat-name">{opponent}</span>
              <i className="round-pips" aria-hidden="true">
                {[0, 1].map((n) => (
                  <i key={n} className={state.botRounds > n ? "earned" : ""} />
                ))}
              </i>
            </span>
          </section>
          <section
            className={`pen-arena-wrap ${deskFx.round ? "round-won" : ""} ${deskFx.knockout ? "knockout" : ""}`}
          >
            <div className="pen-desk-toolbar">
              <span>
                THE DESK{" "}
                <small>
                  {completed ? "MATCH FINISHED" : `${crowdCount} WATCHING`}
                </small>
              </span>
              <label className="pen-camera-picker">
                <span>Camera</span>
                <select
                  aria-label="Camera angle"
                  value={deskView}
                  disabled={aiming}
                  onChange={(e) => setDeskView(readDeskView(e.target.value))}
                >
                  <option value="desk">3D desk</option>
                  <option value="overhead">Overhead</option>
                  <option value="behind">Behind your pen</option>
                  <option value="sideline">Sideline</option>
                  <option value="pen">Pen cam · follow shots</option>
                </select>
              </label>
              <button
                className="pen-expand"
                aria-pressed={focusedDesk}
                onClick={() => setFocusedDesk((value) => !value)}
                disabled={aiming || duel?.phase === "lobby"}
              >
                {focusedDesk ? "Exit focus" : "Focus desk"}
              </button>
            </div>
            <div className="pen-turn">
              <strong>
                {moving
                  ? `${displayMotion?.actor === "human" ? human.toUpperCase() : opponent.toUpperCase()}’S FLICK`
                  : completed
                    ? "DUEL REMEMBERED"
                    : duel?.phase === "lobby"
                      ? "WAITING FOR YOUR OPPONENT"
                      : `${actor.toUpperCase()}’S TURN`}
              </strong>
              <span>
                {moving
                  ? "Watch the contact. Let the pens settle."
                  : completed
                    ? state.lastOutcome
                    : duel
                      ? duel.phase === "lobby"
                        ? "Share the player invitation to start."
                        : duel.phase === "intent"
                          ? "Shot committed. The crowd has its moment."
                          : `${actor} is choosing a shot.`
                      : state.turn === "human"
                        ? owns
                          ? myPlan
                          : `${human} is aiming. Choose a crowd move below, or save your Energy.`
                        : botPlan}
              </span>
            </div>
            <div
              className={`pen-arena ${deskFx.impact ? "impact" : ""} ${deskFx.knockout ? "knockout" : ""} ${edgeDanger ? "danger" : ""}`}
              tabIndex={owns && !completed ? 0 : undefined}
              aria-label={
                owns
                  ? "Pen Fight desk. Pull back from your pen to flick. Escape cancels aiming. Button controls follow the desk."
                  : "Live Pen Fight desk"
              }
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  if (!aiming) setFocusedDesk(false);
                  setAiming(false);
                  setPullPoint(null);
                  dragStart.current = null;
                  shot.current = null;
                } else if (
                  owns &&
                  !completed &&
                  !moving &&
                  !pending &&
                  conn.isActive &&
                  state.turn === "human" &&
                  !aiming
                ) {
                  if (
                    [
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                      " ",
                      "Enter",
                    ].includes(event.key)
                  )
                    event.preventDefault();
                  if (event.key === "ArrowLeft") nudgeAim(-1);
                  if (event.key === "ArrowRight") nudgeAim(1);
                  if (event.key === "ArrowUp")
                    setForce((f) => Math.min(maxForceNow, f + 8));
                  if (event.key === "ArrowDown")
                    setForce((f) => Math.max(MIN_FORCE, f - 8));
                  if (
                    (event.key === " " || event.key === "Enter") &&
                    !event.repeat
                  )
                    void commitFlick();
                }
              }}
              onPointerDown={
                owns &&
                conn.isActive &&
                !pending &&
                !moving &&
                state.turn === "human" &&
                !completed
                  ? (event) => {
                      if (!event.isPrimary || event.button !== 0) return;
                      event.currentTarget.focus({ preventScroll: true });
                      const bounds =
                        event.currentTarget.getBoundingClientRect();
                      const { x, y } = deskInput.current?.(
                        event.clientX,
                        event.clientY,
                      ) ?? {
                        x:
                          ((event.clientX - bounds.left) / bounds.width) * 1000,
                        y:
                          ((event.clientY - bounds.top) / bounds.height) * 1000,
                      };
                      const grabbed = deskInput.current
                        ? canGrabPen(
                            { x, y },
                            { x: state.humanX, y: state.humanY },
                            rightHuman,
                          )
                        : Math.hypot(x - state.humanX, y - state.humanY) <= 110;
                      if (!grabbed) {
                        // A tap chooses direction; only a deliberate drag from
                        // your own pen can submit a flick.
                        if (
                          x >= 0 &&
                          y >= 0 &&
                          x <= 1000 &&
                          y <= 1000 &&
                          Math.hypot(x - state.humanX, y - state.humanY) >= 1
                        ) {
                          setAim({ x: Math.round(x), y: Math.round(y) });
                          setNote("");
                        }
                        return;
                      }
                      dragStart.current = {
                        x: event.clientX,
                        y: event.clientY,
                      };
                      dragRevision.current = revision;
                      shot.current = null;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setAiming(true);
                      pull(event);
                    }
                  : undefined
              }
              onPointerMove={aiming ? pull : undefined}
              onPointerUp={(event) => {
                if (!aiming) return;
                setAiming(false);
                setPullPoint(null);
                if (dragRevision.current !== revision) {
                  dragStart.current = null;
                  setNote("The desk moved. Line up your next flick.");
                  return;
                }
                if (
                  dragStart.current &&
                  isIntentionalDrag(dragStart.current, {
                    x: event.clientX,
                    y: event.clientY,
                  })
                ) {
                  pull(event);
                  setPullPoint(null);
                  if (shot.current) void commitFlick(shot.current);
                  else setNote("Aim back across the desk from this edge.");
                } else
                  setNote(
                    "Pull back and let go to flick. A tap won't spend your turn.",
                  );
                dragStart.current = null;
                shot.current = null;
              }}
              onPointerCancel={() => {
                setAiming(false);
                setPullPoint(null);
                dragStart.current = null;
                shot.current = null;
              }}
              onLostPointerCapture={() => {
                setAiming(false);
                setPullPoint(null);
                dragStart.current = null;
                shot.current = null;
              }}
            >
              <i className="notebook-line l1" />
              <i className="notebook-line l2" />
              <i className="notebook-line l3" />
              <div className="danger-zone">EDGE</div>
              {/* The crowd's work belongs on the desk, not only in a side panel:
              this is the moment a spectator's name is worth seeing, and the
              player is looking at the pens.

              Only the SPECTATORS see effects that are still pending. Showing
              the player an incoming DESK TILT would let them aim off to cancel
              it, which makes the crowd harmless — so the player learns what the
              crowd did from the event feed, after it has already landed. */}
              {liveEffects.length > 0 && spectating && (
                <div className="desk-crowd-effects">
                  {liveEffects.map((effect) => {
                    const copy = EFFECT_ON_DESK[effect.power] ?? {
                      label: effect.power.toUpperCase(),
                      effect: "in play",
                    };
                    return (
                      <span
                        key={effect.id.toString()}
                        className={`desk-effect ${effect.target === "human" ? "on-human" : "on-bot"}`}
                      >
                        <b>{effect.actorName}</b> {copy.label}
                        <i>
                          {copy.effect} ·{" "}
                          {effect.target === "human" ? human : opponent}
                        </i>
                      </span>
                    );
                  })}
                </div>
              )}
              <PenDesk
                inputRef={deskInput}
                human={{ x: state.humanX, y: state.humanY }}
                bot={{ x: state.botX, y: state.botY }}
                motion={displayMotion}
                aim={aim}
                pull={pullPoint}
                power={powerPct}
                interactive={
                  owns && !completed && !moving && state.turn === "human"
                }
                aiming={aiming}
                pen={myPen}
                humanName={human}
                botName={opponent}
                onMoving={setMoving}
                onImpact={showImpact}
                onFall={showFall}
                completed={completed}
                view={deskView}
                mirrored={rightHuman}
                replayKey={replayKey}
              />
              {owns && !completed && !moving && state.turn === "human" && (
                <div className="desk-gesture-hint">
                  {aiming
                    ? `Release to flick · ${powerPct}% force`
                    : "Tap to aim · pull your pen to flick"}
                </div>
              )}
            </div>
          </section>
          {completed && displayMotion && (
            <button
              className="pen-replay"
              disabled={moving}
              onClick={() => setReplayKey((value) => value + 1)}
            >
              {moving ? "Replaying…" : "↻ Replay the last flick"}
            </button>
          )}
        </div>
        <aside
          className="pen-control-column"
          aria-label={
            owns ? "Your shot and crowd invitation" : "Crowd invitation"
          }
        >
          {owns && !completed && (
            <section className="flick-controls">
              <div className="shot-control-heading">
                <span>{state.turn === "human" ? "YOUR MOVE" : "NEXT UP"}</span>
                <strong>
                  {state.turn === "human"
                    ? "Line up your flick."
                    : "Watch the desk."}
                </strong>
              </div>
              <fieldset
                className="pen-target-controls"
                disabled={
                  pending || moving || !conn.isActive || state.turn !== "human"
                }
              >
                <legend>Aim at their pen</legend>
                {(
                  [
                    [-150, "Cap"],
                    [0, "Middle"],
                    [150, "Tip"],
                  ] as const
                ).map(([offset, label]) => {
                  const point = penAimPoint(
                    { x: state.botX, y: state.botY },
                    rightHuman ? "human" : "melabot",
                    offset,
                  );
                  const x = Math.max(0, Math.min(1000, Math.round(point.x))),
                    y = Math.max(0, Math.min(1000, Math.round(point.y)));
                  return (
                    <button
                      key={label}
                      aria-pressed={aim.x === x && aim.y === y}
                      onClick={() => setAim({ x, y })}
                    >
                      {label}
                    </button>
                  );
                })}
                <small>Side hits can glance.</small>
              </fieldset>
              <details className="pen-shot-options">
                <summary>
                  Shot craft ·{" "}
                  {shotContact < 50
                    ? "Cut left"
                    : shotContact > 50
                      ? "Cut right"
                      : "Straight"}
                </summary>
                <fieldset
                  disabled={
                    pending ||
                    moving ||
                    !conn.isActive ||
                    state.turn !== "human"
                  }
                >
                  <legend>Contact bias</legend>
                  <div className="pen-cut-options">
                    {[
                      [20, "Cut left"],
                      [50, "Straight"],
                      [80, "Cut right"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        aria-pressed={shotContact === value}
                        onClick={() => setShotContact(Number(value))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p>
                    Cut shots send the struck pen to either side of contact.
                    Your own pen can carry past it.
                  </p>
                  <label htmlFor={`fine-aim-${match.id}`}>Fine aim</label>
                  <input
                    id={`fine-aim-${match.id}`}
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={Math.round(
                      (Math.atan2(aim.y - state.humanY, aim.x - state.humanX) *
                        180) /
                        Math.PI,
                    )}
                    onChange={(event) => {
                      const angle =
                        (Number(event.target.value) * Math.PI) / 180;
                      const next = boundedAim(
                        { x: state.humanX, y: state.humanY },
                        { x: Math.cos(angle), y: Math.sin(angle) },
                      );
                      if (next) setAim(next);
                    }}
                    aria-valuetext={`${Math.round((Math.atan2(aim.y - state.humanY, aim.x - state.humanX) * 180) / Math.PI)} degrees`}
                  />
                </fieldset>
              </details>
              <p className="eyebrow">
                {moving
                  ? "LET THE PENS SETTLE"
                  : state.turn !== "human"
                    ? duel?.phase === "lobby"
                      ? "WAITING FOR YOUR OPPONENT"
                      : `${opponent.toUpperCase()}’S TURN · WATCH THE DESK`
                    : aiming
                      ? "RELEASE TO FLICK"
                      : "AIM · SET YOUR POWER · FLICK"}
              </p>
              <div className="flick-strength-label">
                <label htmlFor={`flick-strength-${match.id}`}>
                  Flick strength
                </label>
                <output htmlFor={`flick-strength-${match.id}`}>
                  {powerPct}% ·{" "}
                  {powerPct < 35 ? "Soft" : powerPct < 75 ? "Firm" : "Hard"}
                </output>
              </div>
              <input
                id={`flick-strength-${match.id}`}
                className="flick-strength"
                type="range"
                min={MIN_FORCE}
                max={maxForceNow}
                step={1}
                value={cappedForce}
                onChange={(event) => setForce(Number(event.target.value))}
                disabled={
                  pending || moving || !conn.isActive || state.turn !== "human"
                }
                aria-valuetext={`${powerPct}% of ${isOpening ? "opening" : "full"} flick strength`}
                aria-describedby={`flick-strength-help-${match.id}`}
              />
              <p
                className="flick-strength-help"
                id={`flick-strength-help-${match.id}`}
              >
                {isOpening
                  ? "Opening exchange: strength is limited for both pens."
                  : "More strength pushes further—and can carry your own pen off."}
              </p>
              {/* Keyboard path: holding a pointer down is a motor-accessibility
              barrier, so aim and power are also reachable with arrows + space. */}
              <div className="keyboard-flick">
                <button
                  onClick={() => nudgeAim(-1)}
                  disabled={
                    pending ||
                    moving ||
                    !conn.isActive ||
                    state.turn !== "human"
                  }
                  aria-label="Aim left"
                  title="Aim left"
                >
                  ◀
                </button>
                <button
                  onClick={() => setForce((f) => Math.max(MIN_FORCE, f - 8))}
                  disabled={
                    pending ||
                    moving ||
                    !conn.isActive ||
                    state.turn !== "human"
                  }
                  aria-label="Less power"
                  title="Less power"
                >
                  −
                </button>
                <button
                  className="primary"
                  disabled={
                    pending ||
                    moving ||
                    !conn.isActive ||
                    state.turn !== "human"
                  }
                  onClick={() => void commitFlick()}
                >
                  {pending
                    ? "SENDING…"
                    : moving || state.turn !== "human"
                      ? "WAIT"
                      : "FLICK"}
                </button>
                <button
                  onClick={() => setForce((f) => Math.min(maxForceNow, f + 8))}
                  disabled={
                    pending ||
                    moving ||
                    !conn.isActive ||
                    state.turn !== "human"
                  }
                  aria-label="More power"
                  title="More power"
                >
                  +
                </button>
                <button
                  onClick={() => nudgeAim(1)}
                  disabled={
                    pending ||
                    moving ||
                    !conn.isActive ||
                    state.turn !== "human"
                  }
                  aria-label="Aim right"
                  title="Aim right"
                >
                  ▶
                </button>
              </div>
              <p className="desk-keyboard-help">
                On the desk: ← → aim · ↑ ↓ strength · Space flicks · Esc cancels
              </p>
            </section>
          )}
          {owns && !completed && (
            <details className="pen-picker">
              <summary>Your {penName} · Change pen</summary>
              <div className="pen-swatches">
                {PENS.map(([id, name, blurb]) => (
                  <button
                    key={id}
                    className={`pen-swatch ${id} ${myPen === id ? "chosen" : ""}`}
                    onClick={() => choosePen(id)}
                    aria-pressed={myPen === id}
                    title={`${name} — ${blurb}`}
                  >
                    <i aria-hidden="true" />
                    <span>{name}</span>
                  </button>
                ))}
              </div>
              <p className="pen-note">
                Every pen plays exactly the same. Pick the one that feels like
                yours.
              </p>
            </details>
          )}
          {spectatorPanel}
          {crowdInvite}
        </aside>
      </div>
      <p
        className="pen-result"
        role="status"
        hidden={state.lastOutcome === "AIM YOUR FIRST FLICK"}
      >
        {state.lastOutcome}
        {state.turnsInRound >= 6 && !completed
          ? " · Final exchanges—safer positioning decides the round at 8 turns."
          : ""}
      </p>
      {note && (
        <p className="pen-feedback" role="status">
          <span>{note}</span>
          <button aria-label="Dismiss message" onClick={() => setNote("")}>
            ×
          </button>
        </p>
      )}
      {!owns && me && !spectating && !completed && (
        <button
          className="primary wide"
          id="pen-crowd"
          disabled={pending || !conn.isActive}
          onClick={async () => {
            if (busy.current) return;
            busy.current = true;
            setPending(true);
            try {
              await join({ matchId: match.id });
              setNote(
                "You're in. Pick a pen to influence, then choose your move.",
              );
            } catch {
              setNote(
                "Couldn't join yet. Check your connection and try again.",
              );
            } finally {
              busy.current = false;
              setPending(false);
            }
          }}
        >
          Join {human}'s crowd
        </button>
      )}
      {owns && crowd && !completed && (
        <section className="pen-crowd pen-player-crowd">
          <p className="eyebrow">
            {crowdCount > 0 ? `${crowdCount} AROUND THE DESK` : "CROWD ENERGY"}{" "}
            · {crowd.energy}/{crowd.maxEnergy} ENERGY
          </p>
          <p>
            {crowdCount
              ? `${crowdCount} in your crowd.`
              : "Invite a friend with the QR above."}{" "}
            Crowd moves reveal after your flick.
          </p>
          {/* Deliberately no list of pending effects here. The player finds
              out what the crowd did once it has landed, never before. */}
        </section>
      )}
      {matchFeed.length > 0 && (
        <details
          className="pen-live-story"
          open={owns || completed || undefined}
        >
          <summary>AROUND THIS DESK · Latest moments</summary>
          <ol>
            {matchFeed.map((event) => (
              <li key={event.key}>{event.message}</li>
            ))}
          </ol>
        </details>
      )}
      {completed && (
        <section className="pen-memory" ref={memoryCard}>
          <p className="eyebrow">THIS DUEL STAYS IN MELA</p>
          <div
            className="pen-final-score"
            aria-label={`Final score ${state.humanRounds} to ${state.botRounds}`}
          >
            <span>
              {state.humanRounds}
              <small>{human}</small>
            </span>
            <i>—</i>
            <span>
              {state.botRounds}
              <small>{opponent}</small>
            </span>
          </div>
          <h2>
            {owns
              ? state.humanRounds > state.botRounds
                ? `You did it, ${human}.`
                : state.humanRounds === 1
                  ? "One round away. Another desk?"
                  : `${opponent} takes this chapter.`
              : spectating
                ? "Your crowd was part of this."
                : `${human} and ${opponent} made a memory.`}
          </h2>
          <p>{memory?.notableMoment ?? state.lastOutcome}</p>
          <p>
            {human} {state.humanRounds} · {opponent} {state.botRounds}
            {memory
              ? ` · ${memory.crowdParticipants} spectator${memory.crowdParticipants === 1 ? "" : "s"} · ${memory.crowdActions} crowd move${memory.crowdActions === 1 ? "" : "s"}`
              : ""}
          </p>
          {owns && record && (
            <p>{rivalry(record.wins, record.matchesPlayed)}</p>
          )}
          {personal && (
            <p className="pen-keepsake">
              Mela remembers you · Level {personal.melaLevel}
              {spectating
                ? ` · ${personal.crowdInfluence} Crowd Influence`
                : " · Every finished duel is part of your journey."}
            </p>
          )}
          {owns && state.humanRounds < state.botRounds && (
            <p>
              Try this next: near an edge, shorten your pull. Full force can
              carry your own pen off too.
            </p>
          )}
          {owns && (
            <button
              className="primary wide"
              disabled={pending || !conn.isActive}
              onClick={async () => {
                if (busy.current) return;
                busy.current = true;
                setPending(true);
                try {
                  if (duel) await rematchSeats({ mode: duel.mode });
                  else await rematch();
                  onRematch?.();
                  setNote("Fresh desk. Your next duel starts now.");
                } catch {
                  setNote("A new desk could not be set up yet.");
                } finally {
                  busy.current = false;
                  setPending(false);
                }
              }}
            >
              {pending
                ? "Opening…"
                : duel
                  ? "Play again · same mode"
                  : "Play again"}
            </button>
          )}
          <button className="secondary wide" onClick={() => void share()}>
            Share this duel
          </button>
          {memory && (
            <button
              className="secondary wide"
              disabled={savingCard}
              onClick={async () => {
                setSavingCard(true);
                try {
                  await saveDuelCard({
                    human,
                    opponent,
                    humanRounds: state.humanRounds,
                    botRounds: state.botRounds,
                    moment: memory.notableMoment,
                    crowdActions: memory.crowdActions,
                    matchId: match.id.toString(),
                  });
                  setNote(
                    "Your match card is ready. Share the image with your duel link.",
                  );
                } catch {
                  setNote(
                    "Could not save the image here. Share this duel still copies the result and link.",
                  );
                } finally {
                  setSavingCard(false);
                }
              }}
            >
              {savingCard ? "Creating your card…" : "Save match card ↓"}
            </button>
          )}
          {!owns && (
            <button className="primary wide" onClick={onBack}>
              Your turn? Find your own desk
            </button>
          )}
          {memory && (
            <EmailRecap key={match.id.toString()} matchId={match.id} />
          )}
        </section>
      )}
    </main>
  );
}
