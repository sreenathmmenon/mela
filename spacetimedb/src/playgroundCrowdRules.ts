export const PLAYGROUND_POWERS = {
  sidewind: {
    label: "SIDEWIND",
    cost: 20,
    cooldown: 22,
    duration: 25,
    copy: "Shift their next disc one column right (left at the edge). Full neighbour? It stays put.",
  },
  spark: {
    label: "SPARK",
    cost: 20,
    cooldown: 22,
    duration: 25,
    copy: "Their next take removes one extra stick, if any remain. The last stick still wins.",
  },
  chain_break: {
    label: "CHAIN BREAK",
    cost: 16,
    cooldown: 22,
    duration: 25,
    copy: "End their next capture chain after one move. Boxes stay theirs.",
  },
  rhythm: {
    label: "RHYTHM",
    cost: 12,
    cooldown: 22,
    duration: 25,
    copy: "A drumbeat carries their next hit 8 paces farther.",
  },
  heckle: {
    label: "HECKLE",
    cost: 12,
    cooldown: 22,
    duration: 25,
    copy: "A sudden shout cuts their next hit by 8 paces.",
  },
  cheer: {
    label: "CHEER",
    cost: 4,
    cooldown: 10,
    duration: 0,
    copy: "Spend 4 to return 8 shared energy. Keep the crowd going.",
  },
} as const;
export type PlaygroundPower = keyof typeof PLAYGROUND_POWERS;
export function playgroundPower(
  gameKind: string,
  power: string,
): PlaygroundPower {
  const allowed =
    gameKind === "dots_boxes"
      ? ["chain_break", "cheer"]
      : gameKind === "gilli_danda"
        ? ["rhythm", "heckle", "cheer"]
        : gameKind === "four_row"
          ? ["sidewind", "cheer"]
          : gameKind === "last_stick"
            ? ["spark", "cheer"]
            : [];
  if (!allowed.includes(power))
    throw new Error("Choose a power for this game.");
  return power as PlaygroundPower;
}
export function crowdPurchase(
  energy: number,
  max: number,
  ready: bigint,
  now: bigint,
  power: PlaygroundPower,
  waiting: boolean,
) {
  const rule = PLAYGROUND_POWERS[power];
  if (ready > now) throw new Error("Your crowd move is cooling down.");
  if (waiting) throw new Error("An effect is already waiting for that side.");
  if (energy < rule.cost) throw new Error("The shared pool needs more energy.");
  return power === "cheer"
    ? Math.min(max, energy - rule.cost + 8)
    : energy - rule.cost;
}
