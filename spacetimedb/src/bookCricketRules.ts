export const BOOK_CRICKET_RULES = {
  maxBallsPerInnings: 6,
  maxWicketsPerInnings: 2,
} as const;

export type BookCricketStyle = "steady" | "attack";
export type BookCricketWinner = "human" | "melabot" | "draw";

export interface DeliveryOutcome {
  seed: bigint;
  wicket: boolean;
  runs: number;
}

/** Pure, deterministic resolution used by both human and MelaBot deliveries. */
export function resolveBookCricketOutcome(
  seed: bigint,
  style: BookCricketStyle,
): DeliveryOutcome {
  const nextSeed = (seed * 1103515245n + 12345n) % 2147483647n;
  const roll = Number(nextSeed % 100n);
  const wicket = style === "attack" ? roll < 18 : roll < 7;
  const runs = wicket
    ? 0
    : style === "attack"
      ? [0, 2, 4, 4, 6, 6][roll % 6]
      : [0, 1, 1, 2, 3, 4][roll % 6];
  return { seed: nextSeed, wicket, runs };
}

export function isInningsComplete(balls: number, wickets: number): boolean {
  return (
    balls >= BOOK_CRICKET_RULES.maxBallsPerInnings ||
    wickets >= BOOK_CRICKET_RULES.maxWicketsPerInnings
  );
}

export function resolveChaseWinner(
  botScore: number,
  target: number,
): BookCricketWinner {
  if (botScore >= target) return "melabot";
  if (botScore === target - 1) return "draw";
  return "human";
}

export function chooseMelaBotStyle(
  target: number,
  botScore: number,
): BookCricketStyle {
  return target - botScore > 6 ? "attack" : "steady";
}
