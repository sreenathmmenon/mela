import { PEN_FIGHT_RULES } from "./penFightRules";

export interface PenFightAIObservation {
  humanX: number;
  humanY: number;
  botX: number;
  botY: number;
  turnsInRound: number;
}

export interface PenFightAIProposal {
  aimX: number;
  aimY: number;
  force: number;
  contact: number;
  rationale: string;
}

/** A proposal-only opponent: the scheduled reducer still validates and resolves it. */
export class DeterministicPenFightAIProvider {
  decideAction(state: PenFightAIObservation): PenFightAIProposal {
    const dx = state.humanX - state.botX;
    const dy = state.humanY - state.botY;
    const humanEdgeDistance = Math.min(
      state.humanX,
      state.humanY,
      PEN_FIGHT_RULES.arenaSize - state.humanX,
      PEN_FIGHT_RULES.arenaSize - state.humanY,
    );
    const distance = Math.hypot(dx, dy);
    const edgeShot = humanEdgeDistance < 150;
    return {
      // Aim through the human pen so a direct hit carries it toward the edge.
      aimX: Math.round(
        Math.max(
          0,
          Math.min(1000, state.humanX + dx * (edgeShot ? 0.26 : 0.16)),
        ),
      ),
      aimY: Math.round(
        Math.max(
          0,
          Math.min(1000, state.humanY + dy * (edgeShot ? 0.26 : 0.16)),
        ),
      ),
      force: edgeShot ? 88 : distance < 210 ? 74 : 60,
      contact: 50,
      rationale: edgeShot
        ? "MelaBot spots an edge and commits to the desk shot."
        : "MelaBot lines up a measured response.",
    };
  }
}
