import { schema, table, t } from 'spacetimedb/server';

const WORLD_ID = 1n;
const WORLD_NAME = 'Mela Commons';
const MAX_DISPLAY_NAME_LENGTH = 24;

const spacetimedb = schema({
  world: table({ public: true }, {
    id: t.u64().primaryKey(),
    name: t.string(),
    status: t.string(),
    createdAt: t.timestamp(),
  }),
  playerProfile: table({ public: true }, {
    identity: t.identity().primaryKey(),
    displayName: t.string(),
    createdAt: t.timestamp(),
    lastSeenAt: t.timestamp(),
    melaLevel: t.u32(),
    crowdInfluence: t.u32(),
  }),
  worldPresence: table({ public: true }, {
    identity: t.identity().primaryKey(),
    worldId: t.u64(),
    state: t.string(),
    joinedAt: t.timestamp(),
    lastSeenAt: t.timestamp(),
  }),
  worldActivity: table({ public: true }, {
    id: t.u64().primaryKey().autoInc(),
    worldId: t.u64(),
    kind: t.string(),
    message: t.string(),
    occurredAt: t.timestamp(),
  }),
  connectionSession: table({ public: false }, {
    connectionId: t.connectionId().primaryKey(),
    identity: t.identity(),
    connectedAt: t.timestamp(),
  }),
});

export default spacetimedb;

function requireDisplayName(value: string): string {
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new Error(`Display name must be 2–${MAX_DISPLAY_NAME_LENGTH} characters.`);
  }
  return name;
}

function ensureWorld(ctx: any): void {
  if (!ctx.db.world.id.find(WORLD_ID)) {
    ctx.db.world.insert({ id: WORLD_ID, name: WORLD_NAME, status: 'open', createdAt: ctx.timestamp });
  }
}

function recordActivity(ctx: any, kind: string, message: string): void {
  ctx.db.worldActivity.insert({ worldId: WORLD_ID, kind, message, occurredAt: ctx.timestamp });
}

function setPresence(ctx: any, identity: any, state: string): void {
  const existing = ctx.db.worldPresence.identity.find(identity);
  if (existing) {
    ctx.db.worldPresence.identity.update({ ...existing, state, lastSeenAt: ctx.timestamp });
  } else {
    ctx.db.worldPresence.insert({ identity, worldId: WORLD_ID, state, joinedAt: ctx.timestamp, lastSeenAt: ctx.timestamp });
  }
}

export const init = spacetimedb.init(ctx => ensureWorld(ctx));

export const onConnect = spacetimedb.clientConnected(ctx => {
  ensureWorld(ctx);
  if (ctx.connectionId) {
    ctx.db.connectionSession.insert({ connectionId: ctx.connectionId, identity: ctx.sender, connectedAt: ctx.timestamp });
  }
});

export const onDisconnect = spacetimedb.clientDisconnected(ctx => {
  if (ctx.connectionId) ctx.db.connectionSession.connectionId.delete(ctx.connectionId);
});

export const onboard = spacetimedb.reducer({ displayName: t.string() }, (ctx, { displayName }) => {
  ensureWorld(ctx);
  const name = requireDisplayName(displayName);
  const existing = ctx.db.playerProfile.identity.find(ctx.sender);
  if (existing) {
    ctx.db.playerProfile.identity.update({ ...existing, displayName: name, lastSeenAt: ctx.timestamp });
  } else {
    ctx.db.playerProfile.insert({ identity: ctx.sender, displayName: name, createdAt: ctx.timestamp, lastSeenAt: ctx.timestamp, melaLevel: 1, crowdInfluence: 0 });
    recordActivity(ctx, 'player_joined', `${name} joined Mela`);
  }
  setPresence(ctx, ctx.sender, 'online');
});

export const joinWorld = spacetimedb.reducer(ctx => {
  ensureWorld(ctx);
  const profile = ctx.db.playerProfile.identity.find(ctx.sender);
  if (!profile) throw new Error('Choose a display name before joining Mela.');
  setPresence(ctx, ctx.sender, 'online');
  recordActivity(ctx, 'world_joined', `${profile.displayName} entered Mela Commons`);
});

export const leaveWorld = spacetimedb.reducer(ctx => {
  const profile = ctx.db.playerProfile.identity.find(ctx.sender);
  if (!profile) return;
  setPresence(ctx, ctx.sender, 'away');
  recordActivity(ctx, 'world_left', `${profile.displayName} stepped away`);
});
