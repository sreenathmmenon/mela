# MELA STATUS

## Last updated

- Date/time: 2026-09-05, Asia/Kolkata
- Agent/provider: Claude (Opus 5)
- Branch: `main`
- Delivery state: Pen Fight gesture, the Book Cricket book, sound and the return
  hooks are all live on `https://sreenathmenon.com/mela/` against Maincloud
  `mela-cah23`.

## This pass

A mentor could not tell what Book Cricket was or how it was played, and taking a
Pen Fight shot needed three separate controls. Both are fixed.

### Pen Fight — one gesture

Pull back from your pen like a slingshot: direction is aim, distance is force,
release fires. A dashed rubber band follows your finger and the launch guide is
short and colour-ramped by power rather than showing a full trajectory. The
contact/spin slider is gone entirely — one control beats two. Aim and power are
also reachable with on-screen arrows and a FLICK button, since holding a pointer
down is a motor-accessibility barrier.

Two bugs surfaced by playing rather than by the type checker: the aim guide was
anchored to the pen's top-left while pens are centred on their position, leaving
it floating ~111px above the pen; and the power bar scaled against max force but
clamped to the opening cap, so it froze part-way during the first two turns.

### Book Cricket — the book explains the game

Ball one asks nothing: one button, OPEN THE BOOK. The book falls open, a page
number sits in the corner the way it does in any real book, and the last digit
is the runs. Nobody is told to take the last digit — they see 252, then 2 RUNS,
and work it out by ball two.

From ball two the choice appears as two intentions rather than three risk
categories: PLAY IT SAFE and GO FOR IT. BALANCED is not removed; it is the
default first delivery, so only the two deviations from normal are named. Every
percentage and the drawn odds bar are gone — a player should be shown a
decision, not a probability.

Verified the maths survives collapsing to two visible choices: optimal play is
still SAFE in 4 states and GO FOR IT in 8, and the match stays competitive at
roughly 46% human / 50% MelaBot / 4% draw.

A bug caught by playing it: the first version snapped pages to even numbers to
honour the real game's verso rule, so an odd score showed a page that
contradicted it (374 for 3 runs). On SAFE that would have misreported half of
all balls. Truthfulness beat the verso detail; the digit is now always exactly
what happened, locked by a test across 12,000 outcomes.

### Sound, rivalry and regret

Six sounds and nowhere else — flick, contact, teeter, fall, SIX, OUT — entirely
synthesised with the Web Audio API. No audio assets, about 1.5 KB gzipped. It
defaults to muted under reduced-motion, so a Sound on/off control sits in the
identity bar. Every entry point fails silently if audio is blocked.

Rivalry: the picker opens with "You lead MelaBot 2-0." The record already
existed; it was never said out loud, so every match started from nothing.

Regret: when MelaBot wins, the story names the choice that cost you.

## Deployment

Book Cricket's `lastPage` column forced a `--delete-data` publish (the 2.10 SDK
has no column-default annotation). Before publishing, all 12 player identities,
6 remembered matches and the full metrics were exported to
`../mela-backup-20260905-224143/` with a `PLAYERS.md` naming everyone who had
played or watched, including the two audience members who only spent Crowd
Energy. That archive is evidence, not a restore point: profiles are keyed by
SpacetimeDB identity and the only reducer that writes them uses `ctx.sender`, so
a faithful restore would mean impersonating those people. Adding an admin import
reducer would punch a permanent hole in the identity model for demo data, so it
was not done.

## Authoritative schema and reducers

