import { isArenaKind, type ArenaState } from "../spacetimedb/src/arenaRules";

export type StoryMemory = {
  matchId: bigint;
  gameKind: string;
  humanName: string;
  aiName: string;
  winner: string;
  humanScore: number;
  botScore: number;
  crowdActions: number;
  notableMoment: string;
  sequence: bigint;
};

/** Discovery is varied, not a popularity score. Personal history stays complete. */
export function selectStories<T extends StoryMemory>(
  rows: readonly T[],
  limit = 6,
): T[] {
  const ordered = [...rows].sort((a, b) =>
    a.sequence > b.sequence ? -1 : a.sequence < b.sequence ? 1 : 0,
  );
  const selected: T[] = [],
    seen = new Set<string>();
  for (const row of ordered) {
    if (seen.has(row.gameKind)) continue;
    selected.push(row);
    seen.add(row.gameKind);
    if (selected.length >= limit) return selected.slice(0, Math.max(0, limit));
  }
  for (const row of ordered) {
    if (!selected.some((s) => s.matchId === row.matchId)) selected.push(row);
    if (selected.length >= limit) break;
  }
  return selected.slice(0, Math.max(0, limit));
}

export function storyCaption(m: StoryMemory): string {
  // Legacy result summaries mix development/provenance counters with the moment.
  // Keep those records intact; discovery displays only useful narrative sentences.
  const sentences = m.notableMoment
    .split(/(?<=[.!?])\s+/)
    .filter(
      (s) =>
        !/^\d+ discoveries\.?$/i.test(s.trim()) &&
        !/^(?:MelaBot strategy|No crowd powers used|Saved tactics)/i.test(
          s.trim(),
        ),
    );
  return (
    sentences.join(" ").trim() ||
    (m.crowdActions > 0
      ? `${m.crowdActions} crowd ${m.crowdActions === 1 ? "power used" : "powers used"}.`
      : "Open the result, then take your turn.")
  );
}

export type ReplayFrame = { revision: number; state: string };
export type MatchMoment = {
  revision: number;
  label: string;
  detail: string;
  kind: "crowd" | "objective" | "finish";
  state: ArenaState;
};

/** Only committed frames enter this projection. No proposed actions or inferred winners. */
export function readArenaFrame(frame: ReplayFrame): ArenaState | undefined {
  try {
    const s = JSON.parse(frame.state) as ArenaState;
    if (
      s.version !== 1 ||
      !isArenaKind(s.kind) ||
      !Number.isInteger(s.beat) ||
      !Array.isArray(s.pawns) ||
      s.pawns.length !== 2 ||
      !s.pawns.every(
        (p) =>
          p &&
          Number.isInteger(p.x) &&
          p.x >= 0 &&
          p.x <= 8 &&
          Number.isInteger(p.y) &&
          p.y >= 0 &&
          p.y <= 8,
      ) ||
      !Array.isArray(s.walls) ||
      !s.walls.every((w) => Number.isInteger(w) && w >= 0 && w < 81) ||
      !Array.isArray(s.log) ||
      !s.log.every((l) => typeof l === "string") ||
      typeof s.winner !== "string" ||
      !s.crown ||
      !Number.isInteger(s.crown.x) ||
      s.crown.x < 0 ||
      s.crown.x > 8 ||
      !Number.isInteger(s.crown.y) ||
      s.crown.y < 0 ||
      s.crown.y > 8 ||
      ![-1, 0, 1].includes(s.crown.carrier) ||
      !Number.isInteger(s.bridge) ||
      s.bridge < 0 ||
      s.bridge > 8
    )
      return;
    return s;
  } catch {
    return;
  }
}

export function matchMoments(frames: readonly ReplayFrame[]): MatchMoment[] {
  const moments: MatchMoment[] = [];
  for (const frame of [...frames].sort((a, b) => a.revision - b.revision)) {
    const state = readArenaFrame(frame);
    if (!state || frame.revision < 1) continue;
    const crowd = state.log.find((l) =>
      /turned the bridge\.|recharged both runners\.|protected both runners from shoves this beat\.$/.test(
        l,
      ),
    );
    const objective = state.log.find((l) =>
      /opened the treasure vault|picked up|brought it home|stole|shoved/i.test(
        l,
      ),
    );
    if (crowd)
      moments.push({
        revision: frame.revision,
        kind: "crowd",
        label: "Crowd move",
        detail: crowd,
        state,
      });
    else if (objective)
      moments.push({
        revision: frame.revision,
        kind: "objective",
        label: state.kind === "mela_heist" ? "Teamwork" : "Turning point",
        detail: objective,
        state,
      });
    else if (state.winner)
      moments.push({
        revision: frame.revision,
        kind: "finish",
        label: "The finish",
        detail: state.log[state.log.length - 1] ?? "Match complete.",
        state,
      });
  }
  return moments;
}

export function featuredMoment(
  frames: readonly ReplayFrame[],
): MatchMoment | undefined {
  const moments = matchMoments(frames);
  return (
    moments.find((m) => m.kind === "crowd") ??
    moments.find((m) => m.kind === "objective") ??
    moments[moments.length - 1]
  );
}
