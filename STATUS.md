# MELA STATUS

## Current pass — WebMCP Agent Duel

- Sreenath approved host-opened Pen Fight Agent vs MelaBot, then two external agents, with visible intent, crowd interference, fallback, a remote MCP URL and a 20–30 second demonstration capture. Railway is the demo/submission origin.
- Implemented shared `mela_get_desk`, `mela_claim_seat`, `mela_flick` definitions for native Chrome WebMCP and Streamable HTTP MCP at `/mcp`. The Railway runtime transports calls only; SpacetimeDB resolves all gameplay.
- Added `agentDuel`, private `agentProposal`, durable `duelCrowdCredit`; added safe state/cooldown/effect views. Existing Pen Fight seed, crowd effects, cooldowns and activity become private without deleting rows. Agent seats cannot also spectate. Existing human and agent actions share `resolvePenFlick`.
- Agent intent commits for 3 seconds before authoritative resolution; a 30-second missed turn invokes deterministic fallback. Revision/phase validates schedules. Completed memory names both seats and applied crowd actions. Hosting an agent win does not award human game skill.
- Supplied public token is in index.html and expires **17 November 2026**. Its `isThirdParty=true` requires activation through an external same-origin script. Native Chrome diagnostics measured `WrongOrigin` for static/meta-only activation; `public/origin-trial.js` implements Chrome's documented external-script activation. Final Railway Chrome 152 measurement: **WebMCP Enabled**, script token **Success**, `document.modelContext` present, all three `getTools()` results with string inputSchema. Actual `executeTool(toolObject, JSON.stringify(args))` calls claimed a seat, read committed state, accepted legal intents and returned explicit stale/already-committed rejections. No API polyfill or browser feature flags were used.
- **76/76 deterministic tests passed**; frontend typecheck/build, module build and bundled MCP transport build passed. Real SDK clients rejected seat theft, spectator/agent overlap, human bypass, off-turn/illegal/duplicate/stale moves and post-completion moves; TILT remained hidden and landed through committed resolution; disconnect timeout advanced the turn. Final browser checks exposed stale turn notices and duplicate overlapping event deliveries: fixed notices and deduplicated by commit timestamp + transaction-local event ID, with a regression test that preserves subsequent commits reusing IDs.
- Local completed Agent vs MelaBot match 6: TealMind **2–1** MelaBot; host/crowd states converged and durable memory credited CrowdNila's NUDGE. A raw unprivileged subscription to `pen_fight_state` was refused. Local migration of baseline `mela-pen-feel-0906` succeeded with additive tables/views and four access changes, no data deletion.
- Local second completed duel 8: TealMind **2–0** MelaBot with durable CrowdNila NUDGE credit. Book Cricket browser regression on the migrated populated baseline: match 15, Ira **10/0** after six balls, target 11; automatic MelaBot **0/2** after two balls, human win. Existing human Pen Fight desk also rendered through the new public view.
- **Production realtime:** native Astra and independent mobile NilaCrowd, Maincloud matches 6 and 7, both completed **Astra 2–0 MelaBot**. Native reads observed NilaCrowd's DESK TILT applied after a committed plan, then automatic MelaBot action. Match 7 after that first exchange: teal `(429,609)`, rust `(686,549)`, turn 2. Final host and spectator both displayed the same result and durable named TILT credit. Match 5 completed Astra 1–2 MelaBot while exercising timeout fallback during verification pauses.
- **Remote production MCP:** `https://mela-web-production.up.railway.app/mcp` returned all three shared tools and the real desk. Official MCP SDK session claimed RemoteMind in human-opened match 8 and committed a legal opening intent. Independent native Chrome read then observed turn 2 at teal `(323,413)`, rust `(610,464)`, with RemoteMind's intent and automatic MelaBot events. The QA client then disconnected; timeout fallback remains responsible for subsequent turns. This is an SDK transport check, not a claim of two commercial model vendors being tested.
- **UX/capture:** desktop 1000×1600 reviewed with both intent cards, QR and whole 3D desk visible. Mobile 390×844 spectator powers and completed memory inspected; no horizontal overflow. Result story named both agents and NilaCrowd's contribution. Local artifacts: `output/playwright/agent-duel-mobile-result.png`, `agent-duel-capture-frame.png`; **28.8-second actual Railway capture** `output/playwright/mela-agent-duel-captioned.mp4` (optional embedded captions) and `mela-agent-duel-29s.mp4` (plain). The agent actions were chosen by this assistant through native WebMCP; spectator input was automated through a separate human UI session, not an independent human playtest. The capture shows an exchange, not the whole completed match. Browser console had favicon 404 only; no new application exception in the final flow.
- **Release:** implementation `5d29303`, feedback fix `b85f68c`, final runtime `1fc4d03`, all committed/pushed as Sreenath without co-authors. Maincloud `mela-cah23` published in place without deleting data. Railway production **f9b3f390-96d9-4dc7-bc7b-8c45ddf35a78** explicitly observed **SUCCESS**; final asset `index-Dru_EKRz.js`. Railway only: no personal-site deployment. Final documentation/test-driver evidence is delivered in the subsequent Git commit.
- **Limits:** native WebMCP verified in Chrome 152 on this exact Railway origin, not every browser/device; unavailable/expired trial leaves the human game usable and remote MCP remains separate. Remote transport identities survive a session, not process restart/30-minute expiry; use one Railway replica. Seat names are not model-vendor authentication. Existing simplified game physics and lazy Three.js chunk warning remain. No external LLM service, new renderer/game, Redis or simulation tick added. See `docs/WEBMCP_AGENT_DUEL.md` for contracts and migration.
- Next task: use the Railway URL and `/mcp` in a live audience demo with independently operated agent clients; renew the origin-trial token before 17 November 2026. No further feature work started.

