import { ScheduleAt, SenderError, schema, table, t } from "spacetimedb/server";
import {
  DUEL_RULES,
  validateAgentAction as checkAgentAction,
  wakeIsCurrent,
} from "./agentDuelRules";
function validateAgentAction(...args: Parameters<typeof checkAgentAction>) {
  try {
    checkAgentAction(...args);
  } catch (error) {
    throw new SenderError(
      error instanceof Error ? error.message : "Invalid agent action.",
    );
  }
}
import { PEN_MOTION_PREFIX, type PenMotion } from "./penFightMotion";
import {
  BOOK_CRICKET_RULES,
  CROWD_POWERS,
  type BookCricketStyle,
  type CrowdPower,
  applyCrowdDeliveryEffects,
  isChaseMathematicallyLost,
  crowdPowerResult,
  isInningsComplete,
  isCrowdPower,
  resolveBookCricketOutcome,
  resolveChaseWinner,
} from "./bookCricketRules";
import {
  DeterministicAIProvider,
  shouldExecuteScheduledAIWake,
} from "./aiProvider";
import { DeterministicPenFightAIProvider } from "./penFightAiProvider";
import {
  crowdInfluenceForPower,
  describeCrowdSwing,
  nextBookCricketRecord,
  notableCrowdMoment,
  playerProgressAfterMatch,
  spectatorProgressAfterMatch,
} from "./melaMemory";
import {
  type MelaMetricDelta,
  abandonedMatchDelta,
  completedMatchDelta,
  crowdActionDelta,
  playerMatchStartDelta,
  spectatorJoinDelta,
} from "./melaMetrics";
import { checkDisplayName } from "./displayNameRules";
import {
  emailOnboardingPlan,
  realEmail,
  migrateLegacyContacts,
} from "./emailRules";
import {
  PEN_FIGHT_POWERS,
  PEN_FIGHT_RULES,
  type PenFightPower,
  type PenSide,
  isPenFightPower,
  penFightCrowdEnergyResult,
  penFightRoundWinner,
  resolvePenFlick as resolvePenFightPhysics,
  validatePenFlick,
} from "./penFightRules";
import { decideDotsMove, resolveDotsMove } from "./dotsBoxesRules";
import { resolveGilliStrike } from "./gilliDandaRules";

const WORLD_ID = 1n;

const crowdSchedule = table(
  { public: false },
  {
    id: t.u64().primaryKey().autoInc(),
    scheduledAt: t.scheduleAt(),
    kind: t.string(),
    matchId: t.u64(),
    effectId: t.u64(),
  },
);

const spacetimedb = schema({
  emailContact: table(
    { public: false },
    {
      identity: t.identity().primaryKey(),
      email: t.string(),
      source: t.string(),
      verified: t.bool(),
      createdAt: t.timestamp(),
    },
  ),
  emailMigration: table({ public: false }, { id: t.u32().primaryKey() }),
  /**
   * Maps a verified SpacetimeAuth identity to an existing Mela identity.
   * The historical identity remains the canonical owner of matches, records,
   * memories and crowd work; the authenticated identity is an additional
   * credential, never a guessed email-based merge.
   */
  identityLink: table(
    { public: false },
    {
      identity: t.identity().primaryKey(),
      canonicalIdentity: t.identity(),
      linkedAt: t.timestamp(),
    },
  ),
  /** A short-lived, private proof held across the OIDC redirect. */
  profileLinkChallenge: table(
    { public: false },
    {
      nonce: t.string().primaryKey(),
      sourceIdentity: t.identity(),
      expiresAtMicros: t.u64(),
    },
  ),
  world: table(
    { public: true },
    {
      id: t.u64().primaryKey(),
      name: t.string(),
      status: t.string(),
      createdAt: t.timestamp(),
    },
  ),
  aiCharacter: table(
    { public: true },
    {
      id: t.u64().primaryKey(),
      characterKey: t.string(),
      displayName: t.string(),
      persona: t.string(),
    },
  ),
  playerProfile: table(
    { public: true },
    {
      identity: t.identity().primaryKey(),
      displayName: t.string(),
      createdAt: t.timestamp(),
      lastSeenAt: t.timestamp(),
      melaLevel: t.u32(),
      crowdInfluence: t.u32(),
    },
  ),
  melaProfile: table(
    { public: true },
    {
      identity: t.identity().primaryKey(),
      melaLevel: t.u32(),
      progressPoints: t.u32(),
      matchesPlayed: t.u32(),
      matchesWon: t.u32(),
      matchesWatched: t.u32(),
      crowdActions: t.u32(),
      crowdInfluence: t.u32(),
      updatedAt: t.timestamp(),
    },
  ),
  worldPresence: table(
    { public: true },
    {
      identity: t.identity().primaryKey(),
      worldId: t.u64(),
      state: t.string(),
      joinedAt: t.timestamp(),
      lastSeenAt: t.timestamp(),
    },
  ),
  worldActivity: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      worldId: t.u64(),
      kind: t.string(),
      message: t.string(),
      occurredAt: t.timestamp(),
    },
  ),
  connectionSession: table(
    { public: false },
    {
      connectionId: t.connectionId().primaryKey(),
      identity: t.identity(),
      connectedAt: t.timestamp(),
    },
  ),
  /** Safe aggregate counters for operators; no identity or session data. */
  melaMetrics: table(
    { public: true },
    {
      id: t.u64().primaryKey(),
      matchesStarted: t.u64(),
      matchesCompleted: t.u64(),
      uniquePlayerIdentities: t.u64(),
      uniqueSpectatorIdentities: t.u64(),
      totalParticipants: t.u64(),
      crowdActions: t.u64(),
      completedPlayerMatches: t.u64(),
      replayedMatches: t.u64(),
      spectatorToPlayerConversions: t.u64(),
      abandonedMatches: t.u64(),
      spectatorsWhoActed: t.u64(),
      updatedAt: t.timestamp(),
    },
  ),
  /** Private identity flags prevent reconnects from changing aggregate counts. */
  metricsIdentity: table(
    { public: false },
    {
      identity: t.identity().primaryKey(),
      hasPlayed: t.u32(),
      hasSpectated: t.u32(),
      completedPlayerMatches: t.u32(),
      hasActed: t.u32(),
    },
  ),
  match: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      worldId: t.u64(),
      gameKind: t.string(),
      playerIdentity: t.identity(),
      status: t.string(),
      winner: t.string(),
      createdAt: t.timestamp(),
      endedAt: t.option(t.timestamp()),
    },
  ),
  matchParticipant: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      matchId: t.u64(),
      actorKind: t.string(),
      role: t.string(),
      identity: t.option(t.identity()),
      displayName: t.string(),
    },
  ),
  bookCricketState: table(
    { public: true },
    {
      matchId: t.u64().primaryKey(),
      innings: t.u32(),
      turn: t.string(),
      humanScore: t.u32(),
      botScore: t.u32(),
      humanBalls: t.u32(),
      botBalls: t.u32(),
      humanWickets: t.u32(),
      botWickets: t.u32(),
      target: t.u32(),
      lastOutcome: t.string(),
      /** Compact per-innings ball log, e.g. "4,1,W,6" — read left to right. */
      humanTimeline: t.string(),
      botTimeline: t.string(),
      /** Names the crowd's effect on the most recent ball, or "" when none. */
      lastCrowdSwing: t.string(),
      /** The page the book fell open at for the most recent ball. */
      lastPage: t.u32(),
      seed: t.u64(),
    },
  ),
  penFightState: table(
    { public: false },
    {
      matchId: t.u64().primaryKey(),
      round: t.u32(),
      humanRounds: t.u32(),
      botRounds: t.u32(),
      turn: t.string(),
      humanX: t.u32(),
      humanY: t.u32(),
      botX: t.u32(),
      botY: t.u32(),
      turnsInRound: t.u32(),
      lastOutcome: t.string(),
      seed: t.u64(),
    },
  ),
  /** Public, compact board projection. Edge and box ownership are server-owned. */
  dotsBoxesState: table(
    { public: true },
    {
      matchId: t.u64().primaryKey(),
      edges: t.string(),
      boxes: t.string(),
      humanBoxes: t.u32(),
      botBoxes: t.u32(),
      turn: t.string(),
      revision: t.u32(),
      lastOutcome: t.string(),
      seed: t.u64(),
    },
  ),
  /** Gilli flight is committed as an outcome, never a browser physics result. */
  gilliDandaState: table(
    { public: true },
    {
      matchId: t.u64().primaryKey(),
      round: t.u32(),
      humanScore: t.u32(),
      botScore: t.u32(),
      turn: t.string(),
      lastDistance: t.u32(),
      lastSound: t.string(),
      lastOutcome: t.string(),
      seed: t.u64(),
    },
  ),
  matchHistory: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      matchId: t.u64(),
      winner: t.string(),
      humanScore: t.u32(),
      botScore: t.u32(),
      occurredAt: t.timestamp(),
    },
  ),
  matchMemory: table(
    { public: true },
    {
      matchId: t.u64().primaryKey(),
      sequence: t.u64(),
      gameKind: t.string(),
      humanName: t.string(),
      aiName: t.string(),
      winner: t.string(),
      humanScore: t.u32(),
      humanWickets: t.u32(),
      botScore: t.u32(),
      botWickets: t.u32(),
      crowdParticipants: t.u32(),
      crowdActions: t.u32(),
      crowdEnergySpent: t.u32(),
      notableMoment: t.string(),
      completedAt: t.timestamp(),
    },
  ),
  bookCricketRecord: table(
    { public: true },
    {
      identity: t.identity().primaryKey(),
      displayName: t.string(),
      matchesPlayed: t.u32(),
      wins: t.u32(),
      runsScored: t.u32(),
      highestScore: t.u32(),
      updatedAt: t.timestamp(),
    },
  ),
  penFightRecord: table(
    { public: true },
    {
      identity: t.identity().primaryKey(),
      displayName: t.string(),
      matchesPlayed: t.u32(),
      wins: t.u32(),
      roundsWon: t.u32(),
      knockouts: t.u32(),
      updatedAt: t.timestamp(),
    },
  ),
  penFightMetrics: table(
    { public: true },
    {
      id: t.u64().primaryKey(),
      matchesStarted: t.u64(),
      matchesCompleted: t.u64(),
      uniquePlayers: t.u64(),
      uniqueSpectators: t.u64(),
      participants: t.u64(),
      crowdActions: t.u64(),
      roundsCompleted: t.u64(),
      knockouts: t.u64(),
      updatedAt: t.timestamp(),
    },
  ),
  penFightMetricsIdentity: table(
    { public: false },
    {
      identity: t.identity().primaryKey(),
      hasPlayed: t.u32(),
      hasSpectated: t.u32(),
    },
  ),
  liveEvent: table(
    { public: true, event: true },
    {
      id: t.u64().primaryKey().autoInc(),
      matchId: t.u64(),
      message: t.string(),
      occurredAt: t.timestamp(),
    },
  ),
  matchCrowd: table(
    { public: true },
    {
      matchId: t.u64().primaryKey(),
      energy: t.u32(),
      maxEnergy: t.u32(),
    },
  ),
  matchCrowdActivity: table(
    { public: false },
    {
      matchId: t.u64().primaryKey(),
      actions: t.u32(),
      energySpent: t.u32(),
      lastActor: t.string(),
      lastPower: t.string(),
    },
  ),
  matchSpectator: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      matchId: t.u64(),
      identity: t.identity(),
      displayName: t.string(),
      joinedAt: t.timestamp(),
    },
  ),
  spectatorCooldown: table(
    { public: false },
    {
      id: t.u64().primaryKey().autoInc(),
      matchId: t.u64(),
      identity: t.identity(),
      power: t.string(),
      readyAtMicros: t.u64(),
    },
  ),
  crowdEffect: table(
    { public: false },
    {
      id: t.u64().primaryKey().autoInc(),
      matchId: t.u64(),
      power: t.string(),
      target: t.string(),
      actorName: t.string(),
      expiresAtMicros: t.u64(),
    },
  ),
  agentDuel: table(
    { public: true },
    {
      matchId: t.u64().primaryKey(),
      mode: t.string(),
      phase: t.string(),
      revision: t.u64(),
      leftIdentity: t.option(t.identity()),
      rightIdentity: t.option(t.identity()),
      leftName: t.string(),
      rightName: t.string(),
      leftIntent: t.string(),
      rightIntent: t.string(),
      deadlineMicros: t.u64(),
      notice: t.string(),
    },
  ),
  agentProposal: table(
    { public: false },
    {
      matchId: t.u64().primaryKey(),
      revision: t.u64(),
      side: t.string(),
      aimX: t.u32(),
      aimY: t.u32(),
      force: t.u32(),
      contact: t.u32(),
    },
  ),
  duelCrowdCredit: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      matchId: t.u64(),
      name: t.string(),
      power: t.string(),
    },
  ),
  crowdSchedule,
});
export default spacetimedb;

