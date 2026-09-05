# Mela — SpacetimeDB Deep Research & Architecture Base

**Date:** 2026-09-05  
**Project:** Mela  
**Team:** Flux  
**Track:** Games & Toys  
**Purpose:** Architectural foundation before application implementation

---

## 0. Why this document exists

This document captures the deep SpacetimeDB research completed before implementation begins.

The goal is **not** to turn Mela into a SpacetimeDB feature checklist.

The goal is to build Mela in a way that genuinely uses SpacetimeDB as the **authoritative runtime of a living multiplayer world**, while keeping the product itself fun, immediate, and judge-friendly.

The current official Spacetime material describes the platform as a database + server-side module model with transactional reducers, realtime subscriptions, persistent state, and high-performance execution. Its September 3, 2026 scaling discussion also emphasizes keeping highly contended workloads together rather than paying unnecessary distributed coordination costs. [1]

---

# 1. Mela's locked product thesis

> **Players play. Spectators influence. AI participates. The world remembers.**

Mela is a **gaming-first living multiplayer playground**.

The initial vertical slice is:

**Book Cricket + shared world + spectators + Crowd Energy + AI participant + persistence/reconnect + realtime shared state.**

Mela is not:

- a generic multiplayer SaaS product
- an AI-agent platform
- a chatbot
- a voting application
- a static mini-game collection
- a conventional game server with SpacetimeDB attached afterward

The important product idea is the combination:

**multiple games + persistent shared world + strategically active spectators + AI as a first-class participant + realtime authoritative state + memory/history.**

---

# 2. The central architectural insight

SpacetimeDB should not be treated as:

```text
Frontend
  ↓
API
  ↓
SpacetimeDB
```

where the API contains most of the application logic.

For Mela, the preferred mental model is:

```text
                     MELA WORLD
                         │
                    SPACETIMEDB
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
     STATE             RULES             EVENTS
     tables           reducers        event tables
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                  subscriptions
                         │
        ┌────────────────┼────────────────┐
        │                │                │
      player          spectator       big screen
        │                                 │
        └────────────────┬────────────────┘
                         │
                         AI
```

The database/module is the world authority.

Clients are projections of that world.

---

# 3. What SpacetimeDB is especially good at for Mela

Mela naturally contains:

1. shared mutable state
2. many concurrent actors
3. authoritative rules
4. frequent small state transitions
5. realtime state propagation
6. persistent world state
7. scheduled/timed behavior
8. AI acting against the same world
9. transient realtime events
10. reconnect/rejoin

These are much closer to SpacetimeDB's intended sweet spot than a conventional REST/CRUD workload.

SpacetimeDB's key architecture describes modules as defining database schema/server logic, clients as long-lived streaming connections, and reducers as the server-side mechanism for changing state. [2]

---

# 4. Reducers are the laws of Mela

A reducer should be the authoritative mutation boundary.

Conceptual actions:

```text
onboard_player()
join_world()
create_book_cricket()
join_match()
start_match()
play_ball()
use_crowd_power()
cheer()
challenge()
ai_action()
leave_world()
rejoin_session()
finish_match()
```

The browser requests an action.

The reducer decides whether it is valid.

The reducer mutates state atomically.

Conceptual flow:

```text
Client action
     ↓
SpacetimeDB reducer
     ↓
validate identity
validate role
validate match state
validate turn
validate energy/cooldown
validate action
     ↓
commit or rollback
     ↓
new authoritative world state
```

The browser must never be trusted to decide:

- score
- winner
- turn ownership
- crowd energy
- cooldowns
- role
- progression
- AI state
- game result

This is not merely a security rule; it is what makes simultaneous players, spectators, and AI share one real game world.

---

# 5. Concurrency should become a Mela showcase

Mela has a natural concurrency demonstration.

Example:

```text
Crowd Energy = 10

Spectator A → BOOST (cost 6)
Spectator B → CHAOS (cost 6)
```

