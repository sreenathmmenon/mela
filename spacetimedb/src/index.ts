import { schema, table, t } from "spacetimedb/server";
import {
  type BookCricketStyle,
  chooseMelaBotStyle,
  isInningsComplete,
  resolveBookCricketOutcome,
  resolveChaseWinner,
} from "./bookCricketRules";

const WORLD_ID = 1n;

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
  liveEvent: table(
    { public: true, event: true },
    {
      id: t.u64().primaryKey().autoInc(),
      matchId: t.u64(),
      message: t.string(),
      occurredAt: t.timestamp(),
    },
  ),
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
const player = (ctx: any) => {
  const row = ctx.db.playerProfile.identity.find(ctx.sender);
  if (!row) throw new Error("Choose a display name first.");
  return row;
};
const nextMatchId = (ctx: any) => nextId(ctx.db.match.iter());

function resolveDelivery(
  ctx: any,
  match: any,
  state: any,
  side: "human" | "bot",
  style: BookCricketStyle,
) {
  const result = resolveBookCricketOutcome(state.seed, style);
  const human = side === "human";
  const balls = (human ? state.humanBalls : state.botBalls) + 1;
  const wickets =
    (human ? state.humanWickets : state.botWickets) + (result.wicket ? 1 : 0);
  const score = (human ? state.humanScore : state.botScore) + result.runs;
  let next = {
    ...state,
    seed: result.seed,
    lastOutcome: result.wicket ? "WICKET" : String(result.runs),
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
  const over =
    isInningsComplete(balls, wickets) || (!human && score >= state.target);
  if (over && human) {
    next = {
      ...next,
      innings: 2,
      turn: "bot",
      target: score + 1,
      lastOutcome: "INNINGS BREAK",
    };
    emit(ctx, match.id, `MelaBot needs ${score + 1}`);
  } else if (over) {
    const winner = resolveChaseWinner(score, state.target);
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
      humanScore: next.humanScore,
      botScore: next.botScore,
      occurredAt: ctx.timestamp,
    });
    next = {
      ...next,
      turn: "complete",
      lastOutcome: winner === "draw" ? "DRAW" : `${winner.toUpperCase()} WINS`,
    };
    emit(ctx, match.id, next.lastOutcome);
  } else {
    emit(ctx, match.id, `${human ? "Human" : "MelaBot"} → ${next.lastOutcome}`);
  }
  ctx.db.bookCricketState.matchId.update(next);
}

export const init = spacetimedb.init(ensureWorld);
export const onConnect = spacetimedb.clientConnected((ctx: any) => {
  ensureWorld(ctx);
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
    displayName: "MelaBot",
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
    if (state.turn !== "human" || (style !== "steady" && style !== "attack"))
      throw new Error("Illegal delivery.");
    resolveDelivery(ctx, match, state, "human", style);
  },
);
export const runMelaBotTurn = spacetimedb.reducer(
  { matchId: t.u64() },
  (ctx: any, { matchId }: any) => {
    const match = ctx.db.match.id.find(matchId);
    const state = ctx.db.bookCricketState.matchId.find(matchId);
    if (!match || !state || match.status !== "active" || state.turn !== "bot")
      throw new Error("MelaBot is not ready.");
    resolveDelivery(
      ctx,
      match,
      state,
      "bot",
      chooseMelaBotStyle(state.target, state.botScore),
    );
  },
);