/**
 * Reveals only the caller's own canonical Mela identity. The frontend needs
 * this projection to render the exact same profile and matches after an
 * authenticated return, while the link table itself stays private.
 */
export const myIdentityLink = spacetimedb.view(
  { public: true },
  t.array(
    t.row("OwnIdentityLink", {
      identity: t.identity().primaryKey(),
      canonicalIdentity: t.identity(),
    }),
  ),
  (ctx: any) => {
    const row = ctx.db.identityLink.identity.find(ctx.sender);
    return row
      ? [{ identity: row.identity, canonicalIdentity: row.canonicalIdentity }]
      : [];
  },
);

export const ownSpectatorCooldown = spacetimedb.view(
  { public: true },
  t.array(
    t.row("OwnCooldownProjection", {
      id: t.u64().primaryKey(),
      matchId: t.u64(),
      identity: t.identity(),
      power: t.string(),
      readyAtMicros: t.u64(),
    }),
  ),
  (ctx: any) =>
    Array.from(ctx.db.spectatorCooldown.iter() as Iterable<any>).filter((row) =>
      row.identity.isEqual(canonicalIdentity(ctx)),
    ),
);

export const penDeskState = spacetimedb.anonymousView(
  { public: true },
  t.array(
    t.row("PenDeskProjection", {
      matchId: t.u64().primaryKey(),
      round: t.u32(),
      humanRounds: t.u32(),
      botRounds: t.u32(),
      turn: t.string(),
      humanX: t.u32(),
      humanY: t.u32(),
      botX: t.u32(),
      botY: t.u32(),
      turnsInRound: t.u32(),
      lastOutcome: t.string(),
    }),
  ),
  (ctx: any) =>
    Array.from(ctx.db.penFightState.iter()).map((row: any) => {
      const { seed, ...visible } = row;
      return visible;
    }),
);
export const visibleCrowdEffects = spacetimedb.view(
  { public: true },
  t.array(
    t.row("VisibleCrowdEffect", {
      id: t.u64().primaryKey(),
      matchId: t.u64(),
      power: t.string(),
      target: t.string(),
      actorName: t.string(),
      expiresAtMicros: t.u64(),
    }),
  ),
  (ctx: any) =>
    Array.from(ctx.db.crowdEffect.iter() as Iterable<any>).filter(
      (effect: any) => {
        const actor = canonicalIdentity(ctx);
        const match = ctx.db.match.id.find(effect.matchId);
        if (match?.gameKind !== "pen_fight") return true;
        const duel = ctx.db.agentDuel.matchId.find(effect.matchId);
        if (
          duel?.leftIdentity?.isEqual(actor) ||
          duel?.rightIdentity?.isEqual(actor)
        )
          return false;
        return Array.from(ctx.db.matchSpectator.iter()).some(
          (s: any) => s.matchId === effect.matchId && s.identity.isEqual(actor),
        );
      },
    ),
);

const nextId = (rows: Iterable<{ id: bigint }>) => {
  let id = 1n;
  for (const row of rows) if (row.id >= id) id = row.id + 1n;
  return id;
};
const emit = (ctx: any, matchId: bigint, message: string) =>
  ctx.db.liveEvent.insert({
    id: nextId(ctx.db.liveEvent.iter()),
    matchId,
    message,
    occurredAt: ctx.timestamp,
  });
const ensureWorld = (ctx: any) => {
  if (!ctx.db.world.id.find(WORLD_ID))
    ctx.db.world.insert({
      id: WORLD_ID,
      name: "Mela Commons",
      status: "open",
      createdAt: ctx.timestamp,
    });
};
const ensureMelaBot = (ctx: any) => {
  if (!ctx.db.aiCharacter.id.find(1n))
    ctx.db.aiCharacter.insert({
      id: 1n,
      characterKey: "melabot",
      displayName: "MelaBot",
      persona: "Cool under pressure. Reckless when behind.",
    });
};
const ensureMelaProfile = (ctx: any, identity: any) => {
  const existing = ctx.db.melaProfile.identity.find(identity);
  if (existing) return existing;
  const profile = {
    identity,
    melaLevel: 1,
    progressPoints: 0,
    matchesPlayed: 0,
    matchesWon: 0,
    matchesWatched: 0,
    crowdActions: 0,
    crowdInfluence: 0,
    updatedAt: ctx.timestamp,
  };
  ctx.db.melaProfile.insert(profile);
  return profile;
};
const identityKey = (identity: any) => identity.toHexString();
const canonicalIdentity = (ctx: any, identity = ctx.sender) =>
  ctx.db.identityLink.identity.find(identity)?.canonicalIdentity ?? identity;
const MELA_AUTH_ISSUER = "https://auth.spacetimedb.com/oidc";
const MELA_AUTH_CLIENT_ID = "client_034JneP1uzy8V3MhC39IXp";
const requireMelaAuth = (ctx: any) => {
  const jwt = ctx.senderAuth?.jwt;
  if (
    !jwt ||
    jwt.issuer !== MELA_AUTH_ISSUER ||
    !jwt.audience?.some((aud: string) => aud === MELA_AUTH_CLIENT_ID)
  )
    throw new SenderError("Sign in through Mela's email link to continue.");
};
const cleanExpiredProfileLinkChallenges = (ctx: any) => {
  const now = nowMicros(ctx);
  for (const row of ctx.db.profileLinkChallenge.iter())
    if (row.expiresAtMicros <= now)
      ctx.db.profileLinkChallenge.nonce.delete(row.nonce);
};
const historicalMetricSnapshot = (ctx: any) => {
  const matches = Array.from(ctx.db.match.iter()) as any[];
  const playerIds = new Set(
    matches.map((match) => identityKey(match.playerIdentity)),
  );
  const spectatorRows = Array.from(ctx.db.matchSpectator.iter()) as any[];
  const spectatorIds = new Set(
    spectatorRows.map((row) => identityKey(row.identity)),
  );
  const histories = Array.from(ctx.db.matchHistory.iter()) as any[];
  const crowdActions = (
    Array.from(ctx.db.matchCrowdActivity.iter()) as any[]
  ).reduce((sum, activity) => sum + activity.actions, 0);
  const firstSpectatorAt = new Map<string, bigint>();
  for (const spectator of spectatorRows) {
    const key = identityKey(spectator.identity);
    const at = spectator.joinedAt.microsSinceUnixEpoch;
    if (at < (firstSpectatorAt.get(key) ?? at)) firstSpectatorAt.set(key, at);
  }
  const orderedMatches = matches
    .slice()
    .sort((a, b) =>
      a.createdAt.microsSinceUnixEpoch < b.createdAt.microsSinceUnixEpoch
        ? -1
        : 1,
    );
  const completedBefore = new Set<string>();
  let replayedMatches = 0;
  let spectatorToPlayerConversions = 0;
  const countedConversion = new Set<string>();
  for (const match of orderedMatches) {
    const key = identityKey(match.playerIdentity);
    if (completedBefore.has(key)) replayedMatches += 1;
    const spectatorAt = firstSpectatorAt.get(key);
    if (
      spectatorAt !== undefined &&
      spectatorAt < match.createdAt.microsSinceUnixEpoch &&
      !countedConversion.has(key)
    ) {
      spectatorToPlayerConversions += 1;
      countedConversion.add(key);
    }
    if (match.endedAt) completedBefore.add(key);
  }
  return {
    matchesStarted: matches.length,
    abandonedMatches: matches.filter((m: any) => m.status === "abandoned")
      .length,
    matchesCompleted: histories.length,
    uniquePlayerIdentities: playerIds.size,
    uniqueSpectatorIdentities: spectatorIds.size,
    totalParticipants: matches.length + spectatorRows.length,
    crowdActions,
    completedPlayerMatches: histories.length,
    replayedMatches,
    spectatorToPlayerConversions,
  };
};
const ensureMetrics = (ctx: any) => {
  const existing = ctx.db.melaMetrics.id.find(1n);
  if (existing) return existing;
  const snapshot = historicalMetricSnapshot(ctx);
  const metrics = {
    id: 1n,
    matchesStarted: BigInt(snapshot.matchesStarted),
    matchesCompleted: BigInt(snapshot.matchesCompleted),
    uniquePlayerIdentities: BigInt(snapshot.uniquePlayerIdentities),
    uniqueSpectatorIdentities: BigInt(snapshot.uniqueSpectatorIdentities),
    totalParticipants: BigInt(snapshot.totalParticipants),
    crowdActions: BigInt(snapshot.crowdActions),
    completedPlayerMatches: BigInt(snapshot.completedPlayerMatches),
    replayedMatches: BigInt(snapshot.replayedMatches),
    spectatorToPlayerConversions: BigInt(snapshot.spectatorToPlayerConversions),
    abandonedMatches: BigInt(snapshot.abandonedMatches),
    spectatorsWhoActed: 0n,
    updatedAt: ctx.timestamp,
  };
  ctx.db.melaMetrics.insert(metrics);
  return metrics;
};
const metricsIdentityFor = (ctx: any, identity: any) => {
  const existing = ctx.db.metricsIdentity.identity.find(identity);
  if (existing) return existing;
  let hasPlayed = 0;
  let hasSpectated = 0;
  let completedPlayerMatches = 0;
  for (const match of ctx.db.match.iter())
    if (match.playerIdentity.isEqual(identity)) {
      hasPlayed = 1;
      if (match.status === "complete") completedPlayerMatches += 1;
    }
  for (const spectator of ctx.db.matchSpectator.iter())
    if (spectator.identity.isEqual(identity)) hasSpectated = 1;
  const row = {
    identity,
    hasPlayed,
    hasSpectated,
    completedPlayerMatches,
    hasActed: 0,
  };
  ctx.db.metricsIdentity.insert(row);
  return row;
};
const applyMetricDelta = (ctx: any, delta: MelaMetricDelta) => {
  const metrics = ensureMetrics(ctx);
  ctx.db.melaMetrics.id.update({
    ...metrics,
    matchesStarted: metrics.matchesStarted + BigInt(delta.matchesStarted),
    matchesCompleted: metrics.matchesCompleted + BigInt(delta.matchesCompleted),
    uniquePlayerIdentities:
      metrics.uniquePlayerIdentities + BigInt(delta.uniquePlayerIdentities),
    uniqueSpectatorIdentities:
      metrics.uniqueSpectatorIdentities +
      BigInt(delta.uniqueSpectatorIdentities),
    totalParticipants:
      metrics.totalParticipants + BigInt(delta.totalParticipants),
    crowdActions: metrics.crowdActions + BigInt(delta.crowdActions),
    completedPlayerMatches:
      metrics.completedPlayerMatches + BigInt(delta.completedPlayerMatches),
    replayedMatches: metrics.replayedMatches + BigInt(delta.replayedMatches),
    spectatorToPlayerConversions:
      metrics.spectatorToPlayerConversions +
      BigInt(delta.spectatorToPlayerConversions),
    abandonedMatches: metrics.abandonedMatches + BigInt(delta.abandonedMatches),
    spectatorsWhoActed:
      metrics.spectatorsWhoActed + BigInt(delta.spectatorsWhoActed),
    updatedAt: ctx.timestamp,
  });
};
const ensurePenMetrics = (ctx: any) => {
  const existing = ctx.db.penFightMetrics.id.find(1n);
  if (existing) return existing;
  const matches = Array.from(ctx.db.match.iter()).filter(
    (match: any) => match.gameKind === "pen_fight",
  ) as any[];
  const spectators = Array.from(ctx.db.matchSpectator.iter()).filter(
    (row: any) => matches.some((match) => match.id === row.matchId),
  ) as any[];
  const uniquePlayers = new Set(
    matches.map((match) => identityKey(match.playerIdentity)),
  ).size;
  const uniqueSpectators = new Set(
    spectators.map((row) => identityKey(row.identity)),
  ).size;
  const metrics = {
    id: 1n,
    matchesStarted: BigInt(matches.length),
    matchesCompleted: BigInt(
      matches.filter((match) => match.status === "complete").length,
    ),
    uniquePlayers: BigInt(uniquePlayers),
    uniqueSpectators: BigInt(uniqueSpectators),
    participants: BigInt(matches.length + spectators.length),
    crowdActions: 0n,
    roundsCompleted: 0n,
    knockouts: 0n,
    updatedAt: ctx.timestamp,
  };
  ctx.db.penFightMetrics.insert(metrics);
  return metrics;
};
const penMetricIdentity = (ctx: any, identity: any) => {
  const old = ctx.db.penFightMetricsIdentity.identity.find(identity);
  if (old) return old;
  const hasPlayed = Array.from(ctx.db.match.iter()).some(
    (match: any) =>
      match.gameKind === "pen_fight" && match.playerIdentity.isEqual(identity),
  )
    ? 1
    : 0;
  const hasSpectated = Array.from(ctx.db.matchSpectator.iter()).some(
    (row: any) =>
      row.identity.isEqual(identity) &&
      ctx.db.match.id.find(row.matchId)?.gameKind === "pen_fight",
  )
    ? 1
    : 0;
  const row = { identity, hasPlayed, hasSpectated };
  ctx.db.penFightMetricsIdentity.insert(row);
  return row;
};
const updatePenMetrics = (ctx: any, fields: Record<string, number>) => {
  const metrics = ensurePenMetrics(ctx);
  const next: any = { ...metrics, updatedAt: ctx.timestamp };
  for (const [key, value] of Object.entries(fields))
    next[key] = metrics[key] + BigInt(value);
  ctx.db.penFightMetrics.id.update(next);
};
const player = (ctx: any) => {
  const identity = canonicalIdentity(ctx);
  const row = ctx.db.playerProfile.identity.find(identity);
  if (!row) throw new SenderError("Choose a display name first.");
  ensureMelaProfile(ctx, identity);
  return row;
};
const nextMatchId = (ctx: any) => nextId(ctx.db.match.iter());
/**
 * Starting a new match retires the caller's own unfinished one. Mela runs many
 * concurrent matches, so this is scoped to the sender rather than the world:
 * nobody else's live match is ever touched.
 */