Both actions may arrive close together.

The authoritative reducer path should produce one correct serializable outcome:

```text
first transaction:
Energy 10 → 4
BOOST accepted

second transaction:
Energy 4
CHAOS rejected
```

No browser lock should be trusted.

No external distributed counter should be necessary.

The reducer/database state is the authority.

This is particularly valuable for the hackathon because the competition rewards genuine realtime shared state and authoritative server logic.

---

# 6. Subscriptions are the realtime nervous system

SpacetimeDB clients maintain a local cache of subscribed rows and receive changes as live database updates.

The TypeScript SDK exposes the connection, subscribed database view, reducer calls, callbacks, query-builder subscriptions, and React integration. [3]

Mela should therefore avoid turning React into a second source of truth.

Preferred boundary:

```text
SPACETIMEDB
    ↓
subscription
    ↓
client cache
    ↓
React rendering
```

React should own:

- route/navigation state
- input state
- animations
- local UI state
- accessibility state
- temporary pending state
- reconnect presentation

SpacetimeDB should own:

- players
- presence/session state
- match state
- turns
- scores
- crowd energy
- powers
- AI state
- world events
- persistent history

---

# 7. Narrow subscriptions, not "everything everywhere"

The system should subscribe only to what a client needs.

Likely subscription shapes:

### Lobby / World

```text
active players
active matches
public world activity
```

### Match player

```text
current match
participants
turn
score
crowd state
relevant events
```

### Spectator

```text
spectator-visible match state
crowd state
public activity
```

### Big screen

```text
active matches
public world activity
dramatic events
leaderboard/status
```

The first prototype may use broader subscriptions for speed, but the production/demo architecture should demonstrate deliberate subscription scope.

SpacetimeDB documentation specifically discusses narrow subscriptions as a way to limit network bandwidth, client memory and computation. [3]

---

# 8. Event Tables are a particularly strong fit

Current SpacetimeDB event tables exist for data that should be emitted to clients but does not need to remain in normal table state.

Rows are inserted in a transaction, broadcast to subscribers after commit, and then deleted from table state. Clients observe them through insert callbacks. [4]

That is nearly perfect for Mela's moment-to-moment drama.

Examples:

```text
BALL_PLAYED
SIX
WICKET
CROWD_CHEER
BOOST_ACTIVATED
CHAOS_TRIGGERED
AI_CHALLENGE
MATCH_WON
WORLD_EVENT
PLAYER_JOINED
```

This gives us:

```text
persistent state
        +
transient signals
```

For example:

### Persistent table

```text
MatchHistory
Sreenath defeated MelaBot
```

### Event table

```text
SIX!
```

The first becomes part of what **the world remembers**.

The second drives what **the world feels right now**.

Current event-table limitations matter: event tables cannot currently be used as the right/inner side of subscription joins and cannot currently be accessed by views. [4]

Therefore:

**Do not use event tables as the main persistent event/history model.**

Use normal tables for history and event tables for transient client-visible events.

---

# 9. Views: useful, but selective

SpacetimeDB supports read-only server-side views that can be queried/subscribed to. [2]

Potential Mela uses:

```text
CurrentLeaderboard
ActiveWorldStatus
MatchSummary
ActiveSpectators
PlayerStanding
```

Views should be used when server-side derived state genuinely improves correctness or subscription design.

Do not create views merely to demonstrate the feature.

Where the computation is primarily filtering/joining, prefer query-oriented approaches the platform can optimize.

Avoid expensive procedural scans over large history tables.

---

# 10. Indexes are part of the data model

Indexes should be designed from real access patterns.

Likely hot paths include:

```text
world_id
match_id
player_identity
status
match/player relationships
event/history lookup
```

Possible conceptual indexes:

```text
players.by_world
players.by_match
matches.by_status
match_players.by_match
history.by_player
history.by_match
```

Do not create indexes indiscriminately.

