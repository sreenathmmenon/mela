import { useEffect, useState } from "react";
import { useSpacetimeDB, useTable } from "spacetimedb/react";
import { DbConnection, tables } from "./module_bindings";
import { AGENT_TOOLS, AgentBridge } from "./agentTools";
import { QRCodeSVG } from "qrcode.react";
import "./agentDuel.css";

type ModelContext = {
  registerTool: (
    tool: unknown,
    options?: { signal: AbortSignal },
  ) => Promise<void>;
};
export function WebMCPTools() {
  const { getConnection, isActive } = useSpacetimeDB();
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    const connection = getConnection() as DbConnection | null;
    if (!context || !connection || !isActive) return;
    const controller = new AbortController();
    const bridge = new AgentBridge(connection);
    void (async () => {
      for (const tool of AGENT_TOOLS) {
        if (controller.signal.aborted) return;
        await context.registerTool(
          {
            ...tool,
            annotations: {
              readOnlyHint: tool.name === "mela_get_desk",
              untrustedContentHint: true,
            },
            execute: async (args: Record<string, unknown>) => {
              try {
                return JSON.stringify(await bridge.execute(tool.name, args));
              } catch (error) {
                return JSON.stringify({
                  error:
                    error instanceof Error
                      ? error.message
                      : "Action unavailable. Read the desk again.",
                });
              }
            },
          },
          { signal: controller.signal },
        );
      }
      window.dispatchEvent(new Event("mela-tools-ready"));
    })().catch(() => window.dispatchEvent(new Event("mela-tools-error")));
    return () => {
      controller.abort();
      bridge.dispose();
    };
  }, [getConnection, isActive]);
  return null;
}
export function AgentDuelPanel({ matchId }: { matchId: bigint }) {
  const [duels] = useTable(tables.agentDuel);
  const duel = duels.find((row) => row.matchId === matchId);
  const [now, setNow] = useState(Date.now());
  const [available, setAvailable] = useState(
    Boolean((document as Document & { modelContext?: unknown }).modelContext),
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const ready = () => setAvailable(true);
    const error = () => setAvailable(false);
    window.addEventListener("mela-tools-ready", ready);
    window.addEventListener("mela-tools-error", error);
    return () => {
      clearInterval(timer);
      window.removeEventListener("mela-tools-ready", ready);
      window.removeEventListener("mela-tools-error", error);
    };
  }, []);
  if (!duel) return null;
  const seconds = Math.max(
    0,
    Math.ceil(Number(duel.deadlineMicros) / 1000 - now) / 1000,
  );
  return (
    <section
      className="agent-duel-panel"
      aria-label="Agent Duel"
      aria-live="polite"
    >
      <div className="duel-invite">
        <div>
          <p className="eyebrow">TWO MINDS. ONE UNPREDICTABLE CROWD.</p>
          <h2>
            {duel.phase === "complete"
              ? "The desk remembers."
              : duel.phase === "intent"
                ? "Plan committed. Crowd, make your move."
                : "Waiting for the next mind."}
          </h2>
          <p>
            {duel.phase === "complete"
              ? `${duel.leftName} × ${duel.rightName}`
              : `${Math.ceil(seconds)}s · ${duel.phase === "intent" ? "Flick incoming" : "MelaBot policy covers a missed turn"}`}
          </p>
        </div>
        <div className="duel-code">
          {duel.phase !== "complete" && (
            <QRCodeSVG
              size={92}
              value={`${location.origin}/?join=${matchId}`}
              aria-label="Join this Agent Duel crowd"
            />
          )}
          <small>MATCH CODE</small>
          <strong>{matchId.toString()}</strong>
        </div>
      </div>
      <div className="duel-minds">
        <blockquote>
          <b>{duel.leftName}</b>
          <p>{duel.leftIntent || "The teal pen is waiting for a plan."}</p>
        </blockquote>
        <blockquote>
          <b>{duel.rightName}</b>
          <p>{duel.rightIntent || "The rust pen is watching the desk."}</p>
        </blockquote>
      </div>
      <p className="duel-notice">
        {duel.phase === "complete"
          ? "Plans, result and crowd contributions stay in Mela."
          : duel.notice}
      </p>
      <details>
        <summary>Connect your agent</summary>
        <p>
          {available
            ? "Chrome WebMCP is available. Ask your agent to read this desk, claim a seat and flick."
            : location.hostname !== "mela-web-production.up.railway.app"
              ? "Browser agent mode needs the Railway origin and a trial-enabled Chrome. Human play is available here."
              : Date.now() >= 1794873600000
                ? "The WebMCP trial expired on 17 November 2026. Human play and remote MCP remain available."
                : "WebMCP is unavailable in this browser. Use a supported Chrome with the Railway origin trial, or the remote MCP URL below."}
        </p>
        <p>
          Remote MCP: <code>{location.origin}/mcp</code>
        </p>
        <p>
          Use <code>mela_get_desk</code> with matchId{" "}
          <code>{matchId.toString()}</code>, then claim <code>human</code>
          {duel.mode === "duel" ? " or bot in an independent session" : ""}.
          Each agent has 30 seconds. Your public shot intent appears before the
          flick.
        </p>
      </details>
    </section>
  );
}
