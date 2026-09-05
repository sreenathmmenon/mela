# MELA STATUS

## Current handoff — 6 September 2026, Asia/Kolkata

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
- Frontend: https://sreenathmenon.com/mela/
- GitHub Pages deploys on main through `.github/workflows/deploy-pages.yml`.
- Actual server release command: `spacetime publish --module-path spacetimedb --server maincloud mela-cah23 --yes`. Result: updated existing database successfully, empty migration plan.
- Production browser smoke: fresh visitor opened `/mela/?memory=4`, connected to Maincloud, and saw the existing RailwayCheck 2–0 MelaBot memory with share and next-action controls, without onboarding. No production match was created or played during this smoke check. Screenshot: `output/playwright/pen-production-memory.png`.
- Commits must be Sreenath <sreenathmmmenon@gmail.com>, without co-author attribution.

## Known limits and next task

- This is an implemented design pass, not evidence of “best in the universe,” emotional attachment, retention, or virality. Those require real people playing voluntarily.
- Pen appearance is a remembered preference on this browser, not shared persisted per-player equipment.
- Native sharing depends on browser/OS support. Clipboard fallback is provided; per-result social preview images and automatic social posting are not implemented.
- No new long-term character/rivalry schema, pen mastery/unlock system, or historical shot replay. Copy uses existing real match records.
- Existing real-world/device limitations remain: physical QR scan and sound feel require human checking; scripted play is not evidence of human balance.
- No manipulative streak loss, FOMO, notification spam, fake accomplishments, external LLM, social graph, OAuth, new game, generic engine, backend, or high-frequency tick.
- **Next task:** run a short voluntary playtest with a first-time player and two phone spectators. Observe whether they can flick, explain the crowd effect, understand a loss, and choose to replay/share without prompting. Tune from that evidence, not fabricated engagement claims.
