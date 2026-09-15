import {
  readArenaFrame,
  featuredMoment,
  type ReplayFrame,
} from "./matchStories";

export function playableMoments<T extends ReplayFrame>(
  frames: readonly T[],
): T[] {
  return frames
    .filter((f) => {
      const s = readArenaFrame(f);
      return s && !s.winner && s.beat < 24;
    })
    .sort((a, b) => a.revision - b.revision);
}
export function recommendedCheckpoint<T extends ReplayFrame>(
  frames: readonly T[],
): T | undefined {
  const playable = playableMoments(frames),
    moment = featuredMoment(frames);
  return (
    playable.find((f) => f.revision === (moment?.revision ?? 1) - 1) ??
    playable[playable.length - 1]
  );
}
export function requestedMoment(search: string): number | null {
  const v = new URLSearchParams(search).get("moment");
  return v !== null && /^(?:[0-9]|1[0-9]|2[0-3])$/.test(v) ? Number(v) : null;
}
export function momentLink(
  href: string,
  matchId: bigint,
  revision: number,
): string {
  const url = new URL(href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("memory", String(matchId));
  url.searchParams.set("moment", String(revision));
  return url.href;
}
