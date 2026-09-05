# MELA STATUS

## Last updated

- Date/time: 2026-09-05, Asia/Kolkata
- Agent/provider: Codex (GPT-5)
- Branch: `main`
- Delivery state: Pen Fight release gate complete on Maincloud; Book Cricket remains the production regression baseline.

## Complete Book Cricket experience

Mela now demonstrates one authoritative live world end to end: a human starts Book Cricket, strangers join the crowd through a public QR URL, spectators influence shared state, MelaBot acts through private scheduled reducers, the read-only stage communicates the shared event, and the completed match becomes durable Mela memory.

The locked thesis remains unchanged: players play, spectators influence, AI participates, and the world remembers. Book Cricket is the first vertical slice, not a generic game engine or the Mela product boundary.

### Current Book Cricket game loop

- The match is intentionally short: **6 balls and 2 wickets per innings**. The Human bats first; MelaBot chases the explicit target.
- On every Human ball, the player chooses **SAFE** (5% OUT, 0–3), **BALANCED** (10% OUT, 0–4), or **AGGRESSIVE** (20% OUT, boundary-heavy 0/2/4/6). The browser submits only the choice; the server applies a match-seeded deterministic outcome.
- MelaBot observes the same authoritative score, balls, wickets, target, and active crowd effects. It returns one of those same three styles to the common resolver—there is no AI-only scoring path.
- The chase ends immediately on target reached, innings exhaustion, or when the remaining legal maximum cannot even tie. This makes score, balls left, wickets left, and required runs visible stakes rather than decoration.
- The UI now turns those facts into situational language: `1 wicket left`, `5 runs from 2 balls`, a latest-moment outcome, clear player/crowd confirmation, and a stage tension state. An expired QR gives a recoverable plain-language message rather than surfacing a reducer error.

## Delivered capabilities

- [x] Authoritative two-innings Human vs MelaBot Book Cricket: server-owned scores, wickets, target, turns, result, history, shared deterministic resolution path, three explicit risk/reward ball choices, and mathematical chase closure.
- [x] Anonymous identity-backed onboarding and reconnect-safe browser tokens; no accounts, passwords, or OAuth.
- [x] Spectator crowd with shared authoritative Crowd Energy, per-spectator cooldowns, BOOST/CHAOS/SHIELD/CHEER, expiry, regeneration, validation, and atomic concurrent transactions.
- [x] Deterministic MelaBot with public character presentation, private scheduled `ai_wake`, stale/duplicate protection, shared resolution, and visible AI-turn feedback.
- [x] Durable Mela profile/progression, distinct Crowd Influence, game-specific Book Cricket form, completed-match result/history/memory, and notable crowd-story summary.
- [x] Public QR join flow: `?join=<match-id>` carries only a non-secret match id. A fresh phone uses scan → display name → server-validated spectator admission.
- [x] Dedicated read-only big-screen route (`/#/screen?match=<match-id>`): shared score, turn state, Crowd Energy/effects, major events, result, and QR. It has no player/spectator controls or privileged mutation path.
- [x] Post-match story with result, score, crowd contribution, profile/form updates, recent memory, and replay CTA.
- [x] Safe, authoritative usage-metrics projection: aggregate starts/completions, distinct player/crowd identities, participations, crowd actions, replays, and spectator-to-player conversion. It is derived from persisted world data/reducers, never reloads or connections; private identity flags protect uniqueness.
- [x] GitHub Pages deployment workflow configured for `https://sreenathmenon.com/mela` and the live Maincloud module. The production route and hash stage route work on static hosting without server rewrites.
- [x] Pen Fight is the second concrete Mela game: deterministic best-of-three desk duel, server-authoritative flick physics, opening-force fairness cap, autonomous MelaBot, bounded Pen-native crowd effects, QR crowd join, stage arena, Pen record/history/progression, and safe game-specific aggregate metrics.

## Authoritative schema and reducers

