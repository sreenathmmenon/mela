# Mela product experience

## Product diagnosis

Mela already contains ten games, solo opponents, independently claimed human and agent seats in five games, crowd powers, saved results, optional identity saving and external-agent tools. The largest observed experience problem is fragmentation, not the absence of another game. Before this revision the first screen led with a character editor for three arenas. Other games appeared below it. Pen Fight and Four in a Row had a separate advanced-mode disclosure. Personal recent games and public arena replays were separated, and the only persistent top-level destination was Profile. Those are observed implementation facts, not results of an independent usability study.

The product should be understandable without knowing what an arena reducer, character provider or MCP session is. The first decision is what someone wants to do: play, watch, bring an agent, or return to their own history. That distinction is the organizing recommendation for this release. It does not replace individual game rules with a universal framework, or remove AI and spectators to make a simpler static catalogue.

The intended promise is practical: a person can enter a game immediately, understand their next action, invite someone into the correct role, see what changed, and leave with a recognizable result. A future visit should offer an honest continuation, not pressure to protect a streak. No research reviewed establishes that this will win a competition, create virality or guarantee emotional attachment.

## Research basis and limits

Przybylski, Rigby and Ryan's motivational model discusses competence, autonomy and relatedness as routes to enjoyable game engagement. It also treats learning the controls as a prerequisite rather than the experience itself. The implication for Mela is to make meaningful action easy to reach and understand, not to substitute levels or rewards for enjoyable play. This is a theory-informed design hypothesis, not a measured effect in Mela. The paper is from 2010 and is not evidence about modern agent tools or this audience specifically. [1]

Tyack and Mekler's 2024 review examines 259 SDT-based HCI games papers and warns about superficial use of the theory. That critique matters: labeling a profile “relatedness” or adding a choice called “autonomy” does not demonstrate a psychological benefit. Mela needs behavioral observation and player reports, including people who do not enjoy the new experience. [2]

Nielsen's progressive-disclosure guidance recommends putting frequent choices first and leaving specialized options available on demand. Applied here, the character editor and external-agent connection instructions are destinations, not prerequisites for choosing a game. They remain accessible to builders without making first-time players parse them. [3]

Budiu's recognition-versus-recall guidance supports visible, contextual action cues instead of long tutorials that must be memorized. Mela's game-specific help therefore appears in the game, close to the actual controls, and is available again rather than disappearing forever after onboarding. [4]

Poki's current public page centers a game catalogue and familiar categories. Its stated instant-play approach is useful precedent for keeping login out of Mela's critical path. It is not evidence that copying Poki's visual styling or catalogue scale would create growth for Mela. No traffic claims from that site are used as Mela benchmarks. [5]

Lichess exposes separate lobby, friend and computer actions and pairs games with analysis and learning tools. Its own feature list also separates studies, lessons and analysis. The relevant lesson is clear intentions and useful post-game depth, not introducing chess-style ratings across unrelated games. These are product observations from official pages, not competitor playtest results. [6]

Jackbox's official instructions distinguish the host's screen from phone-based joining, while its audience documentation shows that participation differs by game. Mela should similarly make player invitations distinct from public crowd links, and explain the crowd's actual power in each game. Spectators are not simply a count on the player screen. A single universal power description would be misleading. [7,8]

Gladiabots explicitly presents an iterate-and-observe loop: assemble a squad, construct behavior, watch it compete and improve the strategy. Mela can support a similar sense of authorship through character traits, legal actions and truthful replays. This does not justify calling a deterministic test driver an LLM, or treating model labels as proof of provider identity. [9]

The Player Experience Inventory paper was located, but its publisher page could not be retrieved reliably in this pass. No detailed findings or numerical thresholds from that paper are asserted. The reviewed evidence is mostly conceptual and product-level, not a causal comparison of Mela designs. Additional searching is unlikely to resolve the main uncertainty: how new people actually behave in this product.

## One product, four destinations

| Destination | First decision                       | Immediate action                                    | Deeper option                                                      |
| ----------- | ------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------ |
| Play        | Alone or with a friend               | Select a supported game                             | Invite another player; resume an existing seat                     |
| Watch       | Which active room?                   | Join its crowd                                      | Explore explicitly completed matches when no room is active        |
| Agents      | Connect an agent or make a character | Open compatible seats or use the character workshop | Connection instructions, optional Astra design and advanced traits |
| Your Mela   | Continue or remember?                | Resume or open a recent result                      | Nickname, optional verified saving and distinct game records       |

The four destinations use normal labeled navigation buttons and remain equally available on a phone. This pass avoids an oversized promotional hero. A short introduction establishes context, while the game cards remain the primary content. All ten games share the same shelf alignment rather than privileging one unrelated game with an oversized card.

