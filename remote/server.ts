import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { DbConnection } from "../src/module_bindings";
import { AGENT_TOOLS, AgentBridge } from "../src/agentTools";
import { createRecapHandler } from "./recap";

const sessions = new Map<
  string,
  {
    transport: StreamableHTTPServerTransport;
    connection?: DbConnection;
    bridge?: Promise<AgentBridge>;
    touched: number;
    calls: number;
    window: number;
  }
>();
const origin =
  process.env.VITE_PUBLIC_APP_URL ||
  "https://mela-web-production.up.railway.app";
const root = resolve("dist");
const recap = createRecapHandler({
  origin,
  apiKey: process.env.RESEND_EMAIL_API_KEY || process.env.RESEND_API_KEY,
  from: process.env.MELA_EMAIL_FROM,
});
const mime: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
createServer(async (req, res) => {
  try {
    const path = new URL(req.url || "/", origin).pathname;
    if (await recap(req, res, path)) return;
    if (path !== "/mcp") {
      if (!["GET", "HEAD"].includes(req.method || "")) {
        res.writeHead(405).end();
        return;
      }
      const file = resolve(root, "." + decodeURIComponent(path));
      if (file !== root && !file.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      let content: Buffer;
      let extension = extname(file);
      try {
        content = await readFile(file);
      } catch {
        if (extension) {
          res.writeHead(404).end();
          return;
        }
        content = await readFile(resolve(root, "index.html"));
        extension = ".html";
      }
      res
        .writeHead(200, {
          "Content-Type": mime[extension] || "application/octet-stream",
          "Cache-Control":
            extension === ".html" ? "no-cache" : "public, max-age=3600",
        })
        .end(req.method === "HEAD" ? undefined : content);
      return;
    }
    if (
      req.headers.origin &&
      req.headers.origin !== origin &&
      req.headers.origin !== "http://127.0.0.1:5174"
    ) {
      res.writeHead(403).end("Origin not allowed");
      return;
    }
    let session = sessions.get(String(req.headers["mcp-session-id"] || ""));
    if (!session) {
      if (req.headers["mcp-session-id"]) {
        res.writeHead(404).end("Session expired; initialize again.");
        return;
      }
      if (req.method !== "POST") {
        res.writeHead(400).end("Initialize a session first.");
        return;
      }
      if (sessions.size >= 64) {
        res.writeHead(503).end("The demo is full. Retry later.");
        return;
      }
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: randomUUID,
        enableJsonResponse: true,
      });
      session = {
        transport,
        touched: Date.now(),
        calls: 0,
        window: Date.now(),
      };
      const current = session;
      const server = new Server(
        { name: "mela-pen-fight", version: "1.0.0" },
        {
          capabilities: { tools: {} },
          instructions:
            "Ask a human to open an Agent Duel at the Mela Railway app and give you its match code. Tools cannot create matches. Each MCP session has a separate SpacetimeDB identity.",
        },
      );
      server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: AGENT_TOOLS.map((t) => ({ ...t })),
      }));
      server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
        try {
          if (!current.bridge)
            current.bridge = new Promise<AgentBridge>(
              (resolveBridge, reject) => {
                const timer = setTimeout(
                  () =>
                    reject(
                      new Error(
                        "World connection timed out. Reconnect this MCP session.",
                      ),
                    ),
                  12000,
                );
                current.connection = DbConnection.builder()
                  .withUri(
                    process.env.VITE_SPACETIMEDB_HOST ||
                      "https://maincloud.spacetimedb.com",
                  )
                  .withDatabaseName(
                    process.env.VITE_SPACETIMEDB_DB_NAME || "mela-cah23",
                  )
                  .onConnect((connection) => {
                    clearTimeout(timer);
                    resolveBridge(new AgentBridge(connection));
                  })
                  .onConnectError((_ctx, error) => {
                    clearTimeout(timer);
                    reject(error);
                  })
                  .build();
              },
            );
          const bridge = await current.bridge;
          const result = await bridge.execute(
            params.name,
            params.arguments || {},
          );
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text:
                  error instanceof Error
                    ? error.message
                    : "Action unavailable.",
              },
            ],
          };
        }
      });
      await server.connect(transport);
      transport.onclose = () => {
        current.connection?.disconnect();
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };
    }
    session.touched = Date.now();
    if (Date.now() - session.window > 60000) {
      session.window = Date.now();
      session.calls = 0;
    }
    if (++session.calls > 120) {
      res.writeHead(429, { "Retry-After": "60" }).end();
      return;
    }
    // Bound the body before delegating JSON-RPC framing to the official SDK.
    let body: unknown;
    if (req.method === "POST") {
      let size = 0;
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 16384) {
          res.writeHead(413).end();
          return;
        }
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString());
    }
    await session.transport.handleRequest(req, res, body);
    if (session.transport.sessionId)
      sessions.set(session.transport.sessionId, session);
  } catch {
    if (!res.headersSent) res.writeHead(400).end("Invalid request.");
  }
}).listen(
  Number(process.env.PORT || 8080),
  process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
  () => console.log("Mela frontend and MCP transport ready"),
);
setInterval(() => {
  for (const [id, s] of sessions)
    if (Date.now() - s.touched > 30 * 60000) {
      void s.transport.close();
      s.connection?.disconnect();
      sessions.delete(id);
    }
}, 60000).unref();
