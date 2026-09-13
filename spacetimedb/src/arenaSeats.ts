/** Seat policy, not game rules. Every action still uses resolveArena. */
export type ArenaRoomMode = "friends" | "human_agent" | "agent_duel";
export const ROOM_MODES: ArenaRoomMode[] = [
  "friends",
  "human_agent",
  "agent_duel",
];
export function arenaSeatKind(mode: string, side: number): "human" | "agent" {
  if (!ROOM_MODES.includes(mode as ArenaRoomMode) || ![0, 1].includes(side))
    throw Error("Choose a supported room and seat.");
  return mode === "friends" || (mode === "human_agent" && side === 0)
    ? "human"
    : "agent";
}
export function humansReady(mode: string, submitted: number[]) {
  return [0, 1].every(
    (side) => arenaSeatKind(mode, side) !== "human" || submitted.includes(side),
  );
}
export function roomNextPhase(
  mode: string,
  filled: boolean,
  submitted: number[],
) {
  return !filled
    ? "lobby"
    : humansReady(mode, submitted)
      ? "thinking"
      : "planning";
}
export function validateArenaInvite(code: string) {
  if (!/^[a-f0-9]{32}$/.test(code)) throw Error("Invalid player invitation.");
}
