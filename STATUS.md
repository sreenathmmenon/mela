# MELA STATUS

## Last updated

- Date/time: 2026-09-05, Asia/Kolkata
- Agent/provider: Codex (GPT-5)
- Branch: `main`
- Phase: Phase 5 complete and committed; push follows this evidence update.

## Current product state

Phases 0–5 are complete locally. Mela remains a gaming-first persistent shared playground: players play, spectators influence, AI participates, and the world remembers. One SpacetimeDB database is authoritative; reducers are the mutation boundary and browser clients are projections.

Book Cricket is the first vertical slice, not the Mela product boundary. Phase 5 makes MelaBot a visible autonomous participant: after the human innings, a private discrete SpacetimeDB scheduled wake advances only the matching active bot turn through the same authoritative Book Cricket resolution path as a human action.

## Phase 5 delivered

- [x] Replaced the public/manual `runMelaBotTurn` gameplay control with an internal `ai_wake` entry in the existing private `crowdSchedule` table and the private scheduled `processCrowdSchedule` reducer.
- [x] Scheduled wakes use a short discrete delay (1.2 seconds), are deduplicated for a match/expected bot-ball pair, and are ignored without mutation when the match is complete, the turn is no longer MelaBot's, or the expected bot ball is stale.
- [x] Added `AIProvider` and `DeterministicAIProvider`. The provider observes an authoritative state snapshot and returns a legal style proposal plus player-facing rationale; it never mutates database state.
- [x] MelaBot proposals pass into the existing shared `resolveDelivery` internal domain function. Human and AI scoring, wickets, effects, innings transitions, targets, winners, events, and durable result history remain one authoritative path.
- [x] Added one lightweight public `aiCharacter` record for MelaBot (`MelaBot`, “Cool under pressure. Reckless when behind.”), ready for future characters without a character framework.
- [x] Added visible player/spectator AI-turn status and concise events: reasoning, chosen style, delivery result, and next-move feedback. The manual bot trigger is absent from the UI.
- [x] Stabilised the client’s transient event-feed callback with event-id de-duplication so replayed event-table subscriptions do not duplicate displayed moments.

## Authoritative schema and reducers

- Reusable world: `world`, `playerProfile`, `worldPresence`, `worldActivity`, private `connectionSession`.
- Match/game: `match`, `matchParticipant`, `bookCricketState`, `matchHistory`, event `liveEvent`, `aiCharacter`.
- Crowd: `matchCrowd`, `matchSpectator`, `spectatorCooldown`, `crowdEffect`, private `crowdSchedule` schedule table.
- Public reducers: `onboard`, `createBookCricket`, `playBall`, `joinMatchAsSpectator`, `useCrowdPower`.
- Private scheduled reducer: `processCrowdSchedule` for effect expiry, Crowd Energy regeneration, and `ai_wake`. There is no public MelaBot wake reducer.

## Test and validation evidence

| Check                          | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deterministic rules suite      | Pass   | `pnpm test`: 13/13 passing. Includes scoring, wicket/innings/target resolution, shared human/AI resolution, Crowd Energy/effects, deterministic legal AI proposals, and exact scheduled-wake validity (active bot turn and expected bot ball only).                                                                                                                                                                                                     |
| Module build                   | Pass   | `pnpm run spacetime:build` on 2026-09-05.                                                                                                                                                                                                                                                                                                                                                                                                               |
| Frontend typecheck             | Pass   | `pnpm run typecheck` on 2026-09-05.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Frontend production build      | Pass   | `pnpm run build` on 2026-09-05.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Two-client scheduled realtime  | Pass   | Independent player (`127.0.0.1`) and mobile spectator (`localhost`) joined the same local world/match. The human set 8 from 6 balls; spectator BOOST targeting MelaBot was committed before the bot innings. Both clients saw the same AI-thinking status, target 9, `Crowd effects resolved for melabot: BOOST`, automated MelaBot deliveries, and final result: player 8/0 (6), MelaBot 9/0 (5), MelaBot wins. No client clicked a manual bot action. |
| Latest-state crowd interaction | Pass   | The same realtime run showed MelaBot act after the committed spectator BOOST; both clients converged on Crowd Energy 30/60 and the spectator’s BOOST cooldown.                                                                                                                                                                                                                                                                                          |
| Mobile spectator UX            | Pass   | At 390×844, the active-match view showed score, target, MelaBot thinking state/persona, shared energy, target controls, labelled power cards, disabled cooldown state, and live moments without a dead/manual AI control.                                                                                                                                                                                                                               |

## Known limitations

- P0 has one deterministic MelaBot character and a short fixed scheduled-wake delay. There is no external LLM, persistent AI memory/rivalry system, or configurable character roster.
- Wake rows are safely invalidated rather than physically cancelled; stale or duplicate executions perform no state mutation.
- QR onboarding, dedicated big-screen route, synthetic load harness, Maincloud deployment, Pen Fight, rankings, chat, and accounts/OAuth remain out of scope.

## Next task

Phase 5 is complete pending the push of its focused commit. Do not start Phase 6+ without explicit approval. Preserve SpacetimeDB-first authority; do not add Redis, Socket.IO, a separate backend, polling, high-frequency ticks, external LLM, Pen Fight, QR/big-screen work, synthetic load, or Maincloud deployment.

## Handoff notes

Read `AGENTS.md`, this file, `docs/MELA_SpacetimeDB_Architecture_Gate.md`, and `docs/MELA_P0_Game_Rules.md` before another phase.