Indexes improve lookup/query/subscription paths but consume memory and add update overhead.

Design:

**tables + indexes + subscriptions + reducers**

as one system.

---

# 11. Scheduling makes the world continue moving

SpacetimeDB schedule tables can trigger reducers or procedures at future times or intervals. [5]

This is a strong fit for a persistent world.

But Mela does **not** need a high-frequency game loop.

Book Cricket is turn/event driven.

Good scheduling candidates:

```text
turn timeout
crowd power expiration
temporary effect expiration
AI heartbeat
world heartbeat
match cleanup
post-match world event
```

Example:

```text
BOOST activated
   ↓
schedule expiry
   ↓
scheduled reducer
   ↓
BOOST removed
```

Or:

```text
player does not act
   ↓
turn timeout
   ↓
scheduled reducer
   ↓
turn progresses
```

Use scheduling where it represents actual world behavior.

Do not introduce 50–100 ms ticks merely because a game demo can.

---

# 12. AI architecture

AI must be a first-class actor, not a chatbot bolted onto the screen.

Preferred model:

```text
                WORLD STATE
                     ↓
              AI perception
                     ↓
            AIProvider.decideAction()
                     ↓
                proposal
                     ↓
              MELA REDUCER
                     ↓
              WORLD STATE
```

The AI can have:

- character state
- strategy/personality
- memory/history
- cooldowns
- legal actions
- current goals

But the AI must still obey the exact same authoritative world rules as humans.

Therefore:

```text
Human    ─┐
Spectator ├──→ action request → reducer → world
AI        ─┘
```

The AI never gets a privileged mutation path.

---

# 13. Deterministic AI first, LLM second

The first working AI should be deterministic.

Example policy:

```text
if behind by a lot:
    consider aggressive action

if crowd_energy high:
    consider challenge

if own turn:
    choose legal game action

if match idle:
    maybe trigger interaction
```

Then optionally add an LLM provider.

Architecture:

```text
AIProvider
 ├── DeterministicAIProvider
 └── ExternalLLMProvider
```

The deterministic implementation must always remain available.

An LLM failure, timeout, quota error or malformed response must not make Mela unusable.

---

# 14. Procedure boundary for external AI

Reducers should remain the authoritative state-changing path.

Procedures are appropriate when Mela genuinely needs external I/O, such as HTTP access to an LLM provider. SpacetimeDB documentation explicitly distinguishes procedures from reducers and notes procedures are suitable for external requests. [6]

Therefore:

### Reducer

```text
score run
consume energy
change turn
activate power
record result
```

### Procedure/external service

```text
ask an LLM to reason about current state
```

Then:

```text
external AI
   ↓
action proposal
   ↓
normal authoritative reducer
```

Never:

```text
LLM → direct database mutation
```

---

# 15. Do not put the LLM in the critical realtime path unnecessarily

External inference can be slower and less reliable than the core game loop.

Preferred structure:

```text
real-time gameplay
        ↓
deterministic authority
        ↓
AI reasoning may occur asynchronously
        ↓
proposal
        ↓
validated reducer
```

This preserves a playable product even when the external provider fails.

---

# 16. Identity and connection are different

SpacetimeDB distinguishes a user identity from a particular connection.

The identity persists across connections; a connection ID identifies a connection session. [7]

That matters for:

```text
phone
reload
reconnect
second browser tab
big screen
```

Mela should therefore model:

```text
Identity = person/player
Connection = current connection session
```

not:

```text
browser tab = player
```

That will make reconnect/rejoin much more robust.

---

# 17. Anonymous onboarding is the correct hackathon default

For a party game, full OAuth is unnecessary during the critical build window.

A low-friction pattern is:

```text
open Mela
   ↓
SpacetimeDB assigns identity
   ↓
enter display name
   ↓
join world
```

The TypeScript connection APIs support anonymous identity generation and saving the issued token for reconnection. [3][7]

This gives the required:

