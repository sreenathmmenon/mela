# MELA STATUS

## 1. LAST UPDATED

- Date/time: 2026-09-05, Asia/Kolkata (Phase 1 foundation complete; Phase 2 next)
- Agent/provider: Codex (GPT-5)
- Git commit: see `git log -1` on `main` for the current documented milestone
- Branch: `main`

## 2. PROJECT IDENTITY

Team: Flux  
Product: Mela  
Track: Games & Toys  
Problem: Spectators are wasted

Problem statement: “Today’s games are isolated sessions; there’s no shared living playground where humans and AI can play, interact, and shape the same world together in real time.”

## 3. NORTH STAR

Players play.  
Spectators influence.  
AI participates.  
The world remembers.

## 4. CURRENT PRODUCT STATE

The Phase 1 scaffold runs locally. It uses the official React + TypeScript SpacetimeDB template with a TypeScript module, generated TypeScript bindings, local database `mela-cah23`, and Vite client. It still contains only the template `person` table/reducers/UI; no Mela world, identity/onboarding, Book Cricket, crowd, AI, history, or product UI is implemented.

## 5. CURRENT USER FLOW

Not implemented. Target flow: Join → World → Activity → Play → Spectator interaction → AI interaction → Result → Persistence.

## 6. COMPLETED

- [x] Initial environment inspection — no product source files found. Tested with `ls`, `find`, and `rg --files`; the repository is now initialized on `main` with remote `origin`.
- [x] Tooling inspection — Node `v22.16.0`, npm `10.9.2`, pnpm `10.33.2`, and SpacetimeDB CLI `2.10.0` are installed.
- [x] SpacetimeDB account inspection — `spacetime list` reported no databases attached to the current CLI identity. Local SpacetimeDB data directory exists but has no observed database data. Maincloud database state is unconfirmed beyond that empty CLI list.
- [x] Persistent project instructions — `AGENTS.md` and this file created at repository root.
- [x] SpacetimeDB research basis reviewed — `MELA_SpacetimeDB_Deep_Research_Architecture_Base.md` read in full; no implementation was created.
- [x] Architecture baseline revised and approved — `docs/MELA_SpacetimeDB_Architecture_Gate.md` now locks one game-agnostic P0 world/database; Book Cricket as the first vertical slice (Human vs MelaBot, two innings, human bats first); shared Crowd Energy with individual cooldowns; deterministic P0 AI; common authoritative game rules; transient event/durable-history separation; discrete schedules; coordinator-led multi-agent workflow; and end-to-end synthetic QA. Game-specific state remains behind `game_kind` boundaries; no speculative generic engine. Documentation only; not tested or implemented.
- [x] Phase 0 toolchain verification — Node `v22.16.0`, pnpm `10.33.2`, and SpacetimeDB CLI/library `2.10.0` are installed. Current official SpacetimeDB 2.0 documentation supports `spacetime dev --template react-ts` with a TypeScript module, generated bindings, and React client; React requires Node 18+. Selected P0 toolchain: pnpm, React + TypeScript, TypeScript SpacetimeDB module, generated TypeScript bindings, and local SpacetimeDB. No package/project scaffold has been created yet.
- [x] P0 game rules documented — `docs/MELA_P0_Game_Rules.md` locks Human vs MelaBot, two innings, human first, six-delivery/two-wicket innings, a 12-second action timeout, centralized tunable rule values, and the four deterministic crowd powers. Documentation only; not tested or implemented.
- [x] Phase 1 foundation scaffold — created official React + TypeScript template structure: root Vite client (`src/`), TypeScript SpacetimeDB module (`spacetimedb/`), configuration (`spacetime.json`, `spacetime.local.json`, `.env.local`), generated bindings (`src/module_bindings/`), and pnpm lockfiles. Template file locations are preserved; no Mela domain code added.
- [x] Phase 1 local module and client verification — ran `pnpm install`, `pnpm --dir spacetimedb install`, `pnpm run spacetime:build`, `spacetime start`, `pnpm run spacetime:publish:local -- mela-cah23`, `pnpm run spacetime:generate`, `pnpm run typecheck`, and `pnpm run build`. All succeeded. Browser test at `http://127.0.0.1:5173` connected to local SpacetimeDB and the template `Add Person` reducer changed visible state from `People (0)` to `People (1)`.
- [x] Phase 1 template compatibility fixes — corrected the generated root package scripts to use current CLI `spacetime build --module-path spacetimedb` and `spacetimedb` publish paths (not nonexistent `server`). Aligned `.env.local` database name with the generated local database `mela-cah23`; this resolved the initial browser WebSocket disconnect.