## Previous pass — Pen Fight aiming and interaction playtest

- 6 September 2026, baseline `7b65d90`. Sreenath asked for a careful game-design/UX continuation. This pass fixes concrete play problems in the existing 3D game rather than changing its world architecture or rules.
- **Current-turn aiming:** the old default stayed at opening coordinate `(740,500)` after the pens moved. Each new authoritative human turn now points at MelaBot's current position; manual adjustments remain available. A new turn cancels a stale gesture.
- **Accurate edge gestures:** ray/board intersection bounds the aim as one vector. Separately clipping X/Y used to distort diagonals near the edge. Invalid outward/zero-length gestures do not fall through to a different shot. Keyboard angle changes use the same helper.
- **Whole-pen grabbing:** cap, barrel and tip share a generous input capsule matching the visible 3D pen. This is a gesture hit area only, not a change to authoritative game collisions.
- **Strength and keyboard play:** labelled native strength slider, soft/firm/hard readout, explicit opening cap/risk explanation, arrow keys for aim/strength and Space/Enter to flick. Controls remain present but disabled through human/AI animation, avoiding layout jumps; repeated keydown cannot double-submit.
- **Readable action:** input arrow draws over the pen instead of disappearing underneath it on soft barrel-aligned shots. Actor labels moved to the upper margin. On-desk cues progress through launch → contact/miss → exit/crowd save → settled, using only committed motion flags. Brief struck-pen recoil is presentation, not new physics. Live cue is outside the flattened image accessibility role.
- **Mobile/accessibility:** compact header, darker readable rivalry text, labelled invitation QR, at least 48×48 action buttons, and a stable control panel. Name/pen/desk proportions from the actual 3D pass are preserved.
- **History correction:** the prior boundary-coordinate hiding heuristic was too strong: GUARD can legitimately leave a pen at exactly 0/1000. Removed that inference and replaced its test with a guard regression. Only live committed out flags hide a pen; a reopened memory renders recorded positions and is not a replay. No history is fabricated.

### Evidence for this pass