**QR → join → name → play**

flow with very little friction.

Strong authentication can be a later product concern.

---

# 18. Lifecycle reducers for presence

Connection lifecycle hooks can be used for connection/presence bookkeeping.

Conceptually:

```text
connect
   ↓
presence/session state

disconnect
   ↓
connection cleanup / offline status
```

Do not confuse connection presence with durable identity.

The player may disconnect and return.

The world should remain intact.

---

# 19. Persistent memory: "the world remembers"

Mela should not just save final scores.

A useful history model can preserve:

```text
who played
who won
score
spectator interventions
AI participation
important world events
rivalries
streaks
```

That allows future interactions like:

> "You beat MelaBot last time."

The world can therefore remember relationships and outcomes.

This should be modeled as normal persistent tables, not event tables.

---

# 20. Maincloud is part of the product proof

Publishing the Mela module to Maincloud is not merely an infrastructure checkbox.

It allows us to prove:

- real live shared state
- multiple clients
- realtime subscriptions
- authoritative reducers
- persistent world state
- real deployment
- hot module updates/migrations where appropriate

The current Maincloud documentation supports publishing the module and updating an existing database while keeping active client connections connected. [8]

This is particularly useful during a hackathon because we can improve server logic while demonstrating a live product.

---

# 21. Scaling: what we should and should not do

The September 3, 2026 official SpacetimeDB scaling article is important.

It states that each Spacetime database currently executes as a single-threaded actor by design, while Cloud provides distributed state-machine replication for resilience. It also explains that highly contended transactions are often best kept together rather than paying distributed coordination overhead. [1]

Therefore:

### For Mela MVP

Use:

```text
ONE MELA WORLD
      ↓
ONE DATABASE
```

Keep strongly coupled state together:

```text
match
score
crowd energy
turn
AI
world events
```

Do not prematurely split them across databases.

### Future product scaling

If Mela becomes a large product, independent worlds/regions could be separate databases:

```text
                MELA GLOBAL
                     │
          ┌──────────┼──────────┐
          │          │          │
       World A    World B    World C
        DB          DB         DB
```

That is a future scaling concern, not a hackathon concern.

---

# 22. Automatic migrations must influence schema design

SpacetimeDB supports automatic migrations for compatible module changes, including adding tables, indexes, reducers and certain columns with defaults. Some changes are breaking or unsupported. [9]

Therefore:

- prefer additive schema evolution
- avoid unnecessary destructive changes
- document schema evolution
- regenerate client bindings whenever required
- keep migrations reproducible

This matters because Mela will evolve rapidly during the 24-hour build.

---

# 23. Proposed Mela server shape

Conceptually:

```text
spacetime/
├── schema/
│   ├── world
│   ├── players
│   ├── matches
│   ├── crowd
│   ├── ai
│   ├── history
│   └── events
│
├── reducers/
│   ├── onboarding
│   ├── world
│   ├── book_cricket
│   ├── crowd
│   ├── ai
│   └── lifecycle
│
├── views/
│   ├── world
│   ├── match
│   └── leaderboard
│
├── schedules/
│   ├── turn_timeout
│   ├── effect_expiry
│   └── world_ai
│
└── procedures/
    └── external_ai
```

This is a conceptual organization, not a command to create every directory.

Codex should choose the smallest clean structure compatible with current SpacetimeDB module conventions.

---

# 24. Proposed Mela world data concepts

The initial schema should probably include concepts equivalent to:

```text
World
Player
Presence / Connection State
Match
MatchParticipant
BookCricketState
CrowdState
CrowdEffect
AICharacter
PersistentHistory
WorldEvent
TransientEvent
Schedule/Timer
```

Exact names and field types should be determined in the architecture pass.

Do not over-model.

The first implementation should model only the state required by the vertical slice.

---

# 25. Mela's key actor model

There are three fundamentally different actor categories:

```text
PLAYER
SPECTATOR
AI
```

