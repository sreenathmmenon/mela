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
              readOnlyHint:
                tool.name === "mela_get_desk" ||
                tool.name === "mela_get_board" ||
                tool.name === "mela_list_matches",
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
  const [matches] = useTable(tables.match);
  const four = matches.find((m) => m.id === matchId)?.gameKind === "four_row";
  const [presence] = useTable(tables.penSeatPresence);
  const [fallbacks] = useTable(tables.agentFallbackRecord);
  const duel = duels.find((row) => row.matchId === matchId);
  const room = presence.find((row) => row.matchId === matchId);
  const fallback = fallbacks.find((row) => row.matchId === matchId);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
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
  if (duel.mode === "friends" && duel.phase !== "lobby") {
    return duel.phase === "waiting" &&
      room &&
      (!room.leftPresent || !room.rightPresent) ? (
      <p className="game-room-notice" role="status">
        {!room.leftPresent ? duel.leftName : duel.rightName} is away. Their seat
        is reserved for their return.
      </p>
    ) : null;
  }
  if (duel.mode === "friends")
    return (
      <section
        className="agent-duel-panel human-seat-lobby"
        aria-label="Friend match"
      >
        <h2>
          {duel.phase === "lobby"
            ? "Invite your opponent"
            : `${duel.leftName} vs ${duel.rightName}`}
        </h2>
        <p role="status">{duel.notice}</p>
        {duel.phase === "waiting" &&
          room &&
          (!room.leftPresent || !room.rightPresent) && (
            <p role="status">
              {!room.leftPresent ? duel.leftName : duel.rightName} is away.
              Their seat is reserved for their return.
            </p>
          )}
        {duel.phase === "lobby" && (
          <div className="duel-invite">
            <QRCodeSVG
              size={100}
              value={`${location.origin}/?seat=${matchId}`}
              aria-label="Join as the second player"
            />
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${location.origin}/?seat=${matchId}`,
                  );
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Copied" : "Copy player invitation"}
            </button>
            <a href={`?seat=${matchId}`}>Player invitation ↗</a>
          </div>
        )}
        <p>Your seat stays yours if you disconnect. No bot takes your turn.</p>
      </section>
    );
  const seconds = Math.max(
    0,
    Math.ceil(Number(duel.deadlineMicros) / 1000 - now) / 1000,
  );
  return (
    <section
      className={`agent-duel-panel ${four && duel.phase !== "lobby" ? "four-agent-compact" : ""}`}
      aria-label="Agent Duel"
      aria-live="polite"
    >
      <div className="duel-invite">
        <div>
          <p className="eyebrow">
            {duel.mode === "human_agent" ? "HUMAN VS AGENT" : "AGENT MATCH"}
          </p>
          <h2>
            {duel.phase === "complete"
              ? "Match complete"
              : duel.phase === "intent"
                ? four
                  ? duel.notice
                  : "Plan committed. Crowd, make your move."
                : duel.phase === "lobby"
                  ? "Connect your opponent"
                  : duel.notice}
          </h2>
          <p>
            {duel.phase === "complete"
              ? `${duel.leftName} × ${duel.rightName}`
              : duel.deadlineMicros === 0n
                ? duel.phase === "lobby"
                  ? "Share the match code with your agent."
                  : "Your move."
                : `${Math.min(duel.phase === "intent" ? 3 : 30, Math.ceil(seconds))}s · ${duel.phase === "intent" ? (four ? "Disc incoming" : "Flick incoming") : "MelaBot policy covers a missed agent turn"}`}
          </p>
        </div>
        <div className="duel-code">
          {duel.phase !== "complete" && !(four && duel.phase !== "lobby") && (
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
      {!four && (
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
      )}
      <p className="duel-notice">
        {duel.phase === "complete"
          ? "Plans, result and crowd contributions stay in Mela."
          : duel.notice}
      </p>
      {fallback && (
        <p>
          MelaBot substitutions: {duel.leftName} {fallback.leftTurns} ·{" "}
          {duel.rightName} {fallback.rightTurns}. These remain in the result.
        </p>
      )}
      <details>
        <summary>Connect your agent</summary>
        <p>
          {available
            ? `Chrome WebMCP is available. Ask your agent to read this ${four ? "board" : "desk"}, claim a seat and play.`
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
          Use <code>{four ? "mela_get_board" : "mela_get_desk"}</code> with
          matchId <code>{matchId.toString()}</code>, then claim{" "}
          <code>{duel.mode === "human_agent" ? "bot" : "human"}</code>
          {duel.mode === "duel" ? " or bot in an independent session" : ""}.
          Each agent has 30 seconds.{" "}
          {four
            ? "Use mela_drop_four with the latest revision and a legal column."
            : "Your public shot intent appears before the flick."}
        </p>
      </details>
    </section>
  );
}
