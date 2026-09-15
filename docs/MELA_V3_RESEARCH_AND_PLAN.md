# Mela v3 — a playground worth playing, watching and returning to

Research date: **15 September 2026**. Sreenath subsequently approved implementation and supplied the full research export. **Implementation is underway; the whole multi-week v3 program is not complete.** See `MELA_V3_RELEASE_1.md` and `STATUS.md` for the bounded implemented release and actual verification.

## 1. Recommendation

Build Mela around **small, spectacular games that humans, agents and the crowd can shape together**. Make an actual match the front door, a memorable decision the sharing object, and another playable challenge the destination.

The ambition is not a prettier catalogue or a larger collection of generated prototypes. It is a coherent place where someone can play immediately, bring a friend, coach a character, influence a match, and recognize their contribution afterward. Existing games stay available. The next two additions earn their place by offering genuinely different play.

Our best proposed distinguishing loop is:

**See an interesting match → play or influence → understand the decisive moment → share that moment → the recipient tries it or challenges the participants.**

Mela already has pieces of this. V3 must connect and deepen them, not announce the same pieces again. A persistent agent identity, playable replay challenges, a shared multi-game session and strongly differentiated game worlds are substantive extensions. Another character form or font replacement is not.

Winning an award is an ambition, not an acceptance test we control. Product quality, successful first play, understandable crowd influence, reliable agent participation and voluntary return are controllable targets. This plan makes no prediction of first place, virality, investment or acquisition.

## 2. What was actually researched

### Evidence labels

- **Observed:** inspected in a running browser or current repository during this research.
- **Sourced:** stated in a linked primary source; not independently performance-tested.
- **Recommendation:** a design or implementation proposal for Mela.
- **Unknown:** not established by the accessible report, inspection or source.

### Your report

The initial ChatGPT conversation **Find Astra Game Posts** exposed only the first 20,000 characters. Sreenath then supplied `/Users/sreenath/Downloads/astra_games_research.html`. All **169 records** and the metadata in its embedded data index were read without executing the HTML's scripts. The full export contains **126 project/demo lead records, 163 distinct recovered URLs and 31 records with a demo URL**. Categories: 104 Projects, 6 Scenes/toys, 16 Unconfirmed, 22 Threads/videos, 3 Product Hunt, 11 Discovery hubs and 7 Excluded/context. These are research inventory counts, not independently verified distinct finished competitors.

Full-index reconciliation preserves the original recommendation. Mixed-model examples such as Mintfall and Sunlandia cannot establish isolated Astra capability. Local same-screen play such as Toy2Game does not establish online multiplayer. Product Hunt/collection entries do not independently verify each listed game's operation, and clone/IP leads are not evidence of reusable asset rights. Game-playing/optimization agents are a different category from agent-created games. All records were read; only the representative live experiences below were opened or played. No exhaustive comparative playtest, popularity ranking or model-provenance audit is claimed.

The report itself distinguishes creator-attributed Astra use, inaccessible social posts, duplicate leads, interactive scenes and finished games. Preserve those distinctions. Viral views do not establish repeat play, revenue, fair multiplayer, mobile reliability or model attribution.

### Work completed in the initial research-only pass

- Read Mela's engineering instructions, current status and preceding product/challenge research; inspected targeted frontend, arena rules, character, audio, metrics and agent-worker code. Did not repeat a generic full-code audit.
- Inspected production Play, Watch, Agents/character setup and a finished Bridge Breakers replay. Viewed desktop and a browser-emulated **390 × 844** mobile layout; verified the mobile viewport rather than relying on a resized window.
- Opened seven external experiences: Mosswing, Vesper/DreamLoop, Stick Fighter, Tidal Rush, Jelly Baby, Settlecoast and Mela itself. Started limited Mosswing, Stick Fighter practice and Tidal Rush interactions. These were exploratory sessions, not complete competitive playtests.
- Read original game-development writeups/repositories, official Product Hunt material, agent-design references and motivation/spectator research linked below.
- Did **not** create production Mela matches, identities, emails or paid inference requests; did not change application code, publish a database or deploy a release. No fresh full-game regression or human usability study is claimed.

## 3. Competitive lessons — what to surpass, not copy