- **71/71 tests passed.** Added edge/diagonal angle preservation across hundreds of positions/directions, invalid aim rejection, full-pen hit-area coverage, wrong-pen rejection and timed hit/miss/save cue tests. Existing Book Cricket, AI, crowd, history and motion tests remain passing.
- Frontend typecheck, standard build, Railway production build, SpacetimeDB module build, changed-file formatting and whitespace checks passed. Existing lazy WebGL scene chunk-size warning remains (~133kB gzip).
- Independent Asha/Nila clients, local `mela-pen-feel-0906`: match 11 completed **Asha 2–1 MelaBot**, matching in both clients. Both captured the same exact cue sequence for `1:2:1207168774` (human flick → contact → off edge) and `2:0:3578598518` (MelaBot flick → miss). Both then showed human `(260,500)`, bot `(192,601)`, and default aim `(192,601)`.
- Match 12: grabbing the visible tip (rather than the centre) produced a 67% strength gesture and committed `1:0:3468182620`. Nila's NUDGE subsequently changed the human flick; both clients converged at `(260,500)` / `(198,577)` after automatic AI sequence `2:0:455780638`. Completed **Asha 2–0 MelaBot**, matching in both clients.
- Real keyboard path: slider Home=20, End=100, desk ArrowDown=92; left/right aim then Space committed sequence `1:2:1207168774`.
- Additional isolated Ira client, match 13: the control panel remained present at a constant measured height of **194.5625px** across human flick, AI turn and return; disabled during action, enabled afterward. Default aim then matched bot `(630,525)`.
- Mobile 390×844 and 320×740 checked. At 320px: no horizontal overflow; four direction/strength buttons were 48×48, central flick 61×48. Screenshots: `output/playwright/pen-tip-grab.png`, `pen-game-feel-final-mobile.png` (ignored local artifacts).
- Accessibility/Chrome DevTools skill checks caught rivalry contrast and missing QR text alternative; fixed both. Mobile Lighthouse accessibility improved **95 → 100**, best practices **100**. Reports parsed for failures. Remaining non-accessibility audit findings concern the local dev fallback for robots/llms files and navigation layout shift; this is not a claim of comprehensive WCAG or physical-device certification. Final audit JSON: `/var/folders/vr/ttsdq38s06l357twx77l57rm0000gn/T/chrome-devtools-mcp-Kvg2Lm/report.json`.
- Book Cricket browser regression: local match 14, **Asha 13/1–MelaBot 15/0**, target 14, normal automatic three-ball chase and completed result. No Book Cricket code or server code changed.
- Release is frontend-only through Railway. No Maincloud module publication, migration, backend, new game or economy change.
- Released implementation `ac8c126dbf8a67be04846d21e5591965cb9b0293`, committed/pushed as Sreenath without co-author attribution. Railway production deployment `83e930d6-6116-48ae-b85d-a767d7166308` completed successfully; `https://mela-web-production.up.railway.app/` served the Railway-built `index-BQ_i29TU.js`. No production gameplay writes were used for this smoke check. An obsolete GitHub Pages workflow had also deployed the same commit to a personal-site path; it is not Mela's release target and has been removed from the repository.

### Remaining limits and next task

- The server still uses its existing simplified pen collision model; this pass fixes controls and presentation, not rigid-body simulation. Native phone touch/audio/GPU performance and independent human enjoyment remain unverified.
- Next task: Sreenath plays the published version on a physical phone, particularly cap/tip grabbing, edge angles, soft shots and spectator timing. Use that observed feedback for the next tuning pass; do not claim world-best quality, attachment or retention from automated play.

## Previous pass — actual 3D Pen Fight desk

- 6 September 2026. Baseline `b85936d`. Sreenath rejected the previous small-pen/2.5D result and explicitly asked for a better actual game surface. This pass replaces the primary SVG scene with real Three.js/WebGL geometry, not another CSS perspective treatment.
- Solid cylindrical pens, raised clips, ribbed grips, tapered metal tips, a thick wooden desk, perspective camera, directional lighting and cast/received shadows. Pen models are approximately 420 board units long; automated projection checks require over 80px visible length at a 364px phone canvas. All playable corners remain in view. Camera framing is fitted per viewport.
- Pointer input now ray-projects onto the same desk plane used for rendering. Direction arrow, pull tether/finger ring and force feedback share that projection. Escape cancels without committing; button/keyboard controls remain. Moved the cosmetic picker below the flick controls and corrected turn-label contrast.
- Player, spectator and big-screen use the same renderer. Animation consumes existing committed `@pen-motion/1:` events. No schema, reducer, server physics, scoring, AI, progression or Book Cricket changes. This is real **3D rendering**, not a new rigid-body physics simulation.
- Scene is dynamically imported only when Pen Fight mounts (about 132kB gzip). Resources and resize observers are disposed; pixel ratio is capped at 2; animation frames run during shots, not an idle simulation loop. Reduced motion shows committed positions directly. WebGL loss/unavailability switches to an explicitly labelled square-coordinate SVG fallback.
- Checked current official Three.js renderer/raycaster documentation: https://threejs.org/docs/. Native rendering/projection capability is a technical fact; using it as a non-authoritative presentation layer is the implementation decision within Sreenath's approved 3D request.

