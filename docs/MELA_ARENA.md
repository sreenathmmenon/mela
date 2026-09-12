# Mela Arena — shipped contracts

Sreenath approved implementing the new arena direction on 12 September 2026. This is an addition to Mela, not a replacement for Pen Fight, Book Cricket or the other existing games. No competition placement, virality, investment or acquisition is promised.

## Three games, one small proven board vocabulary

The board is a 9×9 lantern-lit diorama. Amber starts at (0,4); Teal starts at (8,4). Both submit a discrete plan; the authoritative reducer resolves both together. Every match ends by move 24. There is no simulation tick or client physics authority.

| Game            | Objective                                                                                          | Finish                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Crown Run       | Pick up the crown, carry it to your own portal, then deliver it                                    | First two deliveries; otherwise most deliveries at 24 moves; equal totals draw |
| Bridge Breakers | Navigate blocks and the moving crossing to the opposite portal                                     | First arrival; simultaneous arrivals draw; otherwise draw at the move limit    |
| Mela Heist      | Occupy both gold switches together, pick up the unlocked treasure, deliver to either runner's home | Shared team victory; otherwise the vault closes at 24 moves                    |

Actions: cardinal step (one tile), dash (two tiles, costs two charge, cannot carry the crown), guard/recharge, shove, interact. Human controls only expose useful interaction/shove situations. Every proposal is independently validated server-side. Guard blocks a shove. Opponents may share a tile; this is a simultaneous-planning board game, not a physical collision simulator. Simultaneous pickups use move-number parity, disclosed in the controls, to avoid deadlock. There is no hidden random advantage.

MelaBot's runner, defender and trickster strategies share the same rule resolver as people and external agents. Mela Heist has a team outcome, not a renamed competitive win. Hosting a strategy duel does not award human match wins or game-skill ranking points.

## Crowd

One shared pool: 42 starting energy, 60 maximum, +3 per committed move. No repeating energy timer for new arenas. At most one pending power per move, acquired atomically. Each spectator has one cooldown across all three powers; reconnect does not reset it. Player and connected agent identities cannot purchase powers.

| Power         | Cost | Personal cooldown | Effect / expiry                                                                                                |
| ------------- | ---- | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Turn bridge   | 20   | 20 seconds        | Crossing centre cycles row 4 → 2 → 6 → 4. Persists until changed. A now-closed route holds the submitted move. |
| Spring charge | 15   | 15 seconds        | Both runners finish this move with full dash charge.                                                           |
| Lantern lift  | 10   | 12 seconds        | Both runners are protected from shoves for this resolution only.                                               |

No stacking: a second power before the next reveal is rejected without spending energy. Invalid roles, insufficient energy, cooldowns and finished games likewise cannot spend energy. Pending power/actor is a private table delivered through a spectator-only view. Public committed frames reveal the crowd's action afterward. There is no chat.

## Little discoveries

Cosmetic, deterministic, once per match, included in replay state. No progression bonus or competitive advantage.

| Game            | Discovery 1                                     | Discovery 2                                         |
| --------------- | ----------------------------------------------- | --------------------------------------------------- |
| Crown Run       | Both rivals guard beside the crown: a royal bow | Carry the crown to the top edge: moon moths follow  |
| Bridge Breakers | Take the top route: a paper kite appears        | Both runners dash together: twin-trail discovery    |
| Mela Heist      | Both guard together: a tiny chai cup            | Unlock the vault within ten moves: a brass owl bows |

## Authority, tables and subscriptions

`spacetimedb/src/arenaRules.ts` is pure versioned domain logic. `arenaModule.ts` adds the schema/reducers; the existing module supplies canonical identity, guest profile, match, Crowd Energy, progression, events and history services. The three implemented games establish the shared vocabulary; this is not a user-code game engine.

- `arena_state`: public match-keyed committed state, revision, phase, strategy/mode and assigned agent identity.
- `arena_intent`: private, indexed by match; at most one validated intent per side/revision.
- `arena_crowd`: private match-keyed pending crowd choice.
- `arena_frame`: normal durable, match-indexed opening plus at most 24 committed frames. Contains actual actions and source disclosure; not transient events.
- `arena_course`: normal named, attributed, bounded creator courses. At most twelve per identity, fourteen blocks per course. Reserved objectives cannot be blocked; paths are validated including the initially open crossing.
- `arena_wake`: private discrete wake/deadline table. Wrong revision, completed/abandoned match or wrong phase is a no-op.
- `my_arena_crowd`: caller-scoped spectator view, not accessible through player/agent observations.
- `my_arena_agent`: caller-scoped active assigned matches. The hosted worker subscribes only to this view, never to private plans or crowd state.

