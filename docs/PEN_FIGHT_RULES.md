# Mela Pen Fight

Pen Fight is Mela’s second concrete game, sharing the world, identity, crowd,
AI, history, QR, stage, and metrics layers with Book Cricket.

- Best of three: first to two rounds wins.
- A round alternates discrete flicks. Drag from your pen toward the opponent,
  choose force and contact, then commit the flick; the server simulates the
  result deterministically. The client never calculates movement, contact,
  edge exit, round, or winner.
- Knock a pen beyond the notebook boundary to take the round. At eight exchanges,
  the pen closest to desk centre wins the round, preventing stalemates.
- Opening force is capped at 65; later flicks use 24–100. Aim, force, and contact
  dominate; only bounded deterministic deflection adds uncertainty.
- Crowd powers are NUDGE, DESK TILT, GUARD, and CHEER. They alter the next legal
  flick’s conditions, never directly award a knockout.

## Authoritative action model

- The Human submits aim (`0–1000`), force (`24–100`; first flick capped at
  `65`), and contact (`0–100`). Invalid, wrong-turn, stale, and completed-match
  actions are rejected by the reducer.
- MelaBot wakes through one discrete scheduled reducer. Its deterministic
  provider observes only authoritative pen positions, proposes a bounded legal
  flick, and the same shared Pen resolver applies the result.
- NUDGE adds a bounded push to the selected side’s next flick. DESK TILT adds
  controlled contact-dependent drift. GUARD protects the _selected_ pen from
  one edge exit; it is not a global shield. CHEER costs 4 energy and returns 8
  shared energy, capped at 60. Effects expire on a discrete schedule.
- A round ends on an edge knockout or after eight exchanges, where the pen
  nearer the desk centre wins. First to two rounds wins the match.

Pen Fight metrics are authoritative aggregates: starts, completions, distinct
player/spectator identities, participations, crowd actions, completed rounds,
and knockouts. Reconnects never count as a person or participation.
