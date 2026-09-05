# Mela P0 — Book Cricket Game Rules

Status: **Locked P0 design; values are intentionally tunable in one game-rules configuration area during implementation.**

## Purpose and pacing

Book Cricket is Mela’s first game, not its product boundary. This ruleset targets a clear, replayable match of about three minutes through short innings, live spectator choices, and a per-action deadline—not through a hard match-loss clock.

## Match format

- Game kind: `book_cricket`.
- Matchup: one Human Player versus deterministic MelaBot.
- Two innings: Human bats first; MelaBot chases second.
- Spectators can join and use powers throughout both innings.
- Each innings ends at six deliveries, two wickets, or (in the chase) when the target is reached.
- Human target = human final score + 1.
- MelaBot wins immediately on reaching the target. Human wins if the chase ends below target. Equal scores are a draw; no P0 tie-breaker.
- The reusable participant model remains actor-generic for future Human versus Human matches.

## Delivery model

The batter chooses one legal style for each delivery:

- **Steady flip** — safer weighted outcome profile.
- **Attack flip** — higher chance of 4/6, with increased wicket risk.

The client submits only the requested style. The server selects and resolves the outcome using a match-owned deterministic seed and delivery sequence; no client can submit a score, wicket, random value, or outcome.

Possible delivery results are `0`, `1`, `2`, `3`, `4`, `6`, or `WICKET`. A wicket scores zero runs. Crowd effects alter the authoritative resolution as specified below.

MelaBot chooses `steady` or `attack` deterministically from current score, target, balls/wickets remaining, active effects, and a small personality policy. It uses the same legal-action and resolution functions as the human.

## Timing

- Human action deadline: **12 seconds** per delivery.
- A human action timeout becomes a server-resolved dot ball (`0`); it is not an automatic match loss.
- MelaBot wake: one discrete scheduled wake after the match transition, with a tunable presentation delay of roughly **1–2 seconds**.
- No high-frequency tick and no hard three-minute automatic-loss clock.

## Crowd Energy

Crowd Energy is a shared resource per match, not a client-side value.

- Starting energy: **42**.
- Maximum energy: **60**.
- Passive regeneration: **+2 every 12 seconds**, via discrete scheduled/validated regeneration only while below the cap.
- Each spectator has individual cooldowns by power. Shared-pool balance, cooldowns, and effects are evaluated by reducers.

## Crowd powers

The spectator chooses a permitted target side (`human` or `melabot`) for side-targeted powers. The UI may favour the human target, but the server validates target, phase, membership, shared energy, cooldown, stacking, and expiry.

| Power | Cost | Spectator cooldown | Effect | Stacking / expiry |
|---|---:|---:|---|---|
| **BOOST** | 18 | 20 s | The selected side’s next non-wicket delivery gains +2 runs, capped at 6. | One active BOOST per target side; expires after next target delivery or 20 s. |
| **CHAOS** | 20 | 25 s | The selected side’s next delivery resolves through the deterministic high-variance chaos profile; it can help or hurt. | One active CHAOS per target side; expires after next target delivery or 20 s. |
| **SHIELD** | 15 | 25 s | The selected side’s next wicket is converted to a dot ball. | One active SHIELD per target side; expires after next target delivery or 25 s. |
| **CHEER** | 4 | 10 s | Replenishes the shared Crowd Energy pool by 8, capped at its maximum, creating a collective resource decision. | Immediate; no effect row. |

Different side-targeted effects may coexist. For a delivery, apply CHAOS to choose the base profile, resolve the base outcome, then apply SHIELD to a wicket, then apply BOOST only to a non-wicket score. Consumed effects are removed atomically with the delivery. Duplicate active effect kind/target pairs are rejected rather than stacked.

All power costs, cooldowns, caps, profiles, innings limits, and timeouts must live in a centralized Book Cricket rules/configuration module when implemented—never scattered magic numbers.

## Deterministic MelaBot personality

MelaBot is “cool under pressure, reckless when behind.” It attacks more often when chasing a difficult target with few deliveries remaining; otherwise it uses steady flips. It recognizes active crowd effects in its legal decision policy and always continues without an external service.

## Live commentary and memory

Short deterministic transient events include joined-world/match notices, innings changes, scores, wickets, power activations/expiry, AI pressure moments, and results. Examples: `Sreenath → 4`, `SIX!`, `BOOST activated`, `MelaBot under pressure`.

Event tables deliver immediate moment-to-moment drama and are not durable table state. Meaningful outcomes—result, player performance, crowd influence, AI participation, and streak facts—are written separately to normal durable history/stat tables.

## P0 tuning assumptions

The numerical values in this document are game-design defaults, not architectural constraints. Change them only through the centralized configuration with deterministic tests and an accompanying STATUS.md decision/update. The intended outcome is a match that feels fast and strategic without requiring traditional Book Cricket’s full rule complexity.