Public reducers: `create_arena`, `play_arena`, `arena_power`, `connect_arena_agent`, `publish_arena_course`. Private scheduled entry: `process_arena_wake`. All mutations remain ordinary SpacetimeDB transactions. Duplicate intent submissions reject; duplicate/stale wakes cannot advance a second time. Atomic finalization produces one shared `match_history` and `match_memory` record, with existing participation progression and crowd summary. There is no universal cross-game skill score.

The new game UI subscribes to current-match arena state, frames and energy. Existing identity/presence/match projections remain shared. Reconnect reconstructs from committed rows. Durable frames provide fresh-stranger replay without relying on missed live events. QR and public memory links use the current origin. Big-screen dispatch recognizes all three game kinds.

## Astra boundary and truthful attribution

The existing Railway Node transport hosts `/api/arena/teach`, `/api/arena/status` and an ordinary subscribed agent client. It does not become a game backend. No separate infrastructure is introduced.

- **Coach:** real `gpt-6-astra` Responses API Structured Outputs maps a short user idea to one of three tested deterministic policies. The UI explicitly says that Astra created the strategy and MelaBot executes it. It does not pretend that every move is an LLM call.
- **Live agent:** connect the hosted agent before the opening move. Its scoped subscription receives the authoritative public board and chooses an index from server-derived legal actions. It proposes through `play_arena` with its independent identity. Agent-vs-agent mode assigns both external seats to the hosted connection, with independently requested proposals.
- **Fallback:** deterministic MelaBot fills an absent/invalid/late proposal at the authoritative deadline. Every durable frame discloses `External agent`, `Human`, `MelaBot strategy` or `MelaBot fallback`; no scripted action is presented as model inference.
- The 25-second maximum deadline prevents a model outage from stranding a match. Once both proposals arrive, a short 2.5-second crowd window resolves early; the original deadline later becomes a stale no-op. Normal deterministic moves use the same 2.5-second window.
- The model does not see opponents' pending intent, pending crowd, credentials or contacts. Generated outputs are schema-constrained and revalidated. No arbitrary prompt-generated executable code.

Official references used: [current model guide](https://developers.openai.com/api/docs/guides/latest-model), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Implementation uses Responses, `reasoning.effort=low`, `store=false`, 1,800 output-token ceiling, 20-second request timeout. No unsupported temperature setting.

## Operations and honest limits

Runtime variables (server only): `OPENAI_API_KEY`, `MELA_ARENA_AGENT_TOKEN`, `MELA_ASTRA_DAILY_CALLS` (default 100, hard ceiling 2,000). Keys never enter Vite/browser variables, source files or the repository. Stable agent credentials retain seat continuity across transport restarts. Hosted capacity is two simultaneous requests. Coach requests additionally have a conservative ten/hour per connection-address guard.

The free deterministic games remain available when hosted Astra is at capacity. The daily call counter is process-local and resets on restart; it is a launch safety budget, not a distributed billing guarantee. Run a single hosted worker with the stable token. Multiple replicas require a reviewed durable quota/lease design before enabling them. Course discovery is currently a small shared catalogue; moderate/bound it further before opening large creator volumes. No unlimited-free-inference claim.

Human-v-human arena seats, multiple independent agent providers, persistent custom character prompts, downloadable video export and unrestricted text-to-level generation are not shipped in this pass. Existing Pen Fight/Four in a Row human and agent modes remain intact. The new games support human vs MelaBot/live Astra and watchable strategy/live-agent duels. Heist is human/agent or agent/agent cooperation. Replays and course selection are real; a course catalogue is not claimed to be a social network.

## Repeatable verification

1. `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm build:transport`, `pnpm spacetime:build`.
2. Publish additively to an isolated local DB, never delete baseline data.
3. `pnpm exec tsx scripts/verify-arena.ts`: real three-client loops, concurrent crowd purchases, authorization, stale/duplicate intent rejection, completed histories and fresh replay reconstruction.
4. With the local hosted worker and a real API key, `pnpm exec tsx scripts/verify-arena-ai.ts`: real human/Astra race and independent agent/agent opening proposals. This is a paid integration check, not part of the default unit suite.
5. Existing guest, Pen Fight human/agent seats and playground regression scripts against that same isolated module.
6. Actual browser desktop/mobile game, crowd, QR, camera, course publish, completion/replay/rematch checks. Browser emulation is not physical-device certification.

Release evidence and deployment IDs belong in `STATUS.md`.
