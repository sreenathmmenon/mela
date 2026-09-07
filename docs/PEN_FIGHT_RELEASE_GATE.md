# Pen Fight — precision and recovery gate, 7 September 2026

Sreenath rejected the previous completion claim. A successful build is not proof of exceptional game feel or of being the best game worldwide. This pass uses observable acceptance checks, fixes failures and preserves the authoritative game. Research basis remains `PEN_FIGHT_PLAY_EXPERIENCE.md`; no new competitor claim is made here.

## Correctness failures found and fixed

- The second human seat's position swap did not also swap its pen orientation, input capsule or cap/tip targets. All three now follow the same authoritative side. Both clients still see the same physical world, with their own names/colours presented locally.
- The committed motion's `contact` coordinate is the moving pen's centre, not the surface collision. Contact feedback now locates the touching barrel surfaces from committed geometry; misses never create a flash. This helper cannot decide a game outcome.
- The SVG recovery renderer had a shorter, differently oriented silhouette and assumed its square filled the whole rectangular viewport. It now matches the pen footprint/orientation and uses its actual SVG screen transform for pointer mapping.
- Returning to a tab could replay the last already-presented motion. A motion/replay key now distinguishes a new shot, an explicit replay and graphics reconstruction.
- A lost graphics context removed the host needed for recovery. The host now survives, with a Restore 3D control that reconstructs the renderer without reconnecting identity or changing the match. The recovery control's pointer/key events do not bubble into game input.

## Interaction changes

- The selected pen has a full-length contour instead of a centre-only ring. The solid arrow is a short direction cue; a dashed guide reaches the selected aim point. Neither guide promises travel, a hit or a hidden crowd-adjusted outcome.
- Pointer cancellation, Escape and lost capture clear an unfinished gesture without submitting it.
- Optional Focus desk removes ancillary content while retaining score, camera, turn and play/crowd controls. Exit focus stays available. Completion exits focus to the result. Lobby focus is disabled so the player invitation remains reachable.
- Waiting-seat copy no longer falsely says it is the absent player's turn. An empty crowd is not described as being with the player.

## Observed acceptance evidence

| Check                                                | Result                                                                                                                                                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Deterministic rules and frontend helpers             | 133 tests pass, including six real rule-resolved contact geometries and seat-perspective invariance                                                                                                                                              |
| Independent two-human and spectator browser sessions | Same committed positions and sequence; right seat intentionally renders its own pen first                                                                                                                                                        |
| Right-seat precision                                 | Cap target 740,333 matches authoritative-side geometry rounded from 740.043,333.079                                                                                                                                                              |
| Mobile touch input                                   | Chrome touch-event drag commits a legal right-seat shot                                                                                                                                                                                          |
| Crowd privacy                                        | DESK TILT visible in spectator overlay and absent from both player overlays; subsequent action resolves normally                                                                                                                                 |
| Complete human match                                 | Amber Spark 562 wins 2–0; both players and spectator show the same named result                                                                                                                                                                  |
| Connection continuity                                | A browser test page closed during a longer playthrough; reopening its existing context resumed the owned seat and the match completed. Cause of page closure was not established; it is not claimed as an app crash or a clean uninterrupted run |
| SDK authority regression                             | Human-human and human-agent matches, seat theft/role rejection, stale/duplicate turns, disconnect/reconnect and named history pass                                                                                                               |
| Forced graphics loss                                 | Recovery renderer appears; Restore 3D creates a live canvas with the same committed positions and no page errors                                                                                                                                 |
| Recovery input                                       | Fresh match: SVG tap at world 600,250 survives Restore 3D as aim 600,250; positions remain 260,500 and 740,500, with no shot committed                                                                                                           |
| Gesture cancellation                                 | Escape during a drag does not advance the observed motion sequence                                                                                                                                                                               |
| Focus layout                                         | No horizontal overflow at 320×740, 390×844, 1440×950 and 844×390. Desk and primary flick fit the viewport after correcting the first clipping failure                                                                                            |

Focus measurements: phone 320px flick bottom 695px; phone 390px bottom 799px; desktop desk bottom 932px in a 950px viewport; landscape desk bottom 381px and flick bottom 228px in a 390px viewport. Evidence screenshots: `output/playwright/pen-focus-verified-*.png`.

## Limits

These are local browser/SDK checks, including emulated mobile touch, not physical iPhone/Android certification or independent player preference testing. No new server physics, schema, AI policy, scoring, auth, progression or other-game mechanics. Existing bundle-size warnings remain. A worldwide quality ranking cannot be established by these checks. Release evidence belongs in `STATUS.md`.
