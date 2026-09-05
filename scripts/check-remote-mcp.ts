import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import assert from "node:assert/strict";
const c = new Client({ name: "mela-release-check", version: "1" });
try {
  await c.connect(
    new StreamableHTTPClientTransport(
      new URL(process.env.MCP_URL || "http://127.0.0.1:8081/mcp"),
    ),
  );
  console.log(
    JSON.stringify({ tools: (await c.listTools()).tools.map((t) => t.name) }),
  );
  const result = await c.callTool({
    name: "mela_get_desk",
    arguments: { matchId: process.env.MATCH_ID || "4" },
  });
  assert.notEqual(result.isError, true, "Remote desk read must succeed");
  console.log(JSON.stringify(result));
  // Opt-in single opening shot on an existing human-opened QA desk only.
  // This is a transport test driver, not an AI provider or game authority.
  if (process.env.CLAIM_QA_SEAT === "yes") {
    const matchId = process.env.MATCH_ID!;
    const seat = await c.callTool({
      name: "mela_claim_seat",
      arguments: { matchId, side: "human", name: "RemoteMind" },
    });
    assert.notEqual(seat.isError, true);
    const desk = JSON.parse((seat.content as { text: string }[])[0].text);
    assert.equal(desk.turn, "human");
    assert.equal(desk.phase, "waiting");
    const shot = await c.callTool({
      name: "mela_flick",
      arguments: {
        matchId,
        round: desk.round,
        turnNumber: desk.turnNumber,
        aimX: desk.rust.x,
        aimY: desk.rust.y,
        force: 60,
        contact: 50,
        intent: "A controlled centre hit from the remote MCP seat.",
      },
    });
    assert.notEqual(shot.isError, true);
    console.log(JSON.stringify({ seat, shot }));
  }
} finally {
  await c.close();
}
