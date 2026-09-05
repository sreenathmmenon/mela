import {
  type BookCricketStyle,
  type CrowdDeliveryEffects,
  chooseMelaBotStyle,
} from "./bookCricketRules";

export interface AIActionProposal {
  style: BookCricketStyle;
  rationale: string;
}

export interface AIObservation {
  target: number;
  botScore: number;
  botBalls: number;
  botWickets: number;
  effects: Partial<CrowdDeliveryEffects>;
}

export interface AIProvider {
  decideAction(observation: AIObservation): AIActionProposal;
}

/**
 * MelaBot's P0 policy is intentionally pure: it observes only authoritative
 * state, returns a legal proposal, and never reaches into the database.
 */
export class DeterministicAIProvider implements AIProvider {
  decideAction(observation: AIObservation): AIActionProposal {
    const style = chooseMelaBotStyle(
      observation.target,
      observation.botScore,
      observation.botBalls,
      observation.botWickets,
      observation.effects,
    );
    return {
      style,
      rationale:
        style === "aggressive"
          ? "MelaBot sees an opening and plays aggressively."
          : style === "safe"
            ? "MelaBot protects its wicket with a safe play."
            : "MelaBot chooses a balanced play.",
    };
  }
}

export function shouldExecuteScheduledAIWake(input: {
  matchStatus: string;
  turn: string;
  botBalls: number;
  expectedBotBalls: number;
}): boolean {
  return (
    input.matchStatus === "active" &&
    input.turn === "bot" &&
    input.botBalls === input.expectedBotBalls
  );
}
