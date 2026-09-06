# Small-game shortlist — research only

Date: 6 September 2026. Branch: `codex/small-games-research`.
Baseline: `5833d5f`. No new game, dependency, schema, deployment or merge.

## Decision under Sreenath's constraint

Research Dots and Boxes plus two alternatives; implement only if the work is small and isolated. **Recommend Dots and Boxes next, but do not implement a full game in this pass.** Its rules are small; a complete Mela integration is a multi-surface feature, not a small patch. A browser-only toy would bypass Mela authority and omit the crowd/memory experience. This document is not implementation approval or a claim of playable functionality.

## Shortlist

| Game                              | Researched basis                                                                                                                                                       | Engineering/design assessment                                                                                                                                                                      | Recommendation                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Dots and Boxes                    | Adjacent horizontal/vertical lines; completing a box earns it and another move; most boxes wins. [UCLA rules](https://www.math.ucla.edu/~tom/Games/dots%26boxes.html). | Small deterministic rules and a touch-friendly 2D board; capture chains make visible comeback moments. Full crowd integration is still new design.                                                 | Best next experiment.                                                               |
| Noughts and Crosses / Tic-tac-toe | Listed by the [Traditional Games Federation of India](https://www.traditionalgamesindia.com/games-list/). This supports local relevance, not an Indian-origin claim.   | Smallest rules/AI surface, but short rounds and familiar solved play leave little room for meaningful spectators. Inventing powers could overwhelm the original game.                              | Easy mechanically, weaker fit for Mela. Do not add just to increase the game count. |
| Navakankari / Nine Men's Morris   | [INTACH Bangalore](https://www.intachblr.org/products.html) includes it in its traditional-game revival programme and describes a two-player nine-coin strategy game.  | Placement, movement, captures and endgame variants require more rule decisions, AI and testing than the other candidates. Source is cultural context, not a complete implementation specification. | Strong heritage candidate, outside the small-work condition.                        |

Dots and Boxes and Noughts and Crosses are presented as familiar notebook games, not as games proven to originate in India. Relative effort above is an engineering assessment, not a measured delivery estimate.

## Smallest worthwhile Dots and Boxes proposal

Recommended, not locked:

- One 4×4-dot board: 9 boxes and 24 legal edges. Human vs deterministic MelaBot; no multiplayer matchmaking or new 3D renderer.
- Tap a visible edge, show a local selection preview, then commit. Clear ownership colours, box-capture animation and an unmistakable extra-turn cue. Server state supplies ownership, turn and result.
- Shared rule function handles both actors: reject occupied/out-of-range edges, enforce turn/revision, award every newly closed adjacent box (including two at once), retain turn on a capture, finish only when all boxes are owned.
- Deterministic AI takes an available capture, otherwise favours moves avoiding a third side, then uses a stable edge-order tie break. This is a simple baseline, not optimal chain strategy.
- Server scheduling wakes AI once per current revision; duplicate/stale wakes do nothing. No ticks or client scoring.
- Reuse identity, participants, match subscriptions, shared energy/cooldown infrastructure and durable memory. Add game-specific state and result details under `game_kind = dots_and_boxes`.
- Crowd must influence play, not merely watch. A possible experiment is one-use protection against an opponent's extra turn, resolved after their move. This changes standard rules and needs explicit design review before implementation: targeting, cost, duration, stacking and hidden/reveal behaviour must be specified. Do not automatically transplant BOOST/CHAOS from cricket.
- Notebook-paper visual language, satisfying drawn strokes and captured initials; no new art/physics dependencies.

## Why full integration is not a tiny change

Current code inspected:

- `src/App.tsx`: game labels, game picker, QR messages, displayed match routing and memory routes have explicit Book Cricket/Pen Fight branches.
- `src/BigScreen.tsx`: existing game selection and rendering require explicit third-game support.
- `spacetimedb/src/index.ts`: match creation/resolution, crowd eligibility/effects and AI schedule dispatch need an additive game-specific path. The existing AI dispatch falls through to Book Cricket after the Pen Fight branch; a new game cannot safely rely on that default.
- Generated bindings and subscription consumers must include the new state; durable memory, recap and metrics assumptions must be audited before claiming integration.

Expected future areas: a dedicated Dots rules/provider module and tests; additive server schema/reducers; generated bindings; one board component; scoped styling; App/subscription routing; crowd rules; history/recap/big-screen projections; integration test driver and STATUS evidence. Keep Pen Fight geometry and Book Cricket rules untouched. No speculative game-engine refactor.

## Branch and merge gate

This branch contains documentation only. Do not merge it as evidence that a new game works. Future implementation stays on an isolated branch and uses a fresh local database, never a production migration for experimentation.

Before any game branch is eligible for Sreenath's merge review:

1. Deterministic tests: each edge orientation, illegal/duplicate/off-turn action, single/double box capture, extra turn, last edge/result, AI legality/determinism and stale wakes.
2. Real independent player and spectator clients: subscription → reducer → committed state → matching subscription assertions; reconnect, crowd concurrency and latest-state AI behaviour.
3. Completed match creates memory/progression exactly once. No universal skill score or fabricated crowd contribution.
4. Desktop/mobile UI review: accurate hit targets, clear turn/capture/result, no inaccessible board edges, QR join, rematch and history.
5. Existing complete test suite, module build and frontend typecheck/build pass. Real Book Cricket and Pen Fight completion/crowd/AI flows still work against the additive local module; Pen Fight 3D/aiming stays intact.
6. Review diff and migration for data loss/scope creep. Sreenath decides whether to merge. No production deployment before that decision.

## Remaining choices

- Whether to allocate a complete integration pass for Dots and Boxes rather than only a small patch.
- The exact spectator mechanic; the example above is a proposal, not a silent change to Mela's locked product rules.

No runtime tests or browser playtests were run for this documentation-only research. No new game is claimed as tested or implemented.
