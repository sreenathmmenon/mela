import { ScheduleAt, SenderError, table, t } from "spacetimedb/server";
import {
  arenaSeatKind,
  humansReady,
  roomNextPhase,
  ROOM_MODES,
  validateArenaInvite,
} from "./arenaSeats";
import { CHARACTER_PRESETS } from "./arenaCharacter";
import {
  validateCharacter,
  decideCharacter,
  characterEvents,
} from "./arenaCharacter";
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
  arenaRoom: table(
    { public: true },
    {
      matchId: t.u64().primaryKey(),
      mode: t.string(),
      leftIdentity: t.identity().optional(),
      rightIdentity: t.identity().optional(),
      leftName: t.string(),
      rightName: t.string(),
    },
  ),
  arenaInvitation: table(
    { public: false },
    {
      matchId: t.u64().primaryKey(),
      owner: t.identity().index(),
      code: t.string(),
    },
  ),
  arenaBudget: table(
    { public: false },
    {
      matchId: t.u64().primaryKey(),
      energy: t.u32(),
      maxEnergy: t.u32(),
    },
  ),
  arenaProduction: table(
    { public: true },
    {
      matchId: t.u64().primaryKey(),
      owner: t.identity().index(),
      amber: t.string(),
      teal: t.string(),
      courseId: t.u64(),
      createdAt: t.timestamp(),
    },
  ),
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
  const owns = (room: any, identity: any, side: number) =>
    (side === 0 ? room?.leftIdentity : room?.rightIdentity)?.isEqual(
      identity,
    ) ?? false;
  const seated = (ctx: any, id: bigint) => {
    const room = ctx.db.arenaRoom.matchId.find(id);
    return room
      ? [0, 1].some((side) => owns(room, services.identity(ctx), side))
      : Boolean(
          ctx.db.arenaState.matchId
            .find(id)
            ?.agentIdentity?.isEqual(ctx.sender) ||
          ctx.db.match.id
            .find(id)
            ?.playerIdentity.isEqual(services.identity(ctx)),
        );
  };
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
    ctx.db.arenaBudget.insert({ matchId, energy: 42, maxEnergy: 60 });
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
    const room = ctx.db.arenaRoom.matchId.find(id);
    const production = ctx.db.arenaProduction.matchId.find(id);
    if (
      room
        ? !humansReady(
            room.mode,
            proposals.map((p) => p.side),
          )
        : row.mode !== "agents" && !proposals.some((p) => p.side === 0)
    )
      return;
    const actions = ([0, 1] as Side[]).map((side) => {
      const p = proposals.find((v) => v.side === side);
      return p
        ? JSON.parse(p.action)
        : production
          ? decideCharacter(
              s,
              side,
              JSON.parse(side === 0 ? production.amber : production.teal),
            )
          : decideArena(s, side, side === 0 ? row.leftPolicy : row.rightPolicy);
    }) as any;
    const source = ([0, 1] as Side[]).map(
      (side) =>
        proposals.find((p) => p.side === side)?.source ??
        (room || row.agentIdentity ? "MelaBot fallback" : "MelaBot strategy"),
    );
    const crowd = ctx.db.arenaCrowd.matchId.find(id);
    if (room && source.some((s) => s === "MelaBot fallback")) {
      const previous = ctx.db.agentFallbackRecord.matchId.find(id);
      const counts = {
        matchId: id,
        leftTurns:
          (previous?.leftTurns ?? 0) +
          (source[0] === "MelaBot fallback" ? 1 : 0),
        rightTurns:
          (previous?.rightTurns ?? 0) +
          (source[1] === "MelaBot fallback" ? 1 : 0),
      };
      if (previous) ctx.db.agentFallbackRecord.matchId.update(counts);
      else ctx.db.agentFallbackRecord.insert(counts);
    }
    const next = resolveArena(s, actions, crowd);
    if (room && source.some((s) => s === "MelaBot fallback"))
      next.log.push("MelaBot covered a missed agent move.");
    if (room)
      next.log = characterEvents(next.log, room.leftName, room.rightName);
    else if (production) {
      const amber =
        row.mode === "agents" ? JSON.parse(production.amber).name : "Amber";
      const teal = JSON.parse(production.teal).name;
      next.log = characterEvents(next.log, amber, teal);
    }
    const finished = Boolean(next.winner);
    ctx.db.arenaState.matchId.update({
      ...row,
      revision: next.beat,
      state: JSON.stringify(next),
      phase: finished
        ? "complete"
        : room
          ? roomNextPhase(room.mode, true, [])
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
    const energy =
      ctx.db.arenaBudget.matchId.find(id) ?? ctx.db.matchCrowd.matchId.find(id);
    const refreshed = {
      ...energy,
      energy: Math.min(energy.maxEnergy, energy.energy + 3),
    };
    if (ctx.db.arenaBudget.matchId.find(id))
      ctx.db.arenaBudget.matchId.update(refreshed);
    ctx.db.matchCrowd.matchId.update({
      ...refreshed,
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
    else if (room ? room.mode === "agent_duel" : row.mode === "agents")
      wake(
        ctx,
        id,
        next.beat,
        room || row.agentIdentity ? 25000000n : 2500000n,
      );
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
      const room = ctx.db.arenaRoom.matchId.find(a.matchId);
      if (
        room &&
        (!room.leftIdentity || !room.rightIdentity || row.phase === "lobby")
      )
        fail("Wait for both seats to join.");
      const human = room
        ? owns(room, identity, a.side) &&
          arenaSeatKind(room.mode, a.side) === "human"
        : a.side === 0 &&
          row.mode === "solo" &&
          match.playerIdentity.isEqual(identity);
      const agent = room
        ? owns(room, identity, a.side) &&
          arenaSeatKind(room.mode, a.side) === "agent"
        : row.agentIdentity?.isEqual(ctx.sender) &&
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
      if (room) {
        const ready = intents(ctx, a.matchId);
        const phase = roomNextPhase(
          room.mode,
          true,
          ready.map((p) => p.side),
        );
        if (phase !== row.phase) {
          ctx.db.arenaState.matchId.update({ ...row, phase });
          if (phase === "thinking")
            wake(ctx, a.matchId, row.revision, 25000000n);
        }
        if (ready.length === 2) wake(ctx, a.matchId, row.revision);
      } else if (row.phase === "planning") {
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
  const produce = db.reducer(
    {
      gameKind: t.string(),
      mode: t.string(),
      amber: t.string(),
      teal: t.string(),
      courseId: t.u64(),
      agent: t.identity().optional(),
    },
    (ctx: any, a: any) => {
      if (!["solo", "agents"].includes(a.mode)) fail("Choose play or watch.");
      if (a.amber.length > 400 || a.teal.length > 400)
        fail("Character is too long.");
      let amber, teal;
      try {
        amber = validateCharacter(JSON.parse(a.amber));
        teal = validateCharacter(JSON.parse(a.teal));
      } catch {
        fail("Choose supported character traits and a short name.");
      }
      const course = a.courseId
        ? ctx.db.arenaCourse.id.find(a.courseId)
        : undefined;
      if (a.courseId && !course) fail("That course was not found.");
      if (a.agent?.isEqual(ctx.sender))
        fail("An agent needs an independent connection.");
      const id = start(
        ctx,
        a.gameKind,
        a.mode,
        "runner",
        "trickster",
        course ? JSON.parse(course.walls) : undefined,
      );
      ctx.db.arenaProduction.insert({
        matchId: id,
        owner: services.identity(ctx),
        amber: JSON.stringify(amber),
        teal: JSON.stringify(teal),
        courseId: a.courseId,
        createdAt: ctx.timestamp,
      });
      for (const p of ctx.db.matchParticipant.iter())
        if (p.matchId === id && (a.mode === "agents" || p.role !== "player"))
          ctx.db.matchParticipant.id.update({
            ...p,
            displayName: p.role === "player" ? amber!.name : teal!.name,
          });
      const row = ctx.db.arenaState.matchId.find(id);
      if (a.agent)
        ctx.db.arenaState.matchId.update({
          ...row,
          agentIdentity: a.agent,
          provenance: "External agent connected",
        });
      // A local character duel has no setup wait. External agents retain their bounded deadline.
      else if (a.mode === "agents") wake(ctx, id, 0);
    },
  );
  const connectAgent = db.reducer(
    { matchId: t.u64(), agent: t.identity() },
    (ctx: any, a: any) => {
      const { row, match } = state(ctx, a.matchId);
      if (ctx.db.arenaRoom.matchId.find(a.matchId))
        fail("Each agent must claim its own seat in this room.");
      if (
        match.status !== "active" ||
        !match.playerIdentity.isEqual(services.identity(ctx)) ||
        row.revision !== 0 ||
        intents(ctx, a.matchId).length
      )
        fail("Connect the agent before the first move.");
      if (a.agent.isEqual(ctx.sender))
        fail("An agent needs an independent connection.");
      if (
        Array.from(ctx.db.matchSpectator.iter()).some(
          (s: any) => s.matchId === a.matchId && s.identity.isEqual(a.agent),
        )
      )
        fail("A spectator cannot become a player in the same match.");
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
        (!ctx.db.arenaRoom.matchId.find(a.matchId) &&
          match.playerIdentity.isEqual(identity)) ||
        seated(ctx, a.matchId) ||
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
      let pool = ctx.db.arenaBudget.matchId.find(a.matchId);
      if (!pool)
        pool = ctx.db.arenaBudget.insert(
          ctx.db.matchCrowd.matchId.find(a.matchId),
        );
      if (pool.energy < rule.cost) fail("Not enough shared Crowd Energy.");
      ctx.db.arenaBudget.matchId.update({
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
      Array.from(ctx.db.arenaCrowd.iter()).filter(
        (r: any) =>
          !seated(ctx, r.matchId) &&
          Array.from(ctx.db.matchSpectator.iter()).some(
            (v: any) =>
              v.matchId === r.matchId &&
              v.identity.isEqual(services.identity(ctx)),
          ),
      ),
  );
  const energy = db.view(
    { public: true },
    t.array(arenaTables.arenaBudget.rowType),
    (ctx: any) =>
      Array.from(ctx.db.arenaBudget.iter()).filter(
        (r: any) =>
          !seated(ctx, r.matchId) &&
          Array.from(ctx.db.matchSpectator.iter()).some(
            (s: any) =>
              s.matchId === r.matchId &&
              s.identity.isEqual(services.identity(ctx)),
          ),
      ),
  );
  const invitation = db.view(
    { public: true },
    t.array(arenaTables.arenaInvitation.rowType),
    (ctx: any) =>
      Array.from(ctx.db.arenaInvitation.iter()).filter((r: any) =>
        r.owner.isEqual(services.identity(ctx)),
      ),
  );
  const ownMove = db.view(
    { public: true },
    t.array(
      t.row("ArenaOwnMove", {
        matchId: t.u64(),
        revision: t.u32(),
        side: t.u8(),
      }),
    ),
    (ctx: any) =>
      Array.from(ctx.db.arenaIntent.iter())
        .filter((r: any) => {
          const room = ctx.db.arenaRoom.matchId.find(r.matchId);
          return room && owns(room, services.identity(ctx), r.side);
        })
        .map((r: any) => ({
          matchId: r.matchId,
          revision: r.revision,
          side: r.side,
        })),
  );
  const createRoom = db.reducer(
    { gameKind: t.string(), mode: t.string(), inviteCode: t.string() },
    (ctx: any, a: any) => {
      if (!ROOM_MODES.includes(a.mode))
        fail("Choose friends, human vs agent, or two agents.");
      if (a.mode === "friends") {
        try {
          validateArenaInvite(a.inviteCode);
        } catch {
          fail("Invalid player invitation.");
        }
      }
      const id = start(
        ctx,
        a.gameKind,
        a.mode === "agent_duel" ? "agents" : "solo",
      );
      for (const task of ctx.db.arenaWake.iter())
        if (task.matchId === id) ctx.db.arenaWake.id.delete(task.id);
      const identity = services.identity(ctx);
      const human = ctx.db.playerProfile.identity.find(identity);
      ctx.db.arenaRoom.insert({
        matchId: id,
        mode: a.mode,
        leftIdentity: a.mode === "agent_duel" ? undefined : identity,
        rightIdentity: undefined,
        leftName:
          a.mode === "agent_duel"
            ? "Amber · open agent seat"
            : human.displayName,
        rightName:
          a.mode === "friends"
            ? "Waiting for your friend"
            : "Teal · open agent seat",
      });
      if (a.mode === "friends")
        ctx.db.arenaInvitation.insert({
          matchId: id,
          owner: identity,
          code: a.inviteCode,
        });
      const row = ctx.db.arenaState.matchId.find(id);
      ctx.db.arenaState.matchId.update({
        ...row,
        phase: "lobby",
        provenance: "Waiting for independent participants",
      });
      ctx.db.arenaProduction.insert({
        matchId: id,
        owner: identity,
        amber: JSON.stringify(CHARACTER_PRESETS[0]),
        teal: JSON.stringify(CHARACTER_PRESETS[1]),
        courseId: 0n,
        createdAt: ctx.timestamp,
      });
      for (const p of ctx.db.matchParticipant.iter())
        if (p.matchId === id)
          ctx.db.matchParticipant.id.update({
            ...p,
            actorKind:
              arenaSeatKind(a.mode, p.role === "player" ? 0 : 1) === "human"
                ? "human"
                : "ai",
            identity:
              p.role === "player" && a.mode !== "agent_duel"
                ? identity
                : undefined,
            displayName:
              p.role === "player" && a.mode !== "agent_duel"
                ? human.displayName
                : "Open seat",
          });
    },
  );
  const claim = db.reducer(
    {
      matchId: t.u64(),
      side: t.u8(),
      name: t.string(),
      inviteCode: t.string(),
    },
    (ctx: any, a: any) => {
      const { row, match } = state(ctx, a.matchId);
      const room = ctx.db.arenaRoom.matchId.find(a.matchId);
      if (!room || ![0, 1].includes(a.side) || match.status !== "active")
        fail("This seat is unavailable.");
      const identity = services.identity(ctx);
      if (owns(room, identity, a.side)) return; // same canonical identity reconnects without the original link
      if (
        (a.side === 0 ? room.leftIdentity : room.rightIdentity) ||
        owns(room, identity, 1 - a.side)
      )
        fail("Each participant owns one seat. This seat cannot be replaced.");
      if (
        Array.from(ctx.db.matchSpectator.iter()).some(
          (s: any) => s.matchId === a.matchId && s.identity.isEqual(identity),
        )
      )
        fail("A spectator cannot take a player seat in this match.");
      const kind = arenaSeatKind(room.mode, a.side);
      if (
        kind === "human" &&
        (a.side !== 1 ||
          a.inviteCode !== ctx.db.arenaInvitation.matchId.find(a.matchId)?.code)
      )
        fail("Use the private player invitation from your friend.");
      const name = a.name.trim();
      if (
        kind === "agent" &&
        (name.length < 2 || name.length > 24 || /[<>\x00-\x1f]/.test(name))
      )
        fail("Give your agent a public name of 2–24 characters.");
      services.ensureGuest(ctx);
      const displayName =
        kind === "human"
          ? ctx.db.playerProfile.identity.find(identity).displayName
          : name;
      const next = {
        ...room,
        ...(a.side === 0
          ? { leftIdentity: identity, leftName: displayName }
          : { rightIdentity: identity, rightName: displayName }),
      };
      ctx.db.arenaRoom.matchId.update(next);
      for (const p of ctx.db.matchParticipant.iter())
        if (
          p.matchId === a.matchId &&
          p.role === (a.side === 0 ? "player" : "opponent")
        )
          ctx.db.matchParticipant.id.update({
            ...p,
            identity,
            displayName,
            actorKind: kind === "human" ? "human" : "ai",
          });
      const phase = roomNextPhase(
        room.mode,
        Boolean(next.leftIdentity && next.rightIdentity),
        [],
      );
      ctx.db.arenaState.matchId.update({ ...row, phase });
      if (phase === "thinking") wake(ctx, a.matchId, row.revision, 25000000n);
      services.emit(
        ctx,
        a.matchId,
        `${displayName} took the ${a.side === 0 ? "Amber" : "Teal"} seat.`,
      );
    },
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
  const productionInbox = db.view(
    { public: true },
    t.array(arenaTables.arenaProduction.rowType),
    (ctx: any) =>
      Array.from(ctx.db.arenaProduction.iter()).filter(
        (r: any) =>
          ctx.db.arenaState.matchId
            .find(r.matchId)
            ?.agentIdentity?.isEqual(ctx.sender) &&
          ctx.db.match.id.find(r.matchId)?.status === "active",
      ),
  );
  return {
    createRoom,
    claim,
    invitation,
    ownMove,
    energy,
    produce,
    productionInbox,
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
