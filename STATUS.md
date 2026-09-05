# MELA STATUS

## Last updated

- Date/time: 2026-09-05, Asia/Kolkata
- Agent/provider: Codex (GPT-5)
- Branch: `main`
- Git commit/push: the containing Phase 4 commit is on `main` and pushed to `origin/main`; use `git log -1` for its immutable hash.

## Current product state

Phases 0–4 are complete locally. Mela remains a gaming-first persistent shared playground: players play, spectators influence, AI participates, and the world remembers. One SpacetimeDB database remains authoritative; reducers are the mutation boundary and browser clients are projections.

Book Cricket is the first game, not the Mela product boundary. It now has a coherent live crowd loop: a non-player joins an active match as a spectator, sees shared Crowd Energy and their individual cooldowns, chooses a target side, uses a power, and immediately sees authoritative state/events update for every connected player and spectator.

## Phase 4 delivered

- [x] Match-scoped spectator membership (`matchSpectator`) linked to durable SpacetimeDB identity and existing name onboarding; no OAuth/account system.
- [x] Shared authoritative Crowd Energy (`matchCrowd`): starts at 42, caps at 60, and regenerates +2 every 12 seconds through a private SpacetimeDB schedule table.
- [x] Individual match/power cooldowns (`spectatorCooldown`) with server-issued ready timestamps.
- [x] Locked powers in one central rules module:
  - BOOST: cost 18, 20-second cooldown, +2 to next non-wicket delivery capped at 6.
  - CHAOS: cost 20, 25-second cooldown, deterministic high-variance next delivery.
  - SHIELD: cost 15, 25-second cooldown, converts the target side's next wicket into a dot ball.
  - CHEER: cost 4, 10-second cooldown, adds 8 to the shared pool capped at 60.
- [x] One active effect per power/target; effects coexist across kinds, resolve in CHAOS → SHIELD → BOOST order, consume on the target delivery, or expire through the private discrete scheduler. No high-frequency tick.
- [x] Reducers: `joinMatchAsSpectator`, `useCrowdPower`, private scheduled `processCrowdSchedule`; normal human/MelaBot delivery resolution consumes crowd effects atomically.
- [x] Concise live event feed for joins, activations, authoritative rejections, effect resolution/expiry, regeneration, normal deliveries, innings, and results. Events remain transient; `matchHistory` remains durable result memory.
- [x] Mobile-first spectator UX: clear join-to-crowd step, live score, shared energy meter, target switcher, labelled power cards with cost/cooldown/explanation, disabled/loading affordances, cooldown feedback, active effects, and authoritative moment feed.

## Authoritative schema

- Reusable world: `world`, `playerProfile`, `worldPresence`, `worldActivity`, private `connectionSession`.
- Match/game: `match`, `matchParticipant`, `bookCricketState`, `matchHistory`, event `liveEvent`.
- Crowd: `matchCrowd`, `matchSpectator`, `spectatorCooldown`, `crowdEffect`, private `crowdSchedule` schedule table.
- Public reducers: `onboard`, `createBookCricket`, `playBall`, `runMelaBotTurn`, `joinMatchAsSpectator`, `useCrowdPower`.
- Private scheduled reducer: `processCrowdSchedule` for effect expiry and Crowd Energy regeneration.

## Test and validation evidence

| Check                      | Status  | Evidence                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Deterministic rules suite  | Pass    | `pnpm test`: 11/11 passing. Covers base Book Cricket, explicit power legality/cost/cooldown/duration configuration, energy charges and no-negative sequential race model, CHEER cap, effect order/cap, and deterministic CHAOS.                                                                                                                                                            |
| Module build               | Pass    | `pnpm run spacetime:build` on 2026-09-05.                                                                                                                                                                                                                                                                                                                                                  |
| Frontend typecheck         | Pass    | `pnpm run typecheck` on 2026-09-05.                                                                                                                                                                                                                                                                                                                                                        |
| Frontend production build  | Pass    | `pnpm run build` on 2026-09-05.                                                                                                                                                                                                                                                                                                                                                            |
| Private schedules          | Pass    | Real local match emitted `Crowd Energy +2` events and expired unconsumed BOOST/CHAOS through `processCrowdSchedule`; no polling/tick used.                                                                                                                                                                                                                                                 |
| Three-client realtime      | Pass    | Independent Ravi player (in-app `127.0.0.1`), Asha spectator (in-app `localhost`), and Nila spectator (Chrome) saw identical match state. Both joined the crowd, Asha activated CHAOS/BOOST, all clients saw energy/effects/events, and the player saw effect resolution on MelaBot's next delivery. Final state converged: Ravi `9/0 (6)`, MelaBot `11/0 (4)`, target `10`, MelaBot wins. |
| Concurrent pool protection | Pass    | With shared energy 26, concurrent Asha BOOST (18) and Nila CHAOS (20) attempts resulted in only the first committed power; pool converged at 10 and never went negative/double-spent.                                                                                                                                                                                                      |
| Cooldown/eligibility       | Pass    | Nila's SHIELD immediately displayed `Ready in 25s`; insufficient-energy powers were disabled. Server reducer independently checks membership, live match, target, known power, duplicate active effect, cooldown, and shared balance and emits a rejection event without spending state.                                                                                                   |
| Mobile UX                  | Pass    | Tested spectator A at 390×844. Score, shared meter, target buttons, one-column power cards, cost/cooldown status, CHEER primary available action, and live feed remained visible and understandable. Player-only MelaBot advance control is hidden from spectators; completed matches hide power controls.                                                                                 |
| Maincloud                  | Not run | Explicitly outside Phase 4.                                                                                                                                                                                                                                                                                                                                                                |

## Known limitations

- P0 MelaBot advancement remains a public but strictly turn-validated reducer trigger; its private scheduled wake is a later discrete-scheduling improvement.
- Power rejection is emitted as a transient authoritative event rather than a durable audit record; completed match result/history remains durable.
- QR onboarding, a dedicated big-screen route, reconnect/load harnesses, external LLM, Pen Fight, rankings, and Maincloud deployment remain out of scope.

## Next task

No Phase 5 work is authorized. The next scoped decision should choose between the already-approved QR/big-screen experience, private scheduled MelaBot wake/turn timeout, or synthetic end-to-end load/reconnect harness. Preserve SpacetimeDB-first authority and do not add Redis, Socket.IO, a separate backend, chat, accounts/OAuth, external LLM, Pen Fight, advanced leaderboard, or deployment without explicit approval.

## Handoff notes

Read `AGENTS.md`, this file, `docs/MELA_SpacetimeDB_Architecture_Gate.md`, and `docs/MELA_P0_Game_Rules.md` before another phase. Do not treat Phase 4 completion as authorization for Phase 5+.
