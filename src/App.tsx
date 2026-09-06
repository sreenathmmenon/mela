import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "react-oidc-context";
import { reducers, tables } from "./module_bindings";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import "./mela.css";
import { PEN_MOTION_PREFIX } from "../spacetimedb/src/penFightMotion";
import { PenFight } from "./PenFight";
import { DotsBoxes } from "./DotsBoxes";
import { GilliDanda } from "./GilliDanda";
import { EmailRecap } from "./EmailRecap";
import { signOut } from "./identity";
import { checkDisplayName } from "../spacetimedb/src/displayNameRules";
import { isMuted, playSound, toggleMuted } from "./sound";

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

// Two intentions, not three risk categories — and no odds on screen. A player
// should never be shown a probability; they should be shown a decision.
// BALANCED is not removed, it is the default "just play the ball" delivery,
// so the only things we name are the two deviations from normal.
/** gameKind as stored in the database, mapped to how Mela names it on screen. */
const GAME_LABELS: Record<string, string> = {
  book_cricket: "Book Cricket",
  pen_fight: "Pen Fight",
  dots_boxes: "Dots & Boxes",
  gilli_danda: "Gilli Danda",
};

const PROFILE_LINK_NONCE_KEY = "mela-profile-link-nonce";
const AUTH_RETURN_TO_KEY = "mela-auth-return-to";
const freshProfileLinkNonce = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
const rememberAuthReturn = () =>
  sessionStorage.setItem(
    AUTH_RETURN_TO_KEY,
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );

const PLAY_CHOICES = [
  {
    style: "safe",
    title: "PLAY IT SAFE",
    risk: "Stay in. Take the singles.",
    copy: "",
  },
  {
    style: "aggressive",
    title: "GO FOR IT",
    risk: "Big runs — or you're out.",
    copy: "",
  },
] as const;

/** Crowd moves get the gold treatment in the ledger: they are the point. */
function isCrowdLine(message: string) {
  return (
    message.includes("crowd") ||
    /BOOST|CHAOS|SHIELD|CHEER|NUDGE|TILT|GUARD/.test(message)
  );
}

/** Renders "4,1,W,6" as a readable run of ball chips. */
function BallStrip({ label, timeline }: { label: string; timeline: string }) {
  const balls = timeline ? timeline.split(",") : [];
  return (
    <div className="ball-strip">
      <span className="ball-strip-label">{label}</span>
      <span className="ball-strip-balls">
        {balls.length === 0 && <em>yet to bat</em>}
        {balls.map((ball, index) => (
          <b
            key={index}
            className={
              ball === "W"
                ? "w"
                : ball === "6" || ball === "4"
                  ? "boundary"
                  : ball === "0"
                    ? "dot"
                    : ""
            }
          >
            {ball}
          </b>
        ))}
      </span>
    </div>
  );
}

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

/**
 * The stage lives under the app's own base path, not the domain root — on a
 * static host the app may be served from a subdirectory.
 */
function screenUrlFor(matchId: bigint) {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/$/, "")}/#/screen?match=${matchId.toString()}`;
}