They may have different permissions.

But they should operate within the same world and authoritative action system.

For example:

```text
PLAYER
    → PLAY_BALL

SPECTATOR
    → BOOST

AI
    → PLAY_BALL / CHALLENGE
```

All converge on validated state transitions.

This is a core product and architecture invariant.

---

# 26. The best first technical demonstration

The strongest demo is probably:

```text
PHONE A
Player

PHONE B
Spectator

PHONE C
Second spectator

BIG SCREEN
World

AI
MelaBot
```

Then:

```text
Player acts
       ↓
Reducer
       ↓
All clients update

Crowd acts
       ↓
Reducer
       ↓
All clients update

AI acts
       ↓
Reducer
       ↓
All clients update

Match ends
       ↓
Persistent history
       ↓
World remembers
```

If possible, intentionally demonstrate simultaneous crowd actions and rejection of an invalid action.

That visually and technically proves the architecture.

---

# 27. SpacetimeDB capability map

| Capability | Mela use | Decision |
|---|---|---|
| Tables | persistent world state | CORE |
| Reducers | authoritative mutation/rules | CORE |
| Subscriptions | realtime state propagation | CORE |
| TypeScript bindings | typed client | CORE |
| React integration | reactive UI | CORE |
| Identity | frictionless players | CORE |
| ConnectionId | connection/session handling | CORE |
| Lifecycle reducers | presence | CORE |
| Indexes | hot lookup paths | CORE |
| Event tables | transient game effects | CORE |
| Persistent event/history tables | memory/history | CORE |
| Schedule tables | time/expiry/world activity | CORE, selective |
| Views | useful derived state | SELECTIVE |
| Procedures | external LLM/HTTP | SELECTIVE |
| Private tables | internal/sensitive data | SELECTIVE |
| Maincloud | live production demo | CORE |
| HTTP handlers | custom HTTP API | NOT MVP |
| Multi-database sharding | future scale | NOT MVP |
| High-frequency simulation loop | unnecessary for Book Cricket | NOT MVP |
| Redis/external state cache | unnecessary | NO |
| Separate websocket backend | defeats core architecture | NO |
| Separate game backend | unnecessary | NO |

---

# 28. What not to do

Do not let implementation drift into:

```text
React
  ↓
Express/Fastify
  ↓
Socket.IO
  ↓
Redis
  ↓
Postgres
  ↓
SpacetimeDB
```

That would make SpacetimeDB incidental.

Also avoid:

- polling game state
- client-authoritative scores
- client-authoritative crowd energy
- special AI mutation path
- LLM directly mutating state
- huge global subscriptions
- storing transient UI effects permanently
- overusing views
- arbitrary indexes
- high-frequency tick loops without product need
- premature sharding
- full authentication before the vertical slice exists

---

# 29. Multi-agent engineering strategy for Mela

The project should be built so multiple coding agents/providers can work safely.

This does **not** mean several agents editing the same files simultaneously.

Use a coordinator + scoped specialist model.

### Agent roles

**Architect Agent**

Owns:
- architecture decisions
- SpacetimeDB capability mapping
- schema/reducer design
- ADRs
- risk analysis

**SpacetimeDB Agent**

Owns:
- module code
- schema
- reducers
- views
- schedules
- procedures
- migrations
- module tests

**Frontend Agent**

Owns:
- React screens
- mobile UX
- big-screen UI
- QR experience
- local presentation state

**Game Rules Agent**

Owns:
- deterministic Book Cricket rules
- rules tests
- spectator power math
- cooldown/energy semantics

**AI Agent**

Owns:
- AIProvider abstraction
- deterministic AI
- optional LLM provider
- prompts/policies
- AI action proposals

**Synthetic User / QA Agent**

Owns:
- scripted multi-client behavior
- synthetic players/spectators
- concurrency tests
- reconnect tests
- invalid-action tests
- stranger-proof usability checks