| Reference and evidence                                                                                                                                                                                                | What is worth learning                                                                               | Mela implication                                                                                                                                | Limit of evidence                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Mosswing](https://mosswing-quiet-flight.jack-514.chatgpt.site/), browser start/retry; [creator repository](https://github.com/Ayi1337/gpt6-astra-one-shot-games)                                                     | One coherent miniature world, expressive subject, obvious first action, fast retry.                  | A game should be attractive and understandable before its help text is read. Give each flagship a recognizable silhouette and material palette. | Limited flight interaction; no retention or device certification. Do not copy its large serif typography into Mela.                                                        |
| [Tidal Rush](https://tidal-rush-paradise-gp.skirano.chatgpt.site/), browser start/countdown                                                                                                                           | Course fantasy, spectacle and race status reinforce the same activity.                               | Show the game doing something, then let the visitor join that activity. The scoreboard and camera must support the action.                      | Race started; no completed race or network play verified.                                                                                                                  |
| [Vesper / DreamLoop](https://github.com/achimala/dream-loop), source and running scene                                                                                                                                | Strong lighting, authored composition and iterative visual criticism create identity.                | Use art direction and authored focal assets, not more random props or bigger bloom.                                                             | The original brief explicitly excluded gameplay. This is a visual benchmark, not evidence of a complete game or retention loop.                                            |
| [Stick Fighter](https://stick-fighter-production.up.railway.app/), practice entry                                                                                                                                     | A distinctive visual language can be simple. Practice, friends and online modes have clear purposes. | Don't equate premium with photorealism. Deliver a playable first action before account/configuration screens.                                   | Practice opened; defeat occurred while unattended. No successful combat or online-match test is claimed.                                                                   |
| [Settlecoast](https://settlecoast.com/), live setup                                                                                                                                                                   | A recognizable 3D board, explicit goal and grouped modes make a complex game legible.                | Show the objective and playable seats clearly; explain one meaningful choice at a time.                                                         | Sign-in was required in observed setup, including free AI/pass-and-play. No account or game was created. Mela should retain guest-first entry.                             |
| [Jelly Baby](https://github.com/scottstts/Jelly-Baby), creator source; live loading                                                                                                                                   | Tactile response and affection can be the product, without a dense score/economy.                    | Pens, strikers and characters should feel pleasant to touch before progression is added.                                                        | Live page stayed at “Starting WebGPU” in this environment; functioning interactions were not verified. Not proof it fails for everyone. Repository licensing also matters. |
| [Void Explorer](https://developers.openai.com/showcase/void-explorer), [Sunwake](https://developers.openai.com/showcase/sunwake), [Hollowflux](https://developers.openai.com/showcase/hollowflux), official showcases | Movement, environment and interacting systems support a coherent fantasy.                            | Make visible surfaces and effects agree with collision and rules. Atmosphere must reinforce decisions.                                          | Primary case studies, not independently reproduced scale/performance claims.                                                                                               |
| [Playco's Astra prototyping account](https://openai.com/index/playco-game-prototyping-with-astra/)                                                                                                                    | Compare playable art/theme variants before committing production effort.                             | Prototype two art treatments against the same tested interaction, then select with player observation.                                          | Studio-reported development results are not Mela outcome forecasts.                                                                                                        |

OpenAI's [game-building methodology](https://developers.openai.com/blog/how-to-build-games-with-astra) supports an experience-first sequence: concrete references, visual direction, implementation, then repeated play and visual checks. Its examples also connect presentation to the underlying simulation. The lesson for Mela is to validate **what the player sees and expects**, not merely whether the build passes. It does not imply that a renderer rewrite or a larger generated world automatically improves a game.

### The rest of the landscape

The accessible report also contains physics toys, arcade shooters, puzzles, movement experiments, strategy games, scene demos and recognizable-game recreations. Leads include MelonLab, Arcane Orb Workshop, Blackwater, Cinderfall, Vector Dive, Harbor Skirmish, Thunderfall, Astral War, ASCII District and Magic Carpet Wizard. They remain leads where not independently inspected. The [MartinDelophy collection](https://github.com/MartinDelophy/awesome-gpt-6-astra) and [magiccreator-ai collection](https://github.com/magiccreator-ai/awesome-gpt-6-astra) are discovery aids, not quality rankings or audited model provenance.

For enduring product patterns, compare [Poki](https://poki.com/) for immediate browser play, [Jackbox](https://www.jackboxgames.com/blog/how-audience-play-along-differs-in-each-jackbox-game) for game-specific audience roles, [GLADIABOTS](https://gladiabots.com/) for observing and improving an agent's behavior, and [Lichess](https://lichess.org/features) for useful analysis and return activities. These references suggest patterns; they do not prove Mela can inherit their audiences.

**Conclusion:** Mela should exceed a single demo in continuity and participation, and exceed a broad portal in how closely playing, agents, spectators and memories fit together. Trying to exceed every portal's game count immediately would undermine that distinction.

## 4. Mela now: strengths and specific gaps

### Preserve the working foundation

The current product has ten discoverable games, guest-first entry, spectator influence, durable results, three character arenas, selected independently owned multiplayer seats, and native realtime authority. Five games expose individually implemented independent-seat modes: Pen Fight, Four in a Row, Crown Run, Bridge Breakers and Mela Heist. That is not all ten games and not four-player support.

The last recorded release verification reports 176 passing tests and deployed source `6bc76df182c8f9a95be81f18853ba4b55bebf4b0`; the current checkout includes documentation follow-up `55a75cf`. Those are previous release results, not tests rerun for this research.

### Gaps supported by this inspection

| Area                           | Current evidence                                                                                                                         | V3 correction                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| First impression               | Play mainly presents illustrated game cards. The unusual crowd/agent experience is elsewhere.                                            | A compact real gameplay/replay focal point with immediate Play/Watch actions, while retaining direct access to all games.           |
| Discovery during quiet periods | Watch had no active matches at inspection and correctly showed completed memories. Repeated match pairs and routine summaries dominated. | Deliberately select useful completed moments, label them Replay, and offer a relevant next action. Never manufacture live activity. |
| Game identity                  | Crown, Bridge and Heist share a substantial board/character presentation system.                                                         | Distinct worlds, readable objectives and characteristic actions, while reusing authority/infrastructure.                            |
| Game-specific copy             | The inspected Bridge replay described a character chasing a crown. Winner information appeared repeatedly before the full story.         | Generate tactic descriptions for the actual game; one result heading, one meaningful moment, one next action.                       |
| Agent onboarding               | Connection/setup and character options compete with getting into a match.                                                                | Immediate ready-to-play examples; optional coaching; external connection as a separate advanced path.                               |
| Character depth                | Current saved traits are bounded pace/route/caution/look, not an evolving general agent.                                                 | Versioned, testable game-specific strategies and durable identity, with honest execution labels.                                    |
| Sharing                        | Arena replays and a square PNG postcard exist.                                                                                           | A concise causal highlight, vertical clip where supported, and a recipient page that can launch a relevant challenge.               |
| Sound                          | The inspected shared sound module has six synthesized cues.                                                                              | A deliberate material/event sound vocabulary, dynamics and spectator mix. Do not claim all existing audio is absent.                |
| Operating scale                | Hosted live inference has process-local limits; external MCP sessions are process-local.                                                 | Durable spend reservations and revocable persistent agent credentials before public always-on leagues.                              |
| Measurement                    | Existing server counters and optional route analytics are present.                                                                       | Add consent-aware journey/quality measurement and meaningful denominators, not another raw dashboard.                               |

These observations do not establish that every game is broken, that the deployed font is stale, or that real users dislike every surface. The production homepage already uses the newer visual baseline. Preserve Outfit/DM Sans and fix hierarchy through composition, spacing and content before another font migration.

## 5. The v3 product experience

### A. A first visit delivers play, not a form

Keep **Play / Watch / Agents / Your Mela**. The first screen has one active visual focal point showing actual gameplay and compact game choices. Avoid a full-screen marketing hero, automatic sound, a compulsory 3D lobby walk or a character-creation wizard.

Recommended first-visit sequence:

1. Tap a game: enter its playable guest mode with a generated editable nickname.
2. See the goal through the board and one short contextual cue.
3. Take a low-risk first action; explain the next rule only when relevant.
4. After a meaningful moment, offer a friend invitation or crowd link without blocking play.
5. After the result, offer a rematch, replay or optional verified saving.

Do not ask whether a person is “a player, spectator or agent builder” before they know what those roles offer. A friend-seat invitation takes them to the correct seat; a crowd link takes them to the audience; an agent capability is never hidden inside the public crowd URL.

### B. One Mela session can contain several games

Propose **Mela Circuit**: an optional, short sequence of three individually supported games that keeps the same people and crowd together. One room, one invitation, clear seat handoffs, explicit next-game consent. Standalone play remains one tap.

This is session continuity, not a speculative generic engine. A series can count match wins under disclosed rules; it must not sum cricket runs, crowd influence and unrelated skill scores into a universal rating. Cooperative rounds need separately stated completion goals, not a hidden conversion into competitive points.

V3 first supports two playing seats plus spectators. Four-player Heist or larger events require their own rules, seat model and tests. Do not label existing two-seat rooms as multi-party matches merely because many people can watch.

### C. A replay becomes an invitation to act

Propose **Try this moment** on eligible completed matches:

- Start from a public, versioned checkpoint of a completed match.
- Let the visitor try one alternative move or select their character's approach.
- Run a new, explicitly unranked challenge through authoritative rules.
- Show the original committed result and the new result separately.
- Offer to challenge a friend or create a fresh full match afterward.

This is not editing history or secretly taking over a live player's seat. Do not expose hidden original plans/seeds. A counterfactual branch needs a declared opponent policy and fresh randomness where required, so it is not misrepresented as what would certainly have happened against the original human.

This capability makes a shared link more useful than a screenshot: the recipient can answer “what would you have done?” with a move.

## 6. Game portfolio: ten preserved, twelve quality-gated

Do not build six more thin games for a number on the homepage. Strengthen the portfolio's range and give its best games unmistakable identities.

| Game            | Its place in Mela                     | Proposed design/presentation focus                                                                                                                                                                                     |
| --------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pen Fight       | Tactile competitive flagship          | Trustworthy contact, accessible direct flicks, legible pen scale, camera-safe aiming, material-rich desk, readable near misses and decisive impacts. Preserve and regression-test the existing authority and geometry. |
| Stick Cricket   | Short sporting spectacle              | One-over rhythm, clear batter/bowler staging, shot/result causality, camera cuts only after input is resolved. If the existing mechanic is choice-based, do not advertise a reflex simulation until rules support it.  |
| Crown Run       | Fast rivalry                          | Rooftop/festival pursuit, unmistakable crown possession, routes visible at a glance, expressive steals and escapes. New vertical scenery cannot conceal logical adjacency.                                             |
| Bridge Breakers | Prediction and brinkmanship           | Suspended mechanical crossings, visibly changing routes and tense simultaneous reveals. Make the bridge itself the recognizable subject, not another generic tiled board.                                              |
| Mela Heist      | Cooperation                           | A clockwork vault with complementary, understandable jobs and a shared escape payoff. Two actors initially; genuinely expanded team play later.                                                                        |
| Four in a Row   | Accessible human/agent strategy       | Clean read, intentional piece sounds, immediate threats, rematch and move analysis; no gratuitous camera motion.                                                                                                       |
| Dots & Boxes    | Quiet tactical competition            | Precise touch targets, satisfying chain closures and restrained feedback; independently test friend seats before exposing them.                                                                                        |
| Gilli Danda     | Timing and Indian playground identity | Understandable timing/trajectory, equivalent sound cues, mobile hand placement and short repeatable rounds.                                                                                                            |
| Last Stick      | Easy entry into mind games            | Immediately understandable legal choices, concise “why this move mattered” after completion, no unnecessary 3D complexity.                                                                                             |
| Book Cricket    | Nostalgia and low-friction play       | Preserve its distinct rules and reliable lightweight flow; don't remove it merely because Stick Cricket exists.                                                                                                        |

### New game 1: Carrom Clash — precision that creates shareable shots

**Recommendation:** a short, explicitly arcade carrom mode, not a claim of full tournament rules. First to a small disclosed pocket target, alternating shots, server-defined fouls and a hard match limit. Prototype the scoring choice before locking it.

Direct touch places the striker within a legal baseline and sets aim/power. The board must predict contact convincingly; moving coins and pockets share exactly the collision geometry the server resolves. Human, MelaBot and external agents submit the same bounded shot action. No agent receives a secret aim assist unavailable under the chosen rules.

The crowd can queue limited, disclosed **next-shot modifiers** in an explicitly crowd-enabled mode—for example a surface-friction preset chosen before the next shot. Do not move pockets or change collision halfway through an otherwise standard shot. Keep a plain practice mode for learning trustworthy mechanics. Costs, symmetry and reveal timing need playtesting before implementation approval.

Two cosmetic Easter eggs: a tiny chalk bird appears outside the playfield during replay of a legal multi-pocket shot; a quiet wooden-knock flourish accompanies a clean finish. Neither changes accuracy, scoring, currency or odds. Respect sound/reduced-motion settings.

**Why:** strong Indian recognition, global comprehension, tactile skill and naturally legible trick-shot clips. **Risk:** precise disc physics, touch and reconciliation make this a substantial game, not a reskin of Pen Fight.

### New game 2: Kite Rivals / Patang — an ownable sky arena

**Recommendation:** a tactical kite duel above a stylized rooftop festival. Read the wind, manage line tension, choose a route and counter an opponent. Use short simultaneous planning/reveal beats at first; don't promise continuous physics/reflex multiplayer from a turn-based implementation.

The player drags a short flight intention and chooses tension with a direct gesture. The server resolves both intentions against public wind and validated crowd effects. A good first prototype must make “why did my line fail?” understandable without equations. Human and agent decisions use the same observation and action contract.

The crowd chooses bounded wind changes for the next reveal, never arbitrary winner selection. Show the gust physically at reveal and explain the resulting route/tension effect. Two kites first; expand only if camera legibility and four-seat rules pass independently.

Two cosmetic Easter eggs: paired kites briefly frame a constellation after a completed cooperative exhibition; a paper bird crosses the distant skyline after a long legal rally. They are scenery, not secret competitive advantages.

**Why:** a different spatial fantasy from desks and boards, strong silhouettes on phones, strategic agent decisions and identifiable Indian character without requiring cultural knowledge. **Risk:** control clarity and wind causality. Prototype before investing in elaborate skyline art.

### Admission rule for either new game

A new title needs a distinct skill, a fun 60–180 second prototype, a meaningful but bounded crowd role, honest agent support, understandable failure and a share-worthy committed moment. If it cannot meet those, keep it experimental and do not pad the public catalogue. Twelve is a proposed quality-gated portfolio, not a promise to ship both before the challenge.

## 7. Agent gaming that is more than a prompt field

### Three entry paths, accurately named

1. **Play:** face the always-available deterministic MelaBot or a supported human/agent seat.
2. **Coach a character:** choose a preset, change a supported tactic, test it, optionally ask Astra to propose a bounded strategy.
3. **Connect my agent:** give an independently operated agent a revocable seat capability and documented tools.

A saved deterministic tactic, a live hosted Astra proposal and a third-party agent are different execution sources. Show the source briefly at setup/result; put per-turn details in the replay. A self-entered model name is not verified provenance. Never describe scripted QA as real model inference.

### Proposed durable agent passport

Store an owner-controlled public character identity, immutable strategy versions, cosmetic appearance, supported game adapters and per-game results. Keep private credentials, recovery links, unpublished prompts and moderation data outside public subscriptions. Raw prompts need not be stored; if optional storage is introduced, disclose it and obtain permission.

An agent's style should be demonstrated by its actions. Show “took the safer route in 4 of 6 eligible choices” only when that statistic is computed from real, defined decisions. Don't imply autonomous learning when the user simply edited a preset.

A coaching loop should compare the old and new strategy against the same published practice suite, include multiple seeds/opponents and hold out evaluation cases. Do not call a lucky single win an improvement. Per-game skill ratings remain separate from participation and crowd identity.

### Execution and safety

- Preserve SpacetimeDB reducers as authority. Every provider returns a proposal, never a direct state mutation.
- Supply public state, the actor's permitted private state, legal choices and a turn/version token. Exclude opponent plans and pending crowd information.
- Validate the version, seat, lifecycle, deadline and legal action at commit. Discard stale/duplicate proposals.
- Use discrete strategic decisions, not LLM calls per animation frame. Generate character flavor outside critical gameplay and never invent causal match facts.
- Persist quota reservations before external calls; reconcile actual usage and retries. Enforce world/session/provider limits and expose truthful availability. Current process-local counters are insufficient for a public multi-worker free offering.
- Add durable, revocable agent delegation with rotation, least privilege and reconnect semantics before persistent leagues. Don't broaden a match token into account access.
- Keep deterministic practice free and playable. Hosted live AI can have clearly stated fair-use capacity; “free game” must not silently mean unlimited paid inference.

[PettingZoo's AEC/parallel distinction](https://pettingzoo.farama.org/) is useful for separating sequential and simultaneous action contracts, not a reason to install a new authority runtime. [Melting Pot](https://proceedings.mlr.press/v139/leibo21a.html) suggests evaluating cooperation and unfamiliar partners as well as wins. Mela is an entertainment product, not a claim to measure general intelligence.

## 8. Spectators are a first-class way to play

The crowd's journey is **arrive → understand stakes → choose an influence → see the reveal → recognize the contribution**. Joining must work from a room list, replay invitation or QR with no account wall.

On a phone, prioritize the match view and one compact power tray. Explain each power by its concrete consequence, cost and availability. Retain server-owned energy, individual cooldowns, capacity and eligibility. Loading is pending acceptance, not an optimistic declaration that a power happened.

For games with hidden crowd planning, spectators can see their allowed pending state; players see effects at committed reveal. Public energy, event timing, tool observations and player UI must not indirectly disclose hidden costs or choices. Animation can celebrate a revealed action, never reveal it early.

Power success has three separate stages: **accepted**, **applied**, and **affected an outcome**. Don't tell a spectator “you won the match” merely because their power was accepted. Credit only facts recorded by resolution. A causal marker can identify a redirected route or consumed shield; stronger counterfactual claims require actual analysis and clear labeling.

Keep game-specific crowd roles. Carrom crowd choices should not behave like Heist coordination merely because both use energy. Add a read-only cinematic audience camera that never changes player aim. On shared big screens, mix communal audio once; phones should avoid echoing every loud cue.

The [audience participation framework](https://arxiv.org/abs/1710.03320) helps distinguish kinds of influence, not prove that more interference improves retention. Test whether players feel the crowd enriches their skill rather than invalidates it. Preserve explicit crowd-enabled versus neutral practice expectations. Rate limits and identity checks reduce abuse, but anonymous sessions do not establish unique humans or solve collusion; public ranked stakes require a stronger policy.

## 9. Art, 3D, typography, interaction and sound

### Art direction

Use a **handcrafted contemporary playground** as the shared identity: satisfying physical materials, distinct character silhouettes, warm light and restrained color accents. Indian origins should appear in games, environments and sound details, not ornamental clutter or caricatures. Instructions remain understandable to someone who has never played these games.

Create one art board per flagship with desktop, phone, input, impact, crowd reveal and result frames. Establish focal object scale, camera safe zones, lighting, material response and prop density before asset production. Compare two playable treatments against the same rules. Commission or generate properly licensed assets; don't copy competitors' game art or disregard repository licenses.

Keep Three.js unless a measured requirement proves a different renderer necessary. Prefer authored hero assets plus instanced secondary props. Preserve actual 3D at several quality levels through shadows, reflections, particles and resolution scaling; do not substitute a flat game just to declare performance solved. Context restoration and unsupported-device honesty still remain necessary—no browser can guarantee unavailable hardware capabilities.

### Input and camera trust

Gameplay silhouettes and collision shapes must align at all selectable angles. Input raycasts and projected aim must agree with the authoritative contact point. Do not change cameras during an unresolved drag. A cinematic camera can follow committed motion, then return to the player's selected aim view. Add a stable overhead option and reduced-motion mode without penalizing competitive visibility.

For tactile games, test deliberate edge hits, grazing contacts, overlapping projections, near misses, low/high power, orientation changes and touch-cancel. Visual polish does not excuse a shot going through a visible object. Client interpolation must remain presentation of committed trajectories, not a second physics authority.

### Typography and layout

Keep Outfit for compact identity/headings and DM Sans for reading/controls. Starting tokens: body/input 16px, supporting text 14px, headings 24–32px, touch controls 44–48px minimum. These are prototype constraints, not blind rules for every score or big-screen view. Scores can be larger because they have a different job.

Use one main action per state. Remove duplicated outcome text, generic “saved forever” sentiment, redundant headings, and irrelevant tactics. Keep safety, privacy and actual rule explanations accessible through contextual disclosure. Do not improve density by making important text tiny. A phone should prioritize the board and the next move, not place them after long setup panels.

### Sound and effects

Build event-driven layers: material contact, movement, impact, anticipation, crowd reveal, result and optional ambience. A pen on wood, a carrom coin and a cricket boundary should not share an arbitrary beep. Match impact strength to authoritative event magnitude; avoid exaggerated cues for insignificant actions.

Keep sound opt-in after browser interaction, remember volume/mute, provide separate motion preferences, cap simultaneous voices and deduplicate cues on reconnect/replay. Avoid looping crowd applause when no people are present. Provide visual equivalents for critical sound and sound equivalents for timing where feasible. Replays need timeline-controlled audio rather than playing every subscribed historical event at once.

Research on [game-feel features](https://arxiv.org/abs/2208.06155) motivates testing combinations of feedback, not adding maximum shake, particles and bass everywhere. The right test is whether people can control and read the game more easily while enjoying it.

## 10. Attachment without manipulation

Aim for **mastery, expression, belonging and remembered events**, not dependence. The [motivation model by Przybylski, Rigby and Ryan](https://selfdeterminationtheory.org/SDT/documents/2010_PrzybylskiRigbyRyan_ROGP.pdf) provides a useful lens through competence, autonomy and relatedness. A [later review](https://arxiv.org/abs/2405.12639) cautions against shallow applications of this theory. Neither is proof that adding badges produces attachment.

| Need                   | Mela design                                                                                            | Evidence to collect                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| “I am getting better”  | Rewatch a move, understand a miss, retry a challenge; compare strategy versions.                       | Can a newcomer explain one improvement and execute it?                     |
| “This is mine”         | Optional nickname, character look, supported tactics and chosen game; no forced persona questionnaire. | Do users voluntarily reuse or refine their character?                      |
| “We did that”          | Shared session continuity, credited crowd moments, cooperative completion and reciprocal rematches.    | Can player and spectator independently identify each other's contribution? |
| “I want another round” | Fast fair rematch, meaningful variation, clear stopping point.                                         | Voluntary rematch/return, not clicks forced by a reward wall.              |

Avoid loss-aversion streaks, fake scarcity, fabricated online counts, loot-box pressure, humiliating loss copy, compulsive notifications and rewards for spamming friends. Saving memories should be useful without making a guest afraid that one wrong click destroys everything; provide truthful device-saving/recovery information at the right moment.

## 11. Sharing and audience growth

Three shareable objects are worth building:

1. **The moment:** a short replay/clip with setup, turning point and result; caption factual crowd involvement and execution source.
2. **The challenge:** open the same completed scenario and try a new move under disclosed practice rules.
3. **The character:** inspect a public strategy version, try it, remix it, or invite it to a supported game.

Provide vertical and landscape framing for the actual game rather than cropping off scores. Clip rendering should reuse committed replay data; support browser export where reliable, and make the replay URL work regardless of export support. Don't add an expensive media-rendering service before measuring demand. Remove private identities/contact data from share payloads and moderate public character names.

Distribution experiments: a human-versus-agent evening with a real crowd; a “can your agent beat this?” challenge for agent developers; concise trick-shot clips; a cooperative Heist session where audience help is visible. These are experiments, not viral guarantees. Share results with denominators and disclose paid promotion if used.

The durable competitive advantage, if earned, is a community of reusable characters, trustworthy games, meaningful spectators and playable memories. It is not the use of Astra by itself. Track whether people return when the novelty of model-generated development has worn off.

## 12. Implementation boundaries and likely work areas

This is an additive evolution of Mela, not a new backend. Preserve one authoritative SpacetimeDB world, ordinary validated reducers, narrow role-aware subscriptions, separate transient events and durable history, and discrete scheduling. No Redis, Socket.IO, separate game-authority API, premature sharding or artificial simulation tick.

| Workstream          | Existing areas to extend                                                                                                         | Proposed new contracts                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Discovery and entry | `src/HomeDiscovery.tsx`, `src/homeDiscovery.css`, `src/productExperience.ts`, `src/App.tsx`                                      | Featured committed moment, supported-mode entry, context-preserving return.                                         |
| Distinct arenas     | `src/ArenaStage.tsx`, `src/ArenaGames.tsx`, `src/arena.css`, `src/arenaDescription.ts`                                           | Per-game presentation/configuration modules; no shared-rule rewrite solely for art.                                 |
| Moments and replay  | `src/arenaPostcard.ts`, existing replay UI, `spacetimedb/src/arenaModule.ts`                                                     | Versioned checkpoint, factual moment marker, separate unranked challenge origin.                                    |
| Agent continuity    | `src/agentTools.ts`, `remote/arena.ts`, `remote/server.ts`, `spacetimedb/src/arenaCharacter.ts`, `spacetimedb/src/arenaSeats.ts` | Private delegation, public passport/version, decision provenance, durable usage reservations.                       |
| Session continuity  | Existing world/seat foundations                                                                                                  | Optional series/session and per-game seat handoff; independent invitation permissions.                              |
| Sound               | `src/sound.ts`, game presentation hooks                                                                                          | Typed cue IDs, material-specific layers, replay/reconnect-safe playback.                                            |
| New games           | New dedicated game-rule/presentation modules                                                                                     | `game_kind`, versioned state, bounded actions and tests for each game; generated bindings only after schema review. |
| Measurement         | `spacetimedb/src/melaMetrics.ts`, `src/analytics.ts`                                                                             | Defined funnel events, test-traffic distinction, privacy-aware cohorts and quality dashboards.                      |

Exact table fields belong in a scoped architecture change after the slice is selected. Do not invent a universal action language that makes all games the same. Reuse proven infrastructure and represent sequential versus simultaneous game contracts explicitly.

Architecture/coordinator ownership covers product, schema, reducers, migrations and cross-agent contracts. Specialists can separately own art/presentation, a specific game's rules, agent adapters, sound, QA or release; no simultaneous edits to the same authority files. Handoffs include assumptions, changed contracts, tests and evidence in Git/docs/STATUS, not hidden conversations. This research did not convene a new expert council or delegate implementation.

## 13. Quality gates: how “excellent” becomes testable

The following are **proposed acceptance targets**, not achieved results.

### Experience

- Observe 12–16 first-time participants across player, spectator and agent-coach journeys in iterative rounds. Include phone users and people unfamiliar with Indian games; do not infer broad population success from this small sample.
- At least 8 of the first 10 relevant novices reach a meaningful action within 30 seconds without help or mandatory identity forms. Investigate every failure, not just the average.
- At least 8 of 10 can explain the objective, whose turn it is, why the result happened and one available next action. For crowd users, also identify their power's actual effect.
- Test first session, second session, same-browser tabs, incognito, verified recovery on another device, expired invitation, disconnect and rematch. Saving is optional; recovery never trusts an unverified email.
- A formative 1–5 design rubric covers input trust, visual coherence, first-action clarity, sound, spectator causality and result/return. A severe input or fairness issue blocks release regardless of the average score. Do not fabricate a 100/100 self-rating as market evidence.

### Technical and performance

- Complete real client → subscription → reducer → committed state → subscription assertions for each exposed mode. Include independent human/agent/crowd sessions, concurrency, illegal moves, duplicate proposals, timeouts and reconnects.
- Preserve Pen Fight and Book Cricket full-match regression gates; cover every other public game before broad release. Unit tests are necessary but do not replace these flows.
- Compare visible contact against authoritative trajectories across cameras and touch devices. Replays remain reconstructible across a release through pinned rule/asset versions or compatible snapshots.
- Measure cold entry on a named representative 4G profile; propose p75 meaningful interaction within 15 seconds, then tighten from measured baseline. Don't load every game's 3D assets on the homepage.
- Adopt field p75 [Core Web Vitals](https://web.dev/articles/vitals) targets: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1. Those don't certify game frame rate.
- Define named physical mid-range Android, iPhone and desktop test devices. Target 60fps on supported higher tiers and a stable 30fps floor on the minimum tier; inspect p95 frame time, memory, thermal behavior and 10-minute sessions. Emulation is not physical-device proof.
- Keyboard/focus/contrast, sound/motion controls, safe-area layout and 320px width checks are required. Any remaining nonvisual gameplay limitations must be disclosed rather than hidden behind a perfect accessibility score.

### Measurement, not vanity totals

Track visitor → game selected → controllable state → first action → completion, segmented by game/mode/device. Separately track crowd join → accepted power → applied effect → completed viewing, and character creation → test → match → remix. Add replay opens, qualified challenge starts, rematches and D1/D7 returning cohorts.

Report denominators and confidence/uncertainty; don't conflate anonymous identities with unique humans or test matches with organic play. Separate per-game skill, Mela participation and crowd influence. Measure fallback frequency, inference cost per completed match, timeout rate and failed joins alongside growth.

A sharing loop can be analyzed as completed players × share rate × qualified recipients per share × recipient-to-play conversion. Measure those terms; do not label a product viral because a few clips got views. No universal retention percentage is invented before a baseline exists.

## 14. Product Hunt and delivery sequence

### Verified challenge context

The [current contest page](https://www.producthunt.com/contests/gpt-6-astra-challenge) announces five winners receiving a year of ChatGPT Pro, $10,000 in API credits and OpenAI promotion. It does not establish a ranked first-through-fifth prize ladder.

The [official launch guide](https://app.notion.com/p/teamhome1431/GPT-6-Astra-Challenge-Product-Hunt-Launch-Guide-3d62e1256c9e80f39bccdd2ab93bb306) was read in the browser on 15 September. It requires scheduling for **18 September 2026** and says launches publish at **12:01 a.m. Pacific**—12:31 p.m. India time on that date. It prioritizes originality, understandable positioning, differentiation and a functioning product. It asks for product visuals, a short demo and honest maker context. This is launch guidance, not a published weighted jury scorecard or a verified submission cutoff.

The verified predecessor is [OpenAI Day using GPT-5.6](https://www.producthunt.com/p/openai/openai-day-winners-are-in), not a confirmed GPT-5.5 contest. Its five named winners were Teable 3.0, CrawlRaven, AskCodi, canitbebuilt and Speakworld. My inference from their product promises is that a tangible end-to-end outcome is more persuasive than a list of AI features; the announcement does not prove what caused the jury's decisions. Daily popularity and a challenge award should not be treated as the same measure.

Check whether Mela has already had a qualifying Product Hunt launch. [Relaunch guidance](https://help.producthunt.com/en/articles/484934-can-i-relaunch-my-product) generally expects six months and a significant change, with review for exceptions. A new domain is not evidence of relaunch eligibility. Confirm any exception with the organizers rather than disguising the existing product.

### Lane A — credible September 18 launch

There are three calendar days from this research date. Do not attempt to build all of v3 in that window.

1. Verify eligibility/scheduled date, deployment health, first-entry/recovery and one complete human–agent–crowd demonstration. Resolve launch blockers first.
2. Make only a bounded, tested presentation slice: real featured gameplay/replay; game-correct tactics; remove duplicate result copy; make existing crowd and replay actions obvious. Keep all old games accessible.
3. Record a truthful 45–60 second demonstration: immediate entry, a real agent decision, independent spectator influence, committed reveal, result and shareable replay. State whether decisions are live Astra, saved tactics or external execution. Include an uncut verification capture separately if practical.
4. Prepare actual desktop/phone screenshots, clear description and maker comment. Do not advertise proposed v3 games, agent passports or playable counterfactuals as shipped.
5. Publish only after production smoke checks and rollback readiness. Answer feedback personally. [Product Hunt sharing rules](https://help.producthunt.com/en/articles/2690626-how-do-i-share-my-post) prohibit vote manipulation; no incentives, vote rings or mass requests for upvotes.

Buying a domain is a coordinated migration, not a cosmetic DNS switch: guest credentials are origin-scoped, verified recovery/callbacks and links need checking, and the Railway WebMCP trial token will not cover an unrelated new origin. Keep the current URL usable until tested continuity exists. No domain, purchase or public submission was changed during this research.

### Lane B — the actual v3 build

Indicative sequence, **not a delivery guarantee**. With one engineering owner supported by coding tools, real artwork and user recruitment, this is a multi-week program, roughly 6–10 weeks depending on physics, asset and study results. Independent art/audio support can reduce bottlenecks; adding agents does not eliminate validation time.

| Milestone                 | Deliverable                                                                                             | Exit condition                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1. First five minutes     | Cohesive entry, game-specific copy, truthful Watch, concise result, fixed target-device friction        | Novice entry/understanding gates; old-game regression; before/after physical-phone evidence.                        |
| 2. Flagship feel          | Distinct Bridge/Crown/Heist presentation, tactile flagship checks, deliberate sound and camera behavior | Controls trusted across cameras; identifiable games without labels; measured sustained device performance.          |
| 3. Playable memories      | Factual highlights, recipient-first replay, one game supporting a separate “try this moment” challenge  | Another identity reconstructs result and starts a legal unranked branch; no private-state leakage or history edits. |
| 4. Real agent continuity  | Versioned passport, reliable reconnect/delegation, test bench, durable hosted budgets                   | Independent real agents complete supported games; stale/duplicate/revoked access rejected; costs bounded.           |
| 5. Together across games  | Two-seat Mela Circuit with continuous crowd and explicit handoffs                                       | Full three-game session across independent clients, reconnect, exit and repeat; no unsupported modes exposed.       |
| 6. Two new games          | Carrom and Kite prototypes, then production one at a time if they pass                                  | Distinct fun and understandable influence; full rules/physics, QA, mobile, replay, agent and release gates.         |
| 7. Evidence-driven growth | Public challenges, selective clips, measured return/sharing, moderation/operations                      | Report actual cohorts, cost and feedback; prioritize observed bottlenecks rather than more features.                |

Introduce additive/versioned state, bind ongoing matches to their rules and retain old replay interpretation. Roll back frontend independently when compatible; rehearse database migration/recovery before changing authority. Release one game or loop at a time behind a verified capability boundary, not a big-bang rewrite.

## 15. What this plan deliberately rejects

- A catalogue race with hundreds of untested games.
- A homepage dominated by marketing, giant typography or compulsory setup.
- Another universal tiled-board reskin presented as a new flagship.
- Replacing all rendering with WebGPU without a demonstrated requirement.
- Calling deterministic character traits live AI, or calling self-reported model labels verified.
- Continuous model calls for physics, unbounded hosted inference or client-authoritative outcomes.
- Global agent rankings before stable identities, fair modes and sufficient matches exist.
- Fake live rooms, inflated players, addictive pressure loops or promised acquisition/award outcomes.
- Copying licensed commercial games/assets or treating “available on GitHub” as permission.
- Rushing new games or a domain migration into a deadline at the expense of working play.

## 16. Remaining unknowns and next task

1. **Research completeness:** the unexposed remainder of the 169-record report may contain relevant outliers. Reconcile its exported index when available; don't restart the research from zero.
2. **Challenge administration:** Mela's prior Product Hunt launch status, any relaunch exception, final submission cutoff and undisclosed judging details need confirmation. The public date/guide are now verified.
3. **Player evidence:** real first-time comprehension, preferred flagship, return behavior, sharing motivation and target-device baseline have not been measured in this pass.
4. **Operating resources:** a durable hosted-AI budget, supported devices, art/audio capacity, moderation capacity and asset rights need explicit operating limits before scale commitments.
5. **New-game rules:** Carrom scoring/fouls, Kite input/tension and crowd balance require prototype playtests; they are recommendations, not locked specifications.

**Exact next task:** turn Milestone 1 into a scoped implementation brief, anchored in a short newcomer study and the observed production issues. Protect the September 18 submission with Lane A; build the larger differentiators through Lane B. No application implementation is authorized or claimed by this research document alone.
