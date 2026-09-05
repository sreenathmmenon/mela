# One-time Mela match recap

The optional **Keep this match in your inbox** section sits after the completed
Book Cricket or Pen Fight result. The explicit **Email me this match** action
requests one transactional email, with no account, password, mailing list or
change to onboarding. Both players and spectators can use it. Read-only memory
links work for strangers too; opening a memory awards no participation credit.

## Delivery boundary

`src/EmailRecap.tsx` posts only match ID, recipient and explicit one-time consent
to `/api/recap` on the existing Railway transport. The current SpacetimeDB token
is sent in the Authorization header. `remote/recap.ts` presents that token to
SpacetimeDB and reads only the requested `match_memory` row through an ordinary
subscription. No match result, score, winner, crowd summary or return URL is
accepted from the browser. No reducers or game state are changed.

The template includes stored names, game-specific score, notable moment, crowd
action count and `/?memory=<id>` at the fixed public app origin. Plain text and
escaped HTML are sent through Resend. Book Cricket now has a read-only return
view for its memory links, matching Pen Fight's existing experience.

Addresses are not saved in Mela profiles, tables, browser storage or app logs.
They are passed to Resend for delivery and are subject to that provider's normal
message/log retention. No marketing contact is created. Provider acceptance
shows “on its way”; it does not claim placement in an inbox. Failures remain
retryable and never report success. The send key and sender stay server-only.

## Configuration

On Railway project `mela`, service `mela-web`, production:

- `RESEND_EMAIL_API_KEY`: runtime secret, never a `VITE_` variable.
- `MELA_EMAIL_FROM`: `Mela <recap@sreenathmenon.com>`.
- Existing `VITE_PUBLIC_APP_URL`: `https://mela-web-production.up.railway.app`.
- Existing database settings: Maincloud `mela-cah23`.

The sender domain must be verified by Resend before arbitrary recipients work.
`up.railway.app` belongs to Railway and cannot be verified through the user's
GoDaddy zone. Sreenath added `sreenathmenon.com` via Resend's GoDaddy integration;
verification/release/delivery evidence belongs in STATUS.md. The website stays
on Railway. Do not deploy it to the email sender's personal domain.

`GET /api/recap/status` reports whether credentials and sender are configured,
not DNS verification or inbox delivery. Local Vite proxies these routes to the
transport on port 8082. Tests inject a delivery stub: they do not send emails.

## Bounded abuse and retries

- Same-origin JSON requests, valid existing SpacetimeDB session, one recipient,
  2KiB body and numeric match ID; pending/absent history is rejected.
- At most four active requests; 60 requests/minute globally; five send attempts
  per verified identity/day, three per recipient/day and 100 globally/day.
- Per-process budgets and deduplication are bounded, reset on restart and assume
  the existing single Railway replica. They are suitable for this demo, not a
  claim of distributed abuse protection. Provider quotas also apply.
- A hash of recipient and match is sent as Resend's idempotency key. Matching
  retries use the same immutable payload and cannot double-send within Resend's
  documented 24-hour window. Concurrent requests for the same recap are rejected
  while one is in flight. A retry is not a newsletter subscription.

## Release checks

`pnpm test`, `pnpm run build`, `pnpm run build:transport`, module build and
server TypeScript check. Test HTTP rejection paths, duplicate/concurrent sends,
authoritative-memory formatting, escaping and provider failure. In a browser,
check both games, narrow viewport, first-time join and result return link.
Finally request a real recap from Railway and inspect Resend's delivered event;
ask the recipient to confirm inbox/spam placement separately.

Sources: [handbook section 8](https://worldtour.spacetimedb.com/handbook#8),
[Resend sending API](https://resend.com/docs/api-reference/emails/send-email),
[idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[sender verification restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).
