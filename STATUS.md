# MELA STATUS

## Last updated

- Date/time: 2026-09-05, Asia/Kolkata
- Agent/provider: Codex (GPT-5)
- Branch: `main`
- Delivery state: Complete Book Cricket experience deployed and verified on Maincloud plus GitHub Pages.

## Complete Book Cricket experience

Mela now demonstrates one authoritative live world end to end: a human starts Book Cricket, strangers join the crowd through a public QR URL, spectators influence shared state, MelaBot acts through private scheduled reducers, the read-only stage communicates the shared event, and the completed match becomes durable Mela memory.

The locked thesis remains unchanged: players play, spectators influence, AI participates, and the world remembers. Book Cricket is the first vertical slice, not a generic game engine or the Mela product boundary.

## Delivered capabilities

- [x] Authoritative two-innings Human vs MelaBot Book Cricket: server-owned scores, wickets, target, turns, result, history, and shared deterministic resolution path.
- [x] Anonymous identity-backed onboarding and reconnect-safe browser tokens; no accounts, passwords, or OAuth.
- [x] Spectator crowd with shared authoritative Crowd Energy, per-spectator cooldowns, BOOST/CHAOS/SHIELD/CHEER, expiry, regeneration, validation, and atomic concurrent transactions.
- [x] Deterministic MelaBot with public character presentation, private scheduled `ai_wake`, stale/duplicate protection, shared resolution, and visible AI-turn feedback.
- [x] Durable Mela profile/progression, distinct Crowd Influence, game-specific Book Cricket form, completed-match result/history/memory, and notable crowd-story summary.
- [x] Public QR join flow: `?join=<match-id>` carries only a non-secret match id. A fresh phone uses scan → display name → server-validated spectator admission.
- [x] Dedicated read-only big-screen route (`/#/screen?match=<match-id>`): shared score, turn state, Crowd Energy/effects, major events, result, and QR. It has no player/spectator controls or privileged mutation path.
- [x] Post-match story with result, score, crowd contribution, profile/form updates, recent memory, and replay CTA.
- [x] GitHub Pages deployment workflow configured for `https://sreenathmenon.com/mela` and the live Maincloud module. The production route and hash stage route work on static hosting without server rewrites.

## Authoritative schema and reducers

- World/identity: `world`, `playerProfile`, `melaProfile`, `worldPresence`, `worldActivity`, private `connectionSession`.
- Match/game: `match`, `matchParticipant`, `bookCricketState`, `matchHistory`, `matchMemory`, `bookCricketRecord`, event `liveEvent`, `aiCharacter`.
- Crowd: `matchCrowd`, `matchCrowdActivity`, `matchSpectator`, `spectatorCooldown`, `crowdEffect`, private `crowdSchedule`.
- Public reducers: `onboard`, `createBookCricket`, `playBall`, `joinMatchAsSpectator`, `useCrowdPower`.
- Private scheduled reducer: `processCrowdSchedule` for effect expiry, Crowd Energy regeneration, and autonomous MelaBot wake.

## Validation evidence

| Check                       | Status | Evidence                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deterministic suite         | Pass   | `pnpm test`: 16/16 passing. Covers Book Cricket rules, crowd energy/effects, deterministic AI scheduling, progression, Crowd Influence, and durable memory construction.                                                                                                                                                     |
| Module build                | Pass   | `pnpm run spacetime:build` on 2026-09-05.                                                                                                                                                                                                                                                                                    |
| Maincloud publish           | Pass   | Published `mela-cah23` to Maincloud. Database identity: `c200fad7d7acce35e4289bd2d998b2eedfd145f765f58cb2c86534d67d844d3a`; dashboard: `https://spacetimedb.com/mela-cah23`.                                                                                                                                                 |
| Production frontend build   | Pass   | `pnpm run build:pages` with Maincloud host/database and production app origin. Output uses the `/mela/` static-host base path.                                                                                                                                                                                               |
| Public deployment           | Pass   | GitHub Pages workflow run `33963081220` succeeded. `https://sreenathmenon.com/mela/` returned HTTP 200 and a fresh production browser connected to Maincloud, onboarded as `Live Smoke`, and received its authoritative profile/start state.                                                                                 |
| QR stranger journey         | Pass   | Two fresh independent browser identities opened `?join=6`, saw the invited-crowd onboarding, entered Asha/Nila display names, and were automatically admitted into the same active match as spectators.                                                                                                                      |
| Four-surface realtime       | Pass   | Player, Asha, Nila, and the read-only stage converged on the same score, two spectators, Crowd Energy/effects, human turn, scheduled MelaBot innings, final result, and durable memory.                                                                                                                                      |
| Crowd concurrency           | Pass   | Asha BOOST and Nila CHAOS were submitted concurrently against the same shared pool; both legal requests serialized to energy 12/60 with both effects visible on player, phones, and stage. No double-spend or negative balance.                                                                                              |
| Reconnect recovery          | Pass   | Asha’s QR client was reloaded during the match. Its saved SpacetimeDB token restored Asha’s identity, spectator role, current state, and final durable result without corrupting state.                                                                                                                                      |
| Complete result propagation | Pass   | Final demo match: Demo Player `20/1 (6)`, MelaBot `12/0 (6)`, Human wins; Asha’s notable BOOST and two crowd moves appeared on player, both phones, and stage.                                                                                                                                                               |
| UX validation               | Pass   | Desktop player: clear start, action, QR, AI/crowd feedback, match story, and rematch. Mobile spectator at 390×844: scan/name/join, score, Crowd Energy, target/powers/cooldowns, event feedback, final story/profile/memory are readable. Big screen: no private controls; clear score/turn/QR/crowd/event/result hierarchy. |

## Deployment configuration

- Maincloud host: `https://maincloud.spacetimedb.com`
- Maincloud database: `mela-cah23`
- Frontend target: `https://sreenathmenon.com/mela`
- GitHub Pages is enabled and live through `.github/workflows/deploy-pages.yml`; workflow run `33963081220` deployed the current frontend.

## Known limitations

- Synthetic validation is an exercised multi-browser end-to-end scenario rather than a dedicated high-volume load harness; high-volume load remains deliberately out of scope.
- No external LLM, configurable AI roster, Pen Fight, generic game engine, social graph, OAuth/accounts, WebMCP, Redis, Socket.IO, separate backend, or high-frequency tick was introduced.

## Next task

Complete Book Cricket is delivered. Do not begin a new product phase without explicit approval.

## Handoff notes

Use [BOOK_CRICKET_DEMO_RUNBOOK.md](docs/BOOK_CRICKET_DEMO_RUNBOOK.md) for the judge flow. Read `AGENTS.md`, this file, and the architecture documents before future work.
