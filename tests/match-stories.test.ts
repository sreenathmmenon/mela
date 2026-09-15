import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  initialArena,
  resolveArena,
  decideArena,
} from "../spacetimedb/src/arenaRules";
import {
  CHARACTER_PRESETS,
  characterBrief,
} from "../spacetimedb/src/arenaCharacter";
import {
  featuredMoment,
  matchMoments,
  readArenaFrame,
  selectStories,
  storyCaption,
  type StoryMemory,
} from "../src/matchStories";
import { ReplayBoard } from "../src/ReplayBoard";
import { arenaCue } from "../src/arenaCue";
import { ARENA_THEMES } from "../src/arenaScenery";

const memory = (id: number, gameKind = "bridge_breakers"): StoryMemory => ({
  matchId: BigInt(id),
  sequence: BigInt(id),
  gameKind,
  humanName: "Asha",
  aiName: "MelaBot",
  winner: "human",
  humanScore: 1,
  botScore: 0,
  crowdActions: 0,
  notableMoment: "0 discoveries. MelaBot strategy / MelaBot strategy.",
});

test("discovery diversifies recent games without losing or mutating personal history", () => {
  const rows = [
    memory(5),
    memory(4),
    memory(3, "pen_fight"),
    memory(2, "mela_heist"),
    memory(1),
  ];
  const before = structuredClone(rows);
  assert.deepEqual(
    selectStories(rows, 3).map((m) => m.matchId),
    [5n, 3n, 2n],
  );
  assert.deepEqual(
    selectStories(rows, 5).map((m) => m.matchId),
    [5n, 3n, 2n, 4n, 1n],
  );
  assert.deepEqual(selectStories(rows, 0), []);
  assert.deepEqual(rows, before);
});
test("discovery removes legacy development counters without inventing a crowd effect", () => {
  assert.equal(
    storyCaption(memory(1)),
    "Open the result, then take your turn.",
  );
  assert.equal(
    storyCaption({ ...memory(1), crowdActions: 2 }),
    "2 crowd powers used.",
  );
  assert.equal(
    storyCaption({
      ...memory(1),
      notableMoment: "Asha turned the bridge. 0 discoveries.",
    }),
    "Asha turned the bridge.",
  );
});
test("moments describe committed crowd resolution, not proposed moves or inferred wins", () => {
  const s = initialArena("bridge_breakers");
  const next = resolveArena(
    s,
    [decideArena(s, 0, "runner"), decideArena(s, 1, "runner")],
    { power: "spring", value: 0, actor: "Nila" },
  );
  const frames = [
    { revision: 0, state: JSON.stringify(s) },
    { revision: 1, state: JSON.stringify(next) },
  ];
  const before = JSON.stringify(frames);
  assert.equal(featuredMoment(frames)?.kind, "crowd");
  assert.equal(featuredMoment(frames)?.detail, "Nila recharged both runners.");
  assert.equal(matchMoments(frames).length, 1);
  assert.equal(JSON.stringify(frames), before);
  assert.equal(featuredMoment([frames[0]]), undefined);
});
test("unreadable or unsupported replay frames never produce a fabricated board", () => {
  for (const state of [
    "bad",
    "null",
    JSON.stringify({ ...initialArena("crown_run"), version: 2 }),
    JSON.stringify({
      ...initialArena("crown_run"),
      crown: { x: 999, y: 0, carrier: -1 },
    }),
  ])
    assert.equal(readArenaFrame({ revision: 1, state }), undefined);
});
test("replay projection carries a named recorded move and valid unique paint references", () => {
  const html = renderToStaticMarkup(
    createElement(ReplayBoard, { state: initialArena("mela_heist") }),
  );
  assert.match(html, /Recorded board at move 0/);
  assert.ok(!html.includes("Live"));
  assert.match(html, /role="img"/);
});
test("all three arenas have different material palettes and game-correct character tactics", () => {
  assert.equal(new Set(Object.values(ARENA_THEMES).map((t) => t.sky)).size, 3);
  const c = CHARACTER_PRESETS[0];
  assert.match(characterBrief(c, "crown_run"), /crown/);
  assert.match(characterBrief(c, "bridge_breakers"), /opposite portal/);
  assert.doesNotMatch(characterBrief(c, "bridge_breakers"), /crown|shove/);
  assert.match(characterBrief(c, "mela_heist"), /partner/);
  assert.doesNotMatch(characterBrief(c, "mela_heist"), /rival|crown/);
});
test("audio choices follow committed objective and crowd events", () => {
  assert.equal(
    arenaCue({ winner: "", log: ["Nila turned the bridge."] }),
    "crowdReveal",
  );
  assert.equal(
    arenaCue({ winner: "", log: ["Both switches opened the treasure vault!"] }),
    "vault",
  );
  assert.equal(arenaCue({ winner: "", log: ["Amber stepped east."] }), "step");
  assert.equal(arenaCue({ winner: "timeout", log: [] }), "out");
  assert.equal(arenaCue({ winner: "human", log: [] }), "arenaWin");
});
