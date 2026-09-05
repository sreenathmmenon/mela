# MELA STATUS

## 1. LAST UPDATED

- Date/time: 2026-09-05, Asia/Kolkata (initial inspection)
- Agent/provider: Codex (GPT-5)
- Git commit: documentation handoff commit on `main` (see `git log -1`; its hash is intentionally not duplicated here)
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

No application exists in this workspace yet. The repository currently contains the initial `README.md` plus project memory; there is no package manifest, lockfile, frontend, SpacetimeDB module, generated binding, configuration, or deployment configuration.

## 5. CURRENT USER FLOW

Not implemented. Target flow: Join → World → Activity → Play → Spectator interaction → AI interaction → Result → Persistence.

## 6. COMPLETED

- [x] Initial environment inspection — no product source files found. Tested with `ls`, `find`, and `rg --files`; the repository is now initialized on `main` with remote `origin`.
- [x] Tooling inspection — Node `v22.16.0`, npm `10.9.2`, pnpm `10.33.2`, and SpacetimeDB CLI `2.10.0` are installed.
- [x] SpacetimeDB account inspection — `spacetime list` reported no databases attached to the current CLI identity. Local SpacetimeDB data directory exists but has no observed database data. Maincloud database state is unconfirmed beyond that empty CLI list.
- [x] Persistent project instructions — `AGENTS.md` and this file created at repository root.

## 7. CURRENTLY IN PROGRESS

No implementation is in progress. The requested master plan, `FLUX_MELA_Prize_Winning_Master_Plan_Codex_Handoff.md`, is referenced by the brief but is absent from this workspace and the checked parent directory.

## 8. NEXT TASK

NEXT: Obtain the full master-plan document or explicit approval to bootstrap the Mela repository from the pasted brief.

Acceptance criteria:
- the full plan is available to inspect, or the human confirms the pasted brief is sufficient;
- a repository scaffold can be chosen without inventing requirements;
- bootstrap begins with documented package/module choices.

## 9. BACKLOG

### P0 — required to win

- Bootstrap frontend and SpacetimeDB module after the full plan is available.
- Implement a tested Book Cricket vertical slice with authoritative shared state.
- Implement spectator powers/Crowd Energy, deterministic AI participant, persistence/event feed, reconnect, QR join, and big-screen view.
- Deploy and validate realtime multi-client behavior on Maincloud.

### P1 — important

- Pen Fight only after P0 vertical slice is proven.
- External LLM provider implementation behind the deterministic fallback.

### P2 — only if time

- Additional games, advanced social features, and nonessential polish.

## 10. SPACETIMEDB STATE

- Database name/server/module/schema/tables/reducers/subscriptions/procedures/schedules/views/indexes/migrations: not implemented.
- Local database: none found/observed.
- Maincloud database: none listed for the current SpacetimeDB CLI identity; deployment has not been attempted.

## 11. FRONTEND STATE

- Routes/screens/components/bindings/local state/server state: not implemented.
- Existing project command: none; no package manifest or runnable project exists.

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
| Local build | Not runnable | No project/package manifest exists. |
| Typecheck | Not runnable | No project/package manifest exists. |
| Unit tests | Not runnable | No test suite exists. |
| Two-client realtime | Not runnable | No module/app exists. |
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

## 17. DECISIONS LOG

### 2026-09-05 — Preserve locked gaming-first scope

Decision: Mela will remain a persistent shared gaming playground, with spectators and AI as first-class participants.

Why: This is the supplied locked project identity and hackathon thesis.

Alternatives considered: Generic multiplayer, standalone games, chat/agent platforms, and voting demos are explicitly out of scope.

### 2026-09-05 — Do not bootstrap before reviewing the missing master plan

Decision: Documentation is created, but implementation is paused pending the referenced plan or explicit authorization to proceed from the pasted brief.

Why: The handoff explicitly requires reading the complete named plan before coding; it is not present in the workspace.

Alternatives considered: Guessing a stack/schema would violate the inspection-first requirement.

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

**IF YOU ARE A NEW AGENT, START HERE.** Read `AGENTS.md`, then this file. Confirm whether `FLUX_MELA_Prize_Winning_Master_Plan_Codex_Handoff.md` has been supplied. Inspect the workspace and Git status before changing anything. Do not invent plan-specific requirements. Once the plan is available or the human authorizes a brief-based bootstrap, create the smallest P0 Book Cricket vertical slice and update this file after every meaningful result.
