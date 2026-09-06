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
  // More reach trades against a narrower contact window. There is no
  // universally optimal full-power shot regardless of contact timing.
  const sweet = Math.max(
    0,
    100 - Math.abs(timing - 55) * (power === 3 ? 5 : power === 2 ? 3 : 2),
  );
  const distance = Math.max(
    0,
    sweet === 0
      ? 0
      : Math.round(((power * 15 + 25) * sweet) / 100 + Number(next % 7n) - 3),
  );
  return {
    distance,
    sound: sweet > 75 ? "crack" : sweet > 35 ? "tap" : "thud",
    seed: next,
  };
}

export const GILLI_FLIGHT_MICROS = 2_400_000n;
export function gilliTimingAt(elapsedMicros: bigint) {
  if (elapsedMicros < 0n || elapsedMicros > GILLI_FLIGHT_MICROS)
    throw new Error("The gilli has landed.");
  return Math.round(
    (Number(elapsedMicros) / Number(GILLI_FLIGHT_MICROS)) * 100,
  );
}
