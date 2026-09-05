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

export function notableCrowdMoment(
  actions: number,
  lastActor: string,
  lastPower: string,
) {
  if (actions === 0) return "The crowd stayed close for every ball.";
  return `${lastActor} made the crowd matter with ${lastPower.toUpperCase()}.`;
}