const abandonOwnActiveMatches = (ctx: any) => {
  const identity = canonicalIdentity(ctx);
  for (const existing of ctx.db.match.iter()) {
    if (existing.status !== "active") continue;
    if (!existing.playerIdentity.isEqual(identity)) continue;
    ctx.db.match.id.update({
      ...existing,
      status: "abandoned",
      endedAt: ctx.timestamp,
    });
    applyMetricDelta(ctx, abandonedMatchDelta());
    emit(ctx, existing.id, "This match was left for a new one.");
  }
};
const nowMicros = (ctx: any) => ctx.timestamp.microsSinceUnixEpoch;
const spectatorFor = (ctx: any, matchId: bigint, identity: any) => {
  for (const row of ctx.db.matchSpectator.iter())
    if (row.matchId === matchId && row.identity.isEqual(identity)) return row;
  return undefined;
};
const cooldownFor = (
  ctx: any,
  matchId: bigint,
  identity: any,
  power: string,
) => {
  for (const row of ctx.db.spectatorCooldown.iter())
    if (
      row.matchId === matchId &&
      row.power === power &&
      row.identity.isEqual(identity)
    )
      return row;
  return undefined;
};
const effectsFor = (ctx: any, matchId: bigint, target: string) => {
  const now = nowMicros(ctx);
  const effects: any[] = [];
  for (const effect of ctx.db.crowdEffect.iter()) {
    if (
      effect.matchId === matchId &&
      effect.target === target &&
      effect.expiresAtMicros > now
    )
      effects.push(effect);
  }
  return effects;
};
const scheduleCrowdTask = (
  ctx: any,
  kind: string,
  matchId: bigint,
  effectId: bigint,
  atMicros: bigint,
) => {
  ctx.db.crowdSchedule.insert({
    id: nextId(ctx.db.crowdSchedule.iter()),
    scheduledAt: ScheduleAt.time(atMicros),
    kind,
    matchId,
    effectId,
  });
};
const scheduleMelaBotWake = (
  ctx: any,
  matchId: bigint,
  expectedBotBalls: number,
) => {
  for (const task of ctx.db.crowdSchedule.iter()) {
    if (
      task.kind === "ai_wake" &&
      task.matchId === matchId &&
      task.effectId === BigInt(expectedBotBalls)
    )
      return;
  }
  scheduleCrowdTask(
    ctx,
    "ai_wake",
    matchId,
    BigInt(expectedBotBalls),
    nowMicros(ctx) + BOOK_CRICKET_RULES.aiWakeDelayMicros,
  );
};

function completeMatch(ctx: any, match: any, state: any, winner: string) {
  if (ctx.db.matchMemory.matchId.find(match.id)) return;
  const human = ctx.db.playerProfile.identity.find(match.playerIdentity);
  if (!human) throw new SenderError("Match player profile is unavailable.");
  const humanProgress = ensureMelaProfile(ctx, match.playerIdentity);
  const humanMetrics = metricsIdentityFor(ctx, match.playerIdentity);
  const playerUpdate = playerProgressAfterMatch(
    humanProgress.progressPoints,
    winner === "human",
  );
  ctx.db.melaProfile.identity.update({
    ...humanProgress,
    ...playerUpdate,
    matchesPlayed: humanProgress.matchesPlayed + 1,
    matchesWon: humanProgress.matchesWon + (winner === "human" ? 1 : 0),
    updatedAt: ctx.timestamp,
  });
  const record = ctx.db.bookCricketRecord.identity.find(match.playerIdentity);
  const nextRecord = nextBookCricketRecord(
    record ?? { matchesPlayed: 0, wins: 0, runsScored: 0, highestScore: 0 },
    state.humanScore,
    winner === "human",
  );
  if (record)
    ctx.db.bookCricketRecord.identity.update({
      ...record,
      ...nextRecord,
      displayName: human.displayName,
      updatedAt: ctx.timestamp,
    });
  else
    ctx.db.bookCricketRecord.insert({
      identity: match.playerIdentity,
      displayName: human.displayName,
      ...nextRecord,
      updatedAt: ctx.timestamp,
    });

  let crowdParticipants = 0;
  for (const spectator of ctx.db.matchSpectator.iter()) {
    if (spectator.matchId !== match.id) continue;
    crowdParticipants += 1;
    const spectatorProfile = ensureMelaProfile(ctx, spectator.identity);
    const spectatorUpdate = spectatorProgressAfterMatch(
      spectatorProfile.progressPoints,
    );
    ctx.db.melaProfile.identity.update({
      ...spectatorProfile,
      ...spectatorUpdate,
      matchesWatched: spectatorProfile.matchesWatched + 1,
      updatedAt: ctx.timestamp,
    });
  }
  const crowdActivity = ctx.db.matchCrowdActivity.matchId.find(match.id) ?? {
    actions: 0,
    energySpent: 0,
    lastActor: "The crowd",
    lastPower: "support",
  };
  const aiName =
    (Array.from(ctx.db.matchParticipant.iter()) as any[]).find(
      (participant: any) =>
        participant.matchId === match.id && participant.actorKind === "ai",
    )?.displayName ?? "MelaBot";
  ctx.db.matchHistory.insert({
    id: nextId(ctx.db.matchHistory.iter()),
    matchId: match.id,
    winner,
    humanScore: state.humanScore,
    botScore: state.botScore,
    occurredAt: ctx.timestamp,
  });
  ctx.db.matchMemory.insert({
    matchId: match.id,
    sequence: match.id,
    gameKind: match.gameKind,
    humanName: human.displayName,
    aiName,
    winner,
    humanScore: state.humanScore,
    humanWickets: state.humanWickets,
    botScore: state.botScore,
    botWickets: state.botWickets,
    crowdParticipants,
    crowdActions: crowdActivity.actions,
    crowdEnergySpent: crowdActivity.energySpent,
    notableMoment: notableCrowdMoment(
      crowdActivity.actions,
      crowdActivity.lastActor,
      crowdActivity.lastPower,
      {
        crowdSwing: state.lastCrowdSwing || undefined,
        winner,
        humanName: human.displayName,
        humanScore: state.humanScore,
        botScore: state.botScore,
        humanWickets: state.humanWickets,
      },
    ),
    completedAt: ctx.timestamp,
  });
  applyMetricDelta(ctx, completedMatchDelta());
  ctx.db.metricsIdentity.identity.update({
    ...humanMetrics,
    completedPlayerMatches: humanMetrics.completedPlayerMatches + 1,
  });
}

function resolveDelivery(
  ctx: any,
  match: any,
  state: any,
  side: "human" | "bot",
  style: BookCricketStyle,
) {
  const human = side === "human";
  const target = human ? "human" : "melabot";
  const effects = effectsFor(ctx, match.id, target);
  const effectState = {
    boost: effects.some((effect) => effect.power === "boost"),
    chaos: effects.some((effect) => effect.power === "chaos"),
    shield: effects.some((effect) => effect.power === "shield"),
  };
  const rawOutcome = resolveBookCricketOutcome(
    state.seed,
    style,
    effectState.chaos,
  );
  const result = applyCrowdDeliveryEffects(rawOutcome, effectState);
  // The crowd's swing is computed from the same transaction that applies it, so
  // every surface can name the person instead of showing an anonymous delta.
  const crowdSwing = describeCrowdSwing(rawOutcome, result, effects);
  for (const effect of effects) ctx.db.crowdEffect.id.delete(effect.id);
  if (crowdSwing) emit(ctx, match.id, crowdSwing);
  const balls = (human ? state.humanBalls : state.botBalls) + 1;
  const wickets =
    (human ? state.humanWickets : state.botWickets) + (result.wicket ? 1 : 0);
  const score = (human ? state.humanScore : state.botScore) + result.runs;
  const token = result.wicket ? "W" : String(result.runs);
  const appendBall = (timeline: string) =>
    timeline ? `${timeline},${token}` : token;
  let next = {
    ...state,
    seed: result.seed,
    lastPage: result.page,
    lastCrowdSwing: crowdSwing ?? "",
    lastOutcome: result.wicket
      ? "OUT"
      : `${result.runs} RUN${result.runs === 1 ? "" : "S"}`,
  };
  if (human)
    next = {
      ...next,
      humanBalls: balls,
      humanWickets: wickets,
      humanScore: score,
      humanTimeline: appendBall(state.humanTimeline),
    };
  else
    next = {
      ...next,
      botBalls: balls,
      botWickets: wickets,
      botScore: score,
      botTimeline: appendBall(state.botTimeline),
    };
  const chaseWon = !human && score >= state.target;
  const inningsFinished = isInningsComplete(balls, wickets);
  const chaseLost =
    !human && isChaseMathematicallyLost(score, state.target, balls);
  const over = inningsFinished || chaseWon || chaseLost;
  if (over && human) {
    next = {
      ...next,
      innings: 2,
      turn: "bot",
      target: score + 1,
      lastOutcome: "INNINGS BREAK",
    };
    emit(ctx, match.id, `MelaBot needs ${score + 1}`);
    emit(ctx, match.id, "MelaBot is reading the field…");
    scheduleMelaBotWake(ctx, match.id, state.botBalls);
  } else if (over) {
    const winner = chaseLost
      ? "human"
      : resolveChaseWinner(score, state.target);
    ctx.db.match.id.update({
      ...match,
      status: "complete",
      winner,
      endedAt: ctx.timestamp,
    });
    completeMatch(ctx, match, next, winner);
    next = {
      ...next,
      turn: "complete",
      lastOutcome: winner === "draw" ? "DRAW" : `${winner.toUpperCase()} WINS`,
    };
    emit(
      ctx,
      match.id,
      chaseLost
        ? "MelaBot cannot reach the target — HUMAN WINS"
        : next.lastOutcome,
    );
  } else {
    emit(ctx, match.id, `${human ? "Human" : "MelaBot"} → ${next.lastOutcome}`);
    if (!human) {
      emit(ctx, match.id, "MelaBot is weighing its next move…");
      scheduleMelaBotWake(ctx, match.id, balls);
    }
  }
  ctx.db.bookCricketState.matchId.update(next);
}