### Verification — actual 3D pass

- **64/64 tests pass**, including four new presentation tests: projection/input round trips across four aspect ratios, full-board framing plus phone pen-size minimum, perspective pull direction, and completed off-desk pen visibility without transient replay. Existing Book Cricket/Pen Fight/crowd/AI/history tests remain passing.
- Frontend typecheck, standard build, Pages production build and SpacetimeDB module build passed. Changed-file formatting and whitespace checks passed. Vite warns about the lazy 522kB uncompressed scene chunk; it is split from the initial app, not silently claimed as zero-cost.
- Local player Asha and independent spectator Nila, database `mela-pen-feel-0906`, match 8: both animated human sequence `1:0:1909890900` and AI sequence `1:1:1109230037`; both settled to human `(323,413)`, bot `(610,464)`. Match completed **Asha 0–2 MelaBot**, with matching player/crowd result. Big screen for match 8 also showed the same completed result.
- Match 9: Nila's NUDGE was accepted and the player feed explicitly confirmed it changed the human flick. Human and autonomous AI state converged at `(421,524)` / `(682,518)` in both browsers. Reduced-motion player emitted **no animated frames**, with controls unlocked.
- Match 11: real pointer drag through the perspective scene emitted authoritative sequence `1:0:3078609690`. An earlier Escape-cancelled drag left the sequence unset and returned to the ready hint.
- Desktop 1440×1000 and mobile 390×844 visually inspected. Mobile canvas 362×323; no horizontal page overflow. Evidence: `output/playwright/pen-3d-desktop-final.png`, `pen-3d-mobile-final.png`, `pen-3d-pull.png`, `pen-3d-motion.png` (local ignored artifacts).
- Forced browser WebGL context loss: simplified-view notice appeared, WebGL canvas removed, fallback board measured square 362×362. A hot-reload check exposed an animation lock when its frame loop was cancelled; fixed with cleanup unlock and a bounded settle timer, then completed the full fresh-page match test.
- Book Cricket UI regression: match 10 completed **Asha 15/0–MelaBot 0/2**, human win, normal six-ball innings and autonomous chase. No Book Cricket code or authority changed.
- Local browser logs include the pre-existing favicon 404; no new application exception in the verified fresh-page flow. The deprecated shadow-map warning from the first prototype was removed by selecting the supported PCF shadow map.
- Main implementation `12eb0bbc9a2e5625cd5b9642583ed7d87c779c92` committed/pushed as Sreenath; Pages run `33991283468` succeeded. Production browser loaded `/mela/assets/index-C0LvPCNk.js` and the real `three-webgl` scene in existing memory 4. No Maincloud module publication is needed because server code/schema are unchanged.
- That production inspection caught an old completed-match edge case: absent transient motion, a fallen pen could appear at its clamped boundary position. The follow-up hides completed boundary-centre pens without changing the result or historical coordinates. Local remembered match 8 verified the fallen human pen hidden and MelaBot visible; all 64 tests and the production build were rerun successfully.

### Remaining limits / next task

- Actual low-end-phone GPU performance, native touch/audio feel and real-person playtesting have not been established by desktop browser emulation. No claim of world-best ranking or emotional attachment is made.
- The existing simplified server collision model remains authoritative; visual pen length/rotation do not introduce capsule/3D collision rules. Pen cosmetic selection remains device-local, as before.
- Next task: have Sreenath inspect the visible pen proportions and actual phone play feel before another visual direction change.

## Previous pass — physical Pen Fight desk and shot feel

