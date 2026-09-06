# Mela games lab

Live app: https://mela-web-production.up.railway.app
Released on main in `1225e74` after Sreenath approved integration. Maincloud/Railway verification is recorded in STATUS.md. The older isolated lab is no longer the latest release target.

## Dots & Boxes

Choose Dots & Boxes. Tap a faint horizontal or vertical line between adjacent dots. Completing the fourth side claims that square and gives another move. Nine squares, most squares wins. MelaBot plays automatically and uses the same resolver.

Invite another phone with the match QR or Copy crowd link. Spectators choose a side then CHAIN BREAK: their next capture still owns its boxes, but loses the extra move. It costs 16 shared energy, rests 22 seconds, expires in 25 seconds if not consumed. A second pending effect cannot stack on the target.

## Gilli Danda

Choose your swing: Gentle gives forgiving contact, Clean balances reach, Thunder gives more distance but needs precision. Tap LIFT THE GILLI, then STRIKE when the marker reaches gold. The server measures elapsed time, computes distance, alternates MelaBot turns, and saves the result after five attempts per side. Not striking before landing scores zero.

Spectators choose a side. RHYTHM adds eight paces to the next strike; HECKLE removes eight, never below zero. Both cost 12, rest 22 seconds and expire after 25 seconds. They cannot stack on a target. An unattended missed lift still scores zero. Pending powers are visible to spectators only; the move reveals the influence to players.

Both games offer CHEER: spend four energy to restore eight, capped at 60, with a ten-second personal cooldown. Everyone shares the same pool. Eligibility, cost, effects, cooldowns and outcomes are server-authoritative. Rejected reducers commit nothing; UI shows the rejection. Energy regeneration is inherited discrete scheduling, not a game tick.

Completed results show scores, your own player/crowd journey and a shareable saved memory. The player can choose **Rematch · invite this crowd**. The server creates at most one official rematch. Everyone watching the completed match receives a **Follow the rematch** link, without another QR or automatic enrolment. Spectators may instead choose **Your turn to play**. Old memory links retain the original result; new match energy/effects start fresh. The public screen route projects the same state without player controls and can open the next stage.

Gilli calibrates its display with three read-only server-clock samples when connecting or returning to the foreground. A wrong device date no longer shifts the contact window. This is an approximate display clock: contact and scoring are still measured and validated exclusively on the server, and a slow connection can still affect play. Stronger swings show a narrower gold window. Dots supports Tab/Enter, visible focus and a highlighted last line.

## Validation boundaries

108 deterministic tests, real three-client new-game/rematch/clock checks, full Book Cricket match regression and four-client Pen Fight agent/crowd regression passed. Desktop and 390px spectator screens were inspected, including a wrong-device-clock Gilli completion and spectator rematch navigation. Gilli is a stylized 2D timing game, not a 3D physics simulation. High-latency feel and broader device testing remain useful. Preview email/magic-link configuration is separate from production.
