/** Connection-backed discovery, deliberately separate from durable membership. */
export function summarizeRoom(
  owner: string,
  visits: ReadonlyArray<{ identity: string; spectator: boolean }>,
) {
  return {
    hostPresent: visits.some((v) => v.identity === owner),
    spectators: new Set(
      visits.filter((v) => v.spectator).map((v) => v.identity),
    ).size,
  };
}
