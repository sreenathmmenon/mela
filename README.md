# Mela

Mela is Flux’s persistent realtime gaming world: players play, spectators influence, AI participates, and the world remembers.

Book Cricket is the first complete vertical slice: one human bats first against MelaBot, the crowd uses shared energy to affect the match, and the result becomes durable Mela memory.

Every ball is a meaningful choice: SAFE favors wickets and small runs,
BALANCED is the all-round option, and AGGRESSIVE offers boundary-heavy outcomes
at greater OUT risk. Scores, wickets, balls, targets, crowd effects, and
MelaBot decisions are resolved only by SpacetimeDB reducers.

## Run locally

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

Open `http://127.0.0.1:5173`. The player can start a match, show the in-game QR code, and open the shared stage at `/#/screen?match=<match-id>`.

## QR and big screen

The QR encodes a public, non-secret URL such as `/?join=<match-id>`. A guest scans it, chooses a display name, and is server-validated into the active match as a spectator. The big-screen route is read-only: it shows the shared score, turn, crowd energy, events, result, and QR join code; it has no player or spectator controls.

For a deployed frontend, set these build-time values:

```bash
VITE_SPACETIMEDB_HOST=https://maincloud.spacetimedb.com
VITE_SPACETIMEDB_DB_NAME=<your-maincloud-database>
VITE_PUBLIC_APP_URL=https://<your-frontend-origin>
```

Mela's production frontend is deployed on Railway. The current Railway service
uses the repository's `Dockerfile`; deploy and verify the Railway service rather
than publishing a separate static-host copy.

The production client defaults to the Maincloud host when no host override is supplied. `VITE_PUBLIC_APP_URL` ensures QR codes point to the public HTTPS frontend rather than a local origin. The stage uses a hash route so it works on static hosting without a server-side rewrite.

## Operator metrics

Append `?operator=metrics` to the player URL for the safe aggregate Mela pulse.
It exposes only authoritative totals (completed matches, distinct player/crowd
identities, and spectator-to-player conversions), never names, tokens, sessions,
or browser analytics. Exact metric definitions live in
[the Book Cricket rules](docs/MELA_P0_Game_Rules.md#trustworthy-mela-usage-metrics).

## Verify

```bash
pnpm test
pnpm run spacetime:build
pnpm run typecheck
pnpm run build
```

To publish the authoritative module after `spacetime login`:

```bash
pnpm run spacetime:publish -- <database-name>
pnpm run spacetime:generate
```

Read [AGENTS.md](AGENTS.md), [STATUS.md](STATUS.md), [the architecture gate](docs/MELA_SpacetimeDB_Architecture_Gate.md), and [the P0 game rules](docs/MELA_P0_Game_Rules.md) before changing the product.
