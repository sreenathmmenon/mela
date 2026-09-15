# Mela v3 — discovery, arena identity and remembered moments

15 September 2026. This is an implemented release slice of the approved v3 direction, not completion of the entire v3 roadmap. Release/production evidence is recorded in STATUS.md.

## What changed

- Play and Watch can feature an actual completed arena match. The lightweight board preview comes from a narrow subscription to that match's committed replay frames. It is explicitly a replay, never fabricated live activity. While frames load, a decorative game cover and truthful completed-result action preserve layout. No Three.js scene is loaded for this preview.
- Recent discovery diversifies across games before filling remaining slots. Personal history is not filtered or rewritten. Existing records remain intact; discovery suppresses routine development counters such as “0 discoveries” and adds colourful game context.
- Completed arena results have a concise named outcome and clickable recorded moments: crowd influence, objectives and the finish. Selecting a moment seeks the existing replay; it cannot change the match, score or history. Energy controls no longer imply an ended match is playable; completed QR links are labelled as replays.
- Crown Run now has a terracotta festival skyline, Bridge Breakers has blue-green stone banks and crossing machinery, and Mela Heist has a brass-and-violet vault. This is authored procedural 3D stage dressing with deliberate palettes, not new game physics or copied third-party assets. Board positions, legal targets and collisions retain the same authoritative rules.
- Narrow-screen camera framing fits the complete playable board in all three views. Stage ornament may extend beyond the viewport, but playable tile corners are tested to remain inside it. Added scenery is disposed on unmount with the existing renderer resources.
- Distinct short sounds accompany committed moves, crowd reveals, vault/objective events and completion. Audio unlocks on a user gesture and respects mute. Opening an old completed match does not play a fresh victory sound. No autoplay music, fake applause or new media dependency.
- Character descriptions now describe the selected game's objective. The same game-specific brief is passed to the existing live-provider prompt; no provider/model/API change or new paid inference was introduced. Character creation is the default agent destination, with external-agent connection kept separate.
- A match now has a reloadable `?match=<id>` view. Reload waits for identity, participants and spectator subscriptions and restores only a match the current identity owns or has joined. A guessed/shared view URL does not grant a seat or spectator membership; public crowd links remain `?join=`, private player invitations remain separate, and completed public replays use `?memory=`. Back to Games clears stale view/replay routing.

## Authority and compatibility

No tables, schemas, public reducers, authoritative game rules, migration, identity provider or Maincloud deployment changed. The shared `characterBrief` is descriptive; the deterministic resolver is unchanged. Existing human/friend/external-agent modes continue through their original reducer validation. Public player state still does not reveal pending crowd power costs or choices. The frontend changes only input/presentation/navigation and subscriptions to already-public committed frames.

The report and prior browser research informed three choices: show the actual game before configuration, give each arena a different material identity, and make a real shared moment the object of discovery. Reading 169 research records does not mean independently playtesting 169 games, or proving that Mela surpasses them.

## Local verification

Isolated in-memory SpacetimeDB: `mela-v3-0915` at `http://127.0.0.1:3000`. No test data was written to Maincloud. The frontend at `http://localhost:8094` explicitly pointed to that local database.

| Check                                   | Actual result                                                                                                                                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full deterministic/HTTP/unit suite      | 189/189 passed, 0 failed/skipped                                                                                                                                                                               |
| New tests                               | 13: discovery, committed-frame parsing/moments, palette/character copy, audio selection, navigation bounds/route cleanup, rematch-follow destinations, three camera views across four sizes                    |
| Module build                            | Passed; isolated module publication also succeeded                                                                                                                                                             |
| Frontend typecheck and production build | Passed; existing >500kB chunk warnings remain                                                                                                                                                                  |
| Transport build                         | Passed                                                                                                                                                                                                         |
| `verify-guest-entry.ts`                 | Six direct guest entries, no-form crowd, duplicate/resume, nickname, rollback, unverified-recovery rejection and convergence passed                                                                            |
| `verify-arena-seats.ts`                 | Nine combinations across Crown/Bridge/Heist × friends/human-agent/agent-duel completed; private intent/energy, crowd concurrency, immutable result, scheduled missed-agent substitution and convergence passed |
| `verify-human-seats.ts`                 | Pen human-human and human-agent completion, seat theft/role/stale rejection, disconnect/reconnect and named memories passed                                                                                    |
| `verify-four-seats.ts`                  | Friends, human-agent and agent-duel completion; real missed-agent scheduling, fallback disclosure, reconnect and convergence passed                                                                            |
| `verify-product-switch.ts`              | Explicit Book → Stick switch, guest idempotence, crowd, shared scoring, autonomous completion and two-client history passed                                                                                    |
| `verify-playground-games.ts`            | Dots, Gilli and Book completion; crowd concurrency, hidden state, stale/invalid actions, history and reconnect/rematch passed                                                                                  |
| `verify-strategy-games.ts`              | Four/Last Stick completion and three-client convergence; concurrent powers, expiry, disconnect/reconnect, immutable memory and abandoned-AI cancellation passed                                                |

