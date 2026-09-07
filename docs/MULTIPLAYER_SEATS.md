# Human and agent seats

Approved by Sreenath, 7 September 2026. Mela remains a shared gaming world, not an agent hosting platform.

## Released scope and contracts

This implementation targets Pen Fight and Four in a Row. Other games retain their existing human-v-MelaBot modes pending individual turn-rule testing. No speculative generic game engine: each game has its own legal action, revision and authoritative resolution function.

| Mode        | Left seat      | Right seat            | Entry                                |
| ----------- | -------------- | --------------------- | ------------------------------------ |
| friends     | creating human | invited human         | private `?seat=<match>` link         |
| human_agent | creating human | external agent        | claim right (`bot`) seat through MCP |
| duel        | external agent | external agent        | host opens, each agent claims once   |
| melabot     | external agent | deterministic MelaBot | retained Pen Fight mode              |

Normal Play still starts the existing human-v-MelaBot game. No mandatory signup/email form is added. Opponents and spectators cannot occupy both roles in a match. A player invitation is first-claim access, not a promise that a particular named friend alone can use it. Public audience links remain `?join=<match>`.

## Authority and reconnect

`agent_duel` retains its published name for backward compatibility and is shared seat metadata, not the game state. `match.game_kind` selects native rules. `match_participant` records actual actor kind, identity and display name. Public reducers validate canonical caller identity, seat type, current match, phase, turn and revision before calling shared internal rules. No reducer-to-reducer calls; no browser scoring or AI outcomes.

Human Pen Fight uses `human_pen_flick` with round/turn number. Agent Pen Fight retains `agent_flick`, committed proposal and discrete scheduled resolution. Human Four uses `play_strategy_move`; agent Four uses `agent_drop_four`. Both call `resolveStrategyTurn`/`resolveFour`. Four agents commit a validated private `four_agent_proposal`, announce their chosen column and allow a three-second crowd window before a discrete scheduled action lands. It validates phase, proposal/turn revisions and actor again, then resolves the latest crowd effects. Human moves remain immediate. Completed/abandoned games invalidate pending actions and remove pending Four proposals.

`join_human_seat` is idempotent for the claimed identity. The older Pen-specific reducer alias remains supported. Neither someone with the link nor an agent can replace a claimed human. Multiple connections with the same canonical identity share the seat; stale duplicate actions still fail atomically. Closing a tab only drops that connection's room presence; it does not delete the seat or its history. Human turns wait for return, with no automatic forfeiture/substitution. Starting a new hosted match can close the previous one; the old view shows a closed state.

Guest identity persists in the same browser. Cross-device ownership requires the existing optional verified saved-identity linking; knowing an email or invitation does not authenticate an existing seat.

## Presence and discovery

The anonymous `pen_seat_presence` projection retains its legacy game name but supports both games: match ID and left/right connected booleans only. It derives from private room connections and canonical identities and exposes no connection IDs. Public room discovery requires a connected host or seat, excludes completed/abandoned rooms and the viewer's owned seats. Agent claim reports its room through `set_room_presence`, so a headless agent can make its room watchable even without a browser host.

Native read-only subscription views are a researched SpacetimeDB capability: [official views documentation](https://spacetimedb.com/docs/functions/views/). Presence means a connected room, not foreground attention; network failure visibility depends on native disconnect detection.

## Agent boundary and truthful results

WebMCP and remote MCP share `src/agentTools.ts`: list matches, read Pen desk/Four board, claim seat, Pen flick, Four drop. Discovery is bounded to twelve returned active agent matches. Observations exclude seed and pending crowd state. External agents supply their own execution/credentials; Mela does not claim to run an LLM merely because an agent seat exists.

Human turns have no bot deadline. External-agent turns have a discrete 30-second missed-turn policy. Stale revision/phase wakes are ignored; normal deterministic game logic covers a missed agent action. The public normal `agent_fallback_record` stores per-seat substitution counts, displayed live and appended to durable `match_memory`. This is not hidden external-agent performance. No high-frequency tick or polling.

## Memory, rematch and fairness

Completed records retain actual opponent names, result, score and crowd contribution. Both human participants earn existing small participation progression; an agent seat does not earn human progression. New competitive modes are intentionally unranked—no mixing them into the old solo skill leaderboard. Transient events remain separate from durable history.

Play again preserves the mode and creates a new invitation/claim cycle; it does not silently move another person to a new match. Returning spectators can watch current rooms or retained results. No artificial scarcity, nagging streaks, fake popularity or manipulative attachment mechanics are added. Repeat play should come from readable play, fair opponents, meaningful crowd actions and recognizable saved outcomes.

## Migration and verification

Publish the additive module before the frontend with `--delete-data=never`. New table/view/reducers are additive; old reducers, game rules and schemas stay compatible. Old browser clients must refresh to use new modes. Never delete production identities or memories to apply this change.

Deterministic rules tests complement real SDK and independent-browser tests. `scripts/verify-human-seats.ts` covers Pen seat theft, same-identity reconnect, stale/duplicate actions, full human/agent games and memory. `scripts/verify-four-seats.ts` covers all three new Four modes, crowd effects, complete results and real scheduled substitution. Existing game, crowd, guest and room suites are regression requirements. Actual execution/release evidence belongs in STATUS.md, not this design contract.
