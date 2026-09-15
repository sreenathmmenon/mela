import {
  isArenaKind,
  MAX_BEATS,
  validateCourse,
  type ArenaState,
} from "./arenaRules";

export const CHALLENGE_RULES_VERSION = 1;
export const CHALLENGE_POLICY = "trickster";

/** Read only a server-owned, committed checkpoint. Never accept browser state. */
export function challengeCheckpoint(
  raw: string,
  kind: string,
  revision: number,
): ArenaState {
  let s: ArenaState;
  try {
    s = JSON.parse(raw);
  } catch {
    throw Error("This recording is unavailable.");
  }
  const integer = (n: unknown, low: number, high: number) =>
    typeof n === "number" && Number.isInteger(n) && n >= low && n <= high;
  if (
    !s ||
    s.version !== CHALLENGE_RULES_VERSION ||
    !isArenaKind(kind) ||
    s.kind !== kind ||
    !integer(s.beat, 0, MAX_BEATS - 1) ||
    s.beat !== revision ||
    s.winner !== "" ||
    !Array.isArray(s.pawns) ||
    s.pawns.length !== 2 ||
    !s.pawns.every(
      (p) =>
        p &&
        integer(p.x, 0, 8) &&
        integer(p.y, 0, 8) &&
        integer(p.stamina, 0, 2) &&
        integer(p.score, 0, 1),
    ) ||
    !s.crown ||
    !integer(s.crown.x, 0, 8) ||
    !integer(s.crown.y, 0, 8) ||
    ![-1, 0, 1].includes(s.crown.carrier) ||
    ![2, 4, 6].includes(s.bridge) ||
    !integer(s.switchMask, 0, 3) ||
    typeof s.treasure !== "boolean" ||
    !Array.isArray(s.eggs) ||
    !s.eggs.every((e) => typeof e === "string") ||
    !Array.isArray(s.visited) ||
    !s.visited.every((v) => integer(v, 0, 80))
  )
    throw Error("Choose a playable moment before the match ends.");
  validateCourse(s.walls);
  // Keep the original move clock and board, but never credit another crowd's earlier actions.
  return {
    ...s,
    log: [
      "Your version starts here. MelaBot chooses fresh moves; the crowd can change what happens.",
    ],
    eggs: [],
    visited: [],
  };
}
