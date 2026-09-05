import {
  PEN_FIGHT_POWERS,
  type PenFightPower,
} from "../spacetimedb/src/penFightRules";

/** Direction hint only, not an outcome/trajectory prediction. SVG uses the
 * same square coordinate system for pens, arrow, finger tether and physics. */
export function aimGuide(
  from: { x: number; y: number },
  aim: { x: number; y: number },
  power: number,
) {
  const distance = Math.hypot(aim.x - from.x, aim.y - from.y);
  if (distance < 1) return { ...from };
  const length = 95 + Math.max(0, Math.min(100, power)) * 1.9;
  return {
    x: from.x + ((aim.x - from.x) / distance) * length,
    y: from.y + ((aim.y - from.y) / distance) * length,
  };
}

/** Presentation only. The reducer independently checks all eligibility. */
export function powerAvailability(input: {
  power: PenFightPower;
  energy: number;
  readyAtMicros?: bigint;
  now: number;
  waiting: boolean;
  pending: boolean;
  connected: boolean;
}) {
  const seconds = Math.max(
    0,
    Math.ceil((Number((input.readyAtMicros ?? 0n) / 1000n) - input.now) / 1000),
  );
  const cost = PEN_FIGHT_POWERS[input.power].cost;
  const reason = !input.connected
    ? "Reconnecting…"
    : input.pending
      ? "Sending…"
      : seconds > 0
        ? `Ready in ${seconds}s`
        : input.waiting
          ? "Already on this pen"
          : input.energy < cost
            ? `Need ${cost - input.energy} Energy`
            : "";
  return {
    disabled: Boolean(reason),
    label: reason || `Use ${PEN_FIGHT_POWERS[input.power].label}`,
  };
}

export function rivalry(wins: number, matches: number) {
  if (matches === 0) return "Every rivalry starts with one desk.";
  const losses = Math.max(0, matches - wins);
  return wins === losses
    ? `You and MelaBot are even: ${wins}–${losses}.`
    : wins > losses
      ? `You lead MelaBot ${wins}–${losses}.`
      : `MelaBot leads ${losses}–${wins}. Your next chapter is unwritten.`;
}

export function duelShare(input: {
  human: string;
  humanRounds: number;
  botRounds: number;
  crowdActions: number;
  moment: string;
}) {
  return `${input.human} ${input.humanRounds}–${input.botRounds} MelaBot.\n${input.moment}${input.crowdActions > 0 ? `\n${input.crowdActions} crowd move${input.crowdActions === 1 ? "" : "s"}. This wasn't a two-player story.` : ""}\nA school-desk duel in Mela. What would your next flick be?`;
}

export function isIntentionalDrag(
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  return Math.hypot(end.x - start.x, end.y - start.y) >= 8;
}