- World/identity: `world`, `playerProfile`, `melaProfile`, `worldPresence`, `worldActivity`, private `connectionSession`.
- Match/game: `match`, `matchParticipant`, `bookCricketState`, `matchHistory`, `matchMemory`, `bookCricketRecord`, event `liveEvent`, `aiCharacter`.
- Pen Fight: `penFightState`, `penFightRecord`, public aggregate `penFightMetrics`, and private per-identity `penFightMetricsIdentity`. Pen’s deterministic provider proposes a legal flick; `processCrowdSchedule` validates the scheduled turn and invokes the same internal resolver as a human action.
- Crowd: `matchCrowd`, `matchCrowdActivity`, `matchSpectator`, `spectatorCooldown`, `crowdEffect`, private `crowdSchedule`.
- Metrics: public safe aggregate `melaMetrics`; private per-identity uniqueness guard `metricsIdentity`.
- Public reducers: `onboard`, `createBookCricket`, `playBall`, `joinMatchAsSpectator`, `useCrowdPower`.
- Private scheduled reducer: `processCrowdSchedule` for effect expiry, Crowd Energy regeneration, and autonomous MelaBot wake.

## Validation evidence

| Check                                 | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Deterministic suite                   | Pass   | `pnpm test`: **20/20** passing after final productization. Includes bounded/deterministic strategy outcomes, explicit strategy-risk differentiation over 10,000 deterministic seeds, wickets/innings/target/chase closure, shared Human/AI resolution, AI scheduling, crowd energy/effects, progression/memory, and metrics semantics.                                                                                                                 |
| Module build                          | Pass   | `pnpm run spacetime:build` on 2026-09-05 after the gameplay finalization.                                                                                                                                                                                                                                                                                                                                                                              |
| Frontend checks                       | Pass   | `pnpm run typecheck`, `pnpm run build`, and `pnpm run build:pages` passed after the gameplay finalization.                                                                                                                                                                                                                                                                                                                                             |
| Maincloud publish                     | Pass   | Published the gameplay-finalized `mela-cah23` module to Maincloud. Database identity: `c200fad7d7acce35e4289bd2d998b2eedfd145f765f58cb2c86534d67d844d3a`; dashboard: `https://spacetimedb.com/mela-cah23`.                                                                                                                                                                                                                                             |
| Production frontend build             | Pass   | `pnpm run build:pages` with Maincloud host/database and production app origin. Output uses the `/mela/` static-host base path.                                                                                                                                                                                                                                                                                                                         |
| Public deployment                     | Pass   | GitHub Pages workflow run `33963081220` succeeded. `https://sreenathmenon.com/mela/` returned HTTP 200 and a fresh production browser connected to Maincloud, onboarded as `Live Smoke`, and received its authoritative profile/start state.                                                                                                                                                                                                           |
| QR stranger journey                   | Pass   | Two fresh independent browser identities opened `?join=6`, saw the invited-crowd onboarding, entered Asha/Nila display names, and were automatically admitted into the same active match as spectators.                                                                                                                                                                                                                                                |
| Four-surface realtime                 | Pass   | Player, Asha, Nila, and the read-only stage converged on the same score, two spectators, Crowd Energy/effects, human turn, scheduled MelaBot innings, final result, and durable memory.                                                                                                                                                                                                                                                                |
| Crowd concurrency                     | Pass   | Asha BOOST and Nila CHAOS were submitted concurrently against the same shared pool; both legal requests serialized to energy 12/60 with both effects visible on player, phones, and stage. No double-spend or negative balance.                                                                                                                                                                                                                        |
| Reconnect recovery                    | Pass   | Asha’s QR client was reloaded during the match. Its saved SpacetimeDB token restored Asha’s identity, spectator role, current state, and final durable result without corrupting state.                                                                                                                                                                                                                                                                |
| Complete result propagation           | Pass   | Final demo match: Demo Player `20/1 (6)`, MelaBot `12/0 (6)`, Human wins; Asha’s notable BOOST and two crowd moves appeared on player, both phones, and stage.                                                                                                                                                                                                                                                                                         |
| UX validation                         | Pass   | Desktop player: clear start, action, QR, AI/crowd feedback, match story, and rematch. Mobile spectator at 390×844: scan/name/join, score, Crowd Energy, target/powers/cooldowns, event feedback, final story/profile/memory are readable. Big screen: no private controls; clear score/turn/QR/crowd/event/result hierarchy.                                                                                                                           |
| Gameplay-loop realtime                | Pass   | Fresh local match #7: Tactical Player chose SAFE/BALANCED/AGGRESSIVE across six balls; independent Field A and Field B crowd clients plus the stage received the same `18/0` vs `21/0`, target `19`, MelaBot win, energy `32/60`, and durable crowd story. Field A's BOOST appeared on the player and the other spectator before its target delivery.                                                                                                  |
| Mobile/stage check                    | Pass   | A fresh QR spectator was exercised at `390×844`; it showed match stakes, target picker, timing-specific power explanations, cost/cooldown state, and live result. The separate `1440×900` stage showed QR, target, score, crowd state, event feed, and final story.                                                                                                                                                                                    |
| Final productization realtime         | Pass   | Fresh local match #9: Final Player plus independent Final Asha/Final Nila mobile crowd clients and a `1440×900` stage converged on `2/2` vs `3/0`, target `3`, MelaBot win, energy `4/60`, two committed effects, the same crowd story, and the same completed memory. Asha/Nila submitted BOOST/CHAOS concurrently; both effects committed atomically and were visible everywhere. Nila reloaded after activation and recovered the same crowd state. |
| Expired QR recovery                   | Pass   | A fresh local identity opened completed-match QR `?join=9`; the client showed `That match has ended. Start a fresh match or scan a live crowd QR.` with no raw fatal-error surface and no power controls.                                                                                                                                                                                                                                              |
| Operator metrics view                 | Pass   | Local `?operator=metrics` rendered only safe aggregate counters (completed matches, unique players/crowd members, conversions), with no identity/session data.                                                                                                                                                                                                                                                                                         |
| Pen Fight deterministic suite         | Pass   | `pnpm test`: **25/25** passing. Includes deterministic/bounded Pen physics, opening cap, Crowd Energy costs, GUARD recovery, safer-position round resolution, and deterministic bounded Pen MelaBot proposals alongside Book Cricket regression coverage.                                                                                                                                                                                              |
| Pen Fight live production playthrough | Pass   | Maincloud match #2: Asha vs MelaBot, QR crowd client `QA Crowd`, and the stage converged on Pen positions, turn, `NUDGE`, shared energy, automatic MelaBot action, and final `0–2` MelaBot result. Durable match memory, Pen record, profile progress, and reloaded player/crowd/stage completion state were verified.                                                                                                                                 |
| Pen Fight QR / reconnect              | Pass   | A fresh Chrome identity opened `?join=2`, onboarded as `QA Crowd`, and joined the active production Pen Fight. Reloading that crowd client and the stage after completion recovered the same result and memory without creating a second spectator.                                                                                                                                                                                                    |
| Pen Fight UI / stage                  | Pass   | Production deployed UI presents drag-to-aim/flick controls, player-facing crowd context, compact spectator powers, completed-match memory/rematch, and a large readable stage desk arena. Mobile `390×844` reload was readable after live subscription initialization.                                                                                                                                                                                 |

