/** Presentation capabilities, not game authority. Keep unsupported modes absent. */
export type PlayIntent = "solo" | "friends" | "human_agent" | "agent_duel";
export const MULTIPLAYER_GAMES = [
  "pen_fight",
  "four_row",
  "bridge_breakers",
  "crown_run",
  "mela_heist",
] as const;
export function supportsIntent(kind: string, intent: PlayIntent) {
  return (
    Object.prototype.hasOwnProperty.call(GAME_GUIDES, kind) &&
    (intent === "solo" || MULTIPLAYER_GAMES.some((game) => game === kind))
  );
}
export function launchLabel(kind: string, intent: PlayIntent) {
  if (intent === "friends") return "Invite a friend →";
  if (intent === "agent_duel") return "Open agent seats →";
  if (intent === "human_agent")
    return kind === "mela_heist"
      ? "Team with an agent →"
      : "Challenge an agent →";
  return "Play →";
}
export function memoryResult(memory: {
  winner: string;
  humanName: string;
  aiName: string;
}) {
  if (memory.winner === "draw") return "A draw";
  if (memory.winner === "team") return "Treasure rescued together";
  if (memory.winner === "timeout") return "The vault closed";
  if (memory.winner === "human") return `${memory.humanName} won`;
  if (["bot", "melabot", "ai"].includes(memory.winner))
    return `${memory.aiName} won`;
  return "Match finished";
}
export const GAME_GUIDES: Record<
  string,
  { goal: string; input: string; crowd: string }
> = {
  pen_fight: {
    goal: "Knock the other pen off the desk. First to two rounds wins.",
    input:
      "Touch any part of your pen, pull back and release. Where you grip changes the flick. Aim controls also work with a keyboard.",
    crowd: "Pick a side, then use a power to change the next flick.",
  },
  book_cricket: {
    goal: "Set a score in six balls. Stop MelaBot beating it.",
    input:
      "The last digit shows runs before crowd effects. OUT means a wicket; zero can also be a dot ball. Safe lowers risk; aggressive raises it. Two wickets end an innings. Crowd effects can change the result.",
    crowd: "Choose a batter, then boost, shield or disrupt their next ball.",
  },
  stick_cricket: {
    goal: "One over each. Set a target, then watch MelaBot chase.",
    input:
      "Choose a batting action for each delivery. Six balls or two wickets end the innings.",
    crowd: "Choose a batter, then boost, shield or disrupt their next ball.",
  },
  dots_boxes: {
    goal: "Complete more boxes than MelaBot.",
    input:
      "Select an empty line between two dots. Closing a box scores it and normally gives you another move.",
    crowd: "Time a power to help a chain or interrupt the next move.",
  },
  gilli_danda: {
    goal: "Send the gilli farther than MelaBot.",
    input:
      "Use the timing control to line up your strike, then hit. Check the distance scored before the next round.",
    crowd: "A drumbeat or a heckle can change the next hit.",
  },
  four_row: {
    goal: "Connect four of your discs in any direction.",
    input:
      "Choose a column to drop a disc. Look for a line while blocking your rival.",
    crowd: "Use a power before a drop to change the next move.",
  },
  last_stick: {
    goal: "Take the last stick to win.",
    input: "Take one, two or three sticks. Plan what you leave for MelaBot.",
    crowd: "A spark can change the pile. Check the new count before choosing.",
  },
  bridge_breakers: {
    goal: "Reach the opposite portal before your rival.",
    input:
      "Choose a lit tile or a move control. Both sides lock a move, then reveal together. Save charge for a dash.",
    crowd:
      "Recharge both runners or change the crossing before the next reveal.",
  },
  crown_run: {
    goal: "Take the crown and carry it home.",
    input:
      "Choose a lit tile or a move control. Both sides reveal together. Intercept the carrier or find a route home.",
    crowd:
      "Change the crossing or recharge both runners before the next reveal.",
  },
  mela_heist: {
    goal: "Bring the treasure home together before the vault closes.",
    input:
      "You are partners, not opponents. Choose a lit tile or a move below; both partners reveal together. Coordinate a route through the vault.",
    crowd:
      "Help the team with charge or change the crossing before the next reveal.",
  },
};
