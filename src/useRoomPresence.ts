import { useEffect } from "react";
import { useReducer, useSpacetimeDB } from "spacetimedb/react";
import { reducers } from "./module_bindings";

/** Report this connection's route; never grant gameplay or spectator roles. */
export function useRoomPresence(
  matchId: bigint | undefined,
  enrolled: boolean,
) {
  const { isActive } = useSpacetimeDB();
  const setRoom = useReducer(reducers.setRoomPresence);
  useEffect(() => {
    if (!isActive || !enrolled) return;
    void setRoom({ matchId }).catch(() => {
      // A completed match may race this presentation request. The server
      // independently hides completed rooms; gameplay must not be interrupted.
    });
  }, [isActive, enrolled, matchId, setRoom]);
}
