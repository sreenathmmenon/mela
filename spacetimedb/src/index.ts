import { ScheduleAt, schema, table, t } from "spacetimedb/server";
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
import {
  crowdInfluenceForPower,
  nextBookCricketRecord,
  notableCrowdMoment,
  playerProgressAfterMatch,
  spectatorProgressAfterMatch,
} from "./melaMemory";
import {
  type MelaMetricDelta,
  completedMatchDelta,
  crowdActionDelta,
  playerMatchStartDelta,
  spectatorJoinDelta,
} from "./melaMetrics";

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
    { public: true },
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
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      matchId: t.u64(),
      identity: t.identity(),
      power: t.string(),
      readyAtMicros: t.u64(),
    },
  ),
  crowdEffect: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      matchId: t.u64(),
      power: t.string(),
      target: t.string(),
      expiresAtMicros: t.u64(),
    },
  ),
  crowdSchedule,
});
export default spacetimedb;

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
  const row = { identity, hasPlayed, hasSpectated, completedPlayerMatches };
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
    updatedAt: ctx.timestamp,
  });
};
const player = (ctx: any) => {
  const row = ctx.db.playerProfile.identity.find(ctx.sender);
  if (!row) throw new Error("Choose a display name first.");
  ensureMelaProfile(ctx, ctx.sender);
  return row;
};
const nextMatchId = (ctx: any) => nextId(ctx.db.match.iter());
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
  if (!human) throw new Error("Match player profile is unavailable.");
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
  const result = applyCrowdDeliveryEffects(
    resolveBookCricketOutcome(state.seed, style, effectState.chaos),
    effectState,
  );
  for (const effect of effects) ctx.db.crowdEffect.id.delete(effect.id);
  if (effects.length)
    emit(
      ctx,
      match.id,
      `Crowd effects resolved for ${target}: ${effects.map((effect) => effect.power.toUpperCase()).join(", ")}`,
    );
  const balls = (human ? state.humanBalls : state.botBalls) + 1;
  const wickets =
    (human ? state.humanWickets : state.botWickets) + (result.wicket ? 1 : 0);
  const score = (human ? state.humanScore : state.botScore) + result.runs;
  let next = {
    ...state,
    seed: result.seed,
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
    };
  else
    next = { ...next, botBalls: balls, botWickets: wickets, botScore: score };
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

export const init = spacetimedb.init((ctx: any) => {
  ensureWorld(ctx);
  ensureMelaBot(ctx);
  ensureMetrics(ctx);
});
export const onConnect = spacetimedb.clientConnected((ctx: any) => {
  ensureWorld(ctx);
  ensureMelaBot(ctx);
  // Module init is not replayed for every in-place Maincloud migration. This
  // makes the first post-migration connection seed a truthful snapshot from
  // the persisted match tables, then normal reducers maintain it incrementally.
  ensureMetrics(ctx);
  if (ctx.db.playerProfile.identity.find(ctx.sender))
    ensureMelaProfile(ctx, ctx.sender);
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
export const onboard = spacetimedb.reducer(
  { displayName: t.string() },
  (ctx: any, { displayName }: any) => {
    ensureWorld(ctx);
    const name = displayName.trim();
    if (name.length < 2 || name.length > 24)
      throw new Error("Name must be 2–24 characters.");
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
  },
);
export const createBookCricket = spacetimedb.reducer((ctx: any) => {
  const p = player(ctx);
  for (const existingMatch of ctx.db.match.iter())
    if (
      existingMatch.gameKind === "book_cricket" &&
      existingMatch.status === "active"
    )
      throw new Error(
        "A Book Cricket match is already live. Join the crowd or finish it first.",
      );
  const participantMetrics = metricsIdentityFor(ctx, ctx.sender);
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
    playerIdentity: ctx.sender,
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
    identity: ctx.sender,
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
export const playBall = spacetimedb.reducer(
  { matchId: t.u64(), style: t.string() },
  (ctx: any, { matchId, style }: any) => {
    const match = ctx.db.match.id.find(matchId);
    const state = ctx.db.bookCricketState.matchId.find(matchId);
    if (
      !match ||
      !state ||
      match.status !== "active" ||
      !match.playerIdentity.isEqual(ctx.sender)
    )
      throw new Error("Not your active match.");
    if (
      state.turn !== "human" ||
      (style !== "safe" && style !== "balanced" && style !== "aggressive")
    )
      throw new Error("Illegal delivery.");
    resolveDelivery(ctx, match, state, "human", style);
  },
);
export const joinMatchAsSpectator = spacetimedb.reducer(
  { matchId: t.u64() },
  (ctx: any, { matchId }: any) => {
    const match = ctx.db.match.id.find(matchId);
    const profile = player(ctx);
    if (!match || match.status !== "active")
      throw new Error("That match is not live.");
    if (match.playerIdentity.isEqual(ctx.sender))
      throw new Error("The player is already in this match.");
    if (spectatorFor(ctx, matchId, ctx.sender)) return;
    const participantMetrics = metricsIdentityFor(ctx, ctx.sender);
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
      identity: ctx.sender,
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
    const match = ctx.db.match.id.find(matchId);
    if (!match || match.status !== "active")
      return rejectCrowdPower(ctx, matchId, power, "match is not live");
    if (!spectatorFor(ctx, matchId, ctx.sender))
      return rejectCrowdPower(ctx, matchId, power, "join the crowd first");
    if (!isCrowdPower(power))
      return rejectCrowdPower(ctx, matchId, power, "unknown power");
    if (target !== "human" && target !== "melabot")
      return rejectCrowdPower(ctx, matchId, power, "invalid target");
    const now = nowMicros(ctx);
    const existingCooldown = cooldownFor(ctx, matchId, ctx.sender, power);
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
        identity: ctx.sender,
        power,
        readyAtMicros,
      });

    const profile = player(ctx);
    applyMetricDelta(ctx, crowdActionDelta());
    const melaProfile = ensureMelaProfile(ctx, ctx.sender);
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
    if (arg.kind === "ai_wake") {
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
        emit(
          ctx,
          arg.matchId,
          `${effect.power.toUpperCase()} expired for ${effect.target}`,
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