All real-client scripts used `TEST_SPACETIME_DB=mela-v3-0915`. These use actual connections, subscriptions and reducer commits, not only pure rule simulation. Scripted external-seat actions are transport/rule QA, not actual LLM inference.

### Browser evidence

- Independent desktop player and mobile spectator completed Bridge **10** in six moves, drawn. Spring charge was accepted after move 1: spectator energy **45 → 30** while player still saw **45**, then both saw **33** after move 2. Turn bridge was accepted after move 4: spectator **39 → 19**, player remained **39**, then both saw **22** after move 5. Both saw the same six-move result and the crowd events at moves 2 and 5.
- Spectator viewport reload initially returned home. The new view routing fixed this: reload retained match 10 and its crowd role. The completed player reload retained the same result. Clicking the move-2 moment displayed the recorded move-2 board and event without changing the completed match. Back returned to a clean homepage URL.
- Independent fresh stranger opening private view `?match=37` was returned to game discovery with a clear crowd-link instruction, no profile/seat claim. This is distinct from permitted public replay and crowd entry.
- Final replay testing found an existing follow link pointing to an abandoned next match. Follow links are now absent for abandoned/missing games; completed next matches link to their result, active ones to the crowd. Local replay 10 no longer showed the dead follow link. A forced local WebGL loss/restoration also recovered its 3D scene and removed the warning without changing the completed result.
- All ten game cards opened their correct game and returned home at 1440px, with no horizontal overflow or alert. Local entry IDs 38–47. This is entry/return coverage, not ten complete browser-played matches.
- Pen Fight **37** loaded 3D at 320px, accepted a flick, showed contact, automatically ran MelaBot and returned the human turn. Reload retained that game. Full-match Pen behavior was covered separately by the real-client checks above.
- Crown skyline, Bridge crossing and mobile Heist vault were visually inspected. Mobile 320px Heist had a 320px document width and one active 3D canvas. Camera-math tests check every playable corner at 298×390, 368×390, 746×520 and 1048×670 for Diorama, Overhead and Ringside.
- Mobile homepage audit first found a visible-label/accessibility-name mismatch in the recorded preview despite category scores of 100. Corrected the preview's graphical markers and accessible name. Final 320px homepage snapshot audit: **31 passed / 0 failed**, all four audited categories 100; failure list independently read. Mobile Bridge result snapshot: **27 passed / 0 failed**, four categories 100. These are snapshot/accessibility checks, not performance or aesthetic approval scores.
- Screenshots were viewed inline. Saving them to this workspace through the browser tool was denied by that tool's separate path boundary; no saved screenshot artifact is claimed. Browser console review showed no page errors in the checked Pen session; font-preload warnings occurred during local hot reload.

## Not yet complete / not established

- This release does **not** implement Carrom, Kite Rivals, durable agent passports/delegation budgets, playable checkpoint challenges or the multi-game Circuit. Those require additional authoritative design, implementation and real-client gates from the v3 plan. Existing ten games remain available.
- No new independent human newcomer study, real-device iOS/Android certification, audio listening study, retention result or comparative game-quality ranking. Browser-emulated mobile is not hardware certification.
- Existing bundle-size warnings remain. Some local multi-subscription churn produced the known SDK “deleting a row not present in cache” warning; the convergence assertions passed. This does not certify every network/device condition.
- No production match/identity/email or paid live model call was created by this local validation. Production smoke and release IDs belong in STATUS.md after deployment is observed.
- Challenge relaunch eligibility and unpublished judging details remain unverified. No claim of guaranteed award placement, virality, investment, acquisition or universal bug-freedom.

**Next implementation task:** the authoritative, unranked “try this recorded moment” challenge, with fresh match ownership, validated checkpoint/version handling and independent player/agent/crowd tests. Do not mutate the original match or expose private seeds/pending intents.
