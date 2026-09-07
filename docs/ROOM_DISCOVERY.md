# Connected rooms, not saved memberships

## Decision — 7 September 2026

An open room is an active match whose host has a connected browser currently
displaying that match. Returning to Games removes that tab from the room;
Resume restores it. A spectator-only room is not advertised to new visitors.
Existing spectators may stay; host-away feedback explains the situation.
This is connected-route presence, not a claim of foreground attention or recent
input. There is no heartbeat, inactivity timer, simulation tick or polling.

The same room model covers all six games. Gameplay rules, crowd costs, AI,
scores and history are unchanged. Agent-duel hosts use the same browser room
presence; headless-only clients are not automatically advertised.

## Native authority and privacy

- Private `room_connection`: one row per `ConnectionId`, canonical identity,
  indexed match ID, server-derived spectator role.
- Public `set_room_presence`: accepts only an optional match ID; authenticates
  the actual connected session, validates active match membership/ownership or
  agent seat. No caller-selected identity, role or count. Omitted match clears
  only the caller's connection. Invalid requests roll back.
- Public anonymous view `room_activity`: match ID, host-present flag, distinct
  connected spectator count. Connection IDs and identities are not exposed by
  this projection. Completed matches are excluded immediately by the view.
- Native disconnect removes only that tab's room/session rows. World presence
  becomes offline only when no remaining canonical-identity connection exists.
- Normal `match_spectator` membership remains intact for authorization and
  durable product memory; it must never be used as a current-viewer count.
- Home, Book Cricket, Pen Fight and big screen subscribe to this projection.
  Route state reports location, not game authority. Gameplay remains reducer-only.

Researched facts: SpacetimeDB anonymous views are shared read-only projections
that update with their table dependencies ([official views documentation](https://spacetimedb.com/docs/functions/views/)).
`ConnectionId` distinguishes simultaneous connections of one identity
([official TypeScript client documentation](https://spacetimedb.com/docs/clients/typescript/)).
Installed SDK 2.10 and local native publication/integration checks verify this use.

## Entry and return UX

The normal URL opens the six-game homepage for new and returning people.
QR and saved-memory URLs retain their existing direct entry. Returning people
get their newest unfinished player match as Resume and three recent played or
watched results. Watch joins directly through the existing guest-capable reducer;
no extra form, forced signup or reload is introduced. Recent results use durable
memory and do not invent a global game score or popularity ranking.

## Migration and limitations

Publish the additive module before the frontend with `--delete-data=never`.
No existing table is dropped, no profile/history is reset, and no existing reducer
contract changes. Old browsers continue playing but do not advertise connected
rooms until they load the new frontend. Do not fabricate a fallback count from
legacy membership. Legacy world-online rows are not mass-reset.

Disconnect visibility depends on the server detecting a lost connection; a
connected background tab still counts. The bounded initial view scans connected
room/session rows; revisit query scope with measured scale, not premature sharding.
Never treat these counts as unique people across separate anonymous identities.

## Checks

`pnpm test` covers pure room aggregation. `pnpm exec tsx
scripts/verify-room-presence.ts` uses independent real SDK connections and native
subscriptions to test role rejection, membership/presence distinction, duplicate
tabs, leave/resume/disconnect/reconnect, invalid rollback, completed-room removal
and retained durable memory. This is separate from browser and game-rule tests.
Actual release and browser evidence belongs in STATUS.md.