- World/identity: `world`, `playerProfile`, `melaProfile`, `worldPresence`, `worldActivity`, private `connectionSession`.
- Match/game: `match`, `matchParticipant`, `bookCricketState`, `matchHistory`, `matchMemory`, `bookCricketRecord`, event `liveEvent`, `aiCharacter`.
- Pen Fight: `penFightState`, `penFightRecord`, public aggregate `penFightMetrics`, and private per-identity `penFightMetricsIdentity`. Pen’s deterministic provider proposes a legal flick; `processCrowdSchedule` validates the scheduled turn and invokes the same internal resolver as a human action.
- Crowd: `matchCrowd`, `matchCrowdActivity`, `matchSpectator`, `spectatorCooldown`, `crowdEffect`, private `crowdSchedule`.
- Metrics: public safe aggregate `melaMetrics`; private per-identity uniqueness guard `metricsIdentity`.
- Public reducers: `onboard`, `createBookCricket`, `playBall`, `joinMatchAsSpectator`, `useCrowdPower`.
- Private scheduled reducer: `processCrowdSchedule` for effect expiry, Crowd Energy regeneration, and autonomous MelaBot wake.

## Validation evidence

All rows below were produced during this pass. Rows describing the *previous*
release are retained under "Prior release evidence" and are explicitly marked
as no longer describing the current build.

