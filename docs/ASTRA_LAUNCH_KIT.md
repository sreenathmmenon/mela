# Mela — an honest launch kit

Prepared 13 September 2026. Product link: https://mela-web-production.up.railway.app/. Replace it only after a custom domain and its identity/agent integrations are verified. Research and source qualifications: [winner research](ASTRA_CHALLENGE_WINNER_RESEARCH.md).

## The product in one sentence

Make a little character, give it a strategy, and play in a world your friends can change.

## Product Hunt draft

**Name:** Mela

**Tagline:** Your characters play. Your friends change the game.

**Description:** Design a fox, owl or robot with Astra, then challenge it or watch two characters play. Friends join the crowd and change the crossing before the next reveal. Three small 3D arenas, saved replays and remixable characters. Guest play starts without signup.

**Maker comment:**

I wanted to make something where watching is part of playing.

In Mela, you can make a little character, decide how it behaves and send it into a match. A friend can join from the crowd link and change the crossing while the moves are still hidden. You both see what happened when the turn resolves.

Astra can turn a character idea into editable tactics. You can also switch on live Astra decisions. Those are two different things: normal characters run instantly without model calls, while live decisions have a limited hosted budget and an openly labeled fallback. The game server checks every action either way.

There are three new arenas: a race, a crown-stealing match and a cooperative treasure heist. Matches keep their characters and replay, so you can share what happened or remix a character and try again. The original Pen Fight and cricket games are still here too.

I'd love you to try one match. Was it obvious what to do? Did changing a character actually feel different? And was being in the crowd fun enough that you'd invite someone else?

## A 75-second real demo

Use two independent browser profiles: host and spectator. Start with an empty private test world when recording a development demo; do not present QA sessions as real audience traction. Use the public deployed world for a production demonstration and disclose your own test participation. Hide operator tools, keys, personal email and unrelated tabs.

1. **0–12 seconds:** Homepage. Show both character portraits, edit Moon Owl's route or pace, then briefly show the optional Astra prompt. If using a recorded real model response, label the elapsed wait honestly; never replace it with a fake response.
2. **12–22 seconds:** Choose Bridge Breakers and "I play Amber". Start without an account form. Show the real 3D board and the human move controls.
3. **22–38 seconds:** Open the crowd link in the second profile. Join without signup. Choose Spring charge. Show the spectator's accepted choice and shared energy; the player does not see that choice until reveal.
4. **38–48 seconds:** Human moves. Show the committed named crowd event and both clients updating to the same position. Explain one sentence only: "The crowd changed that move."
5. **48–63 seconds:** Finish the short race. Show the saved result, scrub the replay, download the actual postcard and click Remix this character.
6. **63–75 seconds:** Brief separate live-agent clip: select Live Astra decisions and watch two characters. Show the notebook's actual External agent sources. If a move falls back, say so. Finish on the product URL.

Do not imply all sequences occurred in one match when edited from different matches. Normal deterministic duels take about 2.5 seconds per turn; live calls can take longer. Avoid a video consisting only of configuration forms, code or a long waiting spinner.

## What makes this demonstration defensible

- Character tactics affect actual legal decisions, not just biographies.
- External Astra proposes actions; the same authoritative game rules validate them.
- Three independent clients were tested, including conflicting crowd purchases and hidden pending actions.
- Saved results and replays reconstruct from database state, not an invented animation.
- Free deterministic play remains usable when hosted inference is unavailable.

These are verified product claims. "World's best," guaranteed first place, viral growth, investment interest and competitor superiority are not verified claims.

## Release and launch checklist

- Confirm the full current contest guide, eligibility, cutoff timezone and entry requirements directly. The retrieved announcement names September 18, but it does not settle every rule.
- Let five independent newcomers try the first match without coaching. Record where they hesitate and what they do, not an inflated satisfaction score. Ask at least two people to try the spectator flow on real phones.
- Inspect existing operator metrics separately from QA fixtures. Measure meaningful match starts/completions, crowd participation, replay visits and repeat play only where the current instrumentation actually supports them. Do not invent unimplemented remix attribution or organic-user counts.
- Record live inference latency/fallback use and keep the hosted quota bounded. Free entry does not mean unlimited model spending.
- If adding a domain, verify Railway routing/TLS, allowed origin, SpacetimeAuth callback/logout URLs, current-domain QR/replay links and a matching Chrome WebMCP origin-trial token. Guest identity is origin-local; offer verified optional saving before changing origins. Do not promise anonymous profiles magically follow to another domain.
- Keep a stable release and honest rollback plan during launch. Do not rewrite Pen Fight/cricket or switch databases on submission day.

## Short invitation to test

I made a small game world where your friends can change the match while you're playing. You can also design a character and watch it try to win. No signup needed. Try one round and tell me where it feels confusing—or whether you'd actually send it to a friend: https://mela-web-production.up.railway.app/

Ask for feedback, not votes. Follow each community's self-promotion rules; do not mass-post, buy votes or manufacture audience activity.
