# Mela and the Astra Challenge

## Competition evidence

The closest verified Product Hunt precedent is **OpenAI Day built on GPT-5.6**, not a confirmed GPT-5.5 Product Hunt challenge. Product Hunt names five winners: Teable 3.0, CrawlRaven, AskCodi, canitbebuilt and Speakworld. The announcement says more than 400 products launched. A separate GPT-5.5 winner list could not be verified; it should not be invented or conflated with this event.[^1]

The distinction between a daily ranking and a challenge award is material. Teable's July 23 launch displays a first-place daily badge, while canitbebuilt displays #10 and Speakworld #32. All three appear in the official winner announcement. Therefore a top-five daily position was not necessary to win that previous award. This is evidence about the previous event, not proof of the current jury's methodology.[^2][^3][^4]

The current Astra contest page announces **five winners**, each receiving a year of ChatGPT Pro, $10,000 in API credits and OpenAI promotion. It does not establish a ranked first-through-fifth prize ladder. The linked announcement and a Product Hunt staff reply say to schedule the launch for **September 18, 2026**. The full short-linked launch guide could not be retrieved, so the complete eligibility terms, existing-product treatment, judging weights and exact timezone/cutoff remain unverified. A zero-valued countdown in extracted HTML is not evidence that submissions have closed.[^5][^6]

## The five Product Hunt winners

| Product      | Verified product promise                                                                                       | Transferable design lesson for Mela                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Teable 3.0   | Business data becomes workflows and custom apps.                                                               | Join the steps into one useful experience; do not showcase disconnected capabilities.                |
| CrawlRaven   | Multiple SEO sources become one prioritized action plan.                                                       | Compress complexity into the next useful decision, not a dashboard of raw detail.                    |
| AskCodi      | A code-aware assistant coordinates development work.                                                           | Continuity and context matter more than adding another blank prompt box.                             |
| canitbebuilt | A sentence produces a hardware assessment, costed components and a 3D concept; first inspection has no signup. | Deliver a tangible result immediately; an editable artifact is more memorable than explanatory copy. |
| Speakworld   | Language learning through journeys and conversations in explorable worlds.                                     | Make the AI capability an activity the visitor participates in, not a technology label.              |

Product descriptions above are drawn from the official launch pages and linked product surfaces, not independent performance certification.[^2][^3][^4][^7][^8] These pages do not reveal private judging deliberations, retention, revenue or acquisition prospects. The lessons are analytical recommendations, not claims that a particular feature caused a win.

### canitbebuilt: a visible transformation

The live product begins with an idea field, three examples and optional detail. It also shows public recent inspections and an explicit warning that estimates need validation before tooling spend.[^9] The useful pattern is a low-friction transformation with an inspectable output and an honest boundary.

For Mela, that transformation should be **describe a character → see its real tactics → watch it make moves**. A sentence that merely changes a name would not satisfy this pattern. Nor would generated source code that a visitor cannot safely run. The artifact must be a character that can actually participate under the same rules as everyone else.

### Speakworld: a world with a purpose

The linked live page offers three language journeys, a named guide, a first mission, movement controls and a conversation goal. Its page also discloses a text fallback and an ungenerated narration asset rather than pretending every capability is ready.[^10] This is useful evidence for an explicit first activity and truthful capability labeling; the full voice experience was not independently played during this research.

Mela's counterpart is a specific first match. Bridge Breakers is the clearest starting point: reach the other portal, see the difference between a sprinter and a patient walker, and let the crowd move the crossing. Crown Run adds possession and rivalry; Heist adds cooperation. They should feel like activities with distinct goals, not three interchangeable screenshots.

## Related OpenAI Build Week winners

OpenAI's separate Build Week article identifies technical implementation, design/UX, potential impact and idea quality as its evaluation dimensions. These are **not automatically the Astra Product Hunt rubric**. Its winners include Second Voice, veTriage, Echo Canvas and Mechanica in first place within their respective categories, with AirBridge, Pulse, Sentinel and Dấu as second-place category winners.[^11]

