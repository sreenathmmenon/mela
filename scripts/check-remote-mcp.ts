import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
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
  console.log(
    JSON.stringify(
      await c.callTool({
        name: "mela_get_desk",
        arguments: { matchId: process.env.MATCH_ID || "4" },
      }),
    ),
  );
} finally {
  await c.close();
}