- 6 September 2026, Codex. Baseline: `300bfe6`. Sreenath explicitly redirected the work to pens, aiming arrows, game actions and desk appearance rather than surrounding identity/share UX.
- Implemented a square-coordinate 2.5D wooden desk: grain, lighting, bevel, thickness, contact shadows, detailed metallic/gel/ink pen rendering, and the player's name on the barrel. Uses SVG/CSS/Web Animations, not a new WebGL/game-engine dependency.
- Replaced the old line with a direction arrow, force colour, pull tether, finger marker and on-desk force feedback. Pull distance is relative to where the gesture starts; it must begin on the player's pen ring. Escape cancels, taps do not fire, stale-board gestures are rejected locally, and keyboard/button controls remain available.
- A committed flick now travels to the **actual server-resolved contact point**, then slides/rotates/settles. The struck pen waits for contact. Real edge exits tumble/fade before round reset. Impact effects/sounds fire on a hit, not every position update. The turn label stays with the moving pen and controls wait for settling.
- Server rule resolution exposes movement metadata only. A versioned `@pen-motion/1:` payload uses the existing transient liveEvent transport: match/sequence/actor, starts, contact, ends, hit/out/guard flags. No table/schema/reducer signature changes; scoring, physics constants, AI decisions and winner logic are unchanged. Durable history remains separate.
- App feeds filter the transport payload. Pen Fight and the dedicated big screen share `PenDesk`; the stage rejects other-match motion and deduplicates readable events using timestamp/ID/message rather than reused transient IDs.
- Reconnect/initial subscription shows current authoritative positions rather than replaying old shots. Reduced-motion skips movement animation. Clients never run collision or winner resolution.

### Verification for the physical desk pass

- Deterministic suite: **60/60 passed**. Five additional tests cover exact collision metadata, raw edge exits versus clamped durable state, honest misses/stationary targets, deterministic mirrored actor metadata, malformed/versioned payload handling, and bounded arrow direction.
- Frontend typecheck, normal build, Pages build, SpacetimeDB build, changed-file formatting and Git whitespace checks: passed.
- In-place local publish to `mela-pen-feel-0906`: passed, empty migration plan, no deletion.
- Real player Asha and independent spectator Nila received **identical animation keyframes** for human sequence `1:2:3502304826` and AI sequence `1:3:3963487223`. Browser animation sampling compared both pens' transforms and offsets, not just endpoint text.
- Full local Pen Fight: Asha **2–1 MelaBot**, identical player/crowd result and durable memory. Additional fresh match verified human and bot contact and live animation objects; a contact screenshot captured the collision flash.
- Reduced-motion emulation: zero pen animations after a real flick; controls unlocked correctly afterward.
- Desktop 1440px and mobile 390×844 inspected. Square desk keeps arrow/finger/physics coordinates aligned; physical pens and directional pull shown in screenshots. Big-screen route rendered the same desk.
- Book Cricket regression completed through the UI and scheduled AI: **Asha 15–18 MelaBot**, confirmed in durable memory. Existing rule tests pass.
- Artifacts (local, ignored): `output/playwright/pen-desk-aim.png`, `pen-desk-motion.png`, `pen-physical-contact.png`, `pen-physical-desk.png`.
- Release order: frontend first, then in-place Maincloud module publish, to avoid exposing the new transport payload in an older frontend. Delivery confirmation is recorded after release.
- Released implementation `54e3a561cb93a0d48a1a1ac5e94e25c328fc5c5b`; Pages run `33990042875` succeeded. Maincloud in-place publish succeeded with an empty migration plan; no data was deleted. A production browser opened the existing `?memory=4` and rendered the new physical desk. Screenshot: `output/playwright/pen-physical-production.png`.
- Final safeguard clears the presentation input lock when an animation effect is replayed or has already been cancelled. Existing open tabs should refresh to load the new renderer/transport handler.

### Limits and next task for this pass

- This is 2.5D rendering of the existing authoritative game, **not a full 3D rigid-body simulation**. Rotation and timing are presentation; collision/winner rules stay on the server.
- Transient shot motion is not historical replay. On reconnect the durable board is authoritative; a missed animation is not reconstructed or fabricated.
- Native sound quality, actual phone touch feel, low-end-device frame rate and real-person play balance still need hands-on validation. Desktop/mobile browser emulation is not a claim of physical-device testing.
- Next task: play this specific desk on a real phone with a spectator and judge aim clarity, contact timing, force feel and readability. Tune those from observed play, without unrelated identity/economy changes.

