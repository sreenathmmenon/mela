/** Presentation-only server clock estimate, anchored to monotonic time.
 * It is never sent back as authoritative contact timing. */
export type ClockSample = {
  serverMs: number;
  midpoint: number;
  roundTrip: number;
};
export function clockSample(
  serverMicros: bigint,
  sent: number,
  received: number,
): ClockSample {
  if (!Number.isFinite(sent) || !Number.isFinite(received) || received < sent)
    throw new Error("Invalid clock sample");
  return {
    serverMs: Number(serverMicros / 1000n),
    midpoint: (sent + received) / 2,
    roundTrip: received - sent,
  };
}
export function estimatedServerMs(sample: ClockSample, monotonicNow: number) {
  return sample.serverMs + Math.max(0, monotonicNow - sample.midpoint);
}
export function flightProgress(serverNow: number, startedMicros: bigint) {
  return Math.max(
    0,
    Math.min(1, (serverNow - Number(startedMicros / 1000n)) / 2400),
  );
}
