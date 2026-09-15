# Mela v3 — playable memories and returning characters

Implemented 15 September 2026 following Sreenath's instruction to use the 169-record report as a competitive benchmark. This advances two substantive loops rather than another cosmetic-only release. It is not evidence of universal superiority or completion of the entire v3 program.

## Product loops

1. **Watch → decide → share:** a completed Crown Run, Bridge Breakers or Heist recording offers “Play this moment.” Choose an earlier committed position, take Amber's place, and finish a new practice match with autonomous MelaBot and a fresh crowd. Share `?memory=<original>&moment=<revision>`; the recipient previews that position without enrolling, then plays without an account form. The new result and original are shown separately.
2. **Create → keep → return:** optional saved characters remain on the canonical Mela identity. Use the same saved edition in any of the three arenas, watch its actual completed matches, or save changed tactics as a new immutable edition. Rematches preserve the saved edition reference for its owner. A stranger can play public character traits without claiming the creator's saved identity. Detailed tactics/saving and Astra design are expandable; immediate play remains available without saving.

## Authority and schema

Additive tables only; no existing fields or reducer signatures removed:

| Table                   | Visibility | Purpose                                                                                                                                                                              |
| ----------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `arena_challenge`       | Public     | New match ID, original match/frame IDs, original starting revision, rules version, declared opponent policy, creation timestamp. Indexed original match and frame IDs.               |
| `saved_arena_character` | Private    | Auto ID, indexed canonical owner, validated character JSON, parent edition ID, edition number, timestamp. Immutable, 32 saved editions per owner.                                    |
| `arena_character_entry` | Public     | Match-to-Amber/Teal saved-edition references; no draft traits. Zero means an unsaved or human-controlled slot. Public match snapshots already disclose the actual names/traits used. |

New reducers: `challenge_arena_moment(frameId)`, `save_arena_character(character,parentId)`, `create_saved_character_arena(...)`. Existing `create_character_arena` calls the same internal `produceCharacterMatch` function; no reducer-to-reducer calls. New caller-scoped views: `my_saved_arena_characters`, `my_arena_character_entries`. Character setup reads those views, not a global private roster. Challenge queries are original-match scoped; replay and comparison are match scoped.

