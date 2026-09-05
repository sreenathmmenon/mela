# Mela Engineering Guide

## 1. Project identity

Team: **Flux**  
Product: **Mela**  
Track: **Games & Toys**  
Problem: **Spectators are wasted**

Repository owner and commit author: **Sreenath** (`sreenathmmmenon@gmail.com`). All commits in this repository must use this identity and must not include `Co-authored-by` trailers or other co-author attribution unless Sreenath explicitly requests an exception.

Locked problem statement: “Today’s games are isolated sessions; there’s no shared living playground where humans and AI can play, interact, and shape the same world together in real time.”

**Before making architectural or product changes, read STATUS.md.**  
**Do not silently change the product direction.**

## 2. Locked vision and principles

Mela is gaming-first: multiple games are the doorway into one persistent, realtime shared playground. Humans play, spectators make meaningful moves, AI characters participate under the same rules, and the world remembers outcomes.

Book Cricket is P0’s first vertical slice, not the product boundary. Keep the Mela world layer game-agnostic where practical: world, identity, presence, player/spectator/AI actors, Crowd Energy, events, durable history, subscriptions, discrete scheduling, and QR/big-screen experiences are reusable. Keep game-specific state and rules behind a `game_kind` boundary so Pen Fight and later games reuse the same living world. Do not build a speculative generic game engine; extract an abstraction only after actual games prove it shared.

Do not turn Mela into a generic multiplayer SaaS product, AI-agent platform, coding-agent orchestrator, chatbot, ordinary isolated game, static mini-game catalogue, social network, or voting demo. Do not remove spectators, AI participation, persistence, or SpacetimeDB authority without explicit human approval.

North star: **Players play. Spectators influence. AI participates. The world remembers.**

## 3. Architecture and ownership

**SpacetimeDB-first rule:** treat SpacetimeDB as the authoritative world runtime, never as a secondary persistence layer behind a conventional backend. Use native tables, reducers, subscriptions, event tables, schedules, views, procedures, identities, and Maincloud whenever they cleanly solve a Mela requirement. Do not add Redis, Socket.IO, Express/Fastify authority APIs, separate WebSocket services, or separate game backends without a concrete approved requirement.

World authority invariants: reducers are the sole authoritative mutation boundary; clients are projections; persistent history is distinct from transient event tables; external AI may propose but never directly mutate world state. Reducers validate and mutate every shared gameplay action; tables store presence, sessions, game state, energy/cooldowns, AI state, scores, and events. Clients subscribe to the smallest required set of tables/queries and render server state. Never trust browser values for score, energy, cooldown, role, winners, game results, AI state, or progression. Do not create artificial high-frequency simulation ticks or prematurely shard the Mela world.

The frontend owns routes, responsive presentation, optimistic _pending_ UI only, local input state, accessibility, reconnect UX, and QR/big-screen experiences. It does not decide authoritative outcomes.

AI decisions sit behind `AIProvider.decideAction(worldState, characterState)`. Keep a deterministic provider as the always-available fallback; providers and keys remain server-side. An LLM failure must not make a game unusable.

## 4. MVP data model and reducers

The first vertical slice is Book Cricket. Expected server entities: world/session, player presence/profile, participant role, Book Cricket match/turn/score, spectator energy and cooldowns, AI character state, persistent score/history, and append-only world events. Exact schema names belong in STATUS.md once implemented.

Expected reducers include name onboarding, join/leave world, create/join Book Cricket, player play action, spectator powers (including CHAOS), AI action, and reconnect-safe presence/session handling. Each reducer authenticates identity, validates role and game state, checks energy/cooldowns, commits one atomic state change, and emits/records an event.

## 5. Authentication, subscriptions, deployment

Start with the smallest secure name-only onboarding compatible with SpacetimeDB identity. Treat identity as server-issued, validate all actions server-side, rate-limit/guard abuse where supported, and never persist secrets in the browser, repository, AGENTS.md, or STATUS.md.

Use narrow subscriptions for a player’s current world/match plus relevant event feed; avoid global unbounded feeds. Plan for reconnect and idempotent-safe UI. The production target is SpacetimeDB Maincloud plus a separately deployed frontend; document actual database name, URLs, commands, and deployment results in STATUS.md. Do not claim a deployment that has not occurred.

