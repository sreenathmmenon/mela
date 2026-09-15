import { useEffect, useState } from "react";
import { useReducer, useTable } from "spacetimedb/react";
import { Identity } from "spacetimedb";
import { reducers, tables } from "./module_bindings";
import {
  CHARACTER_PRESETS,
  characterBrief,
  decodeCharacter,
  type ArenaCharacter,
} from "../spacetimedb/src/arenaCharacter";
import "./characterStudio.css";
import { isArenaKind } from "../spacetimedb/src/arenaRules";

export function CharacterPortrait({
  character,
  teal = false,
}: {
  character: ArenaCharacter;
  teal?: boolean;
}) {
  return (
    <svg
      className={`character-portrait ${teal ? "is-teal" : ""}`}
      viewBox="0 0 180 160"
      aria-hidden="true"
    >
      <ellipse
        cx="90"
        cy="144"
        rx="46"
        ry="9"
        fill="currentColor"
        opacity=".14"
      />
      <path d="M55 137q-8-53 35-53t35 53z" fill="currentColor" />
      <path
        d="M66 136v9m48-9v9"
        stroke="#263a3d"
        strokeWidth="14"
        strokeLinecap="round"
      />
      {character.look === "fox" ? (
        <>
          <path
            d="M49 64L47 20l32 23m22 0 32-23-2 44"
            fill="currentColor"
            stroke="#263a3d"
            strokeWidth="3"
          />
          <path
            d="M46 60q0-34 44-34t44 34q0 41-44 47Q46 101 46 60"
            fill="currentColor"
          />
          <path d="m51 66 39 24 39-24q-7 37-39 40-32-3-39-40" fill="#fff0d1" />
        </>
      ) : character.look === "owl" ? (
        <>
          <path
            d="M47 53 48 23 71 39Q90 30 109 39l23-16 1 30q12 53-43 56Q35 106 47 53"
            fill="currentColor"
          />
          <circle cx="71" cy="68" r="23" fill="#fff0d1" />
          <circle cx="109" cy="68" r="23" fill="#fff0d1" />
        </>
      ) : (
        <>
          <path d="M90 32V18" stroke="currentColor" strokeWidth="5" />
          <circle cx="90" cy="15" r="7" fill="currentColor" />
          <rect
            x="42"
            y="33"
            width="96"
            height="74"
            rx="24"
            fill="currentColor"
          />
          <rect x="54" y="46" width="72" height="39" rx="15" fill="#263a3d" />
        </>
      )}
      <g fill={character.look === "robot" ? "#d6ffda" : "#263a3d"}>
        <circle cx="71" cy="66" r="5" />
        <circle cx="109" cy="66" r="5" />
        {character.look !== "robot" && <path d="m84 85 6 7 6-7z" />}
      </g>
      <path
        d="M64 106q26 11 52 0"
        stroke="#fff0d1"
        strokeWidth="8"
        fill="none"
      />
      <path d="m111 108 12 24-17-7" fill="#fff0d1" />
    </svg>
  );
}

