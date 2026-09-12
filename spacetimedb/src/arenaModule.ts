import { ScheduleAt, SenderError, table, t } from "spacetimedb/server";
import {
  ARENA_POWERS,
  POLICIES,
  decideArena,
  initialArena,
  isArenaKind,
  resolveArena,
  validateArenaAction,
  validateCourse,
  type ArenaState,
  type Side,
} from "./arenaRules";

const arenaWake = table(
  { public: false },
  {
    id: t.u64().primaryKey().autoInc(),
    scheduledAt: t.scheduleAt(),
    matchId: t.u64(),
    revision: t.u32(),
  },
);
export const arenaTables = {
  arenaState: table(
    { public: true },
    {
      matchId: t.u64().primaryKey(),
      revision: t.u32(),
      state: t.string(),
      phase: t.string(),
      mode: t.string(),
      leftPolicy: t.string(),
      rightPolicy: t.string(),
      agentIdentity: t.identity().optional(),
      provenance: t.string(),
    },
  ),
  arenaIntent: table(
    { public: false },
    {
      id: t.u64().primaryKey().autoInc(),
      matchId: t.u64().index(),
      side: t.u8(),
      revision: t.u32(),
      action: t.string(),
      source: t.string(),
    },
  ),
  arenaCrowd: table(
    { public: false },
    { matchId: t.u64().primaryKey(), power: t.string(), actor: t.string() },
  ),
  arenaFrame: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      matchId: t.u64().index(),
      revision: t.u32(),
      state: t.string(),
      actions: t.string(),
      source: t.string(),
    },
  ),
  arenaCourse: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      owner: t.identity(),
      name: t.string(),
      walls: t.string(),
      createdAt: t.timestamp(),
    },
  ),
  arenaWake,
};
export function arenaModule(db: any, services: any) {
  const fail = (text: string): never => {
    throw new SenderError(text);
  };
  const state = (ctx: any, id: bigint) => {
    const row = ctx.db.arenaState.matchId.find(id),
      match = ctx.db.match.id.find(id);
    if (!row || !match) fail("This arena is unavailable.");
    return { row, match, s: JSON.parse(row.state) as ArenaState };
  };
  const intents = (ctx: any, id: bigint) =>
    Array.from(ctx.db.arenaIntent.matchId.filter(id)) as any[];
  function wake(ctx: any, id: bigint, revision: number, delay = 2500000n) {
    ctx.db.arenaWake.insert({
      id: 0n,
      matchId: id,
      revision,
      scheduledAt: ScheduleAt.time(ctx.timestamp.microsSinceUnixEpoch + delay),
    });
  }
  function start(
    ctx: any,
    kind: string,
    mode = "solo",
    leftPolicy = "runner",
    rightPolicy = "trickster",
    walls?: number[],
  ) {
    if (!isArenaKind(kind)) fail("Choose an arena game.");
    services.ensureGuest(ctx);
    const owner = services.identity(ctx);
    const previous = (Array.from(ctx.db.match.iter()) as any[])
      .filter((m) => m.gameKind === kind && m.playerIdentity.isEqual(owner))
      .sort((a, b) => Number(b.id - a.id))[0];
    const { matchId } = services.create(ctx, kind);
    if (previous && !ctx.db.playgroundRematch.previousMatchId.find(previous.id))
      ctx.db.playgroundRematch.insert({
        previousMatchId: previous.id,
        nextMatchId: matchId,
        createdAt: ctx.timestamp,
      });
    // Arena energy regenerates per committed beat, not on a repeating timer.
    for (const task of ctx.db.crowdSchedule.iter())
      if (task.matchId === matchId) ctx.db.crowdSchedule.id.delete(task.id);
    if (mode === "agents")
      for (const p of ctx.db.matchParticipant.iter())
        if (p.matchId === matchId)
          ctx.db.matchParticipant.id.update({
            ...p,
            actorKind: "ai",
            displayName:
              p.role === "player"
                ? `Amber · ${leftPolicy}`
                : `Teal · ${rightPolicy}`,
          });
    const s = initialArena(kind as any, walls);
    ctx.db.arenaState.insert({
      matchId,
      revision: 0,
      state: JSON.stringify(s),
      phase: mode === "agents" ? "thinking" : "planning",
      mode,
      leftPolicy,
      rightPolicy,
      agentIdentity: undefined,
      provenance: "MelaBot · deterministic",
    });
    ctx.db.arenaFrame.insert({
      id: 0n,
      matchId,
      revision: 0,
      state: JSON.stringify(s),
      actions: "[]",
      source: "opening",
    });
    if (mode === "agents") wake(ctx, matchId, 0, 25000000n);
    return matchId;
  }
  function resolve(ctx: any, id: bigint, revision: number) {
    const { row, match, s } = state(ctx, id);
    if (
      match.status !== "active" ||
      row.revision !== revision ||
      row.phase !== "thinking"
    )
      return;
    const proposals = intents(ctx, id);
    if (row.mode !== "agents" && !proposals.some((p) => p.side === 0)) return;
    const actions = ([0, 1] as Side[]).map((side) => {
      const p = proposals.find((v) => v.side === side);
      return p
        ? JSON.parse(p.action)
        : decideArena(s, side, side === 0 ? row.leftPolicy : row.rightPolicy);
    }) as any;
    const source = ([0, 1] as Side[]).map(
      (side) =>
        proposals.find((p) => p.side === side)?.source ??
        (row.agentIdentity ? "MelaBot fallback" : "MelaBot strategy"),
    );
    const crowd = ctx.db.arenaCrowd.matchId.find(id);
    const next = resolveArena(s, actions, crowd);
    const finished = Boolean(next.winner);
    ctx.db.arenaState.matchId.update({
      ...row,
      revision: next.beat,
      state: JSON.stringify(next),
      phase: finished
        ? "complete"
        : row.mode === "agents"
          ? "thinking"
          : "planning",
      provenance: source.join(" / "),
    });
    ctx.db.arenaFrame.insert({
      id: 0n,
      matchId: id,
      revision: next.beat,
      state: JSON.stringify(next),
      actions: JSON.stringify(actions),
      source: source.join(" / "),
    });
    for (const p of proposals) ctx.db.arenaIntent.id.delete(p.id);
    ctx.db.arenaCrowd.matchId.delete(id);
    const energy = ctx.db.matchCrowd.matchId.find(id);
    ctx.db.matchCrowd.matchId.update({
      ...energy,
      energy: Math.min(energy.maxEnergy, energy.energy + 3),
    });
    for (const message of next.log) services.emit(ctx, id, message);
    if (finished)
      services.finish(
        ctx,
        match,
        next.winner,
        next.pawns[0].score,
        next.pawns[1].score,
        `${next.log.join(" ")} ${next.eggs.length} discoveries. ${source.join(" / ")}.`,
      );
    else if (row.mode === "agents")
      wake(ctx, id, next.beat, row.agentIdentity ? 25000000n : 2500000n);
  }
  const create = db.reducer(
    {
      gameKind: t.string(),
      mode: t.string(),
      leftPolicy: t.string(),
      rightPolicy: t.string(),
      courseId: t.u64(),
    },
    (ctx: any, a: any) => {
      if (
        !["solo", "agents"].includes(a.mode) ||
        !POLICIES.includes(a.leftPolicy) ||
        !POLICIES.includes(a.rightPolicy)
      )
        fail("Choose a supported character strategy.");
      const course = a.courseId
        ? ctx.db.arenaCourse.id.find(a.courseId)
        : undefined;
      if (a.courseId && !course) fail("That course was not found.");
      start(
        ctx,
        a.gameKind,
        a.mode,
        a.leftPolicy,
        a.rightPolicy,
        course ? JSON.parse(course.walls) : undefined,
      );
    },
  );
  const action = db.reducer(
    { matchId: t.u64(), revision: t.u32(), side: t.u8(), action: t.string() },
    (ctx: any, a: any) => {
      const { row, match, s } = state(ctx, a.matchId),
        identity = services.identity(ctx);
      if (match.status !== "active" || a.revision !== row.revision)
        fail("The arena has moved on. Choose your next move.");
      if (a.side > 1) fail("Invalid seat.");
      const human =
        a.side === 0 &&
        row.mode === "solo" &&
        match.playerIdentity.isEqual(identity);
      const agent =
        row.agentIdentity?.isEqual(ctx.sender) &&
        (a.side === 1 || row.mode === "agents");
      if (!human && !agent) fail("Only the owner of this seat can play.");
      if (a.action.length > 160) fail("Invalid move.");
      let move;
      try {
        move = JSON.parse(a.action);
        validateArenaAction(s, a.side, move);
      } catch {
        fail("Choose a legal move.");
      }
      if (intents(ctx, a.matchId).some((p) => p.side === a.side))
        fail("Your move is already locked.");
      ctx.db.arenaIntent.insert({
        id: 0n,
        matchId: a.matchId,
        revision: a.revision,
        side: a.side,
        action: JSON.stringify(move),
        source: human ? "Human" : "External agent",
      });
      if (row.phase === "planning") {
        ctx.db.arenaState.matchId.update({ ...row, phase: "thinking" });
        wake(
          ctx,
          a.matchId,
          row.revision,
          row.agentIdentity ? 25000000n : 2500000n,
        );
      }
      if (row.agentIdentity && intents(ctx, a.matchId).length === 2)
        wake(ctx, a.matchId, row.revision);
    },
  );
  const connectAgent = db.reducer(
    { matchId: t.u64(), agent: t.identity() },
    (ctx: any, a: any) => {
      const { row, match } = state(ctx, a.matchId);
      if (
        match.status !== "active" ||
        !match.playerIdentity.isEqual(services.identity(ctx)) ||
        row.revision !== 0 ||
        intents(ctx, a.matchId).length
      )
        fail("Connect the agent before the first move.");
      if (a.agent.isEqual(ctx.sender))
        fail("An agent needs an independent connection.");
      ctx.db.arenaState.matchId.update({
        ...row,
        agentIdentity: a.agent,
        provenance: "External agent connected",
      });
    },
  );
  const power = db.reducer(
    { matchId: t.u64(), power: t.string() },
    (ctx: any, a: any) => {
      const { row, match } = state(ctx, a.matchId),
        identity = services.identity(ctx);
      if (match.status !== "active") fail("This match has finished.");
      if (
        match.playerIdentity.isEqual(identity) ||
        row.agentIdentity?.isEqual(ctx.sender)
      )
        fail("Players cannot use crowd powers.");
      const spectator = Array.from(ctx.db.matchSpectator.iter()).find(
        (v: any) => v.matchId === a.matchId && v.identity.isEqual(identity),
      ) as any;
      if (!spectator) fail("Join the crowd first.");
      const rule = ARENA_POWERS[a.power as keyof typeof ARENA_POWERS];
      if (!rule) fail("Unknown power.");
      if (ctx.db.arenaCrowd.matchId.find(a.matchId))
        fail("The crowd has already chosen for this beat.");
      const previous = Array.from(ctx.db.spectatorCooldown.iter()).find(
        (v: any) => v.matchId === a.matchId && v.identity.isEqual(identity),
      ) as any;
      if (
        previous &&
        previous.readyAtMicros > ctx.timestamp.microsSinceUnixEpoch
      )
        fail("Your crowd power is cooling down.");
      const pool = ctx.db.matchCrowd.matchId.find(a.matchId);
      if (pool.energy < rule.cost) fail("Not enough shared Crowd Energy.");
      ctx.db.matchCrowd.matchId.update({
        ...pool,
        energy: pool.energy - rule.cost,
      });
      if (previous) ctx.db.spectatorCooldown.id.delete(previous.id);
      ctx.db.spectatorCooldown.insert({
        id: services.nextId(ctx.db.spectatorCooldown.iter()),
        matchId: a.matchId,
        identity,
        power: a.power,
        readyAtMicros: ctx.timestamp.microsSinceUnixEpoch + rule.cooldown,
      });
      ctx.db.arenaCrowd.insert({
        matchId: a.matchId,
        power: a.power,
        actor: spectator.displayName,
      });
      const activity = ctx.db.matchCrowdActivity.matchId.find(a.matchId);
      ctx.db.matchCrowdActivity.matchId.update({
        ...activity,
        actions: activity.actions + 1,
        energySpent: activity.energySpent + rule.cost,
        lastActor: spectator.displayName,
        lastPower: a.power,
      });
      const profile = services.profile(ctx, identity);
      ctx.db.melaProfile.identity.update({
        ...profile,
        crowdActions: profile.crowdActions + 1,
        crowdInfluence: profile.crowdInfluence + 1,
        updatedAt: ctx.timestamp,
      });
    },
  );
  const pending = db.view(
    { public: true },
    t.array(
      t.row("ArenaCrowdView", {
        matchId: t.u64(),
        power: t.string(),
        actor: t.string(),
      }),
    ),
    (ctx: any) =>
      Array.from(ctx.db.arenaCrowd.iter()).filter((r: any) =>
        Array.from(ctx.db.matchSpectator.iter()).some(
          (v: any) =>
            v.matchId === r.matchId &&
            v.identity.isEqual(services.identity(ctx)),
        ),
      ),
  );
  const publish = db.reducer(
    { name: t.string(), walls: t.string() },
    (ctx: any, a: any) => {
      services.ensureGuest(ctx);
      if (
        a.name.trim().length < 2 ||
        a.name.length > 40 ||
        a.walls.length > 200
      )
        fail("Name your course in 2–40 characters.");
      let walls;
      try {
        walls = validateCourse(JSON.parse(a.walls));
      } catch {
        fail(
          "Keep every tile reachable, and leave the goals clear. Maximum 14 blocks.",
        );
      }
      const owner = services.identity(ctx);
      if (
        Array.from(ctx.db.arenaCourse.iter()).filter((c: any) =>
          c.owner.isEqual(owner),
        ).length >= 12
      )
        fail("Your twelve course slots are full.");
      ctx.db.arenaCourse.insert({
        id: 0n,
        owner,
        name: a.name.trim(),
        walls: JSON.stringify(walls),
        createdAt: ctx.timestamp,
      });
    },
  );
  const scheduled = db.reducer(
    { onSchedule: arenaWake },
    { arg: arenaWake.rowType },
    (ctx: any, { arg }: any) => resolve(ctx, arg.matchId, arg.revision),
  );
  const inbox = db.view(
    { public: true },
    t.array(arenaTables.arenaState.rowType),
    (ctx: any) =>
      Array.from(ctx.db.arenaState.iter()).filter(
        (r: any) =>
          r.phase !== "complete" &&
          r.agentIdentity?.isEqual(ctx.sender) &&
          ctx.db.match.id.find(r.matchId)?.status === "active",
      ),
  );
  return {
    start,
    create,
    action,
    power,
    pending,
    publish,
    scheduled,
    connectAgent,
    inbox,
  };
}