| Check | Status | Evidence |
| --- | --- | --- |
| Deterministic suite | Pass | `pnpm test`: **35/35** (was 25). New coverage: expectimax proof that no Book Cricket style is optimal in every state; MelaBot required-rate chase; a pen can reach and knock out the opponent from the start; force carries overshoot risk near an edge; no legal opening flick can end a round; contact point steers the struck pen; degenerate aim cannot produce an invalid position; desk-margin tiebreak; crowd swings are attributed. |
| Design pass checks | Pass | After the design pass: `pnpm run typecheck`, `pnpm test` 34/34, `pnpm run build`, `pnpm run build:pages`, and `prettier --check` on every touched file. |
| Design pass browser loop | Pass | Local module republished (`--delete-data`, dev database only) and driven with three real clients (player Sreenath, spectator Nila on a second origin, fresh stranger Arjun on a third): cold-load splash, onboarding, game picker, Book Cricket played to completion twice with suspense/reveal, crowd BOOST attributed before and after the ball (gold banner), pen desk with legal flick + contact + MelaBot response, stage for Book Cricket and Pen Fight, and 390x844 passes for player, spectator and Pen Fight. No functional regressions observed: reducers, subscriptions, QR join, stage route, memory and metrics all behaved as before. |
| Design pass production deploy | Pass | Pushed `3cae643` to `main`; GitHub Pages built and deployed it (deployed CSS/JS fingerprinted: tokens + desk-shake/teeter/qr-glow present, JS points at `maincloud.spacetimedb.com` / `mela-cah23`). Live smoke test on `https://sreenathmenon.com/mela/`: splash → onboarding as a fresh visitor (Priya) → picker → Book Cricket match 7 started, one BALANCED ball committed through Maincloud (1/0, ball strip and reveal rendered), stage route showed the match with QR beacon, latest-moment banner and ball chip. |
| Full redesign (Daylight) checks | Pass | After the rewrite: `pnpm run typecheck`, `pnpm test` 34/34, `pnpm run build:pages`, prettier-clean. |
| Full redesign (Daylight) browser loop | Pass | Local three-identity loop re-run on the new system: player scorebook with teal/rust dots and Fraunces numerals, AGGRESSIVE ball resolving to SIX with Nila's BOOST attributed in the inverted-ink stamp, honey crowd booth with power tickets, poster stage (live match + QR beacon), Pen Fight desk with the teal player pen, fresh-visitor landing, and 390x844 passes for the crowd booth (sticky honey energy header) and the desk. No functional regressions: the same reducer/subscription/QR/stage/memory behaviours as before. |
| Full redesign (Daylight) production deploy | Pass | Pushed `eed3c41`; Pages deployed it (deployed CSS carries `--canvas`/`--teal`/`--honey` and Fraunces; index references the new fonts). Live smoke: returning visitor (Priya) reconnected to her live match 7 with the daylight scorebook and choices, Maincloud state intact; splash and landing render in the new identity. |
| Module build | Pass | `pnpm run spacetime:build`. |
| Frontend checks | Pass | `pnpm run typecheck`, `pnpm run build`, `pnpm run build:pages` (production host/database/origin). |
| Book Cricket balance | Pass | Independent expectimax over the exact 100-roll joint distribution, cross-checked against a 200k-delivery LCG chain (avg 1.760 / 2.160 / 2.690; OUT 4.0% / 14.0% / 35.0%). Optimal policy: SAFE 4 states, BALANCED 2, AGGRESSIVE 6. Chase policy varies with required rate and wickets. |
| Pen Fight physics | Pass | Force sweep from the start position: 20 falls short, 66 makes contact, 80+ knocks the opponent off. Exhaustive opening search (force x angle x contact x seed): max displacement 219 vs 260 needed — no instant win. Simulated rounds: KO 51–79%. Contact 0/50/100 deflects −496 / +7 / +454 units. |
| MelaBot balance | Pass | 3,000 best-of-three matches per skill tier: human match win 36.3% (average) and 38.4% (sloppy). Mirror match at equal skill: KO 60.0%. |
| Fresh-visitor flow | Pass | Cleared storage, cold load: branded splash, then a landing page explaining Mela, then name entry, then a working game picker. No black screen, no dead end. |
| Routing trap fixed | Pass | The previously inert "Choose game" now returns to the picker; a new identity is never routed into a stranger's or a finished match. |
| Concurrent matches | Pass | Arjun and Meera each started and played their own Book Cricket match at the same time on one database; each saw only their own, and each saw the other listed under "join a live crowd". |
| Crowd attribution | Pass | Spectator Nila spent BOOST; the player saw "The crowd is with you. Nila played BOOST — it lands on this ball" *before* choosing, then "2 RUNS — Nila's BOOST turned 0 into 2". The stage showed the same attribution in gold. |
| Pen Fight playthrough | Pass | Live local match: reached MelaBot's pen at force 66, exchanged contact, and won 2–0 with "Riya won with a desk-edge knockout." recorded as durable memory. |
| Suspense and reveal | Pass | Ball commit shows an animated "The ball is on its way…" with the score withheld, then reveals "SIX!" with emphasis; a ball-by-ball strip renders alongside. |
| Big screen | Pass | 1440x900: score/subtext collision fixed; crowd attribution and ball-by-ball strip render; QR and turn state readable from a distance. |
| Mobile spectator | Pass | 390px viewport: score, situation, crowd attribution and ball strip all readable with no horizontal scroll; Crowd Energy sticks to the top of the crowd panel. |
| Schema migration | **Blocked** | In-place publish aborts (new columns need default annotations; table reordering needs manual migration). Verified end to end on a local database seeded with the previous schema: `--delete-data` migrates cleanly. Production publish deliberately not performed — see "Deployment decision required". |
| Pen Fight gesture (live) | Pass | Production: 0 sliders, power bar and 5 keyboard controls present, and a real drag committed a flick. |
| Book Cricket book (live) | Pass | Production: ball one showed only OPEN THE BOOK; it resolved `page 252 -> 2 RUNS`, then PLAY IT SAFE / GO FOR IT appeared. No percentage anywhere on screen. |
| Page digit honesty | Pass | Six consecutive balls read 252->2, 452->2, 130->OUT, 373->3, 56->SIX. Test asserts an exact match across 12,000 outcomes. |
| Rivalry / regret | Pass | After two wins the picker showed "You lead MelaBot 2-0."; the regret line correctly stayed hidden on a win. |
| Sound | **Partial** | 8/8 structural guarantees hold (lazy context, webkit fallback, silent failure, reduced-motion default, persisted mute, gain ceiling). Actual playback **could not be verified**: Chrome requires genuine user activation and CDP-synthesised clicks leave `navigator.userActivation.hasBeenActive` false. Needs a human ear — particularly whether flick and contact stay distinct mid-rally. |
| Production smoke test | Pass | `https://sreenathmenon.com/mela/` on a cleared browser: splash → landing → onboarding → game picker. Book Cricket played to completion — went OUT on ball 1 to AGGRESSIVE (the 35% risk is real), then SAFE through to **Riya 12/1 vs MelaBot 14/1, decided by 2 runs**, with MelaBot losing a wicket mid-chase. Both ball-by-ball strips, the required-rate pressure line and the state-derived memory rendered. Pen Fight: reached and struck MelaBot's pen at force 64 — contact was impossible in the previous build. Stage route, "Mela home" and reconnect all verified live. |
| Stage route regression | Fixed | The stage is a hash route; navigating to it from inside the app only changed the hash, and the route was read once at module load, so it rendered the player view instead. Caught during the production smoke test, made reactive to `hashchange`/`popstate`, and the in-app link now resolves against `BASE_URL` rather than the domain root. Re-verified live. |

