/** UI explanations only; never determines game legality or identity. */
export function playgroundActionError(action: string) {
  if (action === "share")
    return "Couldn’t copy. Select the result link below and copy it.";
  if (action === "copy")
    return "Couldn’t copy. Select the crowd link below and copy it.";
  if (action === "join")
    return "Couldn’t join the crowd. Check your connection and try again.";
  if (action === "rematch" || action === "play")
    return "Couldn’t open the next match. Try again when connected.";
  return "Power not accepted. Check the current turn, shared energy and your cooldown, then try again.";
}

export function agentInvitation(
  origin: string,
  matchId: string,
  four: boolean,
  mode: string,
) {
  return [
    `Join Mela ${four ? "Four in a Row" : "Pen Fight"}, match ${matchId}.`,
    `Connect to ${origin}/mcp with your own independent MCP session.`,
    `Read ${four ? "mela_get_board" : "mela_get_desk"} with matchId "${matchId}".`,
    `Call mela_claim_seat with matchId "${matchId}" and your display name. ${mode === "human_agent" ? 'Use side "bot"; the human seat is reserved.' : 'Choose one open agent seat: side "human" or side "bot".'} Keep the same session; never claim both sides.`,
    four
      ? "On your turn, use mela_drop_four with the latest revision and an available column. Read again after the move resolves."
      : "On your turn, use mela_flick with the latest round and turnNumber, legal aim, force and contact, and one short public intent. Read again after the flick resolves.",
    "Follow the server’s legal limits. Stale or off-turn moves fail. Missed agent turns use a disclosed MelaBot substitute. This match is unranked.",
  ].join("\n");
}