Second Voice emphasizes low-effort confirmation; Echo Canvas makes spatial sound immediately inspectable; Mechanica makes historical mechanisms operable; Dấu combines deterministic measurement with coaching. Across these examples, constrained AI and clear human control are prominent. The inference for Mela is to make the game action understandable, keep rules deterministic and enforceable, and make the model's contribution visible without giving it unchecked authority.

This comparison does not justify a medical or productivity pivot. Mela's distinctive thesis is a shared game in which playing, coaching an actor and influencing from the crowd all matter. A convincing entertainment product can demonstrate technical depth through a simple, enjoyable activity.

## Mela's current gap

The released baseline already has ten games, real subscriptions, crowd influence, durable history, multiple cameras, prompt-to-policy coaching and a live Astra worker. Its weakness is not an absence of features. A visitor first sees a catalogue; the unusual character and AI experience sits inside settings after starting a game. The available prompt previously collapsed into only three named policies, which left a large gap between the fantasy of creating a character and the actual control provided.

The proposed correction is one coherent front door: **Character Arena**. It should expose two characters, a real tactic summary and one start action. Ready-made characters keep entry immediate. Optional Astra design produces a bounded editable character; optional live decisions make real inference observable without making the free game dependent on API availability.

The design must not imply unrestricted intelligence. Character traits cover pace, equal-length route preference, caution and cosmetic appearance. They do not grant teleportation, hidden information, new rules or guaranteed victory. A name or costume cannot change competitive outcomes. A direct edit is equally legitimate; no paid inference is needed merely to rename a fox.

## Product decisions

### One creation-to-play loop

The homepage leads with a compact, functional character workbench. Visitors can select ready-made characters, edit supported traits, or describe an idea to Astra. They can start a duel between two characters or control Amber themselves. Existing games remain direct choices below; there is no account wall.

Character snapshots are stored with their match. The server validates every field and uses the same ordinary action-resolution path. The public snapshot contains only a short name and supported traits, not raw prompts, credentials or private crowd decisions. Astra receives the resulting bounded tactics and public board when live play is explicitly selected.

### Make participation legible

Characters have different 3D silhouettes, readable names and a concise tactic card. The committed board, not animation, determines position and outcome. During inference the interface explains what is happening; the notebook distinguishes external proposals from deterministic actions and missed-deadline fallback.

Crowd powers remain meaningful and constrained: one accepted choice per beat, a shared pool, individual cooldowns, and reveal only at committed resolution. Spectator inclusion is not replaced by a popularity vote, chat or artificial engagement counter.

### A useful sharing object

A finished match provides a saved replay, playback controls, a downloadable postcard of the committed result, and a link to remix either character. The recipient can change a tactic and play, rather than arriving at a generic homepage with no context. Sharing is voluntary, with no contact import, automated posting or incentive to spam.

Postcards are presentation artifacts, not signed competitive certificates. The canonical replay remains the database-backed record. A remixed character is a new editable configuration, not ownership of another person's identity or access to their account.

### Protect the free experience

Deterministic character play is available without model calls. Astra design and live play have bounded capacity and explicit failure states. The current worker is single-process with a daily counter and concurrency cap; it is not a distributed spend-control system. Expanding traffic safely requires durable quota/accounting work and measured cost per completed game before advertising unlimited live AI.

## Launch demonstration

The strongest short demonstration is a continuous, honest sequence:

1. Open Mela without signing up. Select two contrasting characters.
2. Describe a character to Astra, then show the returned editable tactics.
3. Start a real match. Explain once whether it uses local tactics or live Astra.
4. Join from an independent spectator session and move the crossing.
5. Show both plans resolving against that committed crowd effect.
6. Finish, play the replay, save a postcard and remix a character.

