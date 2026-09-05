/**
 * Mela's product counters are intentionally small and server-owned. They
 * describe persisted world activity, not connections, page views, or browser
 * storage. Identity flags are kept separately by the module so a reconnect can
 * never become a new person in these totals.
 */
export interface MelaMetricDelta {
  matchesStarted: number;
  matchesCompleted: number;
  uniquePlayerIdentities: number;
  uniqueSpectatorIdentities: number;
  totalParticipants: number;
  crowdActions: number;
  completedPlayerMatches: number;
  replayedMatches: number;
  spectatorToPlayerConversions: number;
  abandonedMatches: number;
  spectatorsWhoActed: number;
}

export const EMPTY_MELA_METRIC_DELTA: MelaMetricDelta = {
  matchesStarted: 0,
  matchesCompleted: 0,
  uniquePlayerIdentities: 0,
  uniqueSpectatorIdentities: 0,
  totalParticipants: 0,
  crowdActions: 0,
  completedPlayerMatches: 0,
  replayedMatches: 0,
  spectatorToPlayerConversions: 0,
  abandonedMatches: 0,
  spectatorsWhoActed: 0,
};

export function playerMatchStartDelta(input: {
  hasPlayed: boolean;
  hasSpectated: boolean;
  completedPlayerMatches: number;
}): MelaMetricDelta {
  return {
    ...EMPTY_MELA_METRIC_DELTA,
    matchesStarted: 1,
    totalParticipants: 1,
    uniquePlayerIdentities: input.hasPlayed ? 0 : 1,
    replayedMatches: input.completedPlayerMatches > 0 ? 1 : 0,
    spectatorToPlayerConversions:
      !input.hasPlayed && input.hasSpectated ? 1 : 0,
  };
}

export function spectatorJoinDelta(hasSpectated: boolean): MelaMetricDelta {
  return {
    ...EMPTY_MELA_METRIC_DELTA,
    totalParticipants: 1,
    uniqueSpectatorIdentities: hasSpectated ? 0 : 1,
  };
}

export function completedMatchDelta(): MelaMetricDelta {
  return {
    ...EMPTY_MELA_METRIC_DELTA,
    matchesCompleted: 1,
    completedPlayerMatches: 1,
  };
}

/** A spectator counts once, the first time they actually spend Crowd Energy. */
export function crowdActionDelta(firstActionForIdentity = false): MelaMetricDelta {
  return {
    ...EMPTY_MELA_METRIC_DELTA,
    crowdActions: 1,
    spectatorsWhoActed: firstActionForIdentity ? 1 : 0,
  };
}

/** A player left an unfinished match to start another one. */
export function abandonedMatchDelta(): MelaMetricDelta {
  return { ...EMPTY_MELA_METRIC_DELTA, abandonedMatches: 1 };
}
