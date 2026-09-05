# MELA STATUS

## Last updated

- Date/time: 2026-09-05, Asia/Kolkata
- Agent/provider: Codex (GPT-5)
- Branch: `main`
- Git commit/push: the containing Phase 3 commit is on `main` and pushed to `origin/main`; use `git log -1` for its immutable hash.

## Current product state

Phases 0–3 are complete locally. Mela is a gaming-first persistent shared playground: players play, spectators influence, AI participates, and the world remembers. SpacetimeDB is the sole P0 authoritative world runtime; reducers are the mutation boundary and clients are projections.

The first vertical slice is Book Cricket, not the Mela product boundary. The reusable world layer is game-agnostic and game records retain `gameKind` and participant boundaries. The playable P0 match is Human vs deterministic MelaBot: human bats first, then MelaBot chases over six deliveries or two wickets per innings. Scores, wickets, innings, target, winner, events, and results are server-authoritative.

Phase 4 scope is intentionally absent: no Crowd Energy, spectator powers, external LLM, Pen Fight, advanced progression, synthetic load, or Maincloud deployment.

## Completed

- [x] Phase 0: SpacetimeDB-first architecture and P0 Book Cricket rules locked.
- [x] Phase 1: React/TypeScript and TypeScript SpacetimeDB local foundation.
- [x] Phase 2: authoritative world, durable identity/profile, identity-based presence, private connection sessions, and generated bindings.
- [x] Phase 3: match creation; generic human/AI participants; two innings; server-owned score/wickets/target/result; shared delivery resolution; deterministic MelaBot; realtime score/state; transient live events; durable completed-match history; player match UI.

## Authoritative SpacetimeDB state

- Local database: `mela-cah23` at `http://127.0.0.1:3000`; module: `spacetimedb/`.
- Reusable tables: `world`, `playerProfile`, `worldPresence`, `worldActivity`, private `connectionSession`.
- Book Cricket tables: `match`, `matchParticipant`, `bookCricketState`, event table `liveEvent`, durable `matchHistory`.
- Public reducers: `onboard`, `createBookCricket`, `playBall`, `runMelaBotTurn`.
- Human and MelaBot use common internal rule functions; reducers do not call reducers.
- `liveEvent` is transient delivery, not durable state. `matchHistory` is durable product history.
- Schedules remain deferred: no artificial tick exists.

## Frontend state

`src/App.tsx` provides onboarding, world/presence projection, match start, steady/attack delivery controls, deterministic MelaBot progression, shared score/innings/target projection, transient event feed, and completed-result visibility. Generated bindings are in `src/module_bindings/`.

## Test evidence

| Check                    | Status  | Evidence                                                                                                                                                                                                                                       |
| ------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deterministic rules      | Pass    | `pnpm test`: 6/6 tests covering scoring, wicket zero-run behavior, innings boundaries, target/winner result, deterministic/valid MelaBot choice, and shared resolution path.                                                                   |
| Module build             | Pass    | `pnpm run spacetime:build` on 2026-09-05.                                                                                                                                                                                                      |
| Frontend typecheck       | Pass    | `pnpm run typecheck` on 2026-09-05.                                                                                                                                                                                                            |
| Frontend build           | Pass    | `pnpm run build` on 2026-09-05.                                                                                                                                                                                                                |
| Two-browser realtime     | Pass    | Independent Ravi (in-app browser) and Nila (Chrome) saw the identical match, human delivery and event, innings break at `12/0 (6)` / target `13`, MelaBot chase, and final durable `MelaBot 15/1 (6)` / `melabot wins` result without polling. |
| Invalid action rejection | Pass    | Anonymous `play_ball` against the completed match was rejected by the reducer with `Not your active match.`; no state was committed.                                                                                                           |
| Maincloud                | Not run | Outside Phase 3 scope.                                                                                                                                                                                                                         |

## Known limitations

- The deterministic MelaBot reducer can be triggered publicly only when the authoritative state is in MelaBot's turn; the client cannot choose an outcome. The approved private scheduled AI wake remains deferred to the scheduling phase.
- Event feed contents are intentionally live/transient; result memory is the durable `matchHistory` row.
- QR, big-screen, spectator, and Crowd Energy UX are not Phase 3 work.

## Next task

Phase 4 after a new scoped instruction: shared Crowd Energy, per-spectator cooldowns, bounded spectator powers, and discrete effect-expiry scheduling. Keep the one-world/reducer-authority model. Do not introduce Redis, Socket.IO, a separate backend, polling, LLM, Pen Fight, or Maincloud deployment without a new decision.

## Handoff notes

Before another phase, read `AGENTS.md`, this file, `docs/MELA_SpacetimeDB_Architecture_Gate.md`, and `docs/MELA_P0_Game_Rules.md`; inspect Git status; and do not treat Phase 3 completion as authorization for Phase 4.