function App() {
  const auth = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [joining, setJoining] = useState(false);
  const joinBusy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingStyle, setPendingStyle] = useState<string | null>(null);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [showHome, setShowHome] = useState(false);
  // Reduced-motion visitors start muted, so they need a visible way back in.
  const [muted, setMuted] = useState(isMuted);
  // A scanned QR pins the match it names: the visitor lands in THAT game,
  // not whichever one they happened to play or watch last time.
  const [pinnedMatchId, setPinnedMatchId] = useState<bigint | null>(null);
  const [pendingPower, setPendingPower] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<"human" | "melabot">(
    "human",
  );
  const [now, setNow] = useState(Date.now());
  // Suspense is presentation-only: the server has already committed the ball.
  // Holding the reveal for a beat is what turns a number change into a moment.
  const [suspense, setSuspense] = useState(false);
  const [revealed, setRevealed] = useState<{
    outcome: string;
    swing: string;
    ball: number;
  } | null>(null);
  const [matchEvents, setMatchEvents] = useState<
    Array<{ id: bigint; matchId: bigint; message: string }>
  >([]);
  const requestedJoinMatchId = useMemo(matchIdFromJoinLink, []);
  const [requestedMemoryId, setRequestedMemoryId] = useState(() => {
    const value = new URLSearchParams(window.location.search).get("memory");
    return value && /^[0-9]{1,20}$/.test(value) ? BigInt(value) : null;
  });
  /**
   * The operator dashboard is gated on a key in the URL, compared against a
   * value baked in at build time. This keeps the numbers off a guessable URL;
   * it is NOT real authentication, and cannot be — the app has no server of
   * its own to check a password against, and every table it reads is public.
   * Treat it as a lock on a door, not a safe.
   */
  const showOperatorMetrics = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const expected = import.meta.env.VITE_OPERATOR_KEY as string | undefined;
    if (expected) return params.get("operator") === expected;
    // With no key configured the dashboard stays reachable for local work.
    return params.get("operator") === "metrics";
  }, []);
  const onMatchEvent = useCallback(
    (event: { id: bigint; matchId: bigint; message: string }) =>
      !event.message.startsWith(PEN_MOTION_PREFIX) &&
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
  const [profiles, profilesReady] = useTable(tables.playerProfile);
  const [identityLinks, identityLinksReady] = useTable(tables.myIdentityLink);
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
  const [cooldowns] = useTable(tables.ownSpectatorCooldown);
  const [effects] = useTable(tables.visibleCrowdEffects);
  const [aiCharacters] = useTable(tables.aiCharacter);
  const [melaMetrics] = useTable(tables.melaMetrics);
  useTable(tables.liveEvent, { onInsert: onMatchEvent });

  const canonicalIdentity =
    identityLinks[0]?.canonicalIdentity ?? conn.identity;
  const me = useMemo(() => {
    const identity = canonicalIdentity;
    return identity
      ? profiles.find((profile) => profile.identity.isEqual(identity))
      : undefined;
  }, [profiles, canonicalIdentity]);
  const myMelaProfile = useMemo(() => {
    const identity = canonicalIdentity;
    return identity
      ? melaProfiles.find((profile) => profile.identity.isEqual(identity))
      : undefined;
  }, [melaProfiles, canonicalIdentity]);
  const myBookCricketRecord = useMemo(() => {
    const identity = canonicalIdentity;
    return identity
      ? records.find((record) => record.identity.isEqual(identity))
      : undefined;
  }, [records, canonicalIdentity]);
  // Mela runs many concurrent matches. A person only ever lands in a match they
  // own or joined — never in a stranger's, and never in a finished one they had
  // no part in. `showHome` lets them step back out at any time.
  const myIdentity = canonicalIdentity;
  const isMine = useCallback(
    (match: (typeof matches)[number]) =>
      Boolean(
        myIdentity &&
        (match.playerIdentity.isEqual(myIdentity) ||
          spectators.some(
            (row) =>
              row.matchId === match.id && row.identity.isEqual(myIdentity),
          )),
      ),
    [myIdentity, spectators],
  );
  const newest = (rows: typeof matches) =>
    rows.reduce<(typeof matches)[number] | undefined>(
      (latest, match) => (!latest || match.id > latest.id ? match : latest),
      undefined,
    );
  const myMatches = matches.filter(isMine);
  const myLastMatch = newest(myMatches);
  // A scanned QR pins that match, so a returning visitor lands in the crowd they
  // just scanned rather than whichever match they happened to touch last.
  const pinnedMatch =
    pinnedMatchId !== null
      ? myMatches.find((match) => match.id === pinnedMatchId)
      : undefined;
  const myLiveMatch = newest(
    myMatches.filter((match) => match.status === "active"),
  );
  const activeMatch = myLiveMatch;
  const displayedMatch = showHome
    ? undefined
    : (pinnedMatch ?? myLiveMatch ?? myLastMatch);
  const liveMatchesToWatch = matches.filter(
    (match) => match.status === "active" && !isMine(match),
  );
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
  const identity = canonicalIdentity;
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
  // Rivalry is the reason to come back tomorrow: every match currently starts
  // from nothing, so there is never a score to settle. The record already
  // exists — it was simply never said out loud.
  const rivalry = (() => {
    const played = myBookCricketRecord?.matchesPlayed ?? 0;
    if (played < 1) return null;
    const wins = myBookCricketRecord?.wins ?? 0;
    const losses = Math.max(0, played - wins);
    if (wins > losses) return `You lead MelaBot ${wins}\u2013${losses}.`;
    if (losses > wins) return `MelaBot leads you ${losses}\u2013${wins}.`;
    return `You and MelaBot are level at ${wins}\u2013${losses}.`;
  })();

  // Regret is the reason to play one more: a loss only stings usefully if you
  // know which of your own choices cost you.
  const regretLine = (() => {
    if (!matchState || !memory || memory.winner === "human") return null;
    const balls = (matchState.humanTimeline || "").split(",").filter(Boolean);
    const lastWicket = balls.lastIndexOf("W");
    if (lastWicket >= 0 && lastWicket >= balls.length - 2)
      return "You went for it with the innings on the line.";
    if (matchState.humanWickets >= 2)
      return "Both wickets gone \u2014 the innings ended before the overs did.";
    const margin = Math.abs(memory.botScore - memory.humanScore);
    if (margin <= 2) return `${margin} short. One more ball either way.`;
    return null;
  })();

  const currentMetrics = melaMetrics[0];

  /**
   * Everything the operator dashboard shows beyond the world counters is
   * derived here from tables the client already subscribes to — matchMemory
   * carries gameKind, winner and crowd figures per completed match, so no new
   * query or schema column is needed to break the totals down by game.
   */
  const operatorBreakdown = useMemo(() => {
    const perGame = new Map<
      string,
      {
        played: number;
        human: number;
        bot: number;
        draw: number;
        crowd: number;
      }
    >();

    for (const memory of memories) {
      const row = perGame.get(memory.gameKind) ?? {
        played: 0,
        human: 0,
        bot: 0,
        draw: 0,
        crowd: 0,
      };
      row.played += 1;
      if (memory.winner === "human") row.human += 1;
      else if (memory.winner === "draw") row.draw += 1;
      else row.bot += 1;
      row.crowd += Number(memory.crowdParticipants);
      perGame.set(memory.gameKind, row);
    }

    // Distinct spectator identities, counted across every match. A person who
    // watches three matches is one crowd member, not three.
    const spectatorIdentities = new Set(
      spectators.map((row) => row.identity.toHexString()),
    );

    return {
      games: [...perGame.entries()].map(([kind, row]) => ({ kind, ...row })),
      totalCompleted: memories.length,
      humanWins: [...perGame.values()].reduce((n, r) => n + r.human, 0),
      botWins: [...perGame.values()].reduce((n, r) => n + r.bot, 0),
      draws: [...perGame.values()].reduce((n, r) => n + r.draw, 0),
      distinctSpectators: spectatorIdentities.size,
      spectatorJoins: spectators.length,
    };
  }, [memories, spectators]);
  // The crowd's own game: is this the moment, or should they hold energy? The
  // advice is derived from live match state, never a fixed string.
  const crowdAdvice = !matchState
    ? ""
    : matchState.turn === "complete"
      ? "Energy resets with the next match."
      : crowd && crowd.energy < 15
        ? "Energy is low — CHEER builds it back for a bigger move later."
        : matchState.innings === 1
          ? humanBallsLeft <= 2
            ? "Last balls of the innings: every run now sets the target."
            : "Early runs are cheap. Many crowds save energy for the chase."
          : botRunsNeeded <= botBallsLeft * 2 && botWicketsLeft > 1
            ? "MelaBot is comfortable — a wicket is worth more than runs now."
            : botBallsLeft <= 2
              ? "This is the moment. After this there are no balls left to change."
              : "The chase is live. Spending now shapes whether it stays close.";
  // Effects already committed against the batter's next ball. Showing these to
  // the player before they choose is what lets the crowd change their decision.
  const pendingOnMe = matchEffects.filter(
    (effect) =>
      effect.target === (matchState?.turn === "bot" ? "melabot" : "human"),
  );

  // Stage every new ball: hold a short suspense beat, then reveal. Big moments
  // (SIX, OUT, a crowd swing, the last ball) get a longer beat and more weight.
  const ballsBowled = matchState
    ? matchState.humanBalls + matchState.botBalls
    : 0;
  const liveOutcome = matchState?.lastOutcome ?? "";
  const liveSwing = matchState?.lastCrowdSwing ?? "";
  useEffect(() => {
    if (!matchState || liveOutcome === "START" || ballsBowled === 0) return;
    if (revealed?.ball === ballsBowled) return;
    setSuspense(true);
    const dramatic =
      liveOutcome.includes("OUT") ||
      liveOutcome.startsWith("6") ||
      Boolean(liveSwing);
    const timer = window.setTimeout(
      () => {
        setSuspense(false);
        setRevealed({
          outcome: liveOutcome,
          swing: liveSwing,
          ball: ballsBowled,
        });
        // Sound lands with the reveal, not the commit: the moment is the
        // number appearing, not the tap that asked for it.
        if (liveOutcome.includes("OUT")) playSound("out");
        else if (liveOutcome.startsWith("6")) playSound("six");
      },
      dramatic ? 950 : 550,
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ballsBowled, liveOutcome, liveSwing]);
  const bigMoment = Boolean(
    revealed &&
    (revealed.outcome.includes("OUT") ||
      revealed.outcome.startsWith("6") ||
      revealed.swing),
  );

  const createMatch = useReducer(reducers.createBookCricket);
  const createPenFight = useReducer(reducers.createPenFight);
  const createDotsBoxes = useReducer(reducers.createDotsBoxes);
  const createGilliDanda = useReducer(reducers.createGilliDanda);
  const createAgentDuel = useReducer(reducers.createAgentDuel);
  const playBall = useReducer(reducers.playBall);
  const joinSpectator = useReducer(reducers.joinMatchAsSpectator);
  const useCrowdPower = useReducer(reducers.useCrowdPower);
  const beginProfileLink = useReducer(reducers.beginProfileLink);
  const completeProfileLink = useReducer(reducers.completeProfileLink);
  const profileLinkHandled = useRef(false);

  // The source browser holds the one-time nonce across the OIDC redirect. A
  // verified magic-link identity can redeem it exactly once; an email string
  // alone can never attach itself to someone else's saved Mela life.
  useEffect(() => {
    const nonce = sessionStorage.getItem(PROFILE_LINK_NONCE_KEY);
    if (
      !auth.isAuthenticated ||
      !nonce ||
      !connected ||
      !profilesReady ||
      !identityLinksReady ||
      me ||
      profileLinkHandled.current
    )
      return;
    profileLinkHandled.current = true;
    completeProfileLink({ nonce })
      .then(() => {
        sessionStorage.removeItem(PROFILE_LINK_NONCE_KEY);
        setFeedback(
          "Email sign-in is ready. Your Mela memories came with you.",
        );
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Mela could not connect this email sign-in.",
        ),
      );
  }, [
    auth.isAuthenticated,
    completeProfileLink,
    connected,
    identityLinksReady,
    me,
    profilesReady,
  ]);

  const startEmailSignIn = async () => {
    try {
      setError(null);
      rememberAuthReturn();
      if (me && !auth.isAuthenticated) {
        const nonce = freshProfileLinkNonce();
        await beginProfileLink({ nonce });
        sessionStorage.setItem(PROFILE_LINK_NONCE_KEY, nonce);
      }
      await auth.signinRedirect();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Email sign-in could not start. Please try again.",
      );
    }
  };

  const leaveMela = () => {
    if (auth.isAuthenticated) {
      void auth.signoutRedirect();
      return;
    }
    signOut();
  };

  // A scanned QR must land the visitor in THAT match — even if they have
  // played or watched here before. Fresh identities join during onboarding;
  // everyone else joins here, exactly once per page load.
  const qrJoinHandled = useRef(false);
  useEffect(() => {
    if (
      !requestedJoinMatchId ||
      !connected ||
      !me ||
      matches.length === 0 ||
      qrJoinHandled.current
    )
      return;
    qrJoinHandled.current = true;
    // Consume the link so a refresh or the back button cannot re-trigger it.
    const url = new URL(window.location.href);
    url.searchParams.delete("join");
    window.history.replaceState({}, "", url.href);
    const target = matches.find((match) => match.id === requestedJoinMatchId);
    if (!target || target.status !== "active") {
      setError(
        "That match has ended. Start a fresh match or scan a live crowd QR.",
      );
      return;
    }
    const alreadyIn = Boolean(
      myIdentity &&
      (target.playerIdentity.isEqual(myIdentity) ||
        spectators.some(
          (row) =>
            row.matchId === target.id && row.identity.isEqual(myIdentity),
        )),
    );
    setPinnedMatchId(target.id);
    setShowHome(false);
    if (alreadyIn) {
      setFeedback(
        `You're back in the ${target.gameKind === "pen_fight" ? "Pen Fight" : "Book Cricket"} crowd.`,
      );
      return;
    }
    joinSpectator({ matchId: target.id })
      .then(() =>
        setFeedback(
          "You joined the crowd. Spend Crowd Energy to change the next move.",
        ),
      )
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not join that crowd.",
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedJoinMatchId, connected, me, matches]);

  const submitOnboarding = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !connected || !profilesReady || joinBusy.current)
      return;
    if (me) {
      setError(null);
      return;
    }
    // The reducer is the real gate — it runs even if this is bypassed. This
    // check exists only to tell the player WHY a name was refused: SpacetimeDB
    // does not surface reducer error text, so a server rejection reaches the
    // client as "The instance encountered a fatal error".
    const nameCheck = checkDisplayName(name);
    if (!nameCheck.ok) {
      setError(nameCheck.message ?? "That name cannot be used.");
      return;
    }
    try {
      joinBusy.current = true;
      setJoining(true);
      setError(null);
      // Use THIS live connection's credentials, never another tab's most
      // recently saved localStorage token.
      const token = conn.getConnection()?.token;
      if (!token)
        throw new Error("Still connecting. Please try again in a moment.");
      const result = await fetch("/api/welcome", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, consent: true }),
        signal: AbortSignal.timeout(25000),
      });
      const body = await result.json();
      if (!result.ok || (body.accepted !== true && body.existing !== true))
        throw new Error(
          body.error || "Could not send your welcome email. Please retry.",
        );
      setEmail("");
      // The QR effect handles joining once the profile subscription arrives.
      setError(null);
      setFeedback(
        body.existing
          ? "Your Mela profile is already ready on this device."
          : requestedJoinMatchId
            ? "You joined the crowd. Watch the next ball, then decide whether this is the moment to intervene."
            : body.emailStatus === "sent"
              ? "Welcome to Mela. Your welcome email is on its way—check your inbox or spam. Pick your first game."
              : "Welcome to Mela. Your profile is ready; your welcome email is delayed, but you can play now.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to join Mela.",
      );
    } finally {
      joinBusy.current = false;
      setJoining(false);
    }
  };

  const startMatch = async () => {
    setCreatingMatch(true);
    setShowHome(false);
    setPinnedMatchId(null);
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
    setShowHome(false);
    setPinnedMatchId(null);
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
  const startExperimentalGame = async (kind: "dots" | "gilli") => {
    setCreatingMatch(true);
    setShowHome(false);
    setPinnedMatchId(null);
    try {
      await (kind === "dots" ? createDotsBoxes() : createGilliDanda());
      setFeedback(
        kind === "dots"
          ? "The notebook is open. Claim the grid."
          : "The chalk is down. Lift and strike.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to start this game.",
      );
    } finally {
      setCreatingMatch(false);
    }
  };

  // "balanced" is not offered as a card — it is the default ball one delivery —
  // so the parameter is widened past what PLAY_CHOICES exposes.
  const playDelivery = async (style: "safe" | "balanced" | "aggressive") => {
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

  // Sharing a completed duel is read-only: strangers do not join an ended
  // match or receive participation credit just for opening its memory.
  const sharedBookMemory =
    !showHome &&
    memories.find(
      (row) =>
        row.matchId === requestedMemoryId && row.gameKind === "book_cricket",
    );
  if (sharedBookMemory)
    return (
      <main className="mela-shell">
        <header className="hero">
          <p className="eyebrow">MELA · BOOK CRICKET</p>
          <h1>A match worth remembering.</h1>
        </header>
        <section className="memory-hero" aria-label="Completed match memory">
          <p className="eyebrow">NOW PART OF MELA</p>
          <h2>
            {sharedBookMemory.winner === "draw"
              ? "A shared finish."
              : `${sharedBookMemory.winner === "human" ? sharedBookMemory.humanName : sharedBookMemory.aiName} takes the story.`}
          </h2>
          <p className="memory-story">{sharedBookMemory.notableMoment}</p>
          <div className="memory-facts">
            <span>
              {sharedBookMemory.humanName} {sharedBookMemory.humanScore}/
              {sharedBookMemory.humanWickets}
            </span>
            <span>
              {sharedBookMemory.aiName} {sharedBookMemory.botScore}/
              {sharedBookMemory.botWickets}
            </span>
            <span>{sharedBookMemory.crowdActions} crowd moves</span>
          </div>
          <button
            className="primary wide"
            onClick={() => {
              setRequestedMemoryId(null);
              setShowHome(true);
              const url = new URL(location.href);
              url.searchParams.delete("memory");
              window.history.replaceState(null, "", url.href);
            }}
          >
            Your turn? Find your own game
          </button>
          <EmailRecap
            key={sharedBookMemory.matchId.toString()}
            matchId={sharedBookMemory.matchId}
          />
        </section>
      </main>
    );
  const sharedPenMemory =
    !showHome &&
    matches.find(
      (row) =>
        row.id === requestedMemoryId &&
        row.status === "complete" &&
        row.gameKind === "pen_fight",
    );
  const penMatch = sharedPenMemory || displayedMatch;
  if ((me || sharedPenMemory) && penMatch?.gameKind === "pen_fight")
    return (
      <PenFight
        key={penMatch.id.toString()}
        matchId={penMatch.id}
        onRematch={() => {
          setRequestedMemoryId(null);
          setPinnedMatchId(null);
          setShowHome(false);
          const link = new URL(window.location.href);
          link.searchParams.delete("memory");
          window.history.replaceState({}, "", link.href);
        }}
        onBack={() => {
          setShowHome(true);
          setFeedback(null);
        }}
      />
    );
  if (me && displayedMatch?.gameKind === "dots_boxes")
    return (
      <DotsBoxes matchId={displayedMatch.id} onBack={() => setShowHome(true)} />
    );
  if (me && displayedMatch?.gameKind === "gilli_danda")
    return (
      <GilliDanda
        matchId={displayedMatch.id}
        onBack={() => setShowHome(true)}
      />
    );

  return (
    <main className="mela-shell">
      <header className="hero">
        <p className="eyebrow">MELA · LIVE PLAYGROUND</p>
        <div className="hero-row">
          <div>
            <h1>Mela</h1>
            <p className="subtitle">
              Play a quick game against MelaBot — and whoever is watching can
              change what happens next.
            </p>
          </div>
          <span className={`status ${connected ? "online" : "offline"}`}>
            {connected ? "● Live" : "● Reconnecting"}
          </span>
        </div>
      </header>

      {!me && (!connected || !profilesReady) && (
        <section className="join-card" role="status">
          <h2>Opening Mela…</h2>
          <p>Getting your place ready.</p>
        </section>
      )}
      {!me && connected && profilesReady && (
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
          <p>
            {requestedJoinMatchId
              ? "You’ll join as part of the crowd — you get to change what happens on the next move."
              : "Your name on the desk. A welcome in your inbox. No password."}
          </p>
          <label htmlFor="name">Your display name</label>
          <div className="join-row">
            <input
              id="name"
              placeholder="e.g. Maya"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!connected || joining}
              autoComplete="off"
              maxLength={24}
            />
          </div>
          <label htmlFor="join-email">Your email</label>
          <div className="join-row">
            <input
              id="join-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={!connected || joining}
              aria-describedby="join-email-note"
            />
            <button
              disabled={
                !connected || joining || name.trim().length < 2 || !email.trim()
              }
            >
              {joining
                ? "Sending your welcome…"
                : connected
                  ? "Join Mela"
                  : "Connecting…"}
            </button>
          </div>
          <p id="join-email-note" className="recap-privacy">
            By joining, you request one welcome email, delivered by Resend. Your
            email stays private. No newsletter or password. You can securely
            connect this profile to email for another browser after joining.
          </p>
          <button
            type="button"
            className="secondary email-sign-in"
            onClick={() => void startEmailSignIn()}
            disabled={joining}
          >
            Already in Mela? Sign in with email
          </button>
          <p className="recap-privacy">
            Use the magic link you previously connected from your original Mela
            browser. Email alone never takes over a profile.
          </p>
          {auth.isAuthenticated &&
            !me &&
            !sessionStorage.getItem(PROFILE_LINK_NONCE_KEY) && (
              <p className="feedback error" role="alert">
                This email is not connected to a Mela profile yet. Open Mela in
                the browser where your profile already works, then choose “Use
                on another device”.
              </p>
            )}
          {error && (
            <p className="feedback error" role="alert">
              {error}
            </p>
          )}
          {!requestedJoinMatchId && (
            <ul className="how-mela-works">
              <li>
                <b>Play</b> a two-minute game against MelaBot.
              </li>
              <li>
                <b>Share a QR</b> so friends can watch live.
              </li>
              <li>
                <b>They change your game</b> — the crowd spends shared energy on
                your next move.
              </li>
            </ul>
          )}
        </form>
      )}
      {error && me && (
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
            {!auth.isAuthenticated && (
              <button
                className="link-back"
                onClick={() => void startEmailSignIn()}
                title="Secure this profile so you can use it in another browser"
              >
                Use on another device
              </button>
            )}
            {auth.isAuthenticated && (
              <span className="identity-auth">Email connected</span>
            )}
            {displayedMatch && (
              <button
                className="link-back"
                onClick={() => {
                  // Leaving a match must also drop the QR pin, or the pinned
                  // match immediately pulls the visitor straight back in.
                  setPinnedMatchId(null);
                  setShowHome(true);
                  setFeedback(null);
                  setError(null);
                }}
              >
                ← Mela home
              </button>
            )}
          </span>
          <span>
            {presence.filter((row) => row.state === "online").length} people in
            Mela
            <button
              className="link-back"
              onClick={() => {
                const next = toggleMuted();
                setMuted(next);
                if (!next) playSound("flick");
              }}
              aria-pressed={!muted}
              title={muted ? "Turn sound on" : "Turn sound off"}
            >
              {muted ? "Sound off" : "Sound on"}
            </button>
            <button
              className="link-back"
              onClick={leaveMela}
              title="Leave Mela on this device"
            >
              Sign out
            </button>
          </span>
        </section>
      )}
      {me && !displayedMatch && (
        <section className="game-picker">
          <p className="eyebrow">PICK A GAME · PLAY MELABOT</p>
          {rivalry && <p className="rivalry-line">{rivalry}</p>}
          <div className="game-cards">
            <button
              className="game-card cricket"
              onClick={startMatch}
              disabled={creatingMatch}
            >
              <span className="game-art" aria-hidden="true">
                <b className="bat" />
                <b className="ball" />
              </span>
              <strong>Book Cricket</strong>
              <em>6 balls. 2 wickets. Beat MelaBot’s score.</em>
              <span className="game-go">
                {creatingMatch ? "Starting…" : "Play →"}
              </span>
            </button>
            <button
              className="game-card pen"
              onClick={startPenFight}
              disabled={creatingMatch}
            >
              <span className="game-art" aria-hidden="true">
                <b className="pen-a" />
                <b className="pen-b" />
              </span>
              <strong>Pen Fight</strong>
              <em>Flick your pen. Knock MelaBot’s off the desk.</em>
              <span className="game-go">
                {creatingMatch ? "Setting up…" : "Play →"}
              </span>
            </button>
            <button
              className="game-card dots"
              onClick={() => startExperimentalGame("dots")}
              disabled={creatingMatch}
            >
              <span className="game-art dots-art" aria-hidden="true">
                · · ·<br />· · ·<br />· · ·
              </span>
              <strong>Dots &amp; Boxes</strong>
              <em>Draw lines. Claim squares. Keep a capture chain alive.</em>
              <span className="game-go">
                {creatingMatch ? "Opening…" : "Play →"}
              </span>
            </button>
            <button
              className="game-card gilli"
              onClick={() => startExperimentalGame("gilli")}
              disabled={creatingMatch}
            >
              <span className="game-art gilli-art" aria-hidden="true">
                ╱ ─
              </span>
              <strong>Gilli Danda</strong>
              <em>Lift the gilli. Find the sweet spot. Send it flying.</em>
              <span className="game-go">
                {creatingMatch ? "Marking chalk…" : "Play →"}
              </span>
            </button>
          </div>
          <div className="duel-launch">
            <button
              className="secondary"
              disabled={creatingMatch}
              onClick={async () => {
                setCreatingMatch(true);
                try {
                  await createAgentDuel({ mode: "melabot" });
                  setShowHome(false);
                  setPinnedMatchId(null);
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Unable to open duel.",
                  );
                } finally {
                  setCreatingMatch(false);
                }
              }}
            >
              Host Agent vs MelaBot →
            </button>
            <button
              className="secondary"
              disabled={creatingMatch}
              onClick={async () => {
                setCreatingMatch(true);
                try {
                  await createAgentDuel({ mode: "duel" });
                  setShowHome(false);
                  setPinnedMatchId(null);
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Unable to open duel.",
                  );
                } finally {
                  setCreatingMatch(false);
                }
              }}
            >
              Host two agents →
            </button>
          </div>
          {liveMatchesToWatch.length > 0 && (
            <div className="watch-live">
              <p className="eyebrow">OR JOIN A LIVE CROWD</p>
              <ul>
                {liveMatchesToWatch.slice(0, 4).map((match) => {
                  const host =
                    participants.find(
                      (row) =>
                        row.matchId === match.id && row.actorKind === "human",
                    )?.displayName ?? "Someone";
                  const watching = spectators.filter(
                    (row) => row.matchId === match.id,
                  ).length;
                  return (
                    <li key={match.id.toString()}>
                      <span>
                        <strong>{host}</strong> ·{" "}
                        {GAME_LABELS[match.gameKind] ?? match.gameKind}
                        <em>
                          {watching === 0
                            ? "no one watching yet"
                            : plural(watching, "person", "people") +
                              " watching"}
                        </em>
                      </span>
                      <button
                        onClick={async () => {
                          try {
                            await joinSpectator({ matchId: match.id });
                            setShowHome(false);
                            setError(null);
                            setFeedback(
                              `You’re in ${host}’s crowd. Spend Crowd Energy to change the next move.`,
                            );
                          } catch (reason) {
                            setError(
                              reason instanceof Error
                                ? reason.message
                                : "Could not join that crowd.",
                            );
                          }
                        }}
                      >
                        Watch
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      {displayedMatch && matchState && (
        <>
          <section className="scoreboard" aria-label="Live Book Cricket score">
            <div className="match-kicker">
              <span>BOOK CRICKET · FIRST TO THE TARGET</span>
              <span>{matchSpectators.length} in the crowd</span>
            </div>
            <div className={`score-row ${suspense ? "holding" : ""}`}>
              <div>
                <span className="team">{humanName}</span>
                {/* During the suspense beat the committed score is withheld, so
                    the reveal below is the moment the number lands. Keying the
                    remount on the score replays the pop when it changes. */}
                <strong
                  key={
                    suspense
                      ? "hold"
                      : `${matchState.humanScore}-${matchState.humanWickets}`
                  }
                >
                  {suspense
                    ? "…"
                    : `${matchState.humanScore}/${matchState.humanWickets}`}
                </strong>
                <small>
                  Ball {matchState.humanBalls}/6 · {humanWicketsLeft} wickets
                  left
                </small>
              </div>
              <div className="versus">VS</div>
              <div>
                <span className="team">MelaBot</span>
                <strong
                  key={
                    suspense
                      ? "hold"
                      : `${matchState.botScore}-${matchState.botWickets}`
                  }
                >
                  {suspense
                    ? "…"
                    : `${matchState.botScore}/${matchState.botWickets}`}
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
            {/* The book IS the explanation. A page number in the corner, the
                way every real book has one — nobody is told to take the last
                digit, they see 236 then they see 6 runs and work it out. */}
            {matchState.lastPage > 0 && (
              <div className={`mela-book ${suspense ? "flipping" : ""}`}>
                <div className="book-page left">
                  <span className="page-no">
                    {suspense ? "" : matchState.lastPage}
                  </span>
                </div>
                <div className="book-spine" />
                <div className="book-page right">
                  <span className="page-no">
                    {suspense ? "" : matchState.lastPage + 1}
                  </span>
                </div>
                {suspense && <i className="book-leaf" aria-hidden="true" />}
              </div>
            )}
            {suspense && (
              <div className="delivery-result waiting" role="status">
                <span>Opening the book…</span>
              </div>
            )}
            {!suspense && revealed && (
              <div
                className={`delivery-result reveal ${
                  revealed.outcome.includes("OUT") ? "out" : ""
                } ${bigMoment ? "big" : ""} ${revealed.swing ? "crowd" : ""}`}
                key={revealed.ball}
                role="status"
              >
                <strong>
                  {revealed.outcome.startsWith("6")
                    ? "SIX!"
                    : revealed.outcome.startsWith("4")
                      ? "FOUR!"
                      : revealed.outcome}
                </strong>
                <span>
                  {revealed.swing
                    ? revealed.swing
                    : revealed.outcome.includes("OUT")
                      ? wicketsLeftForCurrentInnings
                        ? `${plural(wicketsLeftForCurrentInnings, "wicket")} left.`
                        : "That was the last wicket."
                      : "Everyone watching saw that."}
                </span>
              </div>
            )}
            {(matchState.humanTimeline || matchState.botTimeline) && (
              <div className="timeline-strip" aria-label="Ball by ball">
                <BallStrip
                  label={humanName}
                  timeline={matchState.humanTimeline}
                />
                {matchState.botTimeline && (
                  <BallStrip
                    label="MelaBot"
                    timeline={matchState.botTimeline}
                  />
                )}
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
                    Open the book. The page number is your runs.
                  </p>
                )}
                {pendingOnMe.length > 0 && (
                  <p className="crowd-incoming" role="status">
                    <b>The crowd is with you.</b>{" "}
                    {pendingOnMe
                      .map(
                        (effect) =>
                          `${effect.actorName} played ${effect.power.toUpperCase()}`,
                      )
                      .join(" · ")}{" "}
                    — it lands on this ball.
                  </p>
                )}
                {/* Ball one asks nothing. You tap, the book opens, something
                    happens — and now you understand the game without having
                    read a rule. The choice only appears once it means something. */}
                {matchState.humanBalls === 0 ? (
                  <div className="first-ball">
                    <button
                      className="primary wide open-book"
                      disabled={pendingStyle !== null}
                      onClick={() => playDelivery("balanced")}
                    >
                      {pendingStyle ? "Opening…" : "OPEN THE BOOK"}
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="eyebrow">YOUR NEXT BALL</p>
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
                          {pendingStyle === choice.style && (
                            <small>Opening the book…</small>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {matchState.turn === "bot" && (
              <div
                className={`ai-turn ${botBallsLeft <= 2 || botWicketsLeft <= 1 ? "pressure" : ""}`}
                role="status"
              >
                <span className="ai-pulse" aria-hidden="true" />
                <div>
                  <strong>
                    {melaBot?.displayName ?? "MelaBot"} needs{" "}
                    {plural(botRunsNeeded, "run")} from{" "}
                    {plural(botBallsLeft, "ball")}
                  </strong>
                  {/* The chase is the tense half of the match — say out loud what
                      MelaBot has to do, so watching it is worth the time. */}
                  <p>
                    {botBallsLeft > 0 && botRunsNeeded > botBallsLeft * 6
                      ? "It cannot get there. You have this."
                      : botRunsNeeded <= botBallsLeft
                        ? "It only needs to tick the strike over — you need wickets."
                        : `That's ${(botRunsNeeded / Math.max(1, botBallsLeft)).toFixed(1)} a ball. ${
                            botWicketsLeft <= 1
                              ? "One wicket left — one mistake ends it."
                              : "Every wicket now matters."
                          }`}
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
                    href={screenUrlFor(activeMatch.id)}
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
              {regretLine && <p className="regret-line">{regretLine}</p>}
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
              <EmailRecap
                key={displayedMatch.id.toString()}
                matchId={displayedMatch.id}
              />
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
                {spectatorSituation} {crowdAdvice}
              </p>
              {matchEffects.length > 0 && (
                <div className="active-effects">
                  {matchEffects.map((effect) => (
                    <span key={effect.id.toString()}>
                      <b>{effect.actorName}</b>&nbsp;·{" "}
                      {effect.power.toUpperCase()} →{" "}
                      {effect.target === "human" ? humanName : "MelaBot"}
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
                  <li
                    key={event.id.toString()}
                    className={isCrowdLine(event.message) ? "crowd" : ""}
                  >
                    {event.message}
                  </li>
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
        </>
      )}
      {showOperatorMetrics && currentMetrics && (
        <section
          className="operator-board"
          aria-label="Mela operator dashboard"
        >
          <div className="feed-header">
            <h2>Mela pulse</h2>
            <span>Live from the database</span>
          </div>

          <div className="op-grid">
            <div className="op-stat">
              <strong>{currentMetrics.matchesCompleted.toString()}</strong>
              <span>Matches completed</span>
            </div>
            <div className="op-stat">
              <strong>
                {currentMetrics.uniquePlayerIdentities.toString()}
              </strong>
              <span>People who played</span>
            </div>
            <div className="op-stat">
              <strong>
                {currentMetrics.uniqueSpectatorIdentities.toString()}
              </strong>
              <span>People who watched</span>
            </div>
            <div className="op-stat">
              <strong>{currentMetrics.crowdActions.toString()}</strong>
              <span>Crowd actions spent</span>
            </div>
          </div>

          <div className="op-split">
            <article className="op-panel">
              <h3>By game</h3>
              {operatorBreakdown.games.length === 0 ? (
                <p className="op-empty">No completed matches yet.</p>
              ) : (
                <table className="op-table">
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Played</th>
                      <th>Human</th>
                      <th>MelaBot</th>
                      <th>Crowd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operatorBreakdown.games.map((game) => (
                      <tr key={game.kind}>
                        <td>{GAME_LABELS[game.kind] ?? game.kind}</td>
                        <td>{game.played}</td>
                        <td className="op-teal">{game.human}</td>
                        <td className="op-rust">{game.bot}</td>
                        <td className="op-honey">{game.crowd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </article>

            <article className="op-panel">
              <h3>Who is winning</h3>
              {operatorBreakdown.totalCompleted === 0 ? (
                <p className="op-empty">No completed matches yet.</p>
              ) : (
                <>
                  {/* Teal is the player and rust is MelaBot everywhere
                      else in Mela, so the bar needs no legend. */}
                  <div
                    className="op-bar"
                    role="img"
                    aria-label={`Players have won ${operatorBreakdown.humanWins} of ${operatorBreakdown.totalCompleted} completed matches, MelaBot ${operatorBreakdown.botWins}.`}
                  >
                    <span
                      className="op-bar-human"
                      style={{
                        width: `${(operatorBreakdown.humanWins / operatorBreakdown.totalCompleted) * 100}%`,
                      }}
                    />
                    <span
                      className="op-bar-bot"
                      style={{
                        width: `${(operatorBreakdown.botWins / operatorBreakdown.totalCompleted) * 100}%`,
                      }}
                    />
                  </div>
                  <dl className="op-legend">
                    <div>
                      <dt className="op-teal">Players</dt>
                      <dd>{operatorBreakdown.humanWins}</dd>
                    </div>
                    <div>
                      <dt className="op-rust">MelaBot</dt>
                      <dd>{operatorBreakdown.botWins}</dd>
                    </div>
                    {operatorBreakdown.draws > 0 && (
                      <div>
                        <dt>Draws</dt>
                        <dd>{operatorBreakdown.draws}</dd>
                      </div>
                    )}
                  </dl>
                </>
              )}
            </article>

            <article className="op-panel">
              <h3>The crowd</h3>
              <dl className="op-rows">
                <div>
                  <dt>Crowd joins</dt>
                  <dd>{operatorBreakdown.spectatorJoins}</dd>
                </div>
                <div>
                  <dt>Distinct people</dt>
                  <dd>{operatorBreakdown.distinctSpectators}</dd>
                </div>
                <div>
                  <dt>Spent energy</dt>
                  <dd>{currentMetrics.spectatorsWhoActed.toString()}</dd>
                </div>
                <div>
                  <dt>Became players</dt>
                  <dd>
                    {currentMetrics.spectatorToPlayerConversions.toString()}
                  </dd>
                </div>
              </dl>
              <p className="op-note">
                A crowd join is one scan of a match QR. Distinct people counts
                each identity once however many matches they watch.
              </p>
            </article>
          </div>

          <p className="op-foot">
            Aggregates only — no identities, no sessions, nothing personal.
          </p>
        </section>
      )}
    </main>
  );
}

export default App;