## 7. CURRENTLY IN PROGRESS

No implementation task is currently in progress. Phase 1 is complete and local realtime template connectivity is proven. The next authorized phase is Phase 2: replace the template example with the Mela world foundation, without adding Book Cricket yet. The previously referenced `FLUX_MELA_Prize_Winning_Master_Plan_Codex_Handoff.md` is still absent, but the supplied implementation mission, architecture gate, research basis, and P0 rules govern this work.

## 8. NEXT TASK

NEXT: Phase 2 — implement the game-agnostic Mela world foundation: guest identity/name onboarding, one world, presence, safe public player list, basic bounded world activity, and deliberate subscriptions. Do not implement Book Cricket or spectator powers in this phase.

Acceptance criteria:
- two real browser clients see the same authoritative world/presence updates without polling;
- name onboarding uses durable SpacetimeDB identity and never browser-tab/ConnectionId identity;
- all state changes occur through reducers and subscriptions; no Mela game domain logic leaks into the client;
- build/typecheck/local browser validation are repeated and recorded.

## 9. BACKLOG

### P0 — required to win

- After approval: bootstrap frontend and SpacetimeDB module for the approved architecture.
- Implement a tested Book Cricket vertical slice with authoritative shared state.
- Implement spectator powers/Crowd Energy, deterministic AI participant, persistence/event feed, reconnect, QR join, and big-screen view.
- Deploy and validate realtime multi-client behavior on Maincloud.

### P1 — important

- Pen Fight only after P0 vertical slice is proven.
- External LLM provider implementation behind the deterministic fallback.

### P2 — only if time

- Additional games, advanced social features, and nonessential polish.

## 10. SPACETIMEDB STATE

- Database name/server/module: local `mela-cah23` on `http://127.0.0.1:3000`, TypeScript module at `spacetimedb/`.
- Current template schema: public `person` table; `add`, `say_hello`, `init`, connect, and disconnect template functions. These are foundation-template placeholders, not Mela schema/reducers.
- Generated TypeScript bindings: `src/module_bindings/`; generated successfully after local publish.
- Mela schema/tables/reducers/subscriptions/procedures/schedules/views/indexes/migrations: not implemented.
- Maincloud database: none listed for the current SpacetimeDB CLI identity; deployment has not been attempted.
- Approved architecture baseline: one P0 authoritative world/database; reducers as atomic mutation boundary; narrow public subscriptions; transient event table separate from durable history; selective schedules/views; deterministic AI fallback. Full proposal: `docs/MELA_SpacetimeDB_Architecture_Gate.md`. Phase 1 complete; Phase 2 next.

## 11. FRONTEND STATE

- Routes/screens/components: template single-page Vite React UI only; no Mela route/screen exists.
- Bindings: template bindings generated at `src/module_bindings/`.
- Local state/server state: template input state plus subscribed `person` table only; not Mela state.
- Commands: `pnpm dev`, `pnpm run spacetime:build`, `pnpm run spacetime:publish:local -- mela-cah23`, `pnpm run spacetime:generate`, `pnpm run typecheck`, and `pnpm run build`.

## 12. AI STATE

- AI characters, behavior, fallback, LLM provider, prompts, API configuration: not implemented.
- Product requirement: deterministic AI fallback must remain available; secrets must never enter client code or project documentation.

## 13. DEPLOYMENT

- Local command: none.
- Production command/frontend URL/Maincloud database: none.
- Last known successful deployment: none.

## 14. TEST STATUS

| Test | Status | Notes |
|---|---|---|
| Local build | Pass | Module build and Vite production build passed on 2026-09-05. |
| Typecheck | Pass | `pnpm run typecheck` passed on 2026-09-05. |
| Unit tests | Not runnable | No test suite exists. |
| Two-client realtime | Not runnable | Phase 2 Mela presence is not implemented; only one-client template reducer was manually verified. |
| 5 users | Not runnable | No module/app exists. |
| 10 users | Not runnable | No module/app exists. |
| 20 users | Not runnable | No module/app exists. |
| Reconnect | Not runnable | No module/app exists. |
| Invalid action rejection | Not runnable | No module/app exists. |
| Maincloud | Not runnable | No deployment exists. |
| Mobile | Not runnable | No frontend exists. |
| Big screen | Not runnable | No frontend exists. |
| QR join | Not runnable | No frontend exists. |

## 15. KNOWN BUGS

None recorded: no application exists to test.

