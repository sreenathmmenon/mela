# MELA STATUS

## Last updated

- Date/time: 2026-09-05, Asia/Kolkata
- Agent/provider: Codex (GPT-5)
- Branch: `main`
- Phase: Phase 6 complete and committed; the containing commit is pushed to `origin/main`.

## Current product state

Phases 0–6 are complete locally. Mela remains a gaming-first persistent shared playground: players play, spectators influence, AI participates, and the world remembers. One SpacetimeDB database is authoritative; reducers are the mutation boundary and browser clients are projections.

Book Cricket is the first vertical slice, not the Mela product boundary. Phase 6 makes completed matches durable shared memories and gives people a small persistent Mela identity: progression rewards participation, Book Cricket form measures only Book Cricket performance, and Crowd Influence is independently earned by meaningful spectator actions.

## Phase 6 delivered

- [x] Added identity-keyed `melaProfile`: level, progress points, matches played/won, matches watched, Crowd Actions, Crowd Influence, and update time. It is created on onboarding and lazily backfilled for an existing identity without OAuth/accounts.
- [x] Added immutable `matchMemory` per completed match. It stores game kind, sequence, human and AI participants, winner, final scores/wickets, crowd participants, crowd actions, Crowd Energy spent, a notable crowd moment, and completion time. `liveEvent` remains transient delivery; `matchHistory` remains the existing concise durable result record.
- [x] Added `matchCrowdActivity` to accumulate authoritative successful crowd actions and energy spent during a live match; the completed match memory consumes that summary once.
- [x] Added `bookCricketRecord`: a deliberately game-specific record with matches, wins, total runs, and high score. It is not used as universal Mela progression or Crowd Influence.
- [x] Completion stays in the shared Book Cricket resolution path. It atomically writes the match result/history/memory, player progression and record, and spectator match participation progression. The `matchMemory` primary key and completion guard prevent duplicate finalization.
- [x] Successful crowd powers now add an intentionally small, tunable amount of Crowd Influence (BOOST 2, CHAOS 3, SHIELD 2, CHEER 1) and record the meaningful last crowd moment.
- [x] Added a completed-match experience: result story, notable crowd contribution, final-score chips, immediate rematch CTA, identity/progression glance, useful recent memories, and a small Book Cricket-only form board.

## Authoritative schema and reducers

- Reusable world: `world`, `playerProfile`, `melaProfile`, `worldPresence`, `worldActivity`, private `connectionSession`.
- Match/game: `match`, `matchParticipant`, `bookCricketState`, `matchHistory`, `matchMemory`, `bookCricketRecord`, event `liveEvent`, `aiCharacter`.
- Crowd: `matchCrowd`, `matchCrowdActivity`, `matchSpectator`, `spectatorCooldown`, `crowdEffect`, private `crowdSchedule`.
- Public reducers: `onboard`, `createBookCricket`, `playBall`, `joinMatchAsSpectator`, `useCrowdPower`.
- Private scheduled reducer: `processCrowdSchedule` for effect expiry, Crowd Energy regeneration, and autonomous `ai_wake`.

## Test and validation evidence

| Check                          | Status | Evidence                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deterministic test suite       | Pass   | `pnpm test`: 16/16 passing. Includes core Book Cricket, Crowd Energy/effects, deterministic AI scheduling, progression/level calculation, crowd influence, Book Cricket record aggregation, and durable crowd-story construction.                                                                                                                               |
| Module build                   | Pass   | `pnpm run spacetime:build` on 2026-09-05.                                                                                                                                                                                                                                                                                                                       |
| Local schema migration         | Pass   | `pnpm run spacetime:publish:local` applied four additive public tables: `mela_profile`, `match_memory`, `match_crowd_activity`, and `book_cricket_record`; no existing Phase 5 table was altered.                                                                                                                                                               |
| Frontend typecheck             | Pass   | `pnpm run typecheck` on 2026-09-05.                                                                                                                                                                                                                                                                                                                             |
| Frontend production build      | Pass   | `pnpm run build` on 2026-09-05.                                                                                                                                                                                                                                                                                                                                 |
| Two-client realtime completion | Pass   | Independent Memory Player (`127.0.0.1`) and Memory Spectator (`localhost`) completed the same local Book Cricket match. Spectator used BOOST; completion converged on both clients as Player 12/1 (6), MelaBot 11/0 (6), Human wins. Both immediately showed one crowd move and the durable notable moment “Memory Spectator made the crowd matter with BOOST.” |
| Realtime identity/progression  | Pass   | Without page reload, the player showed 1 match played, 15 progress, Book Cricket record 1 win/12 runs/best 12. The mobile spectator showed 1 watched, 4 progress, and 2 Crowd Influence. Both saw the same recent memory and Book Cricket form board.                                                                                                           |
| UX validation                  | Pass   | Desktop player flow validated: finish → narrated result → notable crowd contribution → rematch CTA → profile/history/form. Mobile spectator flow validated at 390×844: finished story, score, crowd contribution, own watched/influence progress, recent memory, and game-specific form remain readable and avoid raw-table presentation.                       |

## Known limitations

- P0 has a compact progression model with fixed tunable values; it is not a large XP/economy or badge system.
- Recent memory currently shows the latest Book Cricket entries in the shared world; filters, pagination, and a dedicated profile route are deliberately deferred.
- Existing completed matches from before Phase 6 retain their concise `matchHistory` row but do not receive retroactive rich `matchMemory` or progression records.
- QR, dedicated big-screen route, synthetic load/reconnect harness, external LLM, configurable AI roster, Pen Fight, social graph, accounts/OAuth, Maincloud deployment, and WebMCP remain out of scope.

## Next task

Phase 6 is complete. Do not start Phase 7+ without explicit approval. Preserve SpacetimeDB-first authority; do not add Redis, Socket.IO, a separate backend, polling, high-frequency ticks, external LLM, QR/big-screen work, synthetic load, Pen Fight, social graph, OAuth/accounts, WebMCP, or Maincloud deployment.

## Handoff notes

Read `AGENTS.md`, this file, `docs/MELA_SpacetimeDB_Architecture_Gate.md`, and `docs/MELA_P0_Game_Rules.md` before another phase.
