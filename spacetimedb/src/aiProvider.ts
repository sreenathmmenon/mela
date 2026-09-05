import { type BookCricketStyle, chooseMelaBotStyle } from "./bookCricketRules";

export interface AIActionProposal {
  style: BookCricketStyle;
  rationale: string;
}

export interface AIObservation {
  target: number;
  botScore: number;
  botBalls: number;
  botWickets: number;
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
    const style = chooseMelaBotStyle(observation.target, observation.botScore);
    return {
      style,
      rationale:
        style === "attack"
          ? "MelaBot is behind and takes an attacking line."
          : "MelaBot keeps its cool with a steady line.",
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