## 16. KNOWN RISKS

- Product: the referenced master plan has not been provided in the workspace, so plan-specific requirements are unavailable.
- Technical: project bootstrap, realtime concurrency, spectator-power abuse prevention, reconnect behavior, and persistence are unimplemented.
- Demo/deployment: no frontend, database, deployment, or demo path exists.
- AI: no deterministic or external provider is implemented.
- Implementation: Phase 1 foundation is complete; Mela domain implementation begins in Phase 2. Maincloud database/frontend host and live deployment credentials remain unavailable.

## 17. DECISIONS LOG

### 2026-09-05 — Preserve locked gaming-first scope

Decision: Mela will remain a persistent shared gaming playground, with spectators and AI as first-class participants.

Why: This is the supplied locked project identity and hackathon thesis.

Alternatives considered: Generic multiplayer, standalone games, chat/agent platforms, and voting demos are explicitly out of scope.

### 2026-09-05 — Do not bootstrap before reviewing the missing master plan

Decision: Documentation is created, but implementation is paused pending the referenced plan or explicit authorization to proceed from the pasted brief.

Why: The handoff explicitly requires reading the complete named plan before coding; it is not present in the workspace.

Alternatives considered: Guessing a stack/schema would violate the inspection-first requirement.

### 2026-09-05 — Formal SpacetimeDB architecture baseline approved

Decision: P0 is one SpacetimeDB-first authoritative and game-agnostic world/database. Book Cricket is its first vertical slice, not its product boundary: Human vs MelaBot over two innings, human batting first, with active spectators. Crowd Energy is shared per match with spectator cooldowns. Deterministic AI is P0; external LLM proposals are P1. Public reducers and shared internal rules are authoritative, with no reducer-to-reducer transition model. Game-specific rules/state stay behind `game_kind` boundaries; abstractions are extracted only after demonstrated reuse.

Why: It directly preserves the locked Mela thesis and uses native realtime/world capabilities without adding a conventional backend. It preserves Human vs Human extensibility while concentrating the demo on the player–AI–crowd loop.

Alternatives considered: Separate game/REST/WebSocket backends, client authority, reducer-to-reducer state transitions, high-frequency ticks, global unbounded subscriptions, and premature sharding are rejected. The implementation start remains pending explicit authorization.

### 2026-09-05 — P0 rules and toolchain selected

Decision: Use the current official SpacetimeDB React TypeScript template with pnpm and local SpacetimeDB for Phase 1. P0 Book Cricket is a six-delivery/two-wicket-per-innings Human vs MelaBot game with a 12-second human action timeout and centralized tunable crowd-power configuration.

Why: The official current quickstart directly supports the approved TypeScript-module/React-client architecture, and short tunable innings support the intended fast, crowd-interactive demo.

Alternatives considered: A custom non-React client, an external game server, full traditional Book Cricket rules, client-generated outcomes, a hard three-minute loss clock, and LLM commentary are out of scope.

### 2026-09-05 — Phase 1 official template bootstrapped locally

Decision: Use the official `react-ts` template in the existing repository with pnpm dependencies at the root and module directory. The generated local database is `mela-cah23`.

Why: Current official SpacetimeDB 2.0 documentation directly supports this structure and the local development loop has been successfully verified.

Alternatives considered: Replacing SpacetimeDB’s template structure, adding a separate backend, or hand-scaffolding an unverified client were rejected. The template’s `server` script path was corrected to the current `spacetimedb` module directory after CLI verification.

## 18. USER / MENTOR FEEDBACK

No feedback recorded.

## 19. HACKATHON STATUS

- Current milestone: initial handoff and environment inspection.
- Users/launch/checkpoints/code freeze/submission/demo readiness: not recorded or not started.

## 20. DEMO STATUS

No demo exists. Target is a three-minute story that visibly proves play, spectator influence, AI participation, realtime authority, and persistence.

## 21. MARKET / TRACTION

No users, sessions, outreach, launch posts, or traction evidence recorded.

## 22. HANDOFF NOTES

**IF YOU ARE A NEW AGENT, START HERE.** Read `AGENTS.md`, then this file, `docs/MELA_SpacetimeDB_Architecture_Gate.md`, and `docs/MELA_P0_Game_Rules.md`. Phase 1 foundation is complete; Phase 2 Mela world/presence is next. Preserve the locked game-agnostic world boundary, do not add a second backend or generic game engine, and replace—not extend—the template `person` example when Phase 2 begins. Inspect Git status before any work and update this file after every meaningful result.