## Previous release handoff — emotional-connection pass

- Provider: Codex. Branch: main. Starting baseline: `11cd12a`.
- This pass implements the approved Pen Fight emotional-connection brief.
- Book Cricket remains the stable baseline. No new game, account system, AI provider, backend, schema, or progression economy.
- Server update published successfully in place to Maincloud `mela-cah23`; no data deletion or migration.
- Implementation committed/pushed as `08e2723a3e9b1477e0d6d7dbbbbbaa44f3cf531b`, authored solely by Sreenath. GitHub Pages run `33988780671` completed successfully. The deployed JS/CSS fingerprints match the verified build.
- Prior release narratives/evidence are preserved in Git at `11cd12a:STATUS.md`. Their test counts and older deployment claims are historical, not current evidence.

## What changed

### Pen ownership, interaction and feedback

- Retained the four handcrafted, equal-physics pens. Remembered cosmetic choice now has an explicit “Your Gel/Reynolds…” identity and a collapsed change-pen control. Invalid saved pen IDs fall back safely.
- Real Pen Fight records supply rivalry copy. No invented streaks, best shots, personality memories, unlocks, or psychological claims.
- A tap/finger wobble cannot fire a shot; deliberate drag uses its final pointer position. Pending/disconnected actions are disabled. Keyboard/button flick remains available.
- Repeated CONTACT outcomes now retrigger feedback using authoritative state revision, not just outcome text. Loading a remembered duel does not replay its shot sound.
- Transient acknowledgement is separate from authoritative outcome, so feedback no longer permanently hides the game state.
- Pen Fight receives a bounded live event feed. Timestamp/ID/message deduplication handles repeated transient IDs. Routine energy regeneration does not displace meaningful desk moments.
- Spectator instructions no longer tell a non-player to aim. Existing hidden-until-resolved crowd behavior is preserved, with named effects in the feed afterward.

### Crowd connection

- Power labels/costs/durations derive from the pure server configuration. GUARD correctly displays 20, not 16.
- Per-identity cooldown countdown, shared energy shortfall, pending/disconnected states, and existing-effect blocking are visible. The countdown is presentation only; reducers still decide eligibility.
- Mobile two-column power panel, jump-to-crowd link, shared pool header, explicit affected pen, expiry and non-stacking explanations.
- DESK TILT previously multiplied drift by contact offset: centred human flicks (contact 50) got no effect. It now applies the same bounded, seeded lateral tilt to centred or off-centre flicks for either actor.
- Pen crowd actions now also increment the existing Mela participation counter; influence remains distinct from player skill.

### Memory and sharing

- Completion brings the result card into view: real result/moment, crowd contribution, personal rivalry or Crowd Influence, a practical loss tip, and replay.
- Explicit “Share this duel” uses the native share sheet where supported; otherwise copies truthful result/story/link. Nothing is posted automatically.
- Completed QR/share links use `?memory=<matchId>`, a read-only public Pen Fight memory. Fresh visitors see the result without onboarding or receiving participation credit.
- Replay clears old memory/QR selection and resets component-local pending/aim state for the new desk.
- Live desk invitation remains `?join=<matchId>`. Browser-only pen preferences are not represented as cross-device/server-owned customization.

## Actual verification this pass

