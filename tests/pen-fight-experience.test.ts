import test from "node:test";
import assert from "node:assert/strict";
import { resolvePenFlick } from "../spacetimedb/src/penFightRules";
import {
  duelShare,
  isIntentionalDrag,
  powerAvailability,
  rivalry,
} from "../src/penFightExperience";

test("a tap or tiny finger wobble never commits a flick", () => {
  assert.equal(
    isIntentionalDrag({ x: 100, y: 100 }, { x: 100, y: 100 }),
    false,
  );
  assert.equal(
    isIntentionalDrag({ x: 100, y: 100 }, { x: 104, y: 104 }),
    false,
  );
  assert.equal(isIntentionalDrag({ x: 100, y: 100 }, { x: 108, y: 100 }), true);
});

test("DESK TILT affects centred human flicks and stays deterministic for either actor", () => {
  for (let seed = 1n; seed <= 100n; seed++) {
    for (const reverse of [false, true]) {
      const input = {
        seed,
        actorX: reverse ? 740 : 260,
        actorY: 500,
        targetX: reverse ? 260 : 740,
        targetY: 500,
        aimX: reverse ? 260 : 740,
        aimY: 500,
        force: 60,
        contact: 50,
        effects: { nudge: false, tilt: false, guard: false },
      };
      const normal = resolvePenFlick(input);
      const tilted = resolvePenFlick({
        ...input,
        effects: { ...input.effects, tilt: true },
      });
      assert.notDeepEqual(
        [normal.actorY, normal.targetY],
        [tilted.actorY, tilted.targetY],
      );
      assert.deepEqual(
        tilted,
        resolvePenFlick({
          ...input,
          effects: { ...input.effects, tilt: true },
        }),
      );
      for (const value of [
        tilted.actorX,
        tilted.actorY,
        tilted.targetX,
        tilted.targetY,
      ])
        assert.ok(Number.isFinite(value) && value >= 0 && value <= 1000);
    }
  }
});
test("crowd availability uses authoritative prices and cooldowns", () => {
  const input = {
    power: "guard" as const,
    energy: 16,
    now: 1000,
    pending: false,
    connected: true,
    waiting: false,
  };
  assert.equal(powerAvailability(input).label, "Need 4 Energy");
  assert.equal(powerAvailability({ ...input, energy: 20 }).disabled, false);
  assert.equal(
    powerAvailability({ ...input, energy: 20, readyAtMicros: 2_500_000n })
      .label,
    "Ready in 2s",
  );
  assert.equal(
    powerAvailability({ ...input, energy: 20, readyAtMicros: 1_000_000n })
      .disabled,
    false,
  );
  assert.equal(
    powerAvailability({ ...input, energy: 20, waiting: true }).label,
    "Already on this pen",
  );
  assert.equal(
    powerAvailability({ ...input, connected: false }).label,
    "Reconnecting…",
  );
  assert.equal(powerAvailability({ ...input, pending: true }).disabled, true);
});
test("rivalry uses wins and completed matches, never invents streaks", () => {
  assert.match(rivalry(0, 0), /starts/);
  assert.equal(rivalry(2, 3), "You lead MelaBot 2–1.");
  assert.match(rivalry(1, 3), /MelaBot leads 2–1/);
  assert.match(rivalry(2, 4), /even: 2–2/);
});
test("a shareable duel tells the real result and earned crowd story", () => {
  const input = {
    human: "Asha",
    humanRounds: 1,
    botRounds: 2,
    crowdActions: 0,
    moment: "MelaBot won with a knockout.",
  };
  assert.match(duelShare(input), /Asha 1–2 MelaBot/);
  assert.doesNotMatch(duelShare(input), /crowd move|best|streak/i);
  assert.match(duelShare({ ...input, crowdActions: 1 }), /1 crowd move\./);
  assert.match(duelShare({ ...input, crowdActions: 3 }), /3 crowd moves\./);
});