const penEffectsFor = (ctx: any, matchId: bigint, target: string) => {
  const effects = effectsFor(ctx, matchId, target);
  return {
    rows: effects,
    state: {
      nudge: effects.some((e) => e.power === "nudge"),
      tilt: effects.some((e) => e.power === "tilt"),
      guard: effects.some((e) => e.power === "guard"),
    },
  };
};
function finishPenMatch(
  ctx: any,
  match: any,
  state: any,
  winner: PenSide,
  knockout: boolean,
) {
  if (ctx.db.matchMemory.matchId.find(match.id)) return;
  ctx.db.match.id.update({
    ...match,
    status: "complete",
    winner,
    endedAt: ctx.timestamp,
  });
  ctx.db.matchHistory.insert({
    id: nextId(ctx.db.matchHistory.iter()),
    matchId: match.id,
    winner,
    humanScore: state.humanRounds,
    botScore: state.botRounds,
    occurredAt: ctx.timestamp,
  });
  const human = ctx.db.playerProfile.identity.find(match.playerIdentity);
  const activity = ctx.db.matchCrowdActivity.matchId.find(match.id);
  const duel = ctx.db.agentDuel.matchId.find(match.id);
  const leftName = duel?.leftName ?? human?.displayName ?? "Player";
  const rightName = duel?.rightName ?? "MelaBot";
  const credits = Array.from(ctx.db.duelCrowdCredit.iter() as Iterable<any>)
    .filter((c) => c.matchId === match.id)
    .map((c) => `${c.name}'s ${c.power.toUpperCase()}`);
  ctx.db.matchMemory.insert({
    matchId: match.id,
    sequence: match.id,
    gameKind: "pen_fight",
    humanName: leftName,
    aiName: rightName,
    winner,
    humanScore: state.humanRounds,
    humanWickets: 0,
    botScore: state.botRounds,
    botWickets: 0,
    crowdParticipants: Array.from(ctx.db.matchSpectator.iter()).filter(
      (row: any) => row.matchId === match.id,
    ).length,
    crowdActions: activity?.actions ?? 0,
    crowdEnergySpent: activity?.energySpent ?? 0,
    notableMoment: `${winner === "human" ? leftName : rightName} ${knockout ? "won with a desk-edge knockout." : "held the safer desk position."}${credits.length ? " Crowd moves that landed: " + [...new Set(credits)].join(", ") + "." : ""}`,
    completedAt: ctx.timestamp,
  });
  const win = winner === "human";
  if (!duel) {
    const profile = ensureMelaProfile(ctx, match.playerIdentity);
    const progress = playerProgressAfterMatch(profile.progressPoints, win);
    ctx.db.melaProfile.identity.update({
      ...profile,
      ...progress,
      matchesPlayed: profile.matchesPlayed + 1,
      matchesWon: profile.matchesWon + (win ? 1 : 0),
      updatedAt: ctx.timestamp,
    });
  }
  for (const spectator of ctx.db.matchSpectator.iter()) {
    if (spectator.matchId !== match.id) continue;
    const spectatorProfile = ensureMelaProfile(ctx, spectator.identity);
    const spectatorUpdate = spectatorProgressAfterMatch(
      spectatorProfile.progressPoints,
    );
    ctx.db.melaProfile.identity.update({
      ...spectatorProfile,
      ...spectatorUpdate,
      matchesWatched: spectatorProfile.matchesWatched + 1,
      updatedAt: ctx.timestamp,
    });
  }
  if (!duel) {
    const record = ctx.db.penFightRecord.identity.find(match.playerIdentity);
    const nextRecord = {
      matchesPlayed: (record?.matchesPlayed ?? 0) + 1,
      wins: (record?.wins ?? 0) + (win ? 1 : 0),
      roundsWon: (record?.roundsWon ?? 0) + state.humanRounds,
      knockouts: (record?.knockouts ?? 0) + (knockout && win ? 1 : 0),
    };
    if (record)
      ctx.db.penFightRecord.identity.update({
        ...record,
        ...nextRecord,
        updatedAt: ctx.timestamp,
      });
    else
      ctx.db.penFightRecord.insert({
        identity: match.playerIdentity,
        displayName: human?.displayName ?? "Player",
        ...nextRecord,
        updatedAt: ctx.timestamp,
      });
  }
  updatePenMetrics(ctx, {
    matchesCompleted: 1,
    roundsCompleted: state.humanRounds + state.botRounds,
    knockouts: knockout ? 1 : 0,
  });
  applyMetricDelta(ctx, completedMatchDelta());
  const humanMetrics = metricsIdentityFor(ctx, match.playerIdentity);
  ctx.db.metricsIdentity.identity.update({
    ...humanMetrics,
    completedPlayerMatches: humanMetrics.completedPlayerMatches + 1,
  });
  emit(
    ctx,
    match.id,
    `${winner === "human" ? leftName : rightName} WINS THE DESK`,
  );
}
function creditDuelCrowd(ctx: any, matchId: bigint, effect: any) {
  if (ctx.db.agentDuel.matchId.find(matchId))
    ctx.db.duelCrowdCredit.insert({
      id: nextId(ctx.db.duelCrowdCredit.iter()),
      matchId,
      name: effect.actorName,
      power: effect.power,
    });
}
function resolvePenFlick(
  ctx: any,
  match: any,
  state: any,
  side: PenSide,
  aimX: number,
  aimY: number,
  force: number,
  contact: number,
) {
  const human = side === "human";
  const actor = human ? "human" : "melabot";
  const target = human ? "melabot" : "human";
  const actorEffects = penEffectsFor(ctx, match.id, actor);
  const targetEffects = penEffectsFor(ctx, match.id, target);
  const resolution = resolvePenFightPhysics({
    actorSide: side,
    seed: state.seed,
    actorX: human ? state.humanX : state.botX,
    actorY: human ? state.humanY : state.botY,
    targetX: human ? state.botX : state.humanX,
    targetY: human ? state.botY : state.humanY,
    aimX,
    aimY,
    force,
    contact,
    // Guard belongs to the selected pen, so resolve it below against the
    // correct side rather than treating it as a global invulnerability flag.
    effects: { ...actorEffects.state, guard: false },
  });
  // Name the spectator at the moment their power actually fires. Announcing it
  // when it is BOUGHT would let the player aim off to cancel a known tilt, so
  // the crowd's interference has to stay hidden until it has been applied.
  for (const effect of actorEffects.rows) {
    if (effect.power === "guard") continue;
    const label =
      effect.power === "tilt" ? "DESK TILT" : effect.power.toUpperCase();
    emit(
      ctx,
      match.id,
      `${effect.actorName}'s ${label} changed ${actor === "human" ? "the human's" : "MelaBot's"} flick.`,
    );
    ctx.db.crowdEffect.id.delete(effect.id);
    creditDuelCrowd(ctx, match.id, effect);
  }
  let actorOut = resolution.actorOut;
  let targetOut = resolution.targetOut;
  const actorGuard = actorEffects.rows.find(
    (effect) => effect.power === "guard",
  );
  const targetGuard = targetEffects.rows.find(
    (effect) => effect.power === "guard",
  );
  if (actorOut && actorGuard) {
    creditDuelCrowd(ctx, match.id, actorGuard);
    actorOut = false;
    ctx.db.crowdEffect.id.delete(actorGuard.id);
    emit(
      ctx,
      match.id,
      `${actorGuard.actorName}'s GUARD kept ${actor} on the desk.`,
    );
  }
  if (targetOut && targetGuard) {
    creditDuelCrowd(ctx, match.id, targetGuard);
    targetOut = false;
    ctx.db.crowdEffect.id.delete(targetGuard.id);
    emit(
      ctx,
      match.id,
      `${targetGuard.actorName}'s GUARD kept ${target} on the desk.`,
    );
  }
  const motion: PenMotion = {
    matchId: match.id.toString(),
    sequence: `${state.round}:${state.turnsInRound}:${ctx.timestamp.microsSinceUnixEpoch}`,
    actor,
    from: {
      x: human ? state.humanX : state.botX,
      y: human ? state.humanY : state.botY,
    },
    targetFrom: {
      x: human ? state.botX : state.humanX,
      y: human ? state.botY : state.humanY,
    },
    contact: { x: resolution.motion.contactX, y: resolution.motion.contactY },
    end: {
      x: actorOut ? resolution.motion.actorX : resolution.actorX,
      y: actorOut ? resolution.motion.actorY : resolution.actorY,
    },
    targetEnd: {
      x: targetOut ? resolution.motion.targetX : resolution.targetX,
      y: targetOut ? resolution.motion.targetY : resolution.targetY,
    },
    hit: resolution.hit,
    actorOut,
    targetOut,
    guarded:
      (resolution.actorOut && !actorOut) ||
      (resolution.targetOut && !targetOut),
  };
  emit(ctx, match.id, PEN_MOTION_PREFIX + JSON.stringify(motion));
  let next: any = {
    ...state,
    seed: resolution.seed,
    turnsInRound: state.turnsInRound + 1,
    lastOutcome: resolution.hit ? "CONTACT!" : "NO CONTACT",
  };
  if (human)
    Object.assign(next, {
      humanX: resolution.actorX,
      humanY: resolution.actorY,
      botX: resolution.targetX,
      botY: resolution.targetY,
    });
  else
    Object.assign(next, {
      botX: resolution.actorX,
      botY: resolution.actorY,
      humanX: resolution.targetX,
      humanY: resolution.targetY,
    });
  if (resolution.nearEdge)
    emit(ctx, match.id, "A pen is hanging near the edge!");
  if (
    targetOut ||
    actorOut ||
    next.turnsInRound >= PEN_FIGHT_RULES.maxTurnsPerRound
  ) {
    // Your own pen leaving the desk is checked first: flicking so hard that you
    // follow the opponent off the edge must lose, or force carries no downside.
    const winner: PenSide = actorOut
      ? target
      : targetOut
        ? actor
        : penFightRoundWinner({
            humanX: next.humanX,
            humanY: next.humanY,
            botX: next.botX,
            botY: next.botY,
            seed: next.seed,
          });
    if (winner === "human") next.humanRounds += 1;
    else next.botRounds += 1;
    const matchWinner =
      next.humanRounds >= PEN_FIGHT_RULES.roundsToWin
        ? "human"
        : next.botRounds >= PEN_FIGHT_RULES.roundsToWin
          ? "melabot"
          : undefined;
    if (matchWinner) {
      next.turn = "complete";
      next.lastOutcome = `${matchWinner.toUpperCase()} WINS`;
      const duel = ctx.db.agentDuel.matchId.find(match.id);
      if (duel)
        next.lastOutcome = `${matchWinner === "human" ? duel.leftName : duel.rightName} WINS`;
      finishPenMatch(ctx, match, next, matchWinner, targetOut || actorOut);
    } else {
      next.round += 1;
      next.turnsInRound = 0;
      next.humanX = 260;
      next.humanY = 500;
      next.botX = 740;
      next.botY = 500;
      next.turn = next.round % 2 === 0 ? "bot" : "human";
      next.lastOutcome = `${winner.toUpperCase()} TAKES ROUND ${state.round}`;
      emit(ctx, match.id, next.lastOutcome);
      if (next.turn === "bot")
        scheduleMelaBotWake(ctx, match.id, next.turnsInRound);
    }
  } else {
    next.turn = human ? "bot" : "human";
    emit(
      ctx,
      match.id,
      `${human ? "Human" : "MelaBot"} ${resolution.hit ? "made contact" : "missed"}`,
    );
    if (!human) {
    } else {
      emit(ctx, match.id, "MelaBot is lining up a flick…");
      scheduleMelaBotWake(ctx, match.id, next.turnsInRound);
    }
  }
  ctx.db.penFightState.matchId.update(next);
  if (ctx.db.agentDuel.matchId.find(match.id)) beginAgentTurn(ctx, match.id);
}

