# Typography review — 13 September 2026

Sreenath rejected the subtle Instrument Sans adjustment. This pass replaces the
actual font families, not merely their declared sizes. This is a design decision,
not evidence that the user now likes the result.

## Type system

| Role                                     | Typeface / weight | Desktop | Phone                       |
| ---------------------------------------- | ----------------- | ------- | --------------------------- |
| Mela wordmark                            | Outfit 500        | 30px    | 29px                        |
| Discovery section heading                | Outfit 400        | 28px    | 24px                        |
| Game-card name                           | Outfit 500        | 22px    | 19px; 18px at narrow widths |
| Game-card description                    | DM Sans 400       | 15px    | 14px                        |
| Navigation / mode buttons                | DM Sans 500       | 14px    | 13–14px                     |
| Game-page title                          | Outfit 500        | 24px    | 20px                        |
| Expanded game instructions               | DM Sans 400/500   | 15px    | 15px                        |
| Profile / workshop heading               | Outfit 500        | 24–26px | 24px                        |
| Workshop form values                     | DM Sans 400       | 16px    | 16px                        |
| Supporting workshop / account disclosure | DM Sans 400       | 13px    | 13px                        |

Remove compressed negative tracking on headings and game names. Use actual
variable weights rather than synthesised heavy interface headings. Gameplay
numbers keep their existing sizes but use the new display family. Game-stage
geometry, camera projection, hit testing and authoritative state are untouched.

## Visible-text review coverage

- Play: masthead, navigation, mode choices, ten names/descriptions, guest note,
  pending card labels and existing-match resume treatment.
- Watch: room/empty-state labels, completed-match names, results, crowd summaries
  and next actions. Preserve honest separation of active rooms and history.
- Agents: connection/character choices, mode labels, multiplayer actions and
  expanded connection guide. Preserve provider and session limitations.
- Character workshop: remove repeated promotional heading; inspect characters,
  presets, expanded traits, game/mode selects, live-provider disclosure, prompt
  field and launch. Full-width phone selects prevent clipped choices.
- Your Mela and profile dialog: name, participation/skill distinction, recent
  memories, empty state, guest persistence and verified-saving explanations.
  No authentication changes; the external identity-provider page is not styled.
- All ten game-entry/help screens: title, back/sound navigation and instructions.
  Representative Pen Fight, cricket, arena and dots screens visually inspected.
  Fix the arena help-summary contrast conflict; enlarge Pen invitation and
  strength-help text; shorten the clipped desk gesture hint without removing
  the complete touch-point explanation from help.

This is not exhaustive coverage of every possible dynamic result/error string,
language or physical device. Existing user-generated names/history are not
rewritten. Font fallback remains available for unavailable assets and scripts
outside the included Latin subsets.

## Delivery and validation

Both unmodified WOFF2 assets are self-hosted, approximately 69kB combined.
Sources and licenses are in `public/fonts/README.md`. No runtime Google Fonts
connection is needed. Cold entry and application use the same families.

Unit tests verify real WOFF2 headers, license inclusion, matching preload/CSS
paths and absence of the rejected discovery typeface. Browser validation checks
actual loaded font faces and computed styles, responsive wrapping and game
entry/return. Exact build, browser and release evidence belongs in `STATUS.md`.
Accessibility scores establish automated checks only, not aesthetic quality.