The live-Astra recording should show actual source labels. A deterministic example must not be captioned as model inference. Time cuts may be used in edited launch media, but should be disclosed; an uncut verification recording is a useful companion. No social posting or launch submission is performed merely by preparing these assets.

## Validation and success measures

The release gate is behavioral: fresh guest entry, complete character games, legal deterministic tactics, correct live-agent validation, spectator privacy/concurrency, replay reconstruction by another identity, rematch continuity, responsive controls and preserved Pen Fight/Book Cricket flows. Unit tests support but do not replace the client → reducer → committed state → subscription loop.

After release, measure actual visitor-to-first-match conversion, completion rate by mode, spectator joins and accepted powers, replay opens, character remixes, errors, model fallback rate and cost per completed live match. Record those as distinct events and report denominators. Do not infer popularity from cumulative test matches or inflate signups with anonymous profiles. Avoid a universal score that adds unrelated games together.

Targets such as completing first entry within 30 seconds or understanding the objective without reading documentation are testable hypotheses, not achieved metrics until measured with independent people. Real user observation remains necessary: the builder's own browser tests can identify broken controls, but cannot establish delight or retention.

## Risks and next decisions

- The exact current contest rules still need confirmation from the full guide or organizers before submission. Previous winners are precedent, not eligibility advice.
- Live inference latency can make a short game feel slow. The fast deterministic path is a product feature, not something to hide.
- A public editable name needs moderation and abuse controls if a global character-discovery feed is added. This release deliberately uses match-linked snapshots and explicit remix links rather than a new global social network.
- A custom domain requires a coordinated identity-storage, redirect, origin-trial, OAuth callback and email-origin review. Buying or switching one is not necessary to validate this game loop, and is not performed silently.
- Human-v-human seats already exist in selected older games; extending them to simultaneous-turn arenas needs its own seat/disconnect tests. Two hosted Astra proposals are not two independently supplied providers.
- A one-hour improvement pass can deliver a tested release, not prove worldwide superiority, guaranteed virality, investment readiness or a first-place outcome.

## Sources

Accessed 13 September 2026. Dynamic relative dates and ranks are reported as observed, not independently audited engagement data.

[^1]: Aaron O'Leary, Product Hunt, [OpenAI Day winners are in](https://www.producthunt.com/p/openai/openai-day-winners-are-in), 2026.

[^2]: Product Hunt, [Teable 3.0 launch](https://www.producthunt.com/products/teable-4/launches/teable-3-0), July 23, 2026.

[^3]: Product Hunt, [canitbebuilt launch](https://www.producthunt.com/products/canitbebuilt/launches/canitbebuilt), July 23, 2026.

[^4]: Product Hunt, [Speakworld launch](https://www.producthunt.com/products/speakworld/launches/speakworld), July 23, 2026.

[^5]: Product Hunt/OpenAI, [GPT-6 Astra Challenge](https://www.producthunt.com/contests/gpt-6-astra-challenge), September 18, 2026 event.

[^6]: Gabe Perez and Jake Crump, Product Hunt, [Astra Challenge announcement and scheduling clarification](https://www.producthunt.com/p/producthunt/product-hunt-teams-up-with-openaidevs-for-the-gpt-6-astra-challenge), September 2026.

[^7]: Product Hunt, [CrawlRaven launch](https://www.producthunt.com/products/crawlraven/launches/crawlraven), 2026.

[^8]: Product Hunt, [AskCodi launch](https://www.producthunt.com/products/askcodi/launches/askcodi-3), 2026.

[^9]: canitbebuilt, [Live product](https://www.canitbebuilt.ai/), accessed September 13, 2026.

[^10]: Speakworld, [Live product](https://speakworld-342475645314.us-central1.run.app/), accessed September 13, 2026.

[^11]: OpenAI, [Meet the winners of OpenAI Build Week](https://developers.openai.com/blog/build-week-winners), 2026. Official primary account; not a Product Hunt Astra judging guide.