## Deployment configuration

- Maincloud host: `https://maincloud.spacetimedb.com`
- Maincloud database: `mela-cah23`
- Frontend target: `https://sreenathmenon.com/mela`
- GitHub Pages is enabled and live through `.github/workflows/deploy-pages.yml`; final productization workflow run `33964926328` succeeded. A fresh production mobile browser loaded `https://sreenathmenon.com/mela/?operator=metrics`, connected to Maincloud, rendered the safe metrics route, and loaded the new crowd-context/expired-QR recovery bundle.

## Known limitations

- Synthetic validation is an exercised multi-browser end-to-end scenario rather than a dedicated high-volume load harness; high-volume load remains deliberately out of scope.
- Strategy probabilities and short-format values are deliberately centralized and still tunable; they have not yet been calibrated with a large playtest cohort.
- No external LLM, configurable AI roster, generic game engine, social graph, OAuth/accounts, WebMCP, Redis, Socket.IO, separate backend, or high-frequency tick was introduced. The automated test suite is deterministic/unit-led plus targeted real-browser production validation; a high-volume synthetic load harness remains deliberately out of scope.

## Next task

Use the current Book Cricket + Pen Fight release as the stable Mela baseline. Any further game work must preserve the shared-world contracts and begin with a scoped approval.

## Handoff notes

Use [BOOK_CRICKET_DEMO_RUNBOOK.md](docs/BOOK_CRICKET_DEMO_RUNBOOK.md) for the judge flow. Read `AGENTS.md`, this file, and the architecture documents before future work.