**Release/Demo Agent**

Owns:
- deployment
- smoke tests
- Maincloud verification
- frontend deployment
- demo environment
- final judge flow

### Important rule

These agents should not all modify the same files at once.

Prefer:

```text
shared Git repository
+
small task branches/commits
+
explicit ownership
+
STATUS.md updates
+
review/merge gate
```

---

# 30. Synthetic users should become a first-class testing strategy

Mela is particularly suitable for synthetic user testing because the world is stateful and multi-actor.

We should eventually be able to create scenarios such as:

```text
User 1 = PLAYER
User 2 = PLAYER
User 3 = SPECTATOR
User 4 = SPECTATOR
User 5 = AI
```

Then run scripted actions:

```text
join
create match
join
play
boost
chaos
reconnect
simultaneous action
finish
```

The goal is to validate the actual live system, not merely unit-test isolated functions.

Useful synthetic test scenarios:

### Scenario A — basic multiplayer

2 players, 1 spectator

### Scenario B — crowd

2 players, 10 spectators

### Scenario C — concurrency

20 spectators attempt actions rapidly

### Scenario D — reconnect

disconnect/reconnect player during match

### Scenario E — hostile input

invalid role/action/energy/cooldown claims

### Scenario F — AI failure

external provider unavailable; deterministic AI continues

### Scenario G — stranger test

fresh browser joins via QR and reaches playable state quickly

This should eventually feed into automated smoke/evaluation tooling.

---

# 31. Synthetic users must test the real boundary

The strongest synthetic-user tests should not call pure game-rule functions only.

They should exercise:

```text
client
  ↓
SpacetimeDB connection
  ↓
subscription
  ↓
reducer
  ↓
state
  ↓
subscription update
  ↓
client
```

That is how we test what actually makes Mela special.

Unit tests remain valuable, but the synthetic user harness should verify the complete shared-world loop.

---

# 32. Provider independence

Because multiple coding agents/providers will be used, no important project knowledge should live only in one model's context.

Permanent sources of truth:

```text
AGENTS.md
STATUS.md
architecture/ADR docs
tests
actual code
```

Provider-independent rules:

- never rely on hidden chat memory
- update STATUS after meaningful work
- document architecture changes
- document test results
- never fabricate deployment state
- never store secrets in project docs
- keep AI provider interchangeable
- keep deterministic fallback
- inspect existing work before editing

This is essential if Codex runs out of credits or another model/provider takes over.

---

# 33. What AGENTS.md needs to say

The current AGENTS.md already captures the locked product direction, SpacetimeDB authority, AI fallback, subscriptions, security and documentation discipline. [10]

It should now additionally contain:

### SpacetimeDB-first rule

> Treat SpacetimeDB as the authoritative world runtime, not a secondary persistence layer.

### Capability rule

> Prefer native SpacetimeDB capabilities when they solve the requirement cleanly.

### Architecture invariants

> World state is authoritative in SpacetimeDB. Reducers are the mutation authority. Clients are projections. AI is an actor. External AI only proposes actions. Persistent history is separate from transient event tables.

### Multi-agent rule

> Agents have explicit scopes. Do not concurrently edit the same architectural surface without coordination. STATUS.md records active ownership and handoff state.

### Synthetic testing rule

> Before declaring multiplayer features complete, exercise them through multi-client/synthetic user scenarios whenever practical.

### Research rule

> When changing a SpacetimeDB architectural assumption, verify against current official documentation rather than relying on older model knowledge.

---

# 34. What STATUS.md needs to change

The current STATUS.md is intentionally still waiting for the missing master plan and currently says implementation is paused. [11]

That was reasonable at the initial handoff, but it now needs a new architecture gate.

Add a section such as:

