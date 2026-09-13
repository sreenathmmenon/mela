import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import assert from "node:assert/strict";
import {
  CHARACTER_PRESETS,
  decideCharacter,
} from "../spacetimedb/src/arenaCharacter";
const clients: Client[] = [];
async function connect(name: string) {
  const client = new Client({ name, version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(
      new URL(process.env.MCP_URL || "http://127.0.0.1:8083/mcp"),
    ),
  );
  clients.push(client);
  return client;
}
async function call(c: Client, name: string, args: Record<string, unknown>) {
  const result = await c.callTool({ name, arguments: args });
  assert.notEqual(result.isError, true, JSON.stringify(result));
  return JSON.parse((result.content as { text: string }[])[0].text);
}
try {
  if (process.env.MCP_QA_HUMAN_MATCH) {
    const c = await connect("Human vs MCP QA");
    const matchId = process.env.MCP_QA_HUMAN_MATCH;
    await call(c, "mela_join_arena", {
      matchId,
      side: 1,
      name: "Remote QA Teal",
    });
    let observed = await call(c, "mela_get_arena", { matchId }),
      submitted = -1;
    while (observed.status === "active") {
      if (submitted !== observed.revision) {
        await call(c, "mela_arena_move", {
          matchId,
          revision: observed.revision,
          side: 1,
          ...decideCharacter(observed.state, 1, CHARACTER_PRESETS[1]),
        });
        submitted = observed.revision;
      }
      observed = await call(c, "mela_wait_arena", {
        matchId,
        afterRevision: submitted,
      });
    }
    assert.equal(observed.source, "Human / External agent");
    console.log(
      JSON.stringify({
        matchId,
        browserHumanVsRemoteMCP: true,
        complete: true,
        moves: observed.revision,
        modelInference: false,
      }),
    );
  } else {
    const a = await connect("Arena QA Amber"),
      b = await connect("Arena QA Teal");
    const tools = (await a.listTools()).tools;
    assert.ok(tools.some((t) => t.name === "mela_wait_arena"));
    const room = await call(a, "mela_create_arena", {
      gameKind: "bridge_breakers",
    });
    const matchId = room.matchId;
    await call(a, "mela_join_arena", {
      matchId,
      side: 0,
      name: "Remote Amber",
    });
    await call(b, "mela_join_arena", { matchId, side: 1, name: "Remote Teal" });
    const bad = await b.callTool({
      name: "mela_join_arena",
      arguments: { matchId, side: 0, name: "Seat thief" },
    });
    assert.equal(bad.isError, true);
    let observed = await call(a, "mela_get_arena", { matchId });
    while (observed.status === "active") {
      const revision = observed.revision;
      await Promise.all(
        [a, b].map(async (c, side) => {
          const action = decideCharacter(
            observed.state,
            side as 0 | 1,
            CHARACTER_PRESETS[side],
          );
          return call(c, "mela_arena_move", {
            matchId,
            revision,
            side,
            ...action,
          });
        }),
      );
      const [left, right] = await Promise.all(
        [a, b].map((c) =>
          call(c, "mela_wait_arena", { matchId, afterRevision: revision }),
        ),
      );
      assert.ok(left.revision > revision);
      assert.deepEqual(left.state, right.state);
      assert.equal(left.source, "External agent / External agent");
      observed = left;
    }
    console.log(
      JSON.stringify({
        transport: "real Streamable HTTP MCP",
        matchId,
        independentSessions: 2,
        tools: tools.length,
        subscriptionWait: true,
        complete: true,
        moves: observed.revision,
        winner: observed.state.winner,
        everyMoveExternal: true,
        modelInference: false,
        note: "Deterministic external test drivers, not an LLM performance claim.",
      }),
    );
  }
} finally {
  await Promise.all(clients.map((c) => c.close()));
}