Researched fact: reducers remain the mutation boundary and module publication attempts automatic migration; see [official reducer documentation](https://spacetimedb.com/docs/functions/reducers/) and [publication documentation](https://spacetimedb.com/docs/databases/building-publishing/). No new architectural assumption replaces SpacetimeDB. Local additive migrations were observed with existing test matches intact. Production release uses `--delete-data=never --yes=remote,migrate`; observe the migration plan and reject any destructive requirement. Reverting a module after adding tables must retain those table declarations; do not delete the new durable data to roll back presentation.

### Practice validation

- Accept only a server-owned committed frame belonging to a completed, non-practice arena match. Reject terminal, malformed, wrong-game/revision and unsupported-version frames. No browser snapshot input.
- Keep position, score, charge, layout and the original move clock. A move-23 checkpoint has one remaining move, not 24 extra moves. Clear earlier cosmetic discoveries and old event text so a new crowd isn't credited for somebody else's actions.
- Create a separate ID, new participants and fresh 42/60 Crowd Energy. Do not copy old spectators, credentials, pending intents, pending powers or cooldowns. Do not overwrite the original host's rematch link.
- Fixed disclosed deterministic `trickster` MelaBot policy. Normal human/AI resolver and private discrete scheduling remain. External-agent attachment is rejected for practice; this is not a counterfactual prediction of the original human's response.
- Retrying the same frame on the same identity resumes its existing active attempt. A completed attempt can be tried again, but cannot itself become a new source checkpoint.
- Normal durable history and frames remain. Practice is labelled in memory/discovery, excluded from featured source challenges, and awards no player XP, wins, matches-played progression or crowd influence/XP. Operational started/completed play metrics still count actual attempts; do not call those ranked matches.

### Character validation

- Same validated finite tactics as before, no executable prompt/code. Exact saved payload overrides browser-supplied traits for a saved ID. Another identity cannot use or fork the private saved ID.
- Repeat identical saves are idempotent. A changed edition points to its parent; old versions and match snapshots stay unchanged. Thirty-two total editions per owner is an explicit storage bound, not a monetization limit.
- Character match counts are from completed authoritative histories linked to that edition. No universal cross-game skill sum or fabricated activity. A human-controlled Amber slot is not counted as autonomous character play.
- This is persistent **character** continuity, not persistent external-agent accounts, delegated agent credentials, model attestation, a hosted budget ledger or a new inference provider. Existing live/fallback labels and provider limits remain.

## Verification

- Full deterministic suite: **196/196 passed**. New checkpoint tests cover all three games, clock/score/state preservation, rejection, deterministic shared resolution, turning-point selection and capability-free share links.
- Typecheck, production frontend build, transport build, module build, formatter and whitespace checks passed. Existing >500kB bundle warnings remain (main approximately 629kB uncompressed; Three approximately 523kB).
- `scripts/verify-arena-challenges.ts`: real client → reducer → subscription checks on isolated local `mela-v3-moments-0915`. Bridge source 1/attempt 4 (MelaBot won), Heist source 3/attempt 5 (team win), Crown source 2/attempt 6 (draw). Tests cover invalid sources/no guest side effects, duplicate start, wrong seat, stale/duplicate moves, concurrent crowd purchases, hidden energy/plans, deterministic AI wake, reconnect, final convergence, single durable history, original immutability and no progression farming.
- `scripts/verify-character-roster.ts`: private roster and entry views, owner rejection, duplicate save, invalid tactics, immutable editions, forged browser fields overridden, reconnect, and one saved character completing Bridge 8 and Heist 9. These are deterministic autonomous matches, not paid LLM inference.
- Existing real-client regressions passed: `verify-human-seats.ts`, `verify-product-switch.ts`, `verify-guest-entry.ts`, `verify-arena-seats.ts` (all nine game/mode combinations plus actual missed-agent wake), `verify-playground-games.ts`, `verify-strategy-games.ts`, `verify-four-seats.ts`. Covers Pen human/human and human/agent, Book and Stick completion, Dots, Gilli, Four, Last Stick, private crowd concurrency, history and reconnect. The high-concurrency SDK run logged cache-delete/update warnings while assertions converged; do not describe it as warning-free.

## Actual browser checks

- Fresh visitor used the homepage moment link, previewed source Heist 3/move 2, and started new practice 7 without a form. Desktop player and independent 390px spectator joined the same match. Spectator Spring charge changed private energy 45→30; player remained at 45. Next committed move showed the named recharge and both converged to 33. Practice completed at move 13, team win, 11 new moves; both showed the same result/crowd moment. Spectator reload retained the result/role.
- Separate 320px stranger opened source Bridge 1/move 4 with no registration, saw the matching recorded position and enabled play action. Clipboard share fallback reported a copied moment link; temporary browser override was removed. Native share-sheet completion and social posting are not claimed.
- 390px character journey: saved Chai Fox edition 1, launched autonomous Bridge 42, completed it, rematched as 44 and confirmed the saved-character reference survived. Returning to Agents showed **2 matches in 1 arena**. Edited the name and saved Chai Fox Brave edition 2; original edition retained its two old matches.
- Visual screenshots inspected inline at 320/390px. Roster audit 32 passed/0 failed; practice result 28/0; shared moment 30/0. Four audited categories were 100; report JSON failure lists were read. These are accessibility/best-practice/SEO/agentic snapshots, not performance, physical-device or human preference evidence. Added form names after native browser suggestions. Screenshots are not claimed as saved artifacts.

## Boundaries

Preserved ten games and existing physics/rules, human seats, agents, QR, accounts and production origins. No new games, Circuit, persistent external-agent delegation, durable hosted inference budget, video export or measured viral/retention result in this release. Carrom/Kite need actual dedicated playtests and authority/physics work; they are not hidden behind renamed existing boards. The broader approved v3 work remains open.

Deployment and exact commit evidence are appended after release verification in STATUS.md.
