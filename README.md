# Mela

Mela is Flux’s persistent, realtime shared gaming world: players play, spectators influence, AI participates, and the world remembers.

## Current state

Phase 1 foundation is running locally with the official SpacetimeDB React + TypeScript template. It currently contains only the template `person` example; Mela world and Book Cricket domain logic have not been implemented yet.

Read [AGENTS.md](AGENTS.md), [STATUS.md](STATUS.md), [the architecture gate](docs/MELA_SpacetimeDB_Architecture_Gate.md), and [P0 game rules](docs/MELA_P0_Game_Rules.md) before changing architecture or product behavior.

## Local development

Prerequisites: Node 22+, pnpm 10+, and SpacetimeDB CLI 2.10+.

```bash
pnpm install
pnpm --dir spacetimedb install
cp .env.example .env.local
spacetime start
pnpm run spacetime:publish:local -- mela-cah23
pnpm run spacetime:generate
pnpm dev --host 127.0.0.1
```

Open `http://127.0.0.1:5173`. The local database name is recorded in `spacetime.local.json`; `.env.local` must use the same `VITE_SPACETIMEDB_DB_NAME`.

## Verification

```bash
pnpm run spacetime:build
pnpm run typecheck
pnpm run build
```

Do not use the template example as product architecture. Phase 2 replaces it with the approved Mela world foundation.
