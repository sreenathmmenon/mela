/** Cosmetic preferences only. Keep this module free of Three.js so the game
 * picker does not eagerly load the renderer. */
export const DESK_VIEWS = [
  "desk",
  "overhead",
  "behind",
  "sideline",
  "pen",
] as const;
export type DeskView = (typeof DESK_VIEWS)[number];
export function readDeskView(value: string | null): DeskView {
  return DESK_VIEWS.includes(value as DeskView) ? (value as DeskView) : "desk";
}