export const createAgentDuel = spacetimedb.reducer(
  { mode: t.string() },
  (ctx: any, { mode }: any) => {
    if (!["melabot", "duel"].includes(mode))
      throw new SenderError("Choose MelaBot or two agents.");
    const matchId = createPenMatch(ctx);
    ctx.db.agentDuel.insert({
      matchId,
      mode,
      phase: "waiting",
      revision: 0n,
      leftIdentity: undefined,
      rightIdentity: undefined,
      leftName: "Waiting for agent",
      rightName: mode === "melabot" ? "MelaBot" : "Waiting for agent",
      leftIntent: "",
      rightIntent: "",
      deadlineMicros: 0n,
      notice: "The crowd is open. An agent can claim the teal seat.",
    });
    for (const p of ctx.db.matchParticipant.iter())
      if (p.matchId === matchId && (p.role === "player" || mode === "duel"))
        ctx.db.matchParticipant.id.update({
          ...p,
          actorKind: "external_ai",
          identity: undefined,
          displayName: "Waiting for agent",
        });
    beginAgentTurn(ctx, matchId);
  },
);

function beginAgentTurn(ctx: any, matchId: bigint) {
  const duel = ctx.db.agentDuel.matchId.find(matchId);
  const state = ctx.db.penFightState.matchId.find(matchId);
  if (!duel || !state) return;
  const revision = duel.revision + 1n;
  if (state.turn === "complete") {
    ctx.db.agentDuel.matchId.update({
      ...duel,
      revision,
      phase: "complete",
      deadlineMicros: 0n,
      notice: `${duel.leftName} × ${duel.rightName}. Result saved in Mela.`,
    });
    return;
  }
  const next = {
    ...duel,
    revision,
    phase: "waiting",
    deadlineMicros: nowMicros(ctx) + DUEL_RULES.waitMicros,
    notice: `${state.turn === "human" ? duel.leftName : duel.rightName} is choosing a shot.`,
  };
  ctx.db.agentDuel.matchId.update(next);
  if (state.turn === "bot" && duel.mode === "melabot") {
    queueFallback(ctx, matchId, "MelaBot is choosing its shot.");
  } else {
    scheduleCrowdTask(
      ctx,
      "agent_timeout",
      matchId,
      revision,
      next.deadlineMicros,
    );
  }
}
function sideFor(duel: any, identity: any) {
  if (duel.leftIdentity?.isEqual(identity)) return "human";
  if (duel.rightIdentity?.isEqual(identity)) return "bot";
  throw new SenderError("Claim an available agent seat first.");
}
export const claimAgentSeat = spacetimedb.reducer(
  { matchId: t.u64(), side: t.string(), name: t.string() },
  (ctx: any, action: any) => {
    const match = ctx.db.match.id.find(action.matchId);
    const duel = ctx.db.agentDuel.matchId.find(action.matchId);
    if (!duel || match?.status !== "active")
      throw new SenderError("Ask a human host to open an Agent Duel first.");
    if (
      !["human", "bot"].includes(action.side) ||
      (action.side === "bot" && duel.mode !== "duel")
    )
      throw new SenderError("That seat belongs to MelaBot.");
    const check = checkDisplayName(action.name.trim());
    if (!check.ok)
      throw new SenderError(check.message ?? "Choose a valid agent name.");
    const other =
      action.side === "human" ? duel.rightIdentity : duel.leftIdentity;
    if (other?.isEqual(ctx.sender))
      throw new SenderError("Use an independent identity for the other seat.");
    if (
      Array.from(ctx.db.matchSpectator.iter()).some(
        (s: any) =>
          s.matchId === action.matchId && s.identity.isEqual(ctx.sender),
      )
    )
      throw new SenderError("A spectator cannot also control an agent seat.");
    const key = action.side === "human" ? "leftIdentity" : "rightIdentity";
    if (duel[key] && !duel[key].isEqual(ctx.sender))
      throw new SenderError("That seat is already claimed.");
    const nameKey = action.side === "human" ? "leftName" : "rightName";
    ctx.db.agentDuel.matchId.update({
      ...duel,
      [key]: ctx.sender,
      [nameKey]: action.name.trim(),
      notice: `${action.name.trim()} joined the ${action.side === "human" ? "teal" : "rust"} seat.`,
    });
    const role = action.side === "human" ? "player" : "opponent";
    for (const participant of ctx.db.matchParticipant.iter())
      if (participant.matchId === action.matchId && participant.role === role)
        ctx.db.matchParticipant.id.update({
          ...participant,
          actorKind: "external_ai",
          identity: ctx.sender,
          displayName: action.name.trim(),
        });
    emit(
      ctx,
      action.matchId,
      `${action.name.trim()} claimed the ${role} seat.`,
    );
  },
);

export const agentFlick = spacetimedb.reducer(
  {
    matchId: t.u64(),
    round: t.u32(),
    turnNumber: t.u32(),
    aimX: t.u32(),
    aimY: t.u32(),
    force: t.u32(),
    contact: t.u32(),
    intent: t.string(),
  },
  (ctx: any, action: any) => {
    const identity = canonicalIdentity(ctx);
    const duel = ctx.db.agentDuel.matchId.find(action.matchId);
    const match = ctx.db.match.id.find(action.matchId);
    const state = ctx.db.penFightState.matchId.find(action.matchId);
    if (!duel || !state || match?.status !== "active")
      throw new SenderError("This duel is not active.");
    const side = sideFor(duel, ctx.sender);
    if (duel.phase !== "waiting")
      throw new SenderError(
        "A shot is already committed. Wait for the desk to settle.",
      );
    validateAgentAction(state, action, side);
    queueAgentProposal(ctx, duel, side, action);
  },
);
function queueAgentProposal(ctx: any, duel: any, side: string, action: any) {
  const proposal = {
    matchId: duel.matchId,
    revision: duel.revision,
    side,
    aimX: action.aimX,
    aimY: action.aimY,
    force: action.force,
    contact: action.contact,
  };
  if (ctx.db.agentProposal.matchId.find(duel.matchId))
    ctx.db.agentProposal.matchId.update(proposal);
  else ctx.db.agentProposal.insert(proposal);
  const name = side === "human" ? duel.leftName : duel.rightName;
  const next = {
    ...duel,
    phase: "intent",
    notice: `${name}'s plan is committed. The crowd can still change the shot.`,
    [side === "human" ? "leftIntent" : "rightIntent"]: action.intent.trim(),
    deadlineMicros: nowMicros(ctx) + DUEL_RULES.intentMicros,
  };
  ctx.db.agentDuel.matchId.update(next);
  emit(ctx, duel.matchId, `${name}: ${action.intent.trim()}`);
  scheduleCrowdTask(
    ctx,
    "agent_shot",
    duel.matchId,
    duel.revision,
    next.deadlineMicros,
  );
}
function queueFallback(ctx: any, matchId: bigint, notice: string) {
  let duel = ctx.db.agentDuel.matchId.find(matchId);
  const state = ctx.db.penFightState.matchId.find(matchId);
  const side = state.turn;
  if (side === "human" && !duel.leftIdentity)
    duel = { ...duel, leftName: "Teal fallback" };
  if (side === "bot" && duel.mode === "duel" && !duel.rightIdentity)
    duel = { ...duel, rightName: "Rust fallback" };
  const observed =
    side === "human"
      ? {
          ...state,
          humanX: state.botX,
          humanY: state.botY,
          botX: state.humanX,
          botY: state.humanY,
        }
      : state;
  const proposal = new DeterministicPenFightAIProvider().decideAction(observed);
  proposal.force = Math.min(
    proposal.force,
    state.turnsInRound === 0
      ? PEN_FIGHT_RULES.openingForceMax
      : PEN_FIGHT_RULES.maxForce,
  );
  const action = {
    ...proposal,
    round: state.round,
    turnNumber: state.turnsInRound,
    intent: proposal.rationale.replaceAll(
      "MelaBot",
      side === "human" ? duel.leftName : duel.rightName,
    ),
  };
  validateAgentAction(state, action, side);
  ctx.db.agentDuel.matchId.update({ ...duel, notice });
  emit(ctx, matchId, notice);
  queueAgentProposal(ctx, { ...duel, notice }, side, action);
}
function processAgentWake(ctx: any, match: any, arg: any) {
  const duel = ctx.db.agentDuel.matchId.find(match.id);
  if (
    !duel ||
    !wakeIsCurrent(
      duel,
      arg.effectId,
      arg.kind === "agent_timeout" ? "waiting" : "intent",
    )
  )
    return;
  if (arg.kind === "agent_timeout") {
    queueFallback(
      ctx,
      match.id,
      "Agent turn timed out. MelaBot policy takes this flick; the seat remains available for its next turn.",
    );
    return;
  }
  const proposal = ctx.db.agentProposal.matchId.find(match.id);
  const state = ctx.db.penFightState.matchId.find(match.id);
  if (
    !proposal ||
    proposal.revision !== duel.revision ||
    !state ||
    state.turn !== proposal.side
  )
    return;
  validateAgentAction(
    state,
    {
      ...proposal,
      round: state.round,
      turnNumber: state.turnsInRound,
      intent: "Scheduled shot",
    },
    proposal.side,
  );
  ctx.db.agentProposal.matchId.delete(match.id);
  resolvePenFlick(
    ctx,
    match,
    state,
    proposal.side === "human" ? "human" : "melabot",
    proposal.aimX,
    proposal.aimY,
    proposal.force,
    proposal.contact,
  );
}

export const init = spacetimedb.init((ctx: any) => {
  ensureWorld(ctx);
  ensureMelaBot(ctx);
  ensureMetrics(ctx);
  ensurePenMetrics(ctx);
});
export const onConnect = spacetimedb.clientConnected((ctx: any) => {
  migrateLegacyContacts(ctx);
  ensureWorld(ctx);
  ensureMelaBot(ctx);
  // Module init is not replayed for every in-place Maincloud migration. This
  // makes the first post-migration connection seed a truthful snapshot from
  // the persisted match tables, then normal reducers maintain it incrementally.
  ensureMetrics(ctx);
  ensurePenMetrics(ctx);
  const identity = canonicalIdentity(ctx);
  if (ctx.db.playerProfile.identity.find(identity)) {
    ensureMelaProfile(ctx, identity);
    const presence = ctx.db.worldPresence.identity.find(identity);
    if (presence)
      ctx.db.worldPresence.identity.update({
        ...presence,
        state: "online",
        lastSeenAt: ctx.timestamp,
      });
  }
  if (ctx.connectionId)
    ctx.db.connectionSession.insert({
      connectionId: ctx.connectionId,
      identity: ctx.sender,
      connectedAt: ctx.timestamp,
    });
});
export const onDisconnect = spacetimedb.clientDisconnected((ctx: any) => {
  if (ctx.connectionId)
    ctx.db.connectionSession.connectionId.delete(ctx.connectionId);
});
function onboardProfile(ctx: any, displayName: string) {
  ensureWorld(ctx);
  const name = displayName.trim();
  // Validated server-side: the client can be bypassed by calling this
  // reducer directly, and this name is about to render on a projector.
  const check = checkDisplayName(name);
  if (!check.ok)
    throw new SenderError(check.message ?? "That name cannot be used.");
  const old = ctx.db.playerProfile.identity.find(ctx.sender);
  if (old)
    ctx.db.playerProfile.identity.update({
      ...old,
      displayName: name,
      lastSeenAt: ctx.timestamp,
    });
  else
    ctx.db.playerProfile.insert({
      identity: ctx.sender,
      displayName: name,
      createdAt: ctx.timestamp,
      lastSeenAt: ctx.timestamp,
      melaLevel: 1,
      crowdInfluence: 0,
    });
  ensureMelaProfile(ctx, ctx.sender);
  const presence = ctx.db.worldPresence.identity.find(ctx.sender);
  if (presence)
    ctx.db.worldPresence.identity.update({
      ...presence,
      state: "online",
      lastSeenAt: ctx.timestamp,
    });
  else
    ctx.db.worldPresence.insert({
      identity: ctx.sender,
      worldId: WORLD_ID,
      state: "online",
      joinedAt: ctx.timestamp,
      lastSeenAt: ctx.timestamp,
    });
}

// Legacy clients can rename an existing identity, but cannot create new
// name-only registrations after the email-onboarding release.
export const onboard = spacetimedb.reducer(
  { displayName: t.string() },
  (ctx: any, { displayName }: any) => {
    migrateLegacyContacts(ctx);
    if (!ctx.db.playerProfile.identity.find(ctx.sender))
      throw new SenderError("Refresh Mela and join with your name and email.");
    onboardProfile(ctx, displayName);
  },
);

