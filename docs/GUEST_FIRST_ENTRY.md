# Play first, save when it matters

Approved by Sreenath on 2026-09-06. This replaces required name/email entry, not Mela's persistent world or server authority.

## Contract

- A fresh visitor selects one of six games. `enter_game` validates the game, creates a generated-nickname profile and invokes existing game creation in one transaction. Repeated entry resumes an active owned match instead of duplicating/abandoning it.
- A valid crowd invitation can enroll a guest inside `join_match_as_spectator`. Invalid invitations roll back without creating a profile. Existing role, cooldown, energy and private-effect rules remain unchanged.
- A guest identity token remembers this browser. Clearing it without a linked recovery identity loses the browser's access; no claim of automatic cross-device guest recovery.
- The shared profile dialog permits optional nickname changes and optional email save/return. It is available inside every game, not the read-only stage. A dismissible completed-match invitation never blocks replay.
- Optional save uses the existing private ten-minute nonce bridge. The source session and verified destination identity must both be proven. Existing saved accounts restore without silently merging another guest. Existing contact email alone never establishes ownership.
- `protected_identity` is additive private state recording a validated verified-email identity on connection. Caller-only `my_account_status` exposes only protected/recoverable booleans. No email is published. Reducers independently check validated issuer, audience and boolean `email_verified`, rather than trusting the view or browser.
- Auth callback URLs are reduced to local safe return paths; analytics strips query and fragment identifiers. Failed sign-in offers a return to guest play.
- Old email onboarding reducers remain compatible for existing transports/tests. New human guest entry does not call them or send a welcome email. No deletion/backfill of existing contacts, profiles, histories or identity links.

## Researched facts and limits

SpacetimeDB server-issued identities can be reused with a persisted token; OIDC supplies stable provider identities. Official [authentication documentation](https://spacetimedb.com/docs/core-concepts/authentication/) and [SpacetimeAuth testing documentation](https://spacetimedb.com/docs/core-concepts/authentication/spacetimeauth/testing/) describe the JWT and verified-email claims. This is not proof of a particular live inbox round trip. Missing/false verification fails closed.

Hosted sign-in branding and its provider choices are managed by SpacetimeAuth, not this frontend. No new provider, password, custom domain, universal leaderboard, PvP mode or game-rule redesign is part of this release. Full cross-device email verification requires a real inbox, not a fabricated JWT.

## Verification

`pnpm test`; `pnpm typecheck`; `pnpm spacetime:build`; `pnpm build`; `pnpm build:transport`.

Against an isolated local module, run `scripts/verify-guest-entry.ts`, `scripts/verify-playground-games.ts`, `scripts/verify-strategy-games.ts`, and `scripts/verify-agent-duel.ts` with `TEST_SPACETIME_DB` set. These use real clients/subscriptions/reducers, not direct database fixture writes. Guest entry tests create profiles only locally and never send emails. See STATUS.md for exact observed release evidence and limits.
