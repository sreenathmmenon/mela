import type { CrowdPower } from "./bookCricketRules";

export const MELA_PROGRESS = {
  pointsPerLevel: 30,
  playerMatchPoints: 10,
  playerWinPoints: 5,
  spectatorMatchPoints: 4,
  crowdInfluenceByPower: {
    boost: 2,
    chaos: 3,
    shield: 2,
    cheer: 1,
  } satisfies Record<CrowdPower, number>,
} as const;

export function levelForProgress(progressPoints: number) {
  return 1 + Math.floor(progressPoints / MELA_PROGRESS.pointsPerLevel);
}

export function playerProgressAfterMatch(currentPoints: number, won: boolean) {
  const progressPoints =
    currentPoints +
    MELA_PROGRESS.playerMatchPoints +
    (won ? MELA_PROGRESS.playerWinPoints : 0);
  return { progressPoints, melaLevel: levelForProgress(progressPoints) };
}

export function spectatorProgressAfterMatch(currentPoints: number) {
  const progressPoints = currentPoints + MELA_PROGRESS.spectatorMatchPoints;
  return { progressPoints, melaLevel: levelForProgress(progressPoints) };
}

export function crowdInfluenceForPower(power: CrowdPower) {
  return MELA_PROGRESS.crowdInfluenceByPower[power];
}

export function nextBookCricketRecord(
  current: {
    matchesPlayed: number;
    wins: number;
    runsScored: number;
    highestScore: number;
  },
  score: number,
  won: boolean,
) {
  return {
    matchesPlayed: current.matchesPlayed + 1,
    wins: current.wins + (won ? 1 : 0),
    runsScored: current.runsScored + score,
    highestScore: Math.max(current.highestScore, score),
  };
}

/**
 * Picks the line the world will remember. Prefers a real, named crowd swing
 * that actually happened this match over a generic summary, and falls back to
 * the match's own shape (a tight finish, a collapse) when nobody intervened.
 */
export function notableCrowdMoment(
  actions: number,
  lastActor: string,
  lastPower: string,
  context: {
    crowdSwing?: string;
    winner?: string;
    humanName?: string;
    humanScore?: number;
    botScore?: number;
    humanWickets?: number;
  } = {},
) {
  if (context.crowdSwing) return context.crowdSwing;
  if (actions > 0)
    return `${lastActor} made the crowd matter with ${lastPower.toUpperCase()}.`;
  const margin =
    context.humanScore !== undefined && context.botScore !== undefined
      ? Math.abs(context.humanScore - context.botScore)
      : undefined;
  if (margin !== undefined && margin <= 2)
    return `Decided by ${margin === 0 ? "a tie-break finish" : `${margin} run${margin === 1 ? "" : "s"}`}.`;
  if (context.humanWickets !== undefined && context.humanWickets >= 2)
    return `${context.humanName ?? "The player"} lost both wickets chasing runs.`;
  if (context.winner === "human")
    return `${context.humanName ?? "The player"} beat MelaBot without crowd help.`;
  return "MelaBot took this one with nobody intervening.";
}

/**
 * Names the person whose crowd power changed a delivery, and says what it
 * changed. Attribution is derived from the same resolution that applied the
 * effect, so a spectator's contribution is never an anonymous number.
 */
export function describeCrowdSwing(
  raw: { wicket: boolean; runs: number },
  final: { wicket: boolean; runs: number },
  effects: Array<{ power: string; actorName: string }>,
): string | undefined {
  if (!effects.length) return undefined;
  const name = (power: string) =>
    effects.find((effect) => effect.power === power)?.actorName ?? "The crowd";
  if (raw.wicket && !final.wicket)
    return `${name("shield")}'s SHIELD saved the wicket.`;
  if (final.runs > raw.runs)
    return `${name("boost")}'s BOOST turned ${raw.runs} into ${final.runs}.`;
  if (effects.some((effect) => effect.power === "chaos"))
    return final.wicket
      ? `${name("chaos")}'s CHAOS ended in a wicket.`
      : `${name("chaos")}'s CHAOS delivered ${final.runs}.`;
  const labels = effects
    .map((effect) => `${effect.actorName}'s ${effect.power.toUpperCase()}`)
    .join(" · ");
  return `${labels} shaped that ball.`;
}
