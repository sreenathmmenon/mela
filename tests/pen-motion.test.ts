import test from "node:test";
import assert from "node:assert/strict";
import {
  PEN_MOTION_PREFIX,
  readPenMotion,
  type PenMotion,
} from "../spacetimedb/src/penFightMotion";
import { resolvePenFlick } from "../spacetimedb/src/penFightRules";
import { aimGuide } from "../src/penFightExperience";

const base = {
  seed: 8n,
  actorX: 260,
  actorY: 500,
  targetX: 740,
  targetY: 500,
  aimX: 740,
  aimY: 500,
  force: 66,
  contact: 50,
  effects: { nudge: false, tilt: false, guard: false },
};
test("shot presentation retains the exact collision point and unclamped exits", () => {
  const contact = resolvePenFlick(base);
  assert.equal(contact.hit, true);
  assert.ok(contact.motion.contactX > base.actorX);
  assert.ok(contact.motion.contactX < base.targetX);
  const short = resolvePenFlick({ ...base, force: 20 });
  assert.equal(
    short.hit,
    false,
    "an aligned shot still needs enough strength to reach",
  );
  assert.equal(Math.round(contact.motion.actorX), contact.actorX);
  const exit = resolvePenFlick({ ...base, force: 100 });
  assert.equal(exit.targetOut, true);
  assert.ok(exit.motion.targetX > 1000);
  assert.equal(exit.targetX, 1000);
});
test("a miss has no fictional contact and the unstruck pen stays still", () => {
  const miss = resolvePenFlick({ ...base, aimY: 0 });
  assert.equal(miss.hit, false);
  assert.equal(miss.motion.targetX, base.targetX);
  assert.equal(miss.motion.targetY, base.targetY);
  assert.equal(miss.motion.contactX, miss.motion.actorX);
});
test("a saved boundary pen must not be hidden from coordinates alone", () => {
  const out = resolvePenFlick({ ...base, force: 100 });
  const saved = resolvePenFlick({
    ...base,
    force: 100,
    effects: { ...base.effects, guard: true },
  });
  assert.equal(out.targetX, saved.targetX);
  assert.equal(out.targetX, 1000);
  assert.equal(out.targetOut, true);
  assert.equal(saved.targetOut, false);
});
test("motion metadata is deterministic for human and mirrored AI actions", () => {
  for (let seed = 1n; seed <= 100n; seed++) {
    for (const reverse of [false, true]) {
      const action = {
        ...base,
        seed,
        actorX: reverse ? 740 : 260,
        targetX: reverse ? 260 : 740,
        aimX: reverse ? 260 : 740,
      };
      assert.deepEqual(resolvePenFlick(action), resolvePenFlick(action));
      assert.ok(
        Object.values(resolvePenFlick(action).motion).every(Number.isFinite),
      );
    }
  }
});
test("presentation event decoder accepts only the versioned finite shot contract", () => {
  const data: PenMotion = {
    matchId: "4",
    sequence: "1:0:8",
    actor: "human",
    from: { x: 260, y: 500 },
    targetFrom: { x: 740, y: 500 },
    contact: { x: 674, y: 500 },
    end: { x: 720, y: 500 },
    targetEnd: { x: 1100, y: 500 },
    hit: true,
    actorOut: false,
    targetOut: true,
    guarded: false,
  };
  assert.deepEqual(
    readPenMotion(PEN_MOTION_PREFIX + JSON.stringify(data)),
    data,
  );
  for (const message of [
    "Human made contact",
    PEN_MOTION_PREFIX + "{",
    PEN_MOTION_PREFIX + JSON.stringify({ ...data, actor: "spectator" }),
    PEN_MOTION_PREFIX + JSON.stringify({ ...data, matchId: 4 }),
    PEN_MOTION_PREFIX + JSON.stringify({ ...data, end: { x: null, y: 1 } }),
    PEN_MOTION_PREFIX + JSON.stringify({ ...data, hit: "yes" }),
  ])
    assert.equal(readPenMotion(message), undefined);
});
test("aim arrow preserves direction and its power length is bounded", () => {
  const from = { x: 260, y: 500 };
  const aim = { x: 740, y: 200 };
  for (const power of [-100, 0, 50, 100, 200]) {
    const end = aimGuide(from, aim, power);
    assert.ok(
      Math.abs(
        (end.y - from.y) / (end.x - from.x) -
          (aim.y - from.y) / (aim.x - from.x),
      ) < 1e-8,
    );
    assert.ok(Math.hypot(end.x - from.x, end.y - from.y) <= 285.0001);
  }
  assert.deepEqual(aimGuide(from, from, 100), from);
});