Play now uses the existing guest entry and solo reducer paths. With a friend shows only Pen Fight, Four in a Row, Crown Run, Bridge Breakers and Mela Heist. Agent modes use the same five-game capability set. Unsupported games are not shown as if they support multiplayer; they remain available in solo play. Heist is explicitly cooperative, including when its partners are human and agent.

This is presentation capability metadata, not an authority layer. A browser filter never grants a seat. The server still validates identities, invitation capability, roles, game type and legal actions. Existing seat/reconnect behavior and private simultaneous moves remain unchanged.

## First visit and identity

A new visitor should be able to see the catalogue before choosing an identity. Selecting a game still creates the existing server-owned guest profile. Sign-in is optional. The product must not infer that an entered email is verified, fabricate an email record, merge guests silently, or interrupt gameplay to collect a name.

The Your Mela page explains a material limitation plainly: guest progress follows the browser credential; cross-device saving uses optional verified identity. This information belongs next to saving, not before play. A profile button should describe profile and saving together so it does not look like a requirement to enter the games.

Account linking is security-sensitive and was not rewritten as part of this presentation revision. Regression validation must still cover a fresh guest, return with the same credential, private invitation, crowd entry and rejection of unverified recovery. Physical-device email and provider flows require separate evidence rather than a claim inferred from a desktop viewport.

## Player experience across games

Every game gets the same recognizable help affordance, with game-specific content. It states the objective and exposes concise control guidance on request. The compact mobile version keeps the help label while avoiding another paragraph above the board. The game remains in control of its own score, turn feedback and input mechanics.

Pen Fight guidance describes gripping a point on the pen and pulling back; it does not promise the guide line predicts a hidden crowd effect. Cricket explains six deliveries, two wickets and a target. Dots explains closing a box and the usual extra turn. Gilli points to its timing control. Four and Last Stick state their actual win objectives. The three arenas explain simultaneous choices, charge and cooperation where applicable.

Game help must not override disabled-state explanations or become an onboarding carousel. The useful loop is: objective, legal action, immediate pending feedback, committed reaction, clear next turn. Revealing another actor's private move to make the screen feel faster would violate the product's trust model. Camera preferences, audio and focus controls remain presentation options rather than sources of authority.

## Spectator experience

Watch is an explicit destination. It renders the existing bounded, presence-filtered room discovery rather than manufacturing busy rooms from historical matches. If nobody is actively hosting, it says so and offers either starting a game or opening a completed story. Results are labeled finished; they are never sold as live activity.

The spectator journey is short: choose a room, understand the objective, choose a legal power, see acceptance and cooldown, then observe the reveal. The public crowd link is not the private player invitation. Energy is shared within a match, cooldowns are individual, and the server resolves competing purchases. Pending crowd effects remain hidden from players until the relevant resolution.

A viewer who makes no purchase must still be allowed to enjoy the match. No chat, betting, compulsory allegiance or popularity score is introduced. Later research should ask whether a spectator can explain one real effect they caused; raw button-click totals alone do not show meaningful participation.

## Agents as understandable participants

The Agents destination separates two substantially different experiences. Connect an agent means an independently run tool-capable client, with its own session and operator-supplied model. Create a character means editing bounded traits and using the existing deterministic or optional hosted provider. Neither option should impersonate the other.

The connection path lists compatible games first, gives the room invitation next and keeps transport instructions in a disclosure. Copying the MCP endpoint has success and failure feedback. Operators are told that Mela does not run arbitrary external code, sessions are process-local, missed turns use disclosed fallback, and the modes are unranked. These limitations are relevant before competitive claims.

Longer-term agent improvements should prioritize durable delegated credentials, versioned behavior identity, replay-based diagnosis, latency budgets and explicit all-agent/no-fallback competitive rules before leaderboards. Those are future requirements, not shipped features in this UI pass. More seats or tournament brackets require per-game design and validation.

## Memory, meaning and return

Memory should tell the truth about a match in human terms: game, participants, result, meaningful moment and crowd contribution. The same result formatting must handle an individual win, draw, cooperative success and cooperative timeout. Calling every non-human result an AI victory is wrong, particularly for Heist.

Your Mela brings participation and recent results together. The level is a participation foundation; crowd influence is not player skill; Book Cricket's record is not a universal rating. A draw must not be counted as a loss merely because total matches minus wins is easy to calculate. The release removes that misleading rivalry inference.

The emotional design recommendation is recognition rather than obligation: a familiar opponent name, an honest remembered event, a useful replay, a preserved seat, a friend invitation and a voluntary next match. Do not use streak loss, fake scarcity, guilt after losing, simulated spectators, compulsory notifications or unverified claims about friendship with an AI. Enjoyment is a hypothesis to validate, not a property established by adding a badge.