export const myEmailContact = spacetimedb.view(
  { public: true },
  t.array(
    t.row("OwnEmailContact", {
      identity: t.identity().primaryKey(),
      email: t.string(),
      source: t.string(),
      verified: t.bool(),
    }),
  ),
  (ctx: any) => {
    const row = ctx.db.emailContact.identity.find(ctx.sender);
    return row
      ? [
          {
            identity: row.identity,
            email: row.email,
            source: row.source,
            verified: row.verified,
          },
        ]
      : [];
  },
);

export const onboardWithEmail = spacetimedb.reducer(
  { displayName: t.string(), email: t.string() },
  (ctx: any, { displayName, email }: any) => {
    migrateLegacyContacts(ctx);
    let address: string;
    try {
      address = realEmail(email);
    } catch {
      throw new SenderError("Enter a valid email address.");
    }
    // Email is private contact data, but a completed Mela profile may not
    // share it with another identity. The scan is deliberately inside this
    // reducer transaction, so concurrent first registrations cannot both win.
    const usedByAnotherProfile = Array.from(ctx.db.emailContact.iter()).some(
      (contact: any) =>
        contact.email === address &&
        !contact.identity.isEqual(ctx.sender) &&
        Boolean(ctx.db.playerProfile.identity.find(contact.identity)),
    );
    if (usedByAnotherProfile)
      throw new SenderError(
        "This email is already connected to another Mela profile.",
      );
    const old = ctx.db.emailContact.identity.find(ctx.sender);
    const hasProfile = Boolean(ctx.db.playerProfile.identity.find(ctx.sender));
    const plan = emailOnboardingPlan({
      hasProfile,
      address,
      contact: old,
    });
    // A completed profile keeps its original private contact. The sole repair
    // path is an interrupted signup with no profile/history at all.
    if (plan === "reject")
      throw new SenderError(
        "This identity is already registered. Rejoin your existing profile.",
      );
    if (old && plan === "replace")
      ctx.db.emailContact.identity.update({
        ...old,
        email: address,
        source: "user_supplied",
        verified: false,
        createdAt: ctx.timestamp,
      });
    onboardProfile(ctx, displayName);
    if (plan === "insert")
      ctx.db.emailContact.insert({
        identity: ctx.sender,
        email: address,
        source: "user_supplied",
        verified: false,
        createdAt: ctx.timestamp,
      });
  },
);

/**
 * Starts the one-time bridge from a person's current Mela browser identity to
 * their verified magic-link identity. The nonce is generated in the browser
 * and retained only in same-origin session storage through the OIDC redirect;
 * it is private database state and expires after ten minutes.
 */
export const beginProfileLink = spacetimedb.reducer(
  { nonce: t.string() },
  (ctx: any, { nonce }: any) => {
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(nonce))
      throw new SenderError(
        "Could not start secure sign-in. Please try again.",
      );
    if (ctx.db.identityLink.identity.find(ctx.sender))
      throw new SenderError("This Mela profile already has email sign-in.");
    if (!ctx.db.playerProfile.identity.find(ctx.sender))
      throw new SenderError(
        "Join Mela on this device before enabling email sign-in.",
      );
    cleanExpiredProfileLinkChallenges(ctx);
    const existing = ctx.db.profileLinkChallenge.nonce.find(nonce);
    if (existing && !existing.sourceIdentity.isEqual(ctx.sender))
      throw new SenderError(
        "Could not start secure sign-in. Please try again.",
      );
    if (existing)
      ctx.db.profileLinkChallenge.nonce.update({
        ...existing,
        expiresAtMicros: nowMicros(ctx) + 10n * 60n * 1000000n,
      });
    else
      ctx.db.profileLinkChallenge.insert({
        nonce,
        sourceIdentity: ctx.sender,
        expiresAtMicros: nowMicros(ctx) + 10n * 60n * 1000000n,
      });
  },
);

/** Completes the bridge only after Maincloud has validated the OIDC JWT. */
export const completeProfileLink = spacetimedb.reducer(
  { nonce: t.string() },
  (ctx: any, { nonce }: any) => {
    requireMelaAuth(ctx);
    cleanExpiredProfileLinkChallenges(ctx);
    const challenge = ctx.db.profileLinkChallenge.nonce.find(nonce);
    if (!challenge)
      throw new SenderError(
        "This secure sign-in link expired. Start again in your original Mela browser.",
      );
    if (ctx.db.identityLink.identity.find(ctx.sender))
      throw new SenderError("This email sign-in is already connected to Mela.");
    if (ctx.db.playerProfile.identity.find(ctx.sender))
      throw new SenderError(
        "This email sign-in already has a Mela profile and cannot replace another one.",
      );
    if (!ctx.db.playerProfile.identity.find(challenge.sourceIdentity))
      throw new SenderError(
        "That original Mela profile is no longer available.",
      );
    ctx.db.identityLink.insert({
      identity: ctx.sender,
      canonicalIdentity: challenge.sourceIdentity,
      linkedAt: ctx.timestamp,
    });
    ctx.db.profileLinkChallenge.nonce.delete(nonce);
  },
);
export const createBookCricket = spacetimedb.reducer((ctx: any) => {
  const p = player(ctx);
  const identity = canonicalIdentity(ctx);
  // Mela hosts many concurrent matches; only one live match per identity keeps
  // ownership unambiguous without blocking every other person in the world.
  abandonOwnActiveMatches(ctx);
  const participantMetrics = metricsIdentityFor(ctx, identity);
  applyMetricDelta(
    ctx,
    playerMatchStartDelta({
      hasPlayed: participantMetrics.hasPlayed === 1,
      hasSpectated: participantMetrics.hasSpectated === 1,
      completedPlayerMatches: participantMetrics.completedPlayerMatches,
    }),
  );
  ctx.db.metricsIdentity.identity.update({
    ...participantMetrics,
    hasPlayed: 1,
  });
  ensureMelaBot(ctx);
  const melaBot = ctx.db.aiCharacter.id.find(1n);
  const matchId = nextMatchId(ctx);
  ctx.db.match.insert({
    id: matchId,
    worldId: WORLD_ID,
    gameKind: "book_cricket",
    playerIdentity: identity,
    status: "active",
    winner: "",
    createdAt: ctx.timestamp,
    endedAt: undefined,
  });
  ctx.db.matchParticipant.insert({
    id: nextId(ctx.db.matchParticipant.iter()),
    matchId,
    actorKind: "human",
    role: "player",
    identity,
    displayName: p.displayName,
  });
  ctx.db.matchParticipant.insert({
    id: nextId(ctx.db.matchParticipant.iter()),
    matchId,
    actorKind: "ai",
    role: "opponent",
    identity: undefined,
    displayName: melaBot?.displayName ?? "MelaBot",
  });
  ctx.db.bookCricketState.insert({
    matchId,
    innings: 1,
    turn: "human",
    humanScore: 0,
    botScore: 0,
    humanBalls: 0,
    botBalls: 0,
    humanWickets: 0,
    botWickets: 0,
    target: 0,
    lastOutcome: "START",
    humanTimeline: "",
    botTimeline: "",
    lastCrowdSwing: "",
    lastPage: 0,
    seed: matchId + 17n,
  });
  ctx.db.matchCrowd.insert({
    matchId,
    energy: BOOK_CRICKET_RULES.crowdEnergyStart,
    maxEnergy: BOOK_CRICKET_RULES.crowdEnergyMax,
  });
  ctx.db.matchCrowdActivity.insert({
    matchId,
    actions: 0,
    energySpent: 0,
    lastActor: "The crowd",
    lastPower: "support",
  });
  scheduleCrowdTask(
    ctx,
    "regen",
    matchId,
    0n,
    nowMicros(ctx) + BOOK_CRICKET_RULES.crowdEnergyRegenMicros,
  );
  emit(ctx, matchId, `${p.displayName} started batting`);
});
function createPenMatch(ctx: any) {
  const p = player(ctx);
  const identity = canonicalIdentity(ctx);
  abandonOwnActiveMatches(ctx);
  const metricIdentity = penMetricIdentity(ctx, identity);
  updatePenMetrics(ctx, {
    matchesStarted: 1,
    participants: 1,
    uniquePlayers: metricIdentity.hasPlayed ? 0 : 1,
  });
  ctx.db.penFightMetricsIdentity.identity.update({
    ...metricIdentity,
    hasPlayed: 1,
  });
  const globalMetrics = metricsIdentityFor(ctx, identity);
  applyMetricDelta(ctx, playerMatchStartDelta(globalMetrics));
  ctx.db.metricsIdentity.identity.update({ ...globalMetrics, hasPlayed: 1 });
  const matchId = nextMatchId(ctx);
  ctx.db.match.insert({
    id: matchId,
    worldId: WORLD_ID,
    gameKind: "pen_fight",
    playerIdentity: identity,
    status: "active",
    winner: "",
    createdAt: ctx.timestamp,
    endedAt: undefined,
  });
  ctx.db.matchParticipant.insert({
    id: nextId(ctx.db.matchParticipant.iter()),
    matchId,
    actorKind: "human",
    role: "player",
    identity,
    displayName: p.displayName,
  });
  ctx.db.matchParticipant.insert({
    id: nextId(ctx.db.matchParticipant.iter()),
    matchId,
    actorKind: "ai",
    role: "opponent",
    identity: undefined,
    displayName: "MelaBot",
  });
  ctx.db.penFightState.insert({
    matchId,
    round: 1,
    humanRounds: 0,
    botRounds: 0,
    turn: "human",
    humanX: 260,
    humanY: 500,
    botX: 740,
    botY: 500,
    turnsInRound: 0,
    lastOutcome: "AIM YOUR FIRST FLICK",
    seed: matchId + 71n,
  });
  ctx.db.matchCrowd.insert({
    matchId,
    energy: PEN_FIGHT_RULES.crowdEnergyStart,
    maxEnergy: PEN_FIGHT_RULES.crowdEnergyMax,
  });
  ctx.db.matchCrowdActivity.insert({
    matchId,
    actions: 0,
    energySpent: 0,
    lastActor: "The desk",
    lastPower: "watching",
  });
  scheduleCrowdTask(
    ctx,
    "regen",
    matchId,
    0n,
    nowMicros(ctx) + BOOK_CRICKET_RULES.crowdEnergyRegenMicros,
  );
  emit(ctx, matchId, `${p.displayName} set their pen on the desk`);
  return matchId;
}
export const createPenFight = spacetimedb.reducer((ctx: any) => {
  createPenMatch(ctx);
});

function createExperimentalMatch(
  ctx: any,
  gameKind: "dots_boxes" | "gilli_danda",
) {
  const profile = player(ctx),
    identity = canonicalIdentity(ctx);
  abandonOwnActiveMatches(ctx);
  const metrics = metricsIdentityFor(ctx, identity);
  applyMetricDelta(ctx, playerMatchStartDelta(metrics));
  ctx.db.metricsIdentity.identity.update({ ...metrics, hasPlayed: 1 });
  ensureMelaBot(ctx);
  const matchId = nextMatchId(ctx);
  ctx.db.match.insert({
    id: matchId,
    worldId: WORLD_ID,
    gameKind,
    playerIdentity: identity,
    status: "active",
    winner: "",
    createdAt: ctx.timestamp,
    endedAt: undefined,
  });
  ctx.db.matchParticipant.insert({
    id: nextId(ctx.db.matchParticipant.iter()),
    matchId,
    actorKind: "human",
    role: "player",
    identity,
    displayName: profile.displayName,
  });
  ctx.db.matchParticipant.insert({
    id: nextId(ctx.db.matchParticipant.iter()),
    matchId,
    actorKind: "ai",
    role: "opponent",
    identity: undefined,
    displayName: "MelaBot",
  });
  ctx.db.matchCrowd.insert({ matchId, energy: 42, maxEnergy: 60 });
  ctx.db.matchCrowdActivity.insert({
    matchId,
    actions: 0,
    energySpent: 0,
    lastActor: "The crowd",
    lastPower: "watching",
  });
  scheduleCrowdTask(
    ctx,
    "regen",
    matchId,
    0n,
    nowMicros(ctx) + BOOK_CRICKET_RULES.crowdEnergyRegenMicros,
  );
  return { matchId, profile };
}

