import type { Action, ArenaState, Pawn } from "../spacetimedb/src/arenaRules";

export const arenaCellLabel = (x: number, y: number) =>
  `column ${x + 1}, row ${y + 1}`;

/** Text projection of the same committed frame as the visual board. No pending plans. */
export function arenaBoardDescription(
  state: ArenaState,
  names: [string, string],
) {
  const positions = state.pawns
    .map(
      (p, i) =>
        `${i === 0 ? "Amber" : "Teal"} (${names[i]}): ${arenaCellLabel(p.x, p.y)}, dash charge ${p.stamina} of 2.`,
    )
    .join(" ");
  const item = state.kind === "mela_heist" ? "Treasure" : "Crown";
  const objective =
    state.kind === "bridge_breakers"
      ? "Race to the opposite portal."
      : state.crown.carrier >= 0
        ? `${item} carried by ${state.crown.carrier === 0 ? "Amber" : "Teal"}. Deliver at your starting portal.`
        : `${item}: ${arenaCellLabel(state.crown.x, state.crown.y)}.`;
  const switches =
    state.kind === "mela_heist"
      ? ` Switches: column 2, row 2 and column 8, row 8. Vault ${state.switchMask === 3 ? "open" : "locked"}.`
      : "";
  return {
    positions: `Move ${state.beat}. ${positions} ${objective}${switches}`,
    layout: `9 columns left to right; 9 rows top to bottom. Starting portals: column 1, row 5 and column 9, row 5. Column 5 is open only at rows ${state.bridge}, ${state.bridge + 1} and ${state.bridge + 2}. Blocks: ${state.walls.length ? state.walls.map((c) => arenaCellLabel(c % 9, Math.floor(c / 9))).join("; ") : "none"}.`,
  };
}

export function arenaMoveLabel(action: Action, pawn: Pawn) {
  const direction =
    action.x > pawn.x
      ? "right"
      : action.x < pawn.x
        ? "left"
        : action.y > pawn.y
          ? "down"
          : "up";
  return `${action.action === "dash" ? "Dash" : "Step"} ${direction} to ${arenaCellLabel(action.x, action.y)}`;
}
