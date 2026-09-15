import type { ArenaState } from "../spacetimedb/src/arenaRules";
import type { MelaSound } from "./sound";

/** Cues describe committed events; pending crowd choices never enter this function. */
export function arenaCue(s: Pick<ArenaState, "winner" | "log">): MelaSound {
  if (s.winner) return s.winner === "timeout" ? "out" : "arenaWin";
  if (s.log.some((l) => l.includes("opened the treasure vault")))
    return "vault";
  if (
    s.log.some((l) =>
      /turned the bridge|recharged both runners|protected both runners from shoves/.test(
        l,
      ),
    )
  )
    return "crowdReveal";
  if (s.log.some((l) => /picked up|brought it home/.test(l))) return "vault";
  return "step";
}
