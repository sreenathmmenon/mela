# Mela interface review — 13 September 2026

## Review method

Sreenath requested independent review and correction, without asking him to do QA.
Three separate AI reviewers examined typography, copy/interaction, and mobile
accessibility. The coordinator checked their findings against code and browsers,
implemented changes, and requested a second review. These are **AI-assisted
heuristic reviews**, not endorsements by named designers, a human usability study,
or a claim that the product is universally accessible or aesthetically perfect.

The typography and copy reviewers were read-only. The mobile reviewer used its
own local browser session and database; no reviewer altered production data.
Only the coordinator edited source. Game rules, schema and authentication stayed
unchanged. The compact DM Sans homepage was retained.

## Coverage and dispositions

| Surface                      | Reviewed text and interactions                                                       | Changes / result                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Play                         | Names, short rules, mode choice, profile, resume, disabled cards                     | Keep compact hierarchy; no instruction hero. Ten games and supported modes remain.                                                                                          |
| Watch / Your Mela            | Active vs completed rooms, empty states, results, counters, saving                   | Singular crowd move; statistic labels reserve equal height. No fabricated activity.                                                                                         |
| Agents                       | Mode choice, joining instructions, QR meaning, copy success/failure                  | Add actual Pen/Four agent invitation copying; distinguish crowd QR from agent/player invitation. Manual-copy fallback. Shared tool description now correctly includes Four. |
| Character workshop           | Side selection, presets, traits, live execution, prompt privacy, launch              | Human controls left character; CTA names opposite character. Public names/traits disclosure precedes launch. Plain-language deterministic-mode disclosure.                  |
| Profile                      | Guest/saved distinction, nickname, sign-in, saving, forgetting, errors               | Neutral Sign in heading, no unsupported promise of a specific hosted-auth mechanism, explicit destructive action labels. Preserve verification and loss warnings.           |
| Book Cricket                 | First-ball explanation, choice risk, turn/pending, result, memory, invitation        | Explain last digit and OUT accurately; zero can also be a dot ball. Actual winner names/draws, restrained result typography, no opening spinner after completion.           |
| Stick Cricket                | Bowling/batting wording, pending, long names, scene caption, result                  | Game-specific pending text; long-name caption stacks rather than clipping. Shares corrected result presentation.                                                            |
| Pen Fight                    | Entry/help, camera, agent lobby, crowd invitation, result names                      | DM Sans camera/result labels; spectator links not mislabeled player invitations; mode-correct waiting instruction. Existing physical controls unchanged.                    |
| Dots & Boxes                 | Rules, line controls, turn, notebook, crowd invitation                               | Decorative rings no longer wrap across board. Readable instructions; secondary details called Rules & crowd effects.                                                        |
| Four / Last Stick / Gilli    | Rules, turn/action labels, power explanations, result and copy errors                | Readable shared help/crowd heading. Distinct rule details, action-specific errors and selectable links on clipboard failure.                                                |
| Crown / Bridge / Heist       | Current turn, character/provider, movement, objective, crowd, replay/result          | Shared body font, larger essential explanations, real-energy-aware readiness text, costs with units, friend/agent/teammate wording.                                         |
| Arena nonvisual presentation | Current/replayed board, actor positions, crossing, blocks, objective, legal movement | Collapsible committed-board description and destination-labelled moves. No private plans or artificial outcomes. Keyboard move verified to update description.              |

## Review corrections, not rubber-stamping

- A reviewer's first suggestion incorrectly equated a last-digit zero with a
  wicket. A second code review found legal zero-run outcomes. The final copy says
  to look for OUT and explains crowd effects. No scoring rule changed.
- Suspected profile-dialog naming and Pen slider-value defects were discarded:
  the labelled native dialog and normalized `aria-valuetext` were correct.
- Automated overflow checks missed Dots decoration overlap and Stick caption
  squeezing. Screenshots exposed both, and their revised versions were inspected.
- An older local browser tab lost its lazy stage chunk while the test build was
  being replaced. The stable-build checks reload first; this is not counted as a
  successful runtime check or hidden from the release evidence.

## Evidence and remaining boundaries

Exact commands, counts, deployment and final verification are in `STATUS.md`.
Local screenshots use `output/playwright/council-*`; they are QA artifacts, not
committed participant data. Clipboard success and denied-write paths were tested
in an isolated browser, restoring the clipboard function afterward. A complete
local Book Cricket match exercised the corrected result presentation.

All ten game entries and shared page families were inspected, including 320px
mobile and a legal 24-character unbroken nickname. This is not an exhaustive
enumeration of all generated event strings, locales, operating systems or future
user content. A doubled-computed-font stress probe is not native browser zoom.
Homepage Lighthouse scores do not certify gameplay accessibility.

Gilli's strike timing still relies on a visual window; a truly equivalent
nonvisual timing experience requires a separately designed and playtested cue.
Do not claim every game is fully playable with a screen reader. Existing bundle
warnings and previously documented runtime limitations remain. No award,
virality, user satisfaction or real-world expert endorsement is asserted.
