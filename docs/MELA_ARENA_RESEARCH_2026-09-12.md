# Mela arena research and product proposal

Date: 12 September 2026. Status: research and recommendations, not an approved implementation specification. Existing games are outside this proposal's change scope. No competitor hands-on playtest, new Mela game, user validation or deployment was performed for this research.

## Recommendation

Build a new Mela experience around an expressive character that a person can control, teach, challenge and share. Start with one visually legible 3D competition; make agent instruction, crowd intervention and a replayable outcome part of its core loop. Expand with creator challenges after that loop proves enjoyable.

Working game name: **Crown Run**. Working product grouping: **Mela Arena**. These are provisional names, not trademark-clearance claims or mandatory homepage slogans.

The opportunity is the combination of accessible authorship, visible tactical consequences, fair competition, a consequential audience and lasting character history. Each ingredient has precedents. This research does not establish worldwide uniqueness or predict a competition placement.

## What existing products actually show

| Reference | Verified observation | Design inference for Mela |
| --- | --- | --- |
| [Gladiabots](https://presskit.gladiabots.com/) | Players construct robot behavior, watch battles and revise their strategy. The developer describes asynchronous multiplayer and tournaments. | Teaching and revising an agent can be the game itself. Mela must make this easier to understand than a programming editor. |
| [Robocode](https://robocode.sourceforge.io/docs/ReadMe.html) | Players program robots that fight visibly under shared game rules. | Agent combat has a long history; using a prompt alone is insufficient differentiation. |
| [Screeps](https://store.screeps.com/) | Scripted units act autonomously; World is persistent and Arena supports asynchronous PvP. | A persistent agent and an offline challenge can create continuity without requiring both owners online. |
| [AgentArena](https://agentarena.io/) | Its website advertises prompt-customized agents and free/prize-based competition tied to wallets. | Prompt personalization is already marketed elsewhere. This is a website claim, not verified operational performance or adoption. |
| [Jackbox joining](https://www.jackboxgames.com/how-to-play) and [Tee K.O. 2](https://www.jackboxgames.com/games/tee-k-o-2) | Phones join through a room code. Tee K.O. combines player-created artifacts and audience decisions. | Make a phone useful immediately and give people an artifact worth keeping. Mela can apply audience agency to physical objectives rather than judging popularity. |
| [Twitch Plays Pokemon](https://blog.twitch.tv/en/2014/03/01/tpp-victory-the-thundershock-heard-around-the-world-3128a5b1cdf5/) | Twitch reported over 1.16 million command participants and nine million onlookers, with community-created stories and media. | Shared consequences can generate stories. Those historical figures are not expected Mela traffic or evidence that copying the mechanic will spread. |
| [Quick, Draw!](https://blog.google/innovation-and-ai/products/quick-draw-one-billion-drawings-around-world/) | Google reported one billion drawings by December 2017. The interaction was drawing while a model guessed. | An immediately understandable human–AI interaction can travel across languages. Long prompt forms are not necessary for expression. |
| [Infinite Craft](https://neal.fun/infinite-craft/) and [What Beats Rock](https://www.whatbeatsrock.com/) | The browser experiences center on combining items or supplying the next answer; What Beats Rock also exposes community game creation. | One simple action plus a surprising personal result offers a better entry than a catalogue of complex setup options. |
| [SIMA 2](https://deepmind.google/blog/sima-2-an-agent-that-plays-reasons-and-learns-with-you-in-virtual-3d-worlds/) | DeepMind reports research on agents acting in 3D games, including generated environments. | Generic “AI in 3D” is already a competitive area. Mela should demonstrate a specific enjoyable social activity. This research is not an off-the-shelf dependency recommendation. |

These are selected global precedents, not an exhaustive competitor census. Primary product pages describe mechanics, not independently measured retention or causality.

## Crown Run: concrete game proposal

Two expressive toy characters compete to steal a central crown and carry it through a changing arena to their own vault. Returning the crown scores; first to two deliveries wins, with a fixed round cap and an explicit draw when still tied. Grabbing the crown alone does not score. Carrying it restricts mobility, creating a meaningful choice between grabbing early, clearing a route, guarding and intercepting.

The initial arena has three routes, one bridge, a visible launch pad and a risky shortcut. It should look like a small hand-built festival stage: painted wood, cloth banners, brass details and expressive original characters. Indian identity can come through materials and sound while the objective remains readable without cultural background. Avoid a large explorable lobby.

Each beat has a planning window and simultaneous resolution. People choose a destination and a legal action; an agent submits the same intent. Actions include move, dash, guard, shove and interact. Cooldowns and carrying restrictions prevent a single action dominating. Both sides commit before either intent becomes visible. SpacetimeDB resolves one bounded transition and clients animate its committed motion. This is a deliberate planning game, not an assertion that frame-by-frame physical combat is implemented without simulation.

Target match length is 60–120 seconds, subject to measured agent latency. If live model decisions make that target fail, revise the cadence or scope before release. Do not conceal waiting behind unrelated animation.

### Entry and authorship

The first screen offers Play, Teach a character and Watch an available match, with a playable example and no form before entry. A starter character is immediately usable. Custom instruction is optional:

> Wait near the bridge. Let the rival grab the crown, then intercept on the way home.

Astra interprets that instruction against the game's finite legal actions. The player sees a short editable interpretation: “Guard bridge; intercept carrier; retreat with crown.” This communicates what the game understood. “Fly forever” or “never lose” cannot create a new power or bypass the rule budget.

After losing, the owner can change one instruction and run a rematch. The game records character version, instruction change and actual outcomes. Improvement means a demonstrated policy change; it must not be described as model training or permanent model learning.

### Audience role

Spectators can save and spend a shared room resource to rotate a bridge, activate a spring pad or place a short-lived barrier on eligible cells. Exact prices and cooldowns require playtesting. The core constraints are fixed: capped effect strength, no direct winner selection, no stacking that permanently disables a player, and no increase in effect strength simply because one creator brought more viewers.

Players know the set of possible crowd effects. A spectator's pending selection stays private until the resolution boundary. It is revealed and attributed when it affects the world. The next decision observes the resulting arena. A crowd member needs a clear confirmation and cooldown, and their intervention must be visible in the result story.

Competitive ratings should initially exclude crowd-enabled exhibition matches. A controlled leaderboard can later use fixed scenarios and standardized crowd scripts; open audience conditions are not a fair model benchmark.

### Emotional continuity

Keep the same named character, silhouette and behavior across matches. Remember actual rivalries, one pivotal moment and the owner's successive strategies. A saved story might say “Mango escaped with the crown after Nila opened the bridge,” only when those actions occurred. Public strategy remixing is opt-in and credits the original author. Persistence comes from attachment to what someone made and learned, not guilt prompts or fabricated relationships.

## Other new concepts considered

| Concept | Human and agent gameplay | Crowd participation | Recommendation |
| --- | --- | --- | --- |
| Crown Run | Compete for a moving objective; bluff, intercept and escape. | Change legal arena elements at discrete decision boundaries. | Flagship: best proposed balance of visual readability, author expression and shared consequences. |
| Bridge Breakers | A creator arranges obstacles; humans or instructed agents attempt the same compact course. | Trigger bounded course mechanisms in party mode. | Second release: strong challenge-link and remix potential; score fixed-course solo trials separately. |
| Mela Heist | A human and an agent coordinate switches, distractions and carrying treasure through a small room. | Operate lights, doors and limited rescue mechanisms. | Later expansion: makes agent cooperation visible, but adds coordination and level-design work. |
| Prompt creature brawler | Describe a fighter and watch a duel. | Arena effects. | Lower priority: crowded concept, difficult balance and high expectations for arbitrary abilities. |
| Social deduction with agents | Humans infer intentions and agents bluff within a game. | Give constrained clues. | Lower priority for this launch: reading, moderation and pacing can dominate the visual experience. |

Bridge Breakers creator prompt example: “Three islands, two bridges and a risky shortcut.” Translate it into approved components, then validate start/goal reachability, budgets, boundaries and legal placement. Preview and author approval precede publishing. Unsupported requests need clear limits. Generating and executing arbitrary game code is not part of this proposal.

## Agent execution and a sustainable free experience

Two distinct execution types may coexist, but must be named honestly:

- **Astra live:** a hosted provider receives the latest permitted observation and proposes a legal action at each decision boundary. Its identity has ordinary seat permissions. Revisions, deadlines and duplicate protection are enforced by reducers. Model, latency, failures and actual calls are recorded privately for verification.
- **Astra-created strategy:** Astra converts an instruction into a validated bounded policy that executes without a fresh model call on every beat. This can make replay and practice inexpensive, but it must never be labeled a fresh live Astra decision.

External developer agents can later connect through the existing ordinary-client approach with scoped seat credentials. Keys stay on their own servers. Character prompts, other agents' text and audience submissions are untrusted input; none can grant table access, tools, permissions or arbitrary code execution.

Keep ordinary play, practice, spectators and shared replays free. Sponsor a measured amount of hosted live Astra capacity. A two-agent game with eight decisions per side needs up to 16 decision calls before retries and setup; spectators should add no model calls. Ten thousand such matches would be up to 160,000 calls. Price the actual token usage and latency before promising unlimited live play.

Use a per-match call budget, global daily spend ceiling, bounded retries, concurrency admission and explicit queued/unavailable states. A missed model turn can use a disclosed legal fallback, retained in history. This is not evidence that Astra acted. Do not require an API key or a payment card before an ordinary visitor can play.

No new conventional authoritative game backend is proposed. SpacetimeDB continues to own scores, seats, rules, schedules and history. A provider adapter may perform external inference and submit proposals through the approved mutation boundary. Exact hosting and API details need an implementation design after choosing the game.

## Sharing and distribution

The share artifact should contain a real playable challenge: character version, compatible rules version, arena configuration and a committed replay. It should work even when the original creator is offline. Clearly label live rooms, saved replays and matches against a saved strategy. Never imply that an offline human is currently playing.

Two useful flows:

1. Instruction → match → short replay showing an unexpected consequence → “Challenge this character” → recipient plays → rematch or optional remix.
2. Course prompt → validated course → creator completion → share link → friend attempts → same-scenario score comparison → optional remix with attribution.

Export a portrait clip that shows the instruction, relevant move, crowd intervention and outcome with captions. For a fresh attempt, reuse the scenario rather than promising an identical live-model decision sequence. A saved replay is deterministic committed evidence; a new live run can differ.

For initial distribution, use a small set of recognizable matchups: cautious versus reckless, shortcut-seeker versus defender, human versus a publicly challengable champion. Invite a few creators to make their own character and host a match where their audience can join by phone. These are proposed experiments, not assured acquisition channels. Do not buy votes, fabricate concurrent rooms or turn the product into a generic social feed.

## Visual and usability acceptance targets

- A first-time visitor can identify the crown, their character and the destination without reading a paragraph.
- A guest can make the first meaningful action within 20 seconds on the tested device/network. This is a target, not a current result.
- One wide desktop stage; on phones, a tall composition with a stable camera and reachable controls. Layouts should be composed independently rather than shrinking the desktop UI.
- Strong silhouettes, directional shadows, readable bridges and impact feedback. The camera shows playable space throughout input; optional close-ups occur in replays.
- Sound is unlocked by a user gesture, has a visible mute control, and supplements rather than replaces action feedback.
- Validate representative physical phones as well as browser emulation. Measure frame pacing, load time, input responsiveness, agent waiting and resolution accuracy.
- In a first round with 10 independent testers, aim for eight who can explain how they won/lost and make a second attempt without being prompted. Use observations as design evidence, not a statistical claim of product-market fit.

## Competition facts and launch strategy

The [official announcement](https://www.producthunt.com/p/producthunt/product-hunt-teams-up-with-openaidevs-for-the-gpt-6-astra-challenge) asks people to build with Astra and launch on 18 September. The [contest page](https://www.producthunt.com/contests/gpt-6-astra-challenge) advertises five winners, a year of ChatGPT Pro, $10K API credits and OpenAI promotion. The linked Notion guide could not be retrieved in this research. Exact eligibility, prior-product rules, cutoff/time zone and scoring rubric remain unverified. The announcement does not establish that a runtime Astra API integration is mandatory. Earlier advice that claimed it was mandatory is corrected here.

Recommended launch demonstration: type a new character instruction, play a match against it, let another person alter the arena, show the actual deciding move, revise the instruction and share the challenge. This demonstrates authorship, adaptation, multiplayer correctness and a usable product. It is a proposed competitive story, not a verified judging rubric.

Provisional sequence for the six-day window, not a delivery guarantee:

1. Prototype one arena with human and deterministic opponents. Test whether the core objective and actions are fun and understandable.
2. Add bounded instruction interpretation and test whether materially different strategies produce visible differences.
3. Add live Astra decisions with measured latency/cost and ordinary seat validation.
4. Add one crowd mechanism, real two-client tests and durable replay evidence.
5. Polish physical-phone input, presentation, rematch, share flow and creator introduction.
6. Run regression/release checks, finish the verified demo and launch materials. Broaden scope only after those gates pass.

Do not attempt Crown Run, course generation, co-op heists, arbitrary creatures and a persistent open world simultaneously. The larger product vision is extensible; the contest experience needs one complete, convincing loop.

## Metrics and remaining decisions

Track first meaningful action, match completion, second-match starts, successful instruction changes, spectator activation, challenge links opened, recipients who play, next-day return, model latency and cost per completed game. Separate human participants, connected spectators, registered agents and saved replays. Plays are not people, and raw room membership is not live attention.

The product thesis still needs approval: Crown Run as the new flagship, teaching/authoring as a first-class play mode, bounded creator content, and a hosted inference budget. Technical unknowns include measured Astra availability/latency, balanced rules, target devices, actual competitor hands-on experience and the complete contest rules. No implementation changes are authorized by this report itself.

When adopting the purchased domain, include guest credential continuity, saved-identity redirects, email links, CORS and the origin-scoped WebMCP token in migration testing. The Railway token does not automatically cover a new origin. The hosting service can remain on Railway.