function finishExperimentalMatch(
  ctx: any,
  match: any,
  winner: string,
  humanScore: number,
  botScore: number,
  notableMoment: string,
) {
  if (ctx.db.matchMemory.matchId.find(match.id)) return;
  ctx.db.match.id.update({
    ...match,
    status: "complete",
    winner,
    endedAt: ctx.timestamp,
  });
  const human = player(ctx),
    progression = ensureMelaProfile(ctx, match.playerIdentity),
    metrics = metricsIdentityFor(ctx, match.playerIdentity);
  const update = playerProgressAfterMatch(
    progression.progressPoints,
    winner === "human",
  );
  ctx.db.melaProfile.identity.update({
    ...progression,
    ...update,
    matchesPlayed: progression.matchesPlayed + 1,
    matchesWon: progression.matchesWon + (winner === "human" ? 1 : 0),
    updatedAt: ctx.timestamp,
  });
  ctx.db.matchHistory.insert({
    id: nextId(ctx.db.matchHistory.iter()),
    matchId: match.id,
    winner,
    humanScore,
    botScore,
    occurredAt: ctx.timestamp,
  });
  const activity = ctx.db.matchCrowdActivity.matchId.find(match.id) ?? {
    actions: 0,
    energySpent: 0,
  };
  ctx.db.matchMemory.insert({
    matchId: match.id,
    sequence: match.id,
    gameKind: match.gameKind,
    humanName: human.displayName,
    aiName: "MelaBot",
    winner,
    humanScore,
    humanWickets: 0,
    botScore,
    botWickets: 0,
    crowdParticipants: Array.from(ctx.db.matchSpectator.iter()).filter(
      (row: any) => row.matchId === match.id,
    ).length,
    crowdActions: activity.actions,
    crowdEnergySpent: activity.energySpent,
    notableMoment,
    completedAt: ctx.timestamp,
  });
  applyMetricDelta(ctx, completedMatchDelta());
  ctx.db.metricsIdentity.identity.update({
    ...metrics,
    completedPlayerMatches: metrics.completedPlayerMatches + 1,
  });
}

function scheduleExperimentalBot(
  ctx: any,
  kind: string,
  matchId: bigint,
  revision: number,
) {
  scheduleCrowdTask(
    ctx,
    kind,
    matchId,
    BigInt(revision),
    nowMicros(ctx) + BOOK_CRICKET_RULES.aiWakeDelayMicros,
  );
}

function resolveDotsTurn(
  ctx: any,
  match: any,
  state: any,
  side: "human" | "melabot",
  from: number,
  to: number,
) {
  const result = resolveDotsMove({
    edges: state.edges,
    boxes: state.boxes,
    from,
    to,
    side,
  });
  const humanBoxes = result.boxes
    .split(",")
    .filter((box) => box.endsWith("h")).length;
  const botBoxes = result.boxes
    .split(",")
    .filter((box) => box.endsWith("b")).length;
  const next = {
    ...state,
    edges: result.edges,
    boxes: result.boxes,
    humanBoxes,
    botBoxes,
    turn: result.complete ? "complete" : result.nextTurn,
    revision: state.revision + 1,
    lastOutcome: result.claimed
      ? `${side === "human" ? "You" : "MelaBot"} claimed ${result.claimed} box${result.claimed === 1 ? "" : "es"}!`
      : `${side === "human" ? "You" : "MelaBot"} drew a line.`,
    seed: state.seed + 1n,
  };
  ctx.db.dotsBoxesState.matchId.update(next);
  emit(ctx, match.id, next.lastOutcome);
  if (result.complete) {
    finishExperimentalMatch(
      ctx,
      match,
      result.winner!,
      humanBoxes,
      botBoxes,
      result.winner === "draw"
        ? "Every square was claimed — a dead-even notebook battle."
        : `${result.winner === "human" ? "You" : "MelaBot"} claimed the final grid.`,
    );
    return;
  }
  if (next.turn === "melabot") {
    emit(ctx, match.id, "MelaBot is studying the grid…");
    scheduleExperimentalBot(ctx, "dots_ai_wake", match.id, next.revision);
  }
}

export const createDotsBoxes = spacetimedb.reducer((ctx: any) => {
  const { matchId, profile } = createExperimentalMatch(ctx, "dots_boxes");
  ctx.db.dotsBoxesState.insert({
    matchId,
    edges: "",
    boxes: "",
    humanBoxes: 0,
    botBoxes: 0,
    turn: "human",
    revision: 0,
    lastOutcome: "DRAW THE FIRST LINE",
    seed: matchId + 211n,
  });
  emit(
    ctx,
    matchId,
    `${profile.displayName} opened a fresh Dots & Boxes grid.`,
  );
});

export const drawDotsEdge = spacetimedb.reducer(
  { matchId: t.u64(), from: t.u32(), to: t.u32() },
  (ctx: any, action: any) => {
    const match = ctx.db.match.id.find(action.matchId),
      state = ctx.db.dotsBoxesState.matchId.find(action.matchId),
      identity = canonicalIdentity(ctx);
    if (
      !match ||
      !state ||
      match.status !== "active" ||
      match.gameKind !== "dots_boxes" ||
      !match.playerIdentity.isEqual(identity) ||
      state.turn !== "human"
    )
      throw new SenderError("That line is not available.");
    try {
      resolveDotsTurn(ctx, match, state, "human", action.from, action.to);
    } catch (error) {
      throw new SenderError(
        error instanceof Error ? error.message : "Illegal line.",
      );
    }
  },
);

function resolveGilliTurn(
  ctx: any,
  match: any,
  state: any,
  side: "human" | "melabot",
  power: number,
  timing: number,
) {
  const strike = resolveGilliStrike(state.seed, power, timing),
    score =
      side === "human"
        ? state.humanScore + strike.distance
        : state.botScore + strike.distance,
    round = state.round + 1;
  const next = {
    ...state,
    round,
    humanScore: side === "human" ? score : state.humanScore,
    botScore: side === "melabot" ? score : state.botScore,
    turn: round > 10 ? "complete" : side === "human" ? "melabot" : "human",
    lastDistance: strike.distance,
    lastSound: strike.sound,
    lastOutcome: `${side === "human" ? "You" : "MelaBot"} sent the gilli ${strike.distance} paces — ${strike.sound.toUpperCase()}!`,
    seed: strike.seed,
  };
  ctx.db.gilliDandaState.matchId.update(next);
  emit(ctx, match.id, next.lastOutcome);
  if (round > 10) {
    const winner =
      next.humanScore === next.botScore
        ? "draw"
        : next.humanScore > next.botScore
          ? "human"
          : "melabot";
    finishExperimentalMatch(
      ctx,
      match,
      winner,
      next.humanScore,
      next.botScore,
      winner === "draw"
        ? "Neither player gave an inch at the chalk line."
        : `${winner === "human" ? "You" : "MelaBot"} owned the final strike.`,
    );
    return;
  }
  if (next.turn === "melabot") {
    emit(ctx, match.id, "MelaBot balances the gilli on the danda…");
    scheduleExperimentalBot(ctx, "gilli_ai_wake", match.id, next.round);
  }
}

export const createGilliDanda = spacetimedb.reducer((ctx: any) => {
  const { matchId, profile } = createExperimentalMatch(ctx, "gilli_danda");
  ctx.db.gilliDandaState.insert({
    matchId,
    round: 1,
    humanScore: 0,
    botScore: 0,
    turn: "human",
    lastDistance: 0,
    lastSound: "",
    lastOutcome: "LIFT THE GILLI",
    seed: matchId + 509n,
  });
  emit(ctx, matchId, `${profile.displayName} placed a gilli on the chalk.`);
});

export const strikeGilli = spacetimedb.reducer(
  { matchId: t.u64(), power: t.u32(), timing: t.u32() },
  (ctx: any, action: any) => {
    const match = ctx.db.match.id.find(action.matchId),
      state = ctx.db.gilliDandaState.matchId.find(action.matchId),
      identity = canonicalIdentity(ctx);
    if (
      !match ||
      !state ||
      match.status !== "active" ||
      match.gameKind !== "gilli_danda" ||
      !match.playerIdentity.isEqual(identity) ||
      state.turn !== "human"
    )
      throw new SenderError("Wait for your turn at the chalk.");
    try {
      resolveGilliTurn(ctx, match, state, "human", action.power, action.timing);
    } catch (error) {
      throw new SenderError(
        error instanceof Error ? error.message : "Illegal strike.",
      );
    }
  },
);
export const flickPen = spacetimedb.reducer(
  {
    matchId: t.u64(),
    aimX: t.u32(),
    aimY: t.u32(),
    force: t.u32(),
    contact: t.u32(),
  },
  (ctx: any, action: any) => {
    const identity = canonicalIdentity(ctx);
    if (ctx.db.agentDuel.matchId.find(action.matchId))
      throw new SenderError("This desk is reserved for its agent seats.");
    const match = ctx.db.match.id.find(action.matchId);
    const state = ctx.db.penFightState.matchId.find(action.matchId);
    if (
      !match ||
      !state ||
      match.status !== "active" ||
      match.gameKind !== "pen_fight" ||
      !match.playerIdentity.isEqual(identity)
    )
      throw new SenderError("Not your live Pen Fight.");
    if (
      state.turn !== "human" ||
      !validatePenFlick({ ...action, opening: state.turnsInRound === 0 })
    )
      throw new SenderError("Choose a legal aim, force, and contact point.");
    resolvePenFlick(
      ctx,
      match,
      state,
      "human",
      action.aimX,
      action.aimY,
      action.force,
      action.contact,
    );
  },
);
export const usePenFightCrowdPower = spacetimedb.reducer(
  { matchId: t.u64(), power: t.string(), target: t.string() },
  (ctx: any, { matchId, power, target }: any) => {
    const identity = canonicalIdentity(ctx);
    const match = ctx.db.match.id.find(matchId);
    if (!match || match.status !== "active" || match.gameKind !== "pen_fight")
      throw new SenderError("That Pen Fight is not live.");
    if (
      !spectatorFor(ctx, matchId, identity) ||
      !isPenFightPower(power) ||
      (target !== "human" && target !== "melabot")
    )
      throw new SenderError("Join the crowd and choose a legal desk action.");
    const now = nowMicros(ctx);
    const cooldown = cooldownFor(ctx, matchId, identity, power);
    if (cooldown && cooldown.readyAtMicros > now)
      throw new SenderError("That desk move is cooling down.");
    const crowd = ctx.db.matchCrowd.matchId.find(matchId);
    const energy = crowd && penFightCrowdEnergyResult(crowd.energy, power);
    if (!crowd || energy === undefined)
      throw new SenderError("The crowd needs more Energy.");
    if (
      power !== "cheer" &&
      penEffectsFor(ctx, matchId, target).rows.some(
        (effect) => effect.power === power,
      )
    )
      throw new SenderError("That desk effect is already waiting.");
    const rule = PEN_FIGHT_POWERS[power as PenFightPower];
    ctx.db.matchCrowd.matchId.update({ ...crowd, energy });
    if (cooldown)
      ctx.db.spectatorCooldown.id.update({
        ...cooldown,
        readyAtMicros: now + rule.cooldownMicros,
      });
    else
      ctx.db.spectatorCooldown.insert({
        id: nextId(ctx.db.spectatorCooldown.iter()),
        matchId,
        identity,
        power,
        readyAtMicros: now + rule.cooldownMicros,
      });
    const profile = player(ctx);
    const activity = ctx.db.matchCrowdActivity.matchId.find(matchId);
    if (activity)
      ctx.db.matchCrowdActivity.matchId.update({
        ...activity,
        actions: activity.actions + 1,
        energySpent: activity.energySpent + rule.cost,
        lastActor: profile.displayName,
        lastPower: power,
      });
    updatePenMetrics(ctx, { crowdActions: 1 });
    const actorMetrics = metricsIdentityFor(ctx, identity);
    applyMetricDelta(ctx, crowdActionDelta(actorMetrics.hasActed !== 1));
    if (actorMetrics.hasActed !== 1)
      ctx.db.metricsIdentity.identity.update({ ...actorMetrics, hasActed: 1 });
    const influence = power === "tilt" ? 3 : power === "cheer" ? 1 : 2;
    const melaProfile = ensureMelaProfile(ctx, identity);
    ctx.db.melaProfile.identity.update({
      ...melaProfile,
      crowdActions: melaProfile.crowdActions + 1,
      crowdInfluence: melaProfile.crowdInfluence + influence,
      updatedAt: ctx.timestamp,
    });
    if (power === "cheer") {
      emit(
        ctx,
        matchId,
        `${profile.displayName} CHEERED — the desk has more Energy`,
      );
      return;
    }
    const effectId = nextId(ctx.db.crowdEffect.iter());
    const expiresAtMicros = now + rule.durationMicros;
    ctx.db.crowdEffect.insert({
      id: effectId,
      matchId,
      power,
      target,
      actorName: profile.displayName,
      expiresAtMicros,
    });
    scheduleCrowdTask(ctx, "effect_expiry", matchId, effectId, expiresAtMicros);
    // Deliberately NOT announced here. The event feed is visible to the player,
    // and naming the power at purchase time would let them aim off to cancel a
    // tilt they can see coming. resolvePenFlick names the spectator once the
    // effect has actually changed the flick.
    emit(ctx, matchId, `${profile.displayName} is working the desk…`);
  },
);
export const playBall = spacetimedb.reducer(
  { matchId: t.u64(), style: t.string() },
  (ctx: any, { matchId, style }: any) => {
    const identity = canonicalIdentity(ctx);
    const match = ctx.db.match.id.find(matchId);
    const state = ctx.db.bookCricketState.matchId.find(matchId);
    if (
      !match ||
      !state ||
      match.status !== "active" ||
      !match.playerIdentity.isEqual(identity)
    )
      throw new SenderError("Not your active match.");
    if (
      state.turn !== "human" ||
      (style !== "safe" && style !== "balanced" && style !== "aggressive")
    )
      throw new SenderError("Illegal delivery.");
    resolveDelivery(ctx, match, state, "human", style);
  },
);
export const joinMatchAsSpectator = spacetimedb.reducer(
  { matchId: t.u64() },
  (ctx: any, { matchId }: any) => {
    const identity = canonicalIdentity(ctx);
    const duel = ctx.db.agentDuel.matchId.find(matchId);
    if (
      duel?.leftIdentity?.isEqual(identity) ||
      duel?.rightIdentity?.isEqual(identity)
    )
      throw new SenderError("An agent seat cannot also join the crowd.");
    const match = ctx.db.match.id.find(matchId);
    const profile = player(ctx);
    if (!match || match.status !== "active")
      throw new SenderError("That match is not live.");
    if (!duel && match.playerIdentity.isEqual(identity))
      throw new SenderError("The player is already in this match.");
    if (spectatorFor(ctx, matchId, identity)) return;
    if (match.gameKind === "pen_fight") {
      const metricIdentity = penMetricIdentity(ctx, identity);
      updatePenMetrics(ctx, {
        participants: 1,
        uniqueSpectators: metricIdentity.hasSpectated ? 0 : 1,
      });
      ctx.db.penFightMetricsIdentity.identity.update({
        ...metricIdentity,
        hasSpectated: 1,
      });
    }
    const participantMetrics = metricsIdentityFor(ctx, identity);
    applyMetricDelta(
      ctx,
      spectatorJoinDelta(participantMetrics.hasSpectated === 1),
    );
    ctx.db.metricsIdentity.identity.update({
      ...participantMetrics,
      hasSpectated: 1,
    });
    ctx.db.matchSpectator.insert({
      id: nextId(ctx.db.matchSpectator.iter()),
      matchId,
      identity,
      displayName: profile.displayName,
      joinedAt: ctx.timestamp,
    });
    emit(ctx, matchId, `${profile.displayName} joined the crowd`);
  },
);

