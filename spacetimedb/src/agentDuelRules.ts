import { validatePenFlick } from "./penFightRules";

export const DUEL_RULES = { waitMicros: 30_000_000n, intentMicros: 3_000_000n };
export function validateAgentAction(
  state: { round: number; turnsInRound: number; turn: string },
  action: {
    round: number;
    turnNumber: number;
    aimX: number;
    aimY: number;
    force: number;
    contact: number;
    intent: string;
  },
  side: string,
) {
  if (state.round !== action.round || state.turnsInRound !== action.turnNumber)
    throw new Error("Stale desk. Read the current desk before flicking.");
  if (state.turn !== side) throw new Error("It is not your turn.");
  if (!validatePenFlick({ ...action, opening: state.turnsInRound === 0 }))
    throw new Error(
      "Illegal flick: aim 0–1000, force 20–66 on the opening turn (otherwise 20–100), contact 0–100.",
    );
  if (
    !action.intent.trim() ||
    action.intent.length > 160 ||
    /[<>\u0000-\u001f]/.test(action.intent)
  )
    throw new Error("State a short plain-text shot intent (1–160 characters).");
}
export function wakeIsCurrent(
  duel: { revision: bigint; phase: string },
  revision: bigint,
  phase: string,
) {
  return duel.revision === revision && duel.phase === phase;
}