## 6. Engineering standards

- Use typed contracts and clear, small modules; keep reducer validation close to state transitions.
- Preserve backwards-compatible migrations and document every schema/reducer change.
- Keep UI mobile-first and big-screen readable; ensure keyboard access, semantic controls, contrast, and visible focus.
- Keep events append-only where practical; protect user inputs and avoid exposing secrets or internal errors.
- Prefer deterministic tests for game rules; test invalid actions, concurrent actions, reconnects, and multi-client synchronization.
- Run formatter/lint/typecheck/tests/build after meaningful increments. Verify the local product in a browser before calling a feature complete.
- Optimize subscription scope and rendering before premature infrastructure changes; avoid hot polling and unbounded client state.

## 7. Definition of done and judging

A feature is done only when reducer/server validation, subscription updates, responsive UI, error/reconnect behavior, tests, and STATUS.md are complete. The MVP must demonstrate: name onboarding; a living world; Book Cricket with one player and multiple spectators; meaningful spectator powers and Crowd Energy tradeoffs; an AI participant; authoritative realtime updates; persistent events/scores; return/rejoin; big-screen mode; and QR joining.

Demo judgment criteria: the gaming-first thesis is immediately visible, spectator influence is strategic rather than cosmetic, AI is a first-class participant, SpacetimeDB’s realtime authority is clear, and the persistent world feels alive. Do not build Pen Fight until this vertical slice works; it is P1.

## 8. Documentation and handoff

`STATUS.md` is the single source of truth for progress. Update it after every meaningful implementation, test result, deployment attempt, failure, feedback item, or material decision. Never fabricate test results, user feedback, deployment state, or credentials. Keep its required sections current, including one explicit next task.

A new provider must start by reading this file and STATUS.md, inspect the repository and current Git state, run the documented checks, then continue the highest-priority accepted task. If context is missing, record the uncertainty and ask the human rather than inventing product requirements.

Multi-agent rule: an **Architecture/Coordinator** owns product direction, schema/reducer authority, and cross-agent contracts. It sits above explicitly scoped specialists for SpacetimeDB, game rules, frontend, AI, synthetic QA, and release/demo. Specialists have exclusive scope and do not concurrently edit the same authority surface. Coordinate with scoped branches/commits, reviewed handoffs, `STATUS.md`, architecture documents, tests, and Git—not hidden chat context.

Synthetic-user rule: before declaring a multiplayer feature complete, exercise it through real multi-client/synthetic scenarios whenever practical. The target test loop is client → subscription → reducer → committed world state → subscription assertion, including player, spectator, AI, concurrent, invalid-action, reconnect, and fresh-stranger/QR flows. Pure game-rule/unit simulation is valuable but does not substitute for this real-world loop.

P0 Book Cricket is locked as Human Player vs MelaBot over two innings, with the human batting first and spectators active throughout. Keep match participants actor-generic for later Human vs Human. Crowd Energy is one shared match pool with per-spectator cooldowns. P0 AI is deterministic; external LLM is P1 and may only propose actions that pass ordinary authoritative validation.

Internal state transitions use shared domain/rule functions called by public reducers and private scheduled entry points; do not model them as reducer-to-reducer calls. Event tables are transient state delivery (with commit-log records), while durable product history uses normal tables. Schedule only discrete turn timeout, effect expiry, deterministic AI wake, and stale cleanup—never a high-frequency tick.

When changing a SpacetimeDB architectural assumption, verify it against current official documentation and record whether it is a researched fact, recommendation, assumption, or human approval decision.

## 9. Current constraints and risks

Book Cricket and Pen Fight are implemented; STATUS.md records current verification. The production/demo frontend is Railway at `https://mela-web-production.up.railway.app`, with SpacetimeDB Maincloud `mela-cah23`. Do not deploy Mela to the personal-site GitHub Pages path.

Agent Duel is explicitly approved for Pen Fight. WebMCP and remote MCP share definitions in `src/agentTools.ts`; both are ordinary reducer clients. Keep seed/pending crowd state outside agent observations and enforce seat/turn rules in SpacetimeDB. See `docs/WEBMCP_AGENT_DUEL.md`. The public Chrome origin-trial token expires 17 November 2026; verify actual native tool discovery/execution on Railway and keep human play available when the API is absent.