export function CharacterStudio({
  connected,
  identity,
  onOpen,
}: {
  connected: boolean;
  identity?: Identity;
  onOpen: (id: bigint) => void;
}) {
  const produce = useReducer(reducers.createSavedCharacterArena);
  const saveCharacter = useReducer(reducers.saveArenaCharacter);
  const [saved, savedReady] = useTable(tables.mySavedArenaCharacters);
  const [entries] = useTable(tables.myArenaCharacterEntries);
  const [memories] = useTable(tables.matchMemory);
  const [amberId, setAmberId] = useState(0n),
    [tealId, setTealId] = useState(0n);
  const [parentId, setParentId] = useState(0n);
  const createRoom = useReducer(reducers.createArenaRoom);
  const [matches] = useTable(tables.match);
  const [amber, setAmber] = useState<ArenaCharacter>(
    () =>
      decodeCharacter(new URLSearchParams(location.search).get("character")) ??
      CHARACTER_PRESETS[0],
  );
  const [teal, setTeal] = useState<ArenaCharacter>(CHARACTER_PRESETS[1]);
  const [selected, setSelected] = useState<0 | 1>(0),
    [prompt, setPrompt] = useState(""),
    [mode, setMode] = useState("agents"),
    [game, setGame] = useState(() => {
      const value = new URLSearchParams(location.search).get("arena");
      return value &&
        ["bridge_breakers", "crown_run", "mela_heist"].includes(value)
        ? value
        : "bridge_breakers";
    }),
    [live, setLive] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [after, setAfter] = useState<bigint>(),
    [editing, setEditing] = useState(false);
  const character = selected === 0 ? amber : teal;
  const independentRoom = ["friends", "human_agent", "agent_duel"].includes(
    mode,
  );
  const update = (c: ArenaCharacter) => {
    const known = saved.find((s) => s.character === JSON.stringify(c));
    const sourceId = saved.find(
      (s) => s.character === JSON.stringify(character),
    )?.id;
    if (selected === 0) {
      setParentId(sourceId || amberId || parentId);
      setAmber(c);
      setAmberId(known?.id ?? 0n);
    } else {
      setParentId(sourceId || tealId || parentId);
      setTeal(c);
      setTealId(known?.id ?? 0n);
    }
  };
  // Saved editions are immutable; choosing one changes local setup, not an old match.
  const selectedId = selected === 0 ? amberId : tealId;
  const savedCurrent = saved.find(
    (s) => s.character === JSON.stringify(character),
  );
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await saveCharacter({ character: JSON.stringify(character), parentId });
      setMessage(
        `${character.name} saved to your roster. Its past matches keep their original tactics.`,
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Could not save. Your setup is still here.",
      );
    } finally {
      setSaving(false);
    }
  }
  useEffect(() => {
    if (after === undefined || !identity) return;
    const m = matches
      .filter(
        (m) =>
          m.id > after &&
          m.playerIdentity.isEqual(identity) &&
          m.gameKind === game,
      )
      .sort((a, b) => Number(b.id - a.id))[0];
    if (m) onOpen(m.id);
  }, [matches, after, identity, game, onOpen]);
  async function teach() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/arena/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "The designer is unavailable.");
      update(result.character);
      setMessage(
        `Astra designed ${result.character.name}. Review the tactics, then enter the arena.`,
      );
      setEditing(true);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Choose a ready-made character while the designer is away.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    setBusy(true);
    setMessage("");
    try {
      let agent: Identity | undefined;
      const independent = ["friends", "human_agent", "agent_duel"].includes(
        mode,
      );
      if (live && !independent) {
        const response = await fetch("/api/arena/status");
        const result = await response.json();
        if (!result.available || !result.identity)
          throw Error(
            "Live Astra is at capacity. Switch off live decisions to play instantly with these same character tactics.",
          );
        agent = Identity.fromString(result.identity);
      }
      const latest = matches.reduce((n, m) => (m.id > n ? m.id : n), 0n);
      if (independent)
        await createRoom({
          gameKind: game,
          mode,
          inviteCode:
            mode === "friends" ? crypto.randomUUID().replace(/-/g, "") : "",
        });
      else
        await produce({
          gameKind: game,
          mode,
          amber: JSON.stringify(amber),
          teal: JSON.stringify(teal),
          amberId:
            saved.find((s) => s.character === JSON.stringify(amber))?.id ?? 0n,
          tealId:
            saved.find((s) => s.character === JSON.stringify(teal))?.id ?? 0n,
          courseId: 0n,
          agent,
        });
      setAfter(latest);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "The arena could not open. Try again.",
      );
      setBusy(false);
    }
  }
  return (
    <section
      className="character-studio"
      aria-labelledby="character-studio-title"
    >
      <div className="studio-intro">
        <h2 id="character-studio-title">Your characters</h2>
        <p>Saved characters travel between arenas.</p>
        {saved.length > 0 && (
          <div
            className="saved-roster"
            aria-label="Your saved character roster"
          >
            {[...saved]
              .sort((a, b) => Number(b.id - a.id))
              .map((s) => {
                const c = JSON.parse(s.character) as ArenaCharacter;
                const played = entries
                  .filter((e) => e.amberId === s.id || e.tealId === s.id)
                  .map((e) => ({
                    entry: e,
                    memory: memories.find((m) => m.matchId === e.matchId),
                  }))
                  .filter((v) => v.memory);
                const kinds = new Set(played.map((v) => v.memory!.gameKind));
                return (
                  <div className="saved-character-card" key={String(s.id)}>
                    <button
                      className="saved-character-select"
                      disabled={busy}
                      aria-pressed={
                        selectedId === s.id || savedCurrent?.id === s.id
                      }
                      onClick={() => {
                        update(c);
                        setParentId(s.id);
                        setMessage(
                          `${c.name} selected for ${selected === 0 ? "Amber" : "Teal"}.`,
                        );
                      }}
                    >
                      <CharacterPortrait character={c} teal={selected === 1} />
                      <span>
                        <strong>{c.name}</strong>
                        <small>
                          Edition {s.edition} ·{" "}
                          {played.length
                            ? `${played.length} ${played.length === 1 ? "match" : "matches"} in ${kinds.size} ${kinds.size === 1 ? "arena" : "arenas"}`
                            : "Ready for a first match"}
                        </small>
                      </span>
                    </button>
                    {played.length > 0 && (
                      <button
                        className="saved-character-memory"
                        onClick={() =>
                          onOpen(played[played.length - 1].memory!.matchId)
                        }
                      >
                        Watch latest match ↗
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
      <div className="studio-workbench">
        {independentRoom ? (
          <div
            className="studio-cast studio-seat-preview"
            aria-label="Independent participants"
          >
            {[0, 1].map((side) => {
              const human =
                mode === "friends" || (mode === "human_agent" && side === 0);
              return (
                <div className="studio-character" key={side}>
                  {human ? (
                    <span className="studio-human-avatar" aria-hidden="true">
                      {side === 0 ? "Y" : "F"}
                    </span>
                  ) : (
                    <CharacterPortrait
                      character={{ ...CHARACTER_PRESETS[2], look: "robot" }}
                      teal={side === 1}
                    />
                  )}
                  <span>
                    <small>{side === 0 ? "AMBER" : "TEAL"}</small>
                    <strong>
                      {human
                        ? side === 0
                          ? "You"
                          : "Your friend"
                        : mode === "human_agent"
                          ? "Your agent"
                          : `Agent ${side + 1}`}
                    </strong>
                    <em>
                      {human ? "Human-controlled" : "Independent connection"}
                    </em>
                  </span>
                </div>
              );
            })}
            <span className="studio-versus" aria-hidden="true">
              {game === "mela_heist" ? "+" : "×"}
            </span>
          </div>
        ) : (
          <>
            <div
              className="studio-cast"
              aria-label="Choose a character to edit"
            >
              {[amber, teal].map((c, i) => (
                <button
                  key={i}
                  className={`studio-character ${selected === i ? "selected" : ""}`}
                  aria-pressed={selected === i}
                  onClick={() => {
                    setSelected(i as 0 | 1);
                    setParentId(i === 0 ? amberId : tealId);
                    setMessage("");
                  }}
                  disabled={busy}
                >
                  <CharacterPortrait character={c} teal={i === 1} />
                  <span>
                    <small>{i === 0 ? "AMBER" : "TEAL"}</small>
                    <strong>{c.name}</strong>
                    <em>
                      {c.pace === "dash" ? "Quick" : "Patient"} · {c.nerve}
                    </em>
                  </span>
                </button>
              ))}
              <span className="studio-versus" aria-hidden="true">
                {game === "mela_heist" ? "+" : "×"}
              </span>
            </div>
            <div className="studio-presets" aria-label="Ready-made characters">
              {CHARACTER_PRESETS.map((c) => (
                <button disabled={busy} key={c.name} onClick={() => update(c)}>
                  {c.name}
                </button>
              ))}
              <button
                disabled={busy}
                onClick={() => setEditing(!editing)}
                aria-expanded={editing}
              >
                Edit traits
              </button>
            </div>
            <details className="studio-optional" open={editing}>
              <summary
                onClick={(e) => {
                  e.preventDefault();
                  setEditing(!editing);
                }}
              >
                Tactics & saving
              </summary>
              <p className="studio-brief">
                {characterBrief(
                  character,
                  isArenaKind(game) ? game : "bridge_breakers",
                )}
              </p>
              <div className="studio-save-row">
                <button
                  disabled={
                    busy || saving || !connected || Boolean(savedCurrent)
                  }
                  onClick={() => void save()}
                >
                  {saving
                    ? "Saving…"
                    : savedCurrent
                      ? "Saved to your roster ✓"
                      : parentId
                        ? "Save new edition"
                        : "Save this character"}
                </button>
                <small>
                  Saved on your Mela identity. Match names and tactics are
                  public; unused drafts stay private.
                </small>
              </div>
              {editing && (
                <div className="studio-traits">
                  <label>
                    Name
                    <input
                      name="character-name"
                      maxLength={24}
                      value={character.name}
                      onChange={(e) =>
                        update({ ...character, name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Pace
                    <select
                      name="character-pace"
                      value={character.pace}
                      onChange={(e) =>
                        update({
                          ...character,
                          pace: e.target.value as ArenaCharacter["pace"],
                        })
                      }
                    >
                      <option value="dash">Dash when charged</option>
                      <option value="steady">One step at a time</option>
                    </select>
                  </label>
                  <label>
                    Route
                    <select
                      name="character-route"
                      value={character.route}
                      onChange={(e) =>
                        update({
                          ...character,
                          route: e.target.value as ArenaCharacter["route"],
                        })
                      }
                    >
                      <option value="direct">Shortest</option>
                      <option value="north">Prefer north</option>
                      <option value="south">Prefer south</option>
                    </select>
                  </label>
                  <label>
                    Nerve
                    <select
                      name="character-nerve"
                      value={character.nerve}
                      onChange={(e) =>
                        update({
                          ...character,
                          nerve: e.target.value as ArenaCharacter["nerve"],
                        })
                      }
                    >
                      <option value="bold">Bold</option>
                      <option value="careful">Careful</option>
                    </select>
                  </label>
                </div>
              )}
            </details>
          </>
        )}
        <div className="studio-launch">
          <label>
            Arena
            <select
              name="character-arena"
              value={game}
              disabled={busy}
              onChange={(e) => setGame(e.target.value)}
            >
              <option value="bridge_breakers">Bridge Breakers · race</option>
              <option value="crown_run">Crown Run · steal & return</option>
              <option value="mela_heist">Mela Heist · cooperate</option>
            </select>
          </label>
          <label>
            How to play
            <select
              name="character-mode"
              value={mode}
              disabled={busy}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="agents">Watch characters</option>
              <option value="solo">I control the left character</option>
            </select>
          </label>
        </div>
        {["friends", "human_agent", "agent_duel"].includes(mode) ? (
          <p className="studio-brief">
            {mode === "friends"
              ? "A private player link. No signup. Both choose a move, then reveal together."
              : "Bring any tool-capable agent through MCP. Each claims its own seat. No model keys in the browser."}{" "}
            {mode !== "friends" &&
              "Missed agent turns use a labeled MelaBot fallback."}
          </p>
        ) : (
          <label className="studio-live">
            <input
              type="checkbox"
              name="live-character-decisions"
              checked={live}
              disabled={busy}
              onChange={(e) => setLive(e.target.checked)}
            />
            <span>
              Live Astra decisions
              <small>
                {live
                  ? "Character moves are proposed by Astra. Limited capacity; timed-out moves use a labeled fallback."
                  : "Off: characters follow their saved tactics. No live AI calls."}
              </small>
            </span>
          </label>
        )}
        {!independentRoom && (
          <p className="studio-brief">
            Both characters’ names and traits will be public in this match.
            Looks do not change the rules.
          </p>
        )}
        <button
          className="studio-start"
          disabled={busy || saving || !savedReady || !connected}
          onClick={() => void start()}
        >
          {after !== undefined
            ? "Opening your arena…"
            : !connected
              ? "Connecting…"
              : mode === "friends"
                ? "Create a friend invitation →"
                : mode === "human_agent"
                  ? "Open my agent challenge →"
                  : mode === "agent_duel"
                    ? "Open two agent seats →"
                    : game === "mela_heist"
                      ? mode === "agents"
                        ? "Send the team on a heist →"
                        : `Team up with ${teal.name} →`
                      : mode === "agents"
                        ? "Start the character duel →"
                        : `Play against ${teal.name} →`}
        </button>
        {!independentRoom && (
          <details className="studio-optional">
            <summary>Design a character with Astra</summary>
            <form
              className="studio-prompt"
              onSubmit={(e) => {
                e.preventDefault();
                void teach();
              }}
            >
              <label htmlFor="character-idea">
                Or describe {selected === 0 ? "Amber" : "Teal"} to Astra
              </label>
              <div>
                <input
                  id="character-idea"
                  maxLength={400}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A fearless fox who prefers the scenic route"
                />
                <button disabled={busy || prompt.trim().length < 4}>
                  {busy && after === undefined ? "Working…" : "Design →"}
                </button>
              </div>
              <small>
                Optional. Astra suggests editable traits. Your prompt is not
                saved in Mela.
              </small>
            </form>
          </details>
        )}
        {message && (
          <p role="status" className="studio-message">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
