# Mela SpacetimeDB Architecture Gate

Status: **Approved architecture baseline — no implementation authorized yet**  
Scope: architecture only; this document authorizes no application scaffold or server module.

## Reading guide

- **Researched fact** is supported by the supplied research basis or current official SpacetimeDB documentation.
- **Recommendation** preserves Mela's locked thesis and is the proposed implementation direction.
- **Assumption** is a practical placeholder to validate during implementation.
- **Decision** is a choice explicitly approved by Sreenath for this architecture baseline.

## A. Architecture overview

**Recommendation:** Mela is one SpacetimeDB database/module running one persistent shared world for the P0 vertical slice. Its tables are the world state; reducers are its laws; subscriptions create client projections. The frontend is a presentation/input client only. Human players, spectators, and AI all request actions that converge on shared server-side validation.

**Researched fact:** SpacetimeDB databases export tables and reducers; reducers run as separate atomic transactions, committing all changes or rolling them all back. Clients keep long-lived streaming connections and subscribe to public data. [Key Architecture](https://spacetimedb.com/docs/intro/key-architecture/)

No separate game server, WebSocket service, Redis cache, REST authority layer, or distributed world split is proposed.

**Decision — game-agnostic Mela layer:** Book Cricket is P0’s first vertical slice, not the product boundary. The reusable Mela layer owns world, identity, presence, player/spectator/AI actors, shared Crowd Energy, events, durable history, realtime subscriptions, discrete scheduling, and QR/big-screen experiences. Game-specific rules and state live behind a `game_kind`/game-strategy boundary. Future games such as Pen Fight reuse the Mela world and actor infrastructure without redesigning it.

This is deliberately not a generic game-engine project. Implement Book Cricket cleanly first, then extract only abstractions proven to be shared by actual games.

## B. World model

```text
World (persistent social/game container)
 ├─ public player profiles and presence projection
 ├─ active matches
 │   ├─ participants: player / spectator / AI
 │   ├─ Book Cricket state and turn
 │   ├─ shared Crowd Energy and effects
 │   └─ transient dramatic events
 └─ durable match/world history and leaderboard summaries
```

**Recommendation:** P0 has exactly one active world in one database, while preserving `world_id` in world-scoped rows. This makes the experience visibly shared today and permits future independent worlds without rewriting every relationship.

**Decision:** P0 Book Cricket is **Human Player vs MelaBot**, over two innings: the human bats first, MelaBot bats second, and spectators remain active throughout both innings. `match_participant` remains actor-generic so Human vs Human can be added later without changing the world or authority model.

## C. Conceptual schema, fields, and indexes

Exact TypeScript/Rust names and types are deferred until approval. IDs are server-generated. Time fields are server-owned timestamps.

| Table | Conceptual fields | Indexes/access paths | Visibility |
|---|---|---|---|
| `world` | `world_id`, `name`, `status`, `created_at`, `active_match_id?`, `revision` | primary key; `status` | public |
| `player_profile` | `identity`, `display_name`, `created_at`, `last_seen_at`, `total_matches`, `status` | primary key `identity`; optional display-name lookup | public, sanitized |
| `connection_session` | `connection_id`, `identity`, `connected_at`, `last_seen_at` | primary key `connection_id`; `identity` | private |
| `world_presence` | `world_id`, `identity`, `presence_state`, `joined_at`, `last_seen_at` | composite/secondary `world_id`; `identity` | public projection |
| `match` | `match_id`, `world_id`, `game_kind`, `status`, `created_at`, `started_at?`, `ended_at?`, `turn_sequence`, `winner_identity?`, `revision` | primary key; `world_id + status`; `game_kind + status`; `status` | public |
| `match_participant` | `match_id`, `identity_or_actor_id`, `kind`, `role`, `joined_at`, `state` | `match_id`; participant identity/actor lookup; unique membership | public except internal AI detail |
| `book_cricket_state` | `match_id`, `phase`, `turn_owner`, `innings`, `score`, `wickets`, `balls`, `target?`, `last_outcome`, `deadline_at?`, `revision` | primary/unique `match_id`; `turn_owner` only if needed | public, Book Cricket only |
| `crowd_state` | `match_id`, `shared_energy`, `max_energy`, `last_regen_at?`, `revision` | primary/unique `match_id` | public |
| `spectator_state` | `match_id`, `identity`, `joined_at`, `personal_cooldown_until?`, `contribution_count` | `match_id`; `match_id + identity` | public where game-readable |
| `crowd_effect` | `effect_id`, `match_id`, `effect_kind`, `source_identity?`, `starts_at`, `expires_at`, `state` | primary key; `match_id + state`; `expires_at` | public |
| `ai_character` | `actor_id`, `world_id`, `display_name`, `persona_key`, `state`, `last_action_at`, `cooldown_until?` | primary key; `world_id + state` | public safe projection |
| `ai_private_state` | `actor_id`, policy/memory cursor, pending proposal metadata, provider diagnostics | primary key | private |
| `durable_history` | `history_id`, `world_id`, `match_id?`, `kind`, actor references, compact payload/version, `occurred_at` | primary key; `world_id + occurred_at`; `match_id + occurred_at`; actor + time | public only if safe/redacted |
| `leaderboard_snapshot` | `world_id`, `identity`, aggregate score/wins/streak, `updated_at` | `world_id`; ranking access strategy validated with real query | public |
| `transient_event` | `event_id`, `world_id`, `match_id?`, `kind`, safe payload, `occurred_at` | match/world indexes only if required | public **event table** |
| schedule tables | target IDs, due time, expected revision/version, purpose | due/target access paths | private |
| `ai_proposal` (P1) | `proposal_id`, actor, legal-action candidate, input revision, expiry, provider metadata | actor/status/expiry | private |

**Recommendation:** Create only the P0 rows required by the accepted Book Cricket rules. Indexes are intentional: they support reducer lookup and subscription predicates, not speculative optimization. Add a `revision`/expected-state token only where stale timer/proposal handling needs it; reducers still remain the final authority.

**Decision:** Crowd Energy is one **shared pool per match**, with per-spectator cooldowns. This creates a visible coordination and concurrency mechanic: accepted actions atomically consume the common pool, while individual cooldowns prevent one spectator from monopolising powers.

## D. Reducers and validation

| Reducer family | Proposed reducers | Authoritative validation |
|---|---|---|
| onboarding/presence | `onboard`, `join_world`, `leave_world`, lifecycle presence handlers | caller identity owns profile; normalized/bounded name; target world exists/open; never accept identity from browser parameters |
| match lifecycle | `create_match`, `join_match`, `start_match`, `leave_match`, `finish_match` | game kind supported; match/world status; unique membership; allowed role; valid participant count; only allowed actor can start/finish |
| Book Cricket | `play_ball`, `concede_or_end_turn`, `resolve_turn_timeout` | match active; caller owns current player role/turn; legal phase; server derives outcome/score/winner; stale deadline/version rejected |
| spectators | `join_as_spectator`, `use_crowd_power`, `resolve_effect_expiry` | caller is subscribed match spectator; allowed power; shared energy sufficient; individual cooldown elapsed; effect stacking rules; server charges energy and schedules expiry atomically |
| AI | `request_ai_turn`/internal trigger, `apply_ai_action`, `resolve_ai_wake` | AI exists/eligible; proposal fresh and matches state revision; proposed action is legal under the exact same game-rule function as a human action |
| history/system | `record_result` internal, `cleanup_stale_state` | only invoked as part of valid transition/schedule; history payload is redacted/versioned; cleanup checks target still stale |

**Decision:** Public reducers are the authoritative external mutation entry points. They call shared internal domain/rule functions; internal transitions are **not** modeled as reducer-to-reducer calls. Actor-specific permission checks occur before the shared resolution function. A human `play_ball` and an AI `apply_ai_action` therefore produce equivalent legal world transitions. Scheduled reducers use private scheduling entry points and the same internal rules; clients cannot invoke scheduler-only transitions.

**Decision — game boundary:** common reducers own world/membership/presence/crowd/history concerns. A match’s `game_kind` selects the game-specific rule boundary; Book Cricket reducers and `book_cricket_state` remain Book Cricket-specific. Do not build an abstract game engine or strategy framework before a second game proves a shared abstraction.

**Researched fact:** a reducer receives caller identity in its context and runs atomically; an error/exception rejects the entire transaction. [Key Architecture](https://spacetimedb.com/docs/intro/key-architecture/)

## E. Subscription model

Clients subscribe to public, narrow, state-oriented data. They do not subscribe to private rows or use browser state as an alternate store.

| Client scope | Subscription contents | Exclusions |
|---|---|---|
| world/lobby | active world, public presence, open/active match summaries, bounded recent durable activity, public leaderboard | raw connection sessions, private AI data, full history |
| player in match | current match, its participants, Book Cricket state, crowd state/effects, own spectator state if applicable, bounded match history, transient events | other match internals, private queues/credentials |
| spectator in match | same public match projection, crowd state/effects, own allowed spectator state, transient events | player-private or AI-private diagnostics |
| big screen | active matches, public match summaries/state, public presence counts, leaderboard, dramatic transient events | identity tokens, raw connection data, action controls, unbounded history |

**Recommendation:** subscriptions use server-friendly predicates keyed by `world_id`, `match_id`, status, and bounded time windows. The first prototype may temporarily use a broader *single-world* query only if it remains demonstrably small; it must not become a permanent global subscription.

## F. Event tables and persistent history

**Decision:** `transient_event` is an event table for immediate visual/audio drama: ball outcomes, cheers, power activations, AI moments, joins, and win reveals. It is not durable table state: after a successful transaction it is delivered to subscribers and removed from normal table state, though the event is retained in the database commit log. It is never the only product record of a meaningful result.

`durable_history` is a normal append-only table for what the world remembers: match created/ended, results, notable spectator influence, AI participation, and relationship/streak-relevant facts. Store compact, schema-versioned domain records—not raw UI logs or private prompts.

**Researched fact:** event-table rows are broadcast after a successful transaction and then deleted; they are not normal durable state. Event tables cannot be converted to/from regular tables after publishing. [Event Tables](https://spacetimedb.com/docs/tables/event-tables/)

## G. Views

**Recommendation:** defer views until a reducer/table subscription cannot express the derived public projection cleanly. Candidate public views are `active_world_status`, `match_summary`, `world_leaderboard`, and `my_profile` (identity-scoped). Views must not reveal private rows and must not depend on event tables.

**Researched fact:** public views are read-only, can compute derived data/join tables, and may be queried/subscribed to; event tables are unsuitable as their source. [Key Architecture](https://spacetimedb.com/docs/intro/key-architecture/) [Event Tables](https://spacetimedb.com/docs/tables/event-tables/)

## H. Schedule tables and scheduled reducers

**Decision:** schedule only these discrete world deadlines, never artificial high-frequency simulation ticks:

- `turn_timeout_schedule` → resolves an unplayed turn only when match state/version still matches;
- `effect_expiry_schedule` → removes a still-active crowd effect;
- `ai_wake_schedule` → asks deterministic AI to consider one legal action;
- `cleanup_schedule` → handles stale match/presence cleanup conservatively.

Every scheduled reducer is idempotent and revalidates the target row, due time, and expected revision because an earlier action can make a timer obsolete.

**Researched fact:** schedule tables trigger scheduled reducers/procedures at a time or interval. [Schedule Tables](https://spacetimedb.com/docs/tables/schedule-tables/)

## I. Procedures

**Decision:** P0 uses no external procedure: deterministic AI is enough and keeps play reliable.

**P1 recommendation:** an authenticated, rate-limited `request_ai_proposal` procedure may make outbound HTTP to an LLM. It receives a minimum, privacy-safe world snapshot and returns/writes only an expiring private `ai_proposal`. A normal reducer or scheduled reducer rechecks the proposal against current state and applies it through the common rule function. The procedure never writes score, winner, role, energy, cooldown, or progression directly.

**Researched fact:** procedures can make HTTP requests but are not automatically database transactions; any database operation is manual. [Key Architecture](https://spacetimedb.com/docs/intro/key-architecture/)

## J. AI architecture

```text
authoritative state → allowed-action projection → AIProvider.decideAction
  → candidate proposal → ordinary validation/rule resolution → committed world state
```

**Decision:** `DeterministicAIProvider` is P0 and always available. `ExternalLLMProvider` is P1 only. Provider code may choose among server-supplied legal action candidates but cannot mint action capabilities or mutate state. Every AI proposal passes through the ordinary authoritative game-rule validation before it can change the world. API credentials are server-side secrets only; the browser receives neither keys nor raw provider diagnostics.

## K. Identity and reconnect

**Recommendation:** use the long-lived SpacetimeDB identity as the durable player key, not the browser tab or `ConnectionId`. Name onboarding binds a validated display name to that identity. Persist the issued auth/token material in the client’s normal secure browser storage per SDK guidance so reload/reconnect can resume the same identity. `ConnectionId` lives only in the private connection registry and supports multiple tabs/connections per identity.

On disconnect, do not end a match or erase a participant. Mark only the connection offline; public identity presence becomes offline only after no active connection remains. Rejoin reducers restore an eligible participant to the active match without reassigning roles or rewriting results.

**Researched fact:** identity is long-lived across connections, while each connection gets a distinct `ConnectionId`. [Key Architecture](https://spacetimedb.com/docs/intro/key-architecture/)

## L. Security and public/private data

Public data: display names, safe presence, public match state/score/turn, public crowd energy/effects, safe AI character presentation, leaderboard, redacted durable history, and transient spectator-visible drama.

Private data: authentication token material, raw `ConnectionId` registry, internal moderation/rate-limit state, AI prompt/provider credentials/diagnostics, unredacted strategy/memory, proposal queue, and operational/deployment configuration.

**Recommendation:** public tables contain only data safe for every subscribed client. Do not attempt row-level secrecy in a broadly public table; use private tables plus narrowly designed public views/projections when personalized data is genuinely needed.

## M. Concurrency and atomicity

Every meaningful gameplay request is one reducer transaction. A crowd-power reducer reads current pool/cooldown/effect state, validates it, deducts energy, records durable consequence where needed, inserts the transient event, and schedules expiry in one all-or-nothing commit. Thus concurrent requests serialize to one legal state; clients reconcile from resulting subscriptions rather than client locks.

Use server-derived random/outcome policy for Book Cricket if randomness is part of the game; never accept a client-provided run, winner, timestamp, role, energy, or cooldown. Validate expected revisions for timers and AI proposals. Make repeat-prone actions idempotent where practical through stable action IDs/transition checks.

## N. Maincloud deployment

**Recommendation:** P0 deploys one named Mela database/module to Maincloud after local two-client validation, then deploys the static frontend separately with environment-configured host/database identity. Database name, Maincloud account ownership, frontend host, and public URL remain undecided. Publish only schema-compatible incremental changes during live demos; record every attempt and result in STATUS.md.

**Researched fact:** Maincloud hosts SpacetimeDB databases; compatible automatic migrations support additive evolution, while incompatible changes require deliberate migration planning. [Maincloud](https://spacetimedb.com/docs/how-to/deploy/maincloud/) [Automatic Migrations](https://spacetimedb.com/docs/databases/automatic-migrations/)

## O. QR onboarding and big screen

QR encodes a public HTTPS route containing only a non-secret world/match join reference. It never carries an identity token, role authority, admin action, or score. A fresh phone connects, receives/recovers its identity, chooses a display name, subscribes to the world/match, and calls a reducer to join as a server-validated spectator or player.

The big screen is an unprivileged read-only client with a dedicated route and subscription profile. It renders public current-world/match/leaderboard/event data. It has no administrative reducer and no privileged credentials.

## P. Synthetic-user architecture

**Decision:** build a later test harness using real generated client bindings and disposable identities. Its end-to-end target must drive the full loop:

```text
synthetic client → connection → subscription → reducer → committed state → subscription assertion
```

Scenario roles: synthetic player, spectator, deterministic AI, concurrent crowd actors, invalid/hostile client, reconnecting client, and fresh QR/stranger browser. Pure game-rule/unit simulation validates isolated deterministic logic; it does **not** prove subscriptions, identity, reducer authority, or client convergence. Unit tests complement but never replace end-to-end shared-world tests.

## Q. Multi-agent workflow

| Scope | Exclusive owner | Coordination artifact |
|---|---|---|
| product direction, schema/reducer changes, cross-agent contracts | **Architecture/Coordinator** | this gate, ADRs, STATUS decisions, integration review |
| module/schema/reducers/migrations | SpacetimeDB agent | module docs, reducer tests, STATUS |
| pure game rules/balance | game-rules agent | rules spec/tests |
| UI, QR, big screen | frontend agent | route/component docs, visual test notes |
| AI providers/policies | AI agent | provider contract, failure tests |
| synthetic clients/concurrency | QA agent | scenario matrix/results |
| deployment/demo | release agent | runbook, deploy evidence, demo checklist |

The Architecture/Coordinator sits above specialist agents: it alone accepts changes to product direction, schema/reducer authority, and cross-agent contracts. Specialists have exclusive scoped ownership and work on scoped branches/commits. They do not concurrently edit shared authority files (`schema`, shared rule contract, `STATUS.md`) without coordinator sequencing. Every handoff names owner, branch/commit, touched surfaces, test evidence, decision changes, and next task in STATUS.md. Git plus the repository documents—not chat—are the communication record.

## R. Testing strategy

1. Pure deterministic rule tests: scoring, legal transitions, effect stacking, cooldown and energy math.
2. Reducer tests: authorization, rejected invalid action, atomic rollback, stale timers/proposals.
3. Two-client live local test: same state visible after join/play/crowd action.
4. Synthetic scenarios: basic multiplayer; crowd contention; 5/10/20 clients; reconnect; hostile inputs; LLM failure; QR stranger journey.
5. Deployment smoke test: Maincloud identity, subscriptions, reducers, reconnect, mobile, big screen, QR.

No row of STATUS.md’s test matrix changes to pass without recorded evidence.

## S. P0 / P1 / P2

| Priority | Included | Explicitly excluded |
|---|---|---|
| P0 | one game-agnostic Mela world/database; guest name onboarding; two-innings Human vs MelaBot Book Cricket (human bats first); active spectators; shared Crowd Energy; deterministic AI; transient events + durable history; reconnect; QR; big screen; local/Maincloud realtime validation | external LLM dependency, Human vs Human mode, second game, generic game-engine framework, sharding, advanced accounts/social layer |
| P1 | Pen Fight after P0 proof, reusing Mela world/actor infrastructure; external LLM proposal procedure; richer history/rivalries; stronger auth; expanded synthetic load coverage | new generic platform services until shared behavior justifies extraction |
| P2 | multiple independently deployed worlds/regions, additional games, advanced moderation/analytics, account linking | anything that weakens the gaming-first thesis |

## T. Rejected approaches

- **Express/Fastify/REST authority, Socket.IO, separate WebSocket service, separate game backend, Redis for world state:** duplicate or weaken SpacetimeDB’s authority without a demonstrated requirement.
- **Client-authoritative score/energy/cooldowns/role/result/AI state:** invalid under Mela’s shared-world invariant and unsafe under concurrency.
- **LLM direct mutation:** external output is untrusted and nondeterministic; it may only propose an action.
- **Event table as history:** event rows are transient and cannot replace durable player/world memory.
- **Polling or global unbounded subscriptions:** wastes bandwidth/client work and obscures the realtime model.
- **High-frequency ticks:** Book Cricket is discrete/turn-driven; timers must represent real deadlines/effects.
- **Premature multi-database sharding:** the MVP’s coupled world state benefits from one authoritative database.
- **Static catalogue or cosmetic-only spectator vote:** fails the locked product thesis.

## Locked decisions

1. P0 is one Mela world in one authoritative SpacetimeDB database; `world_id` remains in the model for future expansion.
2. P0 Book Cricket is Human vs MelaBot, two innings, human batting first, with spectators active throughout; the participant model remains Human vs Human-ready.
3. Crowd Energy is shared per match with per-spectator cooldowns.
4. P0 AI is deterministic; P1 may add an external LLM provider that only proposes actions for normal validation.
5. Public reducers plus shared internal domain functions are the only mutation design; no reducer-to-reducer internal transition model.
6. Transient event tables are separate from durable normal-table history; schedules are discrete only.
7. The Architecture/Coordinator owns product, authority, and cross-agent contracts above exclusive specialist scopes.
8. Synthetic QA must exercise the real client → subscription → reducer → committed state → subscription assertion loop.
9. No Redis, Socket.IO, separate game backend, premature sharding, client authority, or artificial high-frequency tick.
10. Book Cricket is P0’s first game only. Mela world infrastructure is game-agnostic where practical; game-specific state/rules remain behind `game_kind` boundaries, and no speculative generic game engine is built.

## Remaining technical unknowns

- Final Maincloud database name and static-frontend host/domain.
- Exact P0 Book Cricket scoring/action rules and spectator-power catalogue/balance values; these are game-rules specifications, not architecture changes.
- Exact SpacetimeDB module language and frontend framework/toolchain; select only at the implementation-bootstrap gate based on current SDK support and team speed.
