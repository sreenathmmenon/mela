# Four in a Row and Last Stick

Two additional games in the existing Mela world, approved by Sreenath on 6 September 2026. These are familiar abstract strategy games with Mela crowd variants, not claims of Indian origin or new inventions. Existing Book Cricket, Pen Fight, Dots & Boxes and Gilli Danda rules remain unchanged.

## Play

**Four in a Row (`four_row`)**: human gold discs against teal MelaBot on seven columns/six rows. Choose an arrow; a disc falls into the lowest empty cell. Four horizontal, vertical or diagonal discs wins; a filled board without a line draws. Shapes supplement colour. The winning line is highlighted from the committed completed board.

**Last Stick (`last_stick`)**: 21 sticks, human first, alternating takes of 1–3. Taking the final stick wins. The biggest collection does not win. MelaBot follows a deterministic modulo-four strategy. Crowd intervention changes that arithmetic; no hidden browser scoring or random timing challenge.

Both are single Human versus MelaBot matches, not human matchmaking or WebMCP agent-seat games. Result scores in memory are 1–0/0–1 (0–0 draw for Four), not a universal skill score. Existing Mela participation/crowd progression is retained. No new economy or leaderboard.

## Crowd

One match pool starts at 42, caps at 60, and uses existing discrete energy regeneration. Each spectator has their own cooldown. All costs, eligibility, roles, stacking and effects are enforced atomically by reducers.

| Game / power       | Cost | Cooldown / expiry | Effect                                                                                                                                                                                                                              |
| ------------------ | ---: | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Four / SIDEWIND    |   20 | 22s / 25s         | Next selected target's disc goes one column right; at column 7 it goes left. If that neighbour is full it stays in its chosen column. The original chosen column must be legal. Consumed exactly once, including no-shift outcomes. |
| Last Stick / SPARK |   20 | 22s / 25s         | Remove one extra stick after the selected target's next legal take, only if a stick remains. Extra stick belongs to the same actor, including the winning last stick.                                                               |
| Both / CHEER       |    4 | 10s / none        | Spend 4, return 8 to the shared pool, capped at 60.                                                                                                                                                                                 |

Only joined spectators can buy powers. One pending effect per target; another is rejected without charging energy. Effects are visible to joined spectators, not players, anonymous viewers, big screens or AI. The move reveals the spectator's name and what actually happened. An expired effect cannot apply; expiry names the spent power only after it is no longer actionable. AI proposes from the public committed board/pile and goes through the same effect resolution as humans.

## Authority and lifecycle

- Additive public `four_row_state`: match primary key, 42-cell row-major board, turn, revision, last cell, concise outcome.
- Additive public `last_stick_state`: match primary key, remaining count, turn, revision, human/bot counts taken, concise outcome.
- `create_four_row`, `create_last_stick` reuse existing world/profile/participants/crowd/metrics creation.
- `play_strategy_move(match_id, revision, choice)` verifies canonical owner, active game, human turn, exact revision and legal choice. A retried/stale move cannot advance the next turn. Choice is column 0–6 or stick count 1–3; client submits no outcome.
- Private scheduled `strategy_ai_wake` uses the existing schedule table, four seconds after the human move. It validates active match, game kind, bot turn and expected revision. Four AI uses bounded five-ply alpha-beta search with stable ordering; Last Stick uses a pure deterministic proposal. Both call `resolveStrategyTurn`, which calls game-specific pure rules.
- Completion commits winner, one normal history row, one durable memory, progression and crowd credit in the same transaction, then cancels remaining schedules/effects. Abandoned matches cannot be advanced by old wakes and do not fabricate completed memories.
- Existing `rematch_playground` supports both kinds: owner-only, idempotent, refuses to abandon another active game. Spectators explicitly follow the next-match invitation.
- React uses SDK table subscriptions for public boards, matches and memories, and caller-only cooldown/effect views. No game polling. Both boards currently use the existing playground-wide state table subscriptions; match-primary-key filtering occurs in the projection. Further narrowing is a scale optimization, not a claim that queries are already match-scoped.

## Presentation and operation

Responsive CSS/SVG-free board visuals, not Three.js/physics. Actual disc/wood illustrations are code-native; no asset downloads or packages. Keyboard buttons, pending/error/disconnect/closed-table states, mobile crowd shortcut, sound toggle/reduced motion, full QR invite, read-only big-screen dispatch, public memory links, progression and rematch flow reuse Mela foundations.

No registration/authentication, email, Pen Fight physics, agent tooling or Book Cricket rules rewrite. Production uses existing Railway frontend and Maincloud `mela-cah23`. Schema publication must use `--delete-data=never`; no replacement database or personal-site deployment. Old frontend can continue without querying new tables during the additive module rollout.

## Verification

`pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm build:transport`, `pnpm spacetime:build`.

Real SDK checks against a **local** published database:

```
TEST_SPACETIME_DB=mela-six-0906 pnpm exec tsx scripts/verify-strategy-games.ts
TEST_SPACETIME_DB=mela-six-0906 pnpm exec tsx scripts/verify-playground-games.ts
TEST_SPACETIME_DB=mela-six-0906 pnpm exec tsx scripts/verify-agent-duel.ts
```

These use normal reducer/subscription clients, not internal-rule simulation or an authoritative-state backdoor. Fixture onboarding sends no real email. Browser desktop/mobile tests remain separately required. STATUS.md records actual results and deployment IDs. No zero-bug, world-best, all-device or high-load certification is asserted.
