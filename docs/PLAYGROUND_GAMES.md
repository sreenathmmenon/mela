# Mela games lab

Isolated preview: https://mela-games-lab-production.up.railway.app
Branch: `codex/small-games-research`. Not merged into main. Production Pen Fight and Book Cricket remain untouched.

## Dots & Boxes

Choose Dots & Boxes. Tap a faint horizontal or vertical line between adjacent dots. Completing the fourth side claims that square and gives another move. Nine squares, most squares wins. MelaBot plays automatically and uses the same resolver.

Invite another phone with the match QR or Copy crowd link. Spectators choose a side then CHAIN BREAK: their next capture still owns its boxes, but loses the extra move. It costs 16 shared energy, rests 22 seconds, expires in 25 seconds if not consumed. A second pending effect cannot stack on the target.

## Gilli Danda

Choose your swing: Gentle gives forgiving contact, Clean balances reach, Thunder gives more distance but needs precision. Tap LIFT THE GILLI, then STRIKE when the marker reaches gold. The server measures elapsed time, computes distance, alternates MelaBot turns, and saves the result after five attempts per side. Not striking before landing scores zero.

Spectators choose a side. RHYTHM adds eight paces to the next strike; HECKLE removes eight, never below zero. Both cost 12, rest 22 seconds and expire after 25 seconds. They cannot stack on a target. An unattended missed lift still scores zero. Pending powers are visible to spectators only; the move reveals the influence to players.

Both games offer CHEER: spend four energy to restore eight, capped at 60, with a ten-second personal cooldown. Everyone shares the same pool. Eligibility, cost, effects, cooldowns and outcomes are server-authoritative. Rejected reducers commit nothing; UI shows the rejection. Energy regeneration is inherited discrete scheduling, not a game tick.

Completed results show scores, crowd contribution and a shareable saved memory. Play again creates a new match; spectator invitations belong to the specific match. The public screen route projects the same state without player controls.

## Validation boundaries

106 deterministic tests, real three-client new-game checks, full Book Cricket match regression and four-client Pen Fight agent/crowd regression passed. Desktop and 390px spectator screens were inspected. Gilli is a stylized 2D timing game, not a 3D physics simulation. High-latency feel and broader device testing remain useful before merging. Preview email/magic-link configuration is separate from production.
