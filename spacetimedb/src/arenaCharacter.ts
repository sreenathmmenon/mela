import {
  decideArena,
  legalActions,
  pathDistance,
  type Action,
  type ArenaState,
  type Side,
} from "./arenaRules";

/** Small, inspectable tactics, not executable user code or a privileged AI. */
export type ArenaCharacter = {
  name: string;
  pace: "dash" | "steady";
  route: "direct" | "north" | "south";
  nerve: "bold" | "careful";
  look: "fox" | "owl" | "robot";
};
export const CHARACTER_PRESETS: ArenaCharacter[] = [
  {
    name: "Chai Fox",
    pace: "dash",
    route: "north",
    nerve: "bold",
    look: "fox",
  },
  {
    name: "Moon Owl",
    pace: "steady",
    route: "south",
    nerve: "careful",
    look: "owl",
  },
  { name: "Bolt", pace: "dash", route: "direct", nerve: "bold", look: "robot" },
];
export function validateCharacter(value: unknown): ArenaCharacter {
  const c = value as ArenaCharacter;
  if (
    !c ||
    typeof c !== "object" ||
    typeof c.name !== "string" ||
    c.name.trim().length < 2 ||
    c.name.length > 24 ||
    /[<>\x00-\x1f]/.test(c.name) ||
    !["dash", "steady"].includes(c.pace) ||
    !["direct", "north", "south"].includes(c.route) ||
    !["bold", "careful"].includes(c.nerve) ||
    !["fox", "owl", "robot"].includes(c.look)
  )
    throw Error(
      "Choose a name of 2–24 characters and supported character traits.",
    );
  return {
    name: c.name.trim(),
    pace: c.pace,
    route: c.route,
    nerve: c.nerve,
    look: c.look,
  };
}
export function characterBrief(
  c: ArenaCharacter,
  kind: ArenaState["kind"] = "crown_run",
): string {
  const objective =
    kind === "mela_heist"
      ? "Reach your switch, then help bring the treasure home"
      : kind === "bridge_breakers"
        ? "Race to the opposite portal"
        : "Collect the crown and bring it home";
  const caution =
    kind === "mela_heist"
      ? "Work with your partner"
      : c.nerve === "careful"
        ? "Prefer a clear route away from the rival"
        : "Take the direct contest when paths are equally good";
  return `${objective}. ${c.pace === "dash" ? "Dash when charged" : "Prefer single steps"}. ${c.route === "direct" ? "Take the shortest route" : `Prefer the ${c.route} route when equally short`}. ${caution}.`;
}
/** Replace seat labels once; a name containing "Amber" or "Teal" is literal data. */
export function characterEvents(
  log: string[],
  amber: string,
  teal: string,
): string[] {
  return log.map((message) =>
    message.replace(/\b(Amber|Teal)\b/g, (seat) =>
      seat === "Amber" ? amber : teal,
    ),
  );
}
export function decideCharacter(
  s: ArenaState,
  side: Side,
  c: ArenaCharacter,
): Action {
  const basic = decideArena(s, side),
    p = s.pawns[side],
    other = s.pawns[1 - side];
  if (!["move", "dash"].includes(basic.action)) return basic;
  let gx = 4,
    gy = 4;
  if (s.kind === "bridge_breakers") gx = side === 0 ? 8 : 0;
  else if (s.kind === "mela_heist" && s.switchMask !== 3) {
    gx = side === 0 ? 1 : 7;
    gy = side === 0 ? 1 : 7;
  } else if (s.crown.carrier === side) gx = side === 0 ? 0 : 8;
  else if (s.crown.carrier >= 0) {
    gx = other.x;
    gy = other.y;
  } else {
    gx = s.crown.x;
    gy = s.crown.y;
  }
  const choices = legalActions(s, side).filter(
    (a) => a.action === "move" || (a.action === "dash" && c.pace === "dash"),
  );
  const score = (a: Action) =>
    pathDistance(s, a.x, a.y, gx, gy) * 100 +
    (c.route === "north" ? a.y : c.route === "south" ? 8 - a.y : 0) * 2 +
    (c.nerve === "careful" &&
    s.kind !== "mela_heist" &&
    Math.abs(a.x - other.x) + Math.abs(a.y - other.y) <= 1
      ? 20
      : 0);
  return (
    choices.sort((a, b) => score(a) - score(b))[0] ?? {
      action: "guard",
      x: p.x,
      y: p.y,
    }
  );
}

/** Only public, bounded character traits travel in a remix URL. Never credentials or prompts. */
export function encodeCharacter(c: ArenaCharacter): string {
  return encodeURIComponent(JSON.stringify(validateCharacter(c)));
}
export function decodeCharacter(
  raw: string | null,
): ArenaCharacter | undefined {
  if (!raw || raw.length > 800) return;
  try {
    return validateCharacter(JSON.parse(raw));
  } catch {
    return;
  }
}
