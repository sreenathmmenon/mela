export const GILLI_RULES = { rounds: 5, minPower: 1, maxPower: 3 } as const;
export type GilliResolution = {
  distance: number;
  sound: "tap" | "crack" | "thud";
  seed: bigint;
};
/** Deterministic, server-side hit result; UI may animate it but cannot choose it. */
export function resolveGilliStrike(
  seed: bigint,
  power: number,
  timing: number,
): GilliResolution {
  if (
    !Number.isInteger(power) ||
    power < 1 ||
    power > 3 ||
    !Number.isInteger(timing) ||
    timing < 0 ||
    timing > 100
  )
    throw new Error("Choose a legal strike.");
  const next = (seed * 1103515245n + 12345n) & 0x7fffffffn;
  const sweet = Math.max(0, 100 - Math.abs(timing - 55) * 2);
  const distance = Math.max(
    1,
    Math.round(power * 12 + sweet / 3 + Number(next % 11n) - 5),
  );
  return {
    distance,
    sound: sweet > 75 ? "crack" : sweet > 35 ? "tap" : "thud",
    seed: next,
  };
}
