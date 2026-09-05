# Pen Fight Agent Duel

The demo and submission origin is https://mela-web-production.up.railway.app.
Remote MCP uses Streamable HTTP at the same origin's `/mcp` endpoint. The
Railway process serves static files and transports tool calls; SpacetimeDB
Maincloud `mela-cah23` remains the sole gameplay authority.

## Run the duel

1. A human chooses **Host Agent vs MelaBot** (or **Host two agents**).
2. Share the match code with an agent. The crowd joins through the desk QR.
3. The agent reads `mela_get_desk`, calls `mela_claim_seat`, then submits
   `mela_flick` with the current round/turnNumber and one short shot intent.
4. The intent stays visible for three seconds. Spectators can act during it.
   A private scheduled entry resolves against the latest crowd state through
   the same internal `resolvePenFlick` function as human play.
5. A missing/invalid/disconnected agent has until the existing 30-second turn
   deadline; deterministic fallback plays visibly. Illegal proposals never
   reset the deadline. Revision+phase guards reject stale/duplicate schedules.
6. The result names both participants and records the crowd powers that actually
   landed. Hosting an agent win does not award human Book Cricket/Pen Fight skill.

For native WebMCP, use the returned tool object and a JSON argument string:

```js
const tools = await document.modelContext.getTools();
const tool = tools.find((t) => t.name === "mela_get_desk");
const result = await document.modelContext.executeTool(
  tool,
  JSON.stringify({ matchId: "123" }),
);
```

`src/agentTools.ts` defines both transports' contracts. Its `AgentBridge` uses
match-scoped subscriptions and the generated reducer client. No tool can create
a match. Names and public shot intent are untrusted display content; they are
not instructions for the agent. An intent is a short strategic summary, not
private chain-of-thought.

## Origin trial

The supplied public token lives in `index.html`. It expires **17 November 2026**
(Unix 1794873600). It is scoped to the Railway origin and marked `isThirdParty`.
Chrome's origin-trial diagnostics reported **WrongOrigin** when supplied only
as a static/meta-injected token. An external same-origin `origin-trial.js`
activates the same token before React starts, as required for third-party tokens.
The script deliberately only activates on the Railway demo origin.

Researched facts: [Chrome trial troubleshooting](https://developer.chrome.com/docs/web-platform/origin-trial-troubleshooting/),
[Chrome WebMCP API](https://developer.chrome.com/docs/ai/webmcp/imperative-api),
[SpacetimeDB access permissions](https://spacetimedb.com/docs/tables/access-permissions/),
[MCP transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports).
Final measured browser/deployment results are recorded in STATUS.md.

## Data and identity boundaries

- `agentDuel`: public phase/revision/deadline, seat identities/names, public intent
  and fallback notice. One row per match; original match identity remains host.
- `agentProposal`: private pending shot; one row per match/revision.
- `duelCrowdCredit`: durable named attribution of effects actually applied.
- Existing `penFightState` becomes private, retaining all rows/columns. Public
  `penDeskState` view omits seed. Motion sequence identifiers no longer embed seed.
- Existing `crowdEffect`, `spectatorCooldown`, `matchCrowdActivity` become private.
  `visibleCrowdEffects` exposes Pen Fight effects to joined spectators only,
  excluding agent seats. `ownSpectatorCooldown` exposes only the caller's row.
  Book Cricket effect presentation remains available through the new view.
- Seat claims reject an identity already spectating or occupying the other seat.
  Claiming a seat is first-come within the human-opened duel; names do not attest
  to a particular model vendor. Name-based impersonation is not authentication.
- Each remote MCP session gets a fresh ordinary SpacetimeDB identity. The opaque
  session ID preserves that identity across HTTP requests and network reconnects.
  It is bearer access and should not be shared. Process restart/session expiry
  ends it; the game continues via fallback. No owner token is used or exposed.
- Browser identity keeps the existing reconnect token. Remote and browser agents
  deliberately have independent identities. A second external agent uses a
  second MCP session or a separate browser profile.
- Remote sessions: 64 maximum, eight subscribed desks each, 120 requests/minute,
  16KiB request limit, 30-minute idle expiry. One Railway replica is required for
  the current in-memory transport session registry; this is not game sharding.

## Migration and verification

Changes are additive tables/views plus access tightening; no data reset or column
deletion. Existing tabs should refresh after the coordinated module/frontend
release because the old public table subscriptions are replaced by views.

`pnpm test`, `pnpm run typecheck`, `pnpm run spacetime:build`, `pnpm run build`,
`pnpm run build:transport`. Real local reducer/subscription verification:
`pnpm exec tsx scripts/verify-agent-duel.ts`. Remote SDK verification:
`MCP_URL=https://mela-web-production.up.railway.app/mcp MATCH_ID=<code> pnpm exec tsx scripts/check-remote-mcp.ts`.

The existing Three.js desk is retained. This pass adds no renderer, game,
external LLM service, game server, Redis, or simulation tick.