const rejectCrowdPower = (
  ctx: any,
  matchId: bigint,
  power: string,
  reason: string,
) => {
  const profile = player(ctx);
  emit(
    ctx,
    matchId,
    `${profile.displayName}'s ${power.toUpperCase()} was rejected: ${reason}`,
  );
};

export const useCrowdPower = spacetimedb.reducer(
  { matchId: t.u64(), power: t.string(), target: t.string() },
  (ctx: any, { matchId, power, target }: any) => {
    const identity = canonicalIdentity(ctx);
    const match = ctx.db.match.id.find(matchId);
    if (!match || match.status !== "active")
      return rejectCrowdPower(ctx, matchId, power, "match is not live");
    if (!spectatorFor(ctx, matchId, identity))
      return rejectCrowdPower(ctx, matchId, power, "join the crowd first");
    if (!isCrowdPower(power))
      return rejectCrowdPower(ctx, matchId, power, "unknown power");
    if (target !== "human" && target !== "melabot")
      return rejectCrowdPower(ctx, matchId, power, "invalid target");
    const now = nowMicros(ctx);
    const existingCooldown = cooldownFor(ctx, matchId, identity, power);
    if (existingCooldown && existingCooldown.readyAtMicros > now)
      return rejectCrowdPower(ctx, matchId, power, "cooling down");
    const crowd = ctx.db.matchCrowd.matchId.find(matchId);
    if (!crowd)
      return rejectCrowdPower(ctx, matchId, power, "crowd is unavailable");
    const nextEnergy = crowdPowerResult(crowd.energy, power);
    if (nextEnergy === undefined)
      return rejectCrowdPower(ctx, matchId, power, "not enough Crowd Energy");
    const config = CROWD_POWERS[power as CrowdPower];
    if (
      power !== "cheer" &&
      effectsFor(ctx, matchId, target).some((effect) => effect.power === power)
    )
      return rejectCrowdPower(
        ctx,
        matchId,
        power,
        "already active for that side",
      );

    ctx.db.matchCrowd.matchId.update({ ...crowd, energy: nextEnergy });
    const readyAtMicros = now + config.cooldownMicros;
    if (existingCooldown)
      ctx.db.spectatorCooldown.id.update({
        ...existingCooldown,
        readyAtMicros,
      });
    else
      ctx.db.spectatorCooldown.insert({
        id: nextId(ctx.db.spectatorCooldown.iter()),
        matchId,
        identity,
        power,
        readyAtMicros,
      });

    const profile = player(ctx);
    const actorMetrics = metricsIdentityFor(ctx, identity);
    applyMetricDelta(ctx, crowdActionDelta(actorMetrics.hasActed !== 1));
    if (actorMetrics.hasActed !== 1)
      ctx.db.metricsIdentity.identity.update({ ...actorMetrics, hasActed: 1 });
    const melaProfile = ensureMelaProfile(ctx, identity);
    ctx.db.melaProfile.identity.update({
      ...melaProfile,
      crowdActions: melaProfile.crowdActions + 1,
      crowdInfluence:
        melaProfile.crowdInfluence +
        crowdInfluenceForPower(power as CrowdPower),
      updatedAt: ctx.timestamp,
    });
    const activity = ctx.db.matchCrowdActivity.matchId.find(matchId);
    if (activity)
      ctx.db.matchCrowdActivity.matchId.update({
        ...activity,
        actions: activity.actions + 1,
        energySpent: activity.energySpent + config.cost,
        lastActor: profile.displayName,
        lastPower: power,
      });
    if (power === "cheer") {
      emit(
        ctx,
        matchId,
        `${profile.displayName} CHEERED — Crowd Energy ${nextEnergy}/${crowd.maxEnergy}`,
      );
      return;
    }
    const effectId = nextId(ctx.db.crowdEffect.iter());
    const expiresAtMicros = now + config.durationMicros;
    ctx.db.crowdEffect.insert({
      id: effectId,
      matchId,
      power,
      target,
      actorName: profile.displayName,
      expiresAtMicros,
    });
    scheduleCrowdTask(ctx, "effect_expiry", matchId, effectId, expiresAtMicros);
    emit(
      ctx,
      matchId,
      `${profile.displayName} activated ${config.label} for ${target}`,
    );
  },
);

export const processCrowdSchedule = spacetimedb.reducer(
  { onSchedule: crowdSchedule },
  { arg: crowdSchedule.rowType },
  (ctx: any, { arg }: any) => {
    const match = ctx.db.match.id.find(arg.matchId);
    if (!match || match.status !== "active") return;
    if (arg.kind === "agent_timeout" || arg.kind === "agent_shot") {
      processAgentWake(ctx, match, arg);
      return;
    }
    if (arg.kind === "dots_ai_wake") {
      const state = ctx.db.dotsBoxesState.matchId.find(arg.matchId);
      if (
        !state ||
        match.gameKind !== "dots_boxes" ||
        state.turn !== "melabot" ||
        state.revision !== Number(arg.effectId)
      )
        return;
      const [from, to] = decideDotsMove(state.edges);
      resolveDotsTurn(ctx, match, state, "melabot", from, to);
      return;
    }
    if (arg.kind === "gilli_ai_wake") {
      const state = ctx.db.gilliDandaState.matchId.find(arg.matchId);
      if (
        !state ||
        match.gameKind !== "gilli_danda" ||
        state.turn !== "melabot" ||
        state.round !== Number(arg.effectId)
      )
        return;
      // MelaBot's timing/power are derived only from committed state.
      resolveGilliTurn(
        ctx,
        match,
        state,
        "melabot",
        Number(state.seed % 3n) + 1,
        Number((state.seed / 7n) % 101n),
      );
      return;
    }
    if (arg.kind === "ai_wake") {
      if (match.gameKind === "pen_fight") {
        if (ctx.db.agentDuel.matchId.find(match.id)) return;
        const state = ctx.db.penFightState.matchId.find(arg.matchId);
        if (
          !state ||
          state.turn !== "bot" ||
          state.turnsInRound !== Number(arg.effectId)
        )
          return;
        const proposal = new DeterministicPenFightAIProvider().decideAction(
          state,
        );
        emit(ctx, arg.matchId, proposal.rationale);
        resolvePenFlick(
          ctx,
          match,
          state,
          "melabot",
          proposal.aimX,
          proposal.aimY,
          proposal.force,
          proposal.contact,
        );
        return;
      }
      const state = ctx.db.bookCricketState.matchId.find(arg.matchId);
      if (
        !state ||
        !shouldExecuteScheduledAIWake({
          matchStatus: match.status,
          turn: state.turn,
          botBalls: state.botBalls,
          expectedBotBalls: Number(arg.effectId),
        })
      )
        return;
      const proposal = new DeterministicAIProvider().decideAction({
        target: state.target,
        botScore: state.botScore,
        botBalls: state.botBalls,
        botWickets: state.botWickets,
        effects: {
          boost: effectsFor(ctx, arg.matchId, "melabot").some(
            (effect) => effect.power === "boost",
          ),
          chaos: effectsFor(ctx, arg.matchId, "melabot").some(
            (effect) => effect.power === "chaos",
          ),
          shield: effectsFor(ctx, arg.matchId, "melabot").some(
            (effect) => effect.power === "shield",
          ),
        },
      });
      emit(ctx, arg.matchId, proposal.rationale);
      emit(ctx, arg.matchId, `MelaBot chose ${proposal.style.toUpperCase()}`);
      resolveDelivery(ctx, match, state, "bot", proposal.style);
      return;
    }
    if (arg.kind === "effect_expiry") {
      const effect = ctx.db.crowdEffect.id.find(arg.effectId);
      if (effect && effect.expiresAtMicros <= nowMicros(ctx)) {
        ctx.db.crowdEffect.id.delete(effect.id);
        // Naming the spectator is the point — their Energy was spent and the
        // flick never came, which is a real outcome worth seeing. The power
        // itself is safe to name now: it has expired and cannot be played
        // around.
        emit(
          ctx,
          arg.matchId,
          `${effect.actorName}'s ${effect.power.toUpperCase()} ran out before the flick.`,
        );
      }
      return;
    }
    if (arg.kind === "regen") {
      const crowd = ctx.db.matchCrowd.matchId.find(arg.matchId);
      if (crowd && crowd.energy < crowd.maxEnergy) {
        const energy = Math.min(
          crowd.maxEnergy,
          crowd.energy + BOOK_CRICKET_RULES.crowdEnergyRegenAmount,
        );
        ctx.db.matchCrowd.matchId.update({ ...crowd, energy });
        emit(
          ctx,
          arg.matchId,
          `Crowd Energy +${BOOK_CRICKET_RULES.crowdEnergyRegenAmount} (${energy}/${crowd.maxEnergy})`,
        );
      }
      scheduleCrowdTask(
        ctx,
        "regen",
        arg.matchId,
        0n,
        nowMicros(ctx) + BOOK_CRICKET_RULES.crowdEnergyRegenMicros,
      );
    }
  },
);
