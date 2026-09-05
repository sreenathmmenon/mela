# Mela Book Cricket demo runbook

## Live surfaces

- Player / crowd: `https://sreenathmenon.com/mela/`
- Shared stage: `https://sreenathmenon.com/mela/#/screen?match=<match-id>`
- Authoritative database dashboard: `https://spacetimedb.com/mela-cah23`

The frontend is a static GitHub Pages deployment. The authoritative runtime is the `mela-cah23` SpacetimeDB Maincloud database. The stage is read-only; it has no privileged controls.

## Three-minute demo

1. Open the player URL on a laptop and the stage URL on a TV/projector.
2. Choose a display name and select **Start Book Cricket vs MelaBot**.
3. Open the in-game stage link. The stage displays the score, turn, Crowd Energy, recent moments, and a QR code.
4. Scan the QR from one or more phones. Each guest enters a display name and joins the crowd without an account or password.
5. On a phone, select a target and use a crowd power. The player, every spectator, and the stage receive the same committed effect and energy state.
6. Play the human innings. The stage communicates the innings break and MelaBot turn; MelaBot advances automatically through server-side scheduled wakes.
7. At completion, show the narrated result, crowd moment, durable recent memory, Mela profile change, and Book Cricket form.
8. Choose **Play again vs MelaBot** to begin the next shared match.

## Safety checks

- QR URLs contain only a public match identifier; no token, score authority, or role authority is encoded.
- Every player/crowd/AI action is validated and committed by a SpacetimeDB reducer.
- A normal page reload retains the anonymous SpacetimeDB identity token and resubscribes to the same authoritative world.
- Concurrent crowd requests serialize through the shared Crowd Energy reducer transaction; invalid or unaffordable actions cannot produce negative energy.