- `pnpm test`: **55/55 passed** (50 existing plus 5 experience/regression tests).
- Added checks: tap threshold; server-configured pricing/cooldown/stacking/offline/pending presentation; honest rivalry; share copy including losses and zero crowd moves; deterministic TILT across 100 seeds in both directions with centred contact and bounded coordinates.
- `pnpm run typecheck`: pass.
- `pnpm run spacetime:build`: pass.
- `pnpm run build` and `pnpm run build:pages`: pass.
- Prettier check on changed code: pass. Git whitespace check: pass.
- Isolated local database: `mela-pen-feel-0906`, local frontend `http://127.0.0.1:5174/`.
- First attempt against the older local `mela-cah23` was rejected for an existing schema mismatch. No deletion was used; created the isolated database instead.
- Independent browser sessions: Asha (player), Nila (390×844 spectator), fresh stranger (read-only memory).
- Nila joined via match link, played DESK TILT, saw a 22-second remaining cooldown; the effect was consumed by Asha's flick. Both sessions received Nila's named TILT event, contact, automatic MelaBot action and shared Energy updates.
- Pointer tap did not change outcome; a deliberate drag advanced to MelaBot and automatically back to Asha. Button controls also drove the completed duel.
- Both browsers showed Asha 0–2 MelaBot, one crowd move, and a durable knockout memory. Database readback confirmed that exact result and crowd action. Nila's profile readback: one crowd action, three Crowd Influence.
- Replay opened a fresh desk. Gel selection survived reload. The player and spectator mobile screenshots were visually inspected; no horizontal overflow at 390×844.
- A fresh stranger opened `?memory=1` directly, with result and next-action controls and no account prompt.
- Replay from an owner's shared memory URL also passed: a new desk rendered and the old `memory` parameter was cleared.
- Book Cricket regression playthrough: OPEN THE BOOK, subsequent SAFE choices, automatic chase, durable result **Asha 17–20 MelaBot**. Existing Book Cricket deterministic tests all passed.
- Local screenshots: `output/playwright/pen-player-memory.png`, `pen-crowd-memory.png`, `pen-mobile-player.png`; CLI snapshots/screenshots remain local and Git-ignored.
- Existing local favicon 404 observed. Native audio quality and native OS share sheets are not validated by these browser checks.

## Authority and implementation map

- Shared world: world, playerProfile, melaProfile, presence, world activity, connection sessions, aggregate metrics, match and actor-generic participants.
- Book Cricket: bookCricketState, Book Cricket rules/provider, record, shared history/memory.
- Pen Fight: penFightState, Pen Fight rules/provider, penFightRecord and metrics.
- Crowd: matchCrowd, matchCrowdActivity, matchSpectator, spectatorCooldown, crowdEffect and private crowdSchedule.
- liveEvent is transient delivery; matchHistory/matchMemory are durable product history.
- Reducers own mutations; clients project subscriptions. Human/AI share game-specific rule resolution. Private scheduling owns AI wake/effect expiry and existing discrete tasks.
- Public gameplay includes onboard, createBookCricket, playBall, createPenFight, flickPen, joinMatchAsSpectator, useCrowdPower, usePenFightCrowdPower.
- No table/reducer contract or generated binding changes in this pass.

## Deployment

- Maincloud: `https://maincloud.spacetimedb.com`, database `mela-cah23`.
- Frontend: https://mela-web-production.up.railway.app/
- Railway project `mela`, production service `mela-web`. Deployment uses the repository `Dockerfile`; GitHub Pages is not a release target.
- Actual server release command: `spacetime publish --module-path spacetimedb --server maincloud mela-cah23 --yes`. Result: updated existing database successfully, empty migration plan.
- Production browser smoke: fresh visitor opened `/?memory=4`, connected to Maincloud, and saw the existing RailwayCheck 2–0 MelaBot memory with share and next-action controls, without onboarding. No production match was created or played during this smoke check. Screenshot: `output/playwright/pen-production-memory.png`.
- Commits must be Sreenath <sreenathmmmenon@gmail.com>, without co-author attribution.

## Known limits and next task

- This is an implemented design pass, not evidence of “best in the universe,” emotional attachment, retention, or virality. Those require real people playing voluntarily.
- Pen appearance is a remembered preference on this browser, not shared persisted per-player equipment.
- Native sharing depends on browser/OS support. Clipboard fallback is provided; per-result social preview images and automatic social posting are not implemented.
- No new long-term character/rivalry schema, pen mastery/unlock system, or historical shot replay. Copy uses existing real match records.
- Existing real-world/device limitations remain: physical QR scan and sound feel require human checking; scripted play is not evidence of human balance.
- No manipulative streak loss, FOMO, notification spam, fake accomplishments, external LLM, social graph, OAuth, new game, generic engine, backend, or high-frequency tick.
- **Next task:** run a short voluntary playtest with a first-time player and two phone spectators. Observe whether they can flick, explain the crowd effect, understand a loss, and choose to replay/share without prompting. Tune from that evidence, not fabricated engagement claims.
