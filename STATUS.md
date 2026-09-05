# MELA STATUS

## Last updated

- Date/time: 2026-09-05, Asia/Kolkata
- Agent/provider: Claude (Opus 5)
- Branch: `main`
- Delivery state: Product excellence pass complete, published to Maincloud, deployed, and smoke-tested in production.

## Product excellence pass

An independent audit of the live product found three defects that made the
locked thesis untrue in practice, all now fixed and proven:

1. **A new player could not play.** Opening the production URL dropped a fresh
   visitor into a stranger's *finished* Pen Fight with a single inert button and
   no way out. Match selection is now identity-scoped: you only ever land in a
   match you own or joined, and "Mela home" always works.
2. **Only one match could exist in the whole world.** A second person was
   offered "join the crowd" and nothing else. Matches are now per-identity, so
   any number of people can play at once, and the home screen lists other live
   matches to watch.
3. **Neither game's core decision was real.** Book Cricket's AGGRESSIVE was
   mathematically optimal in all twelve states; Pen Fight's pens could not reach
   each other at any legal force, so every round ended on a positional tiebreak.

### Book Cricket

- Style table repriced: SAFE 4% OUT (0–3), BALANCED 14% (0,1,2,4), AGGRESSIVE
  35% (0,3,4,6). Risk now outruns reward 8.75x to 1.53x.
- Expectimax over the true joint distribution: optimal first-innings policy is
  **SAFE in 4 states, BALANCED in 2, AGGRESSIVE in 6**, and wickets in hand
  change the right answer (5 balls: 2 wickets → AGGRESSIVE, 1 wicket → SAFE).
- Chase is rate-driven: need 2 from 3 → SAFE; need 14 from 4 → AGGRESSIVE.
- Adaptive play beats every pure strategy (41.4% vs 26.4 / 36.6 / 38.7%).
- MelaBot chases to the required rate and protects its last wicket.
- Real OUT percentages are shown on the choice cards.

### Pen Fight

- New flick model: travel scales with force; leftover travel transfers to the
  struck pen; contact point steers it (±56° of deflection authority).
- **Contact is now possible** — the old physics moved a pen at most 129 units
  when it needed ~364. Knockouts are the normal way rounds end (~50–79%).
- Force has a genuine sweet spot: near an edge, force 40–60 wins outright while
  70+ knocks the opponent out *and* carries you off. Actor-out resolves first.
- Opening fairness proven by exhaustive search over every legal opening flick:
  max opponent displacement 219 against the 260 needed to exit.
- Round tiebreak uses desk margin, not centre distance — a teetering pen loses.
- MelaBot aims through the human toward the nearest edge, manages its own
  overshoot, and carries a deterministic wobble so it stays beatable (~36–38%
  human match win for typical play).
- The pen is drawn as a pen: tapered barrel, nib, cap, clip, contact shadow,
  and a friction-decay slide instead of a linear glide.

### Crowd, the differentiator

Previously a spectator could turn a 4 into a 6 and **no surface named them.**
Now: crowd effects record their author, and the delivery resolution reports the
swing it caused. The player sees "Nila played BOOST — it lands on this ball"
*before choosing*, then "Nila's BOOST turned 0 into 2" after. The stage shows
the same line in gold, and durable memory keeps it. Contextual advice tells the
crowd whether to spend now or hold.

### Product and presentation

- Pre-render splash: a cold load is no longer ~3.5s of black screen.
- Landing page explains what Mela is before asking for a name.
- Game picker has per-game art and player-facing copy.
- Suspense beat between commit and reveal, scaled to the drama; the score is
  withheld until the reveal so it lands as a moment.
- Ball-by-ball strip on player and stage surfaces.
- Big-screen score/subtext collision fixed.
- Memories are state-derived and name people rather than using filler.
- Mobile: sticky Crowd Energy, single-column powers, 44px+ touch targets.

## Deployment

Adding `humanTimeline`, `botTimeline`, `lastCrowdSwing` and `hasActed` plus a
table reordering is a breaking schema change, and the SpacetimeDB 2.10
TypeScript SDK exposes no column default annotation — so the publish required
`--delete-data`. The world held 5 profiles, 2 memories and 2 matches, all demo
data from prior QA runs with no real users; Sreenath approved the reset.

Published to Maincloud on 2026-09-05. Database identity
`c200fad7d7acce35e4289bd2d998b2eedfd145f765f58cb2c86534d67d844d3a`; dashboard
`https://spacetimedb.com/mela-cah23`. Frontend deployed by GitHub Pages runs
`33970151428` and `33971062100`.

Note for future schema changes: publishing the module and pushing the frontend
must happen in that order, or the live site briefly runs against a schema it
does not have.

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
| Deterministic suite | Pass | `pnpm test`: **34/34** (was 25). New coverage: expectimax proof that no Book Cricket style is optimal in every state; MelaBot required-rate chase; a pen can reach and knock out the opponent from the start; force carries overshoot risk near an edge; no legal opening flick can end a round; contact point steers the struck pen; degenerate aim cannot produce an invalid position; desk-margin tiebreak; crowd swings are attributed. |
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
- **The live site currently serves the previous build.** The frontend in this
  commit expects the new schema, so it must not be pushed until the module has
  been published — otherwise the site will break on missing columns. Publish the
  module first, regenerate bindings, then push.

## Known limitations

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

Run a multi-device production session — a real phone scanning the QR into a live
match — to confirm crowd attribution and concurrent matches with genuine
separate devices rather than separate browser identities. After that, the
highest-value remaining work is sound on the six moments that carry the games
(Pen Fight: flick, contact, edge teeter, fall; Book Cricket: SIX, OUT) and a
shared crowd-level goal so multiple spectators feel like one crowd.

## Handoff notes

Use [BOOK_CRICKET_DEMO_RUNBOOK.md](docs/BOOK_CRICKET_DEMO_RUNBOOK.md) for the
judge flow. Read `AGENTS.md`, this file, and the architecture documents before
future work. The balance numbers in both games are proven by tests — re-run
those proofs before changing any of them.