## Visual and interaction system

Preserve Mela's warm paper, green and amber vocabulary, with a disciplined shared layout. The desktop shelf is a consistent grid; phone cards keep readable titles and short actions. Navigation uses text rather than unexplained icons. Active mode selection is visible, focus rings remain present and targets are at least 44px in the new controls.

Motion should support interaction, not consume attention everywhere. Existing lightweight previews remain, with reduced-motion suppression in the new product surface. No heavyweight homepage 3D scene, autoplay video or unrelated image generation is required. A game can have a visually rich stage without making discovery expensive or hard to scan.

Help, copy failures, offline state, empty rooms and unavailable actions all need intentional layouts. Whitespace has a job: distinguish choice groups and keep the action hierarchy readable. It should not place the first usable game below a full screen of configuration on a phone.

## Verification and measurement

This release's technical acceptance criteria are deterministic capability/result tests, all existing unit tests, builds, and real browser entry across the ten-game shelf. Test the supported friend and agent launch routes, a fresh private invitation, a crowd join, a saved result and a returning session. Check both 320–390px phone widths and desktop, keyboard focus, reduced motion and page errors. Full unit simulation does not replace the client/subscription/reducer loop.

The proposed human-study gate is deliberately separate: ask five to eight new people to start without explanation; include a phone user, a spectator and an agent builder. Observe where they hesitate before instructing them. Ask what they think happened after one action, which role they occupy, whether the match felt fair and whether they would voluntarily return. Record failures and negative feedback. A small sample finds confusion; it does not establish population-level retention.

Useful operational measures are successful entry-to-first-action time, completed matches by game and mode, failed invitation joins, reconnect recovery, spectator acceptance/rejection and a voluntary replay/rematch. Distinguish unique people from sessions, spectators from players and paid inference from fallback. Do not inflate signups with guests or local QA. This pass reuses existing counters and adds no tracking vendor, email campaign or personal-data collection.

The browser walkthrough found one authority-entry integration defect: explicitly selecting Stick Cricket could resume an active Book Cricket match. The release therefore adds `create_stick_cricket`, calling the existing shared server start function, before releasing the frontend. Generic guest entry remains idempotent; no tables, scoring, physics, identity or crowd rules change. A real two-client regression completes the new match and checks its durable Stick Cricket memory. This is not a frontend-only release.

Mobile measurement also exposed layout shifts from the connection indicator and asynchronously inserted resume card. The indicator no longer displaces the header, resume sits below game discovery, and the authentication-loading shell follows the final layout. The follow-up local mobile audit recorded zero layout shift; this is lab evidence, not field performance or a guarantee on every device. Exact tests and deployment outcomes belong in STATUS.md. The next phase should be selected from observed newcomer friction, not another speculative bundle of games or promises of global superiority.

## Sources

1. Andrew K. Przybylski, C. Scott Rigby and Richard M. Ryan. [A Motivational Model of Video Game Engagement](https://selfdeterminationtheory.org/SDT/documents/2010_PrzybylskiRigbyRyan_ROGP.pdf). Review of General Psychology, 2010, 14(2), 154–166. Theory and evidence review; not Mela-specific.
2. April Tyack and Elisa D. Mekler. [Self-Determination Theory and HCI Games Research: Unfulfilled Promises and Unquestioned Paradigms](https://arxiv.org/abs/2405.12639). 2024, accepted TOCHI preprint; DOI 10.1145/3673230. Counterpoint to superficial psychological claims.
3. Jakob Nielsen. [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/). Nielsen Norman Group, 2006. Interaction-design guidance.
4. Raluca Budiu. [Memory Recognition and Recall in User Interfaces](https://www.nngroup.com/articles/recognition-and-recall/). Nielsen Norman Group, 2024. Contextual instructions and visible actions.
5. Poki. [Free Online Games](https://poki.com/). Official public product page, inspected September 2026. Catalogue and instant-play precedent, not independently verified traffic evidence.
6. Lichess. [Homepage](https://lichess.org/en) and [Features](https://lichess.org/features). Official pages, inspected September 2026. Opponent intentions and game-specific learning/analysis.
7. Jackbox Games. [How to Play](https://www.jackboxgames.com/how-to-play/). Official host and phone-controller instructions.
8. Belia Portillo, Jackbox Games. [How Audience Play-Along Differs in Each Jackbox Game](https://www.jackboxgames.com/blog/how-audience-play-along-differs-in-each-jackbox-game). Published 2021, live page includes later packs. Per-game audience participation.
9. Gladiabots. [AI Combat Arena](https://gladiabots.com/). Official product page, inspected September 2026. Create, observe and iterate loop; marketing reviews are not treated as independent evidence.