```text
## SPACETIMEDB ARCHITECTURE GATE

Status: Research complete; architecture approval pending.

Research basis:
MELA_SpacetimeDB_Deep_Research_Architecture_Base.md

Required before implementation:
- schema
- indexes
- reducers
- subscriptions
- event tables
- views
- schedules
- procedures
- identity/reconnect
- public/private boundaries
- AI provider boundary
- synthetic user testing strategy
- multi-agent ownership model
```

And update the next task from:

> obtain missing master plan

to:

> Produce and review the Mela SpacetimeDB Architecture Decision Record, then implement only after approval.

---

# 35. Recommended new permanent documents

After the architecture gate, the repository should eventually contain:

```text
AGENTS.md
STATUS.md
README.md

docs/
├── MELA_SpacetimeDB_Architecture.md
├── ADR/
│   ├── 001-spacetimedb-authority.md
│   ├── 002-world-model.md
│   ├── 003-ai-boundary.md
│   ├── 004-synthetic-users.md
│   └── 005-multi-agent-workflow.md
└── testing/
    └── synthetic-user-scenarios.md
```

Do not create all of these immediately.

Start with the architecture ADR.

---

# 36. Recommended implementation gates

## Gate 0 — research

Complete.

## Gate 1 — architecture

Produce:

- world model
- schema
- reducers
- indexes
- subscription plan
- event strategy
- schedules
- views
- procedures
- AI boundary
- synthetic testing architecture
- multi-agent ownership model

## Gate 2 — P0 shared world

Prove:

```text
join
presence
subscriptions
shared state
```

## Gate 3 — Book Cricket

Prove:

```text
create
join
play
score
turn
finish
```

## Gate 4 — spectators

Prove:

```text
Crowd Energy
BOOST
CHAOS
concurrency
server validation
```

## Gate 5 — AI

Prove:

```text
deterministic AI
same reducer path
failure-safe
```

## Gate 6 — memory

Prove:

```text
history
reconnect
return
```

## Gate 7 — showmanship

Prove:

```text
QR
big screen
fresh stranger
Maincloud
```

## Gate 8 — synthetic evaluation

Prove:

```text
2
5
10
20+
```

clients/scenarios as realistically as the environment allows.

---

# 37. Final architectural statement

The architecture should be explainable in one sentence:

> **Mela is a living multiplayer world whose authoritative state, rules, realtime updates, timed behavior, and transient events run in SpacetimeDB; humans, spectators, and AI all act through the same validated world rules, while persistent history makes the world remember.**

That is the architectural foundation.

---

# 38. References

[1] Spacetime, “Ok, but does it scale?”, September 3, 2026.  
https://spacetimedb.com/blog/how-does-spacetime-scale

[2] SpacetimeDB — Key Architecture / database & module concepts.  
https://spacetimedb.com/docs/intro/key-architecture/

[3] SpacetimeDB — TypeScript Reference / subscriptions / client cache / React integration.  
https://spacetimedb.com/docs/clients/typescript/

[4] SpacetimeDB — Event Tables.  
https://spacetimedb.com/docs/tables/event-tables/

[5] SpacetimeDB — Schedule Tables.  
https://spacetimedb.com/docs/tables/schedule-tables/

[6] SpacetimeDB — Procedures.  
https://spacetimedb.com/docs/functions/procedures/

[7] SpacetimeDB — Connecting / Identity / ConnectionId.  
https://spacetimedb.com/docs/clients/connection/

[8] SpacetimeDB — Maincloud deployment.  
https://spacetimedb.com/docs/how-to/deploy/maincloud/

[9] SpacetimeDB — Automatic Migrations.  
https://spacetimedb.com/docs/databases/automatic-migrations/

[10] Current repository AGENTS.md — captured project direction and engineering rules.

[11] Current repository STATUS.md — captured initial repository state and handoff process.

---

# 39. Research status

**Research:** COMPLETE  
**Architecture:** READY FOR FORMAL ADR / APPROVAL  
**Implementation:** NOT STARTED  
**Codex action:** Architecture pass first; no P0 coding until the architecture gate is reviewed.