### Prior release evidence (previous build — does not describe the current code)

The Book Cricket + Pen Fight release notes recorded before this pass remain in
git history at commit `2022633`. They described a build in which a fresh visitor
could not reach a playable state, only one match could exist world-wide, and
neither game's central decision was mathematically meaningful. Do not cite those
rows as evidence for the current build.

## Deployment configuration

- Maincloud host: `https://maincloud.spacetimedb.com`
- Maincloud database: `mela-cah23`
- Frontend target: `https://sreenathmenon.com/mela`
- GitHub Pages deploys from `.github/workflows/deploy-pages.yml` on push to `main`.
- **The live site serves the design-pass build (`3cae643`).** No module publish
  was needed: the schema and module bindings are unchanged from the currently
  published Maincloud module.

## Known limitations

- The display font loads from Google Fonts; offline, Mela falls back to the
  system stack (Avenir Next/Trebuchet/system-ui), which is legible but less
  distinctive. No font is bundled locally.
- The "MELA" corner stamp on memory cards is CSS `::after` content, so it is
  exposed to assistive tech as decorative text; it is hidden below 520px.
- The published schema reset the world's prior demo data (approved). Any future
  column addition will hit the same constraint until the SDK supports column
  defaults.
- Batting first is structurally disadvantaged in Book Cricket: the chaser knows
  the exact target. With optimal play the human wins ~41% and MelaBot ~54% (4%
  draws). Tuning the bot's chase bands barely moves this; closing it fully would
  need a rules change (a third wicket brings it to ~44/50 but softens the
  wicket tension that makes the choice matter). MelaBot being a modest favourite
  is a deliberate choice — it should be worth beating.
- The Pen Fight balance figures come from scripted opponents, not human
  playtesters. A cautious scripted "human" that never attacks wins only ~17%;
  that is a limitation of the model, not evidence about real players.
- Crowd powers are still resolved per-spectator. A shared crowd-level goal
  ("did the crowd swing this match?") is designed for but not implemented.
- No sound. Four Pen Fight moments (flick, contact, edge teeter, fall) and two
  Book Cricket moments (SIX, OUT) would benefit; deferred deliberately.
- No external LLM, generic game engine, social graph, OAuth, Redis, Socket.IO,
  separate backend, or high-frequency tick was introduced.
- High-volume load testing remains out of scope.

## Next task

Run the planned multi-device production session — a real phone scanning the QR
into a live match — to confirm crowd attribution and concurrent matches with
genuine separate devices on the deployed design. After that, the
highest-value remaining work is sound on the six moments that carry the games
(Pen Fight: flick, contact, edge teeter, fall; Book Cricket: SIX, OUT) and a
shared crowd-level goal so multiple spectators feel like one crowd.

## Handoff notes

Use [BOOK_CRICKET_DEMO_RUNBOOK.md](docs/BOOK_CRICKET_DEMO_RUNBOOK.md) for the
judge flow. Read `AGENTS.md`, this file, and the architecture documents before
future work. The balance numbers in both games are proven by tests — re-run
those proofs before changing any of them.
