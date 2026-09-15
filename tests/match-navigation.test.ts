import assert from "node:assert/strict";
import test from "node:test";
import {
  matchFromLocation,
  matchLocation,
  followMatchDestination,
} from "../src/matchNavigation";

test("restored match identifiers are bounded; locations confer no seat claims", () => {
  assert.equal(matchFromLocation("?match=10"), 10n);
  for (const search of [
    "",
    "?match=0",
    "?match=-1",
    "?match=1.5",
    "?match=NaN",
    "?match=" + "9".repeat(21),
    "?join=10",
    "?memory=10",
    "?join=10&match=11",
    "?memory=10&match=11",
    "?seat=10&match=11",
  ])
    assert.equal(matchFromLocation(search), null);
});
test("joining becomes a reloadable view without retaining the onboarding action", () => {
  const href = matchLocation(
    "https://example.com/mela/?join=10&utm_source=friend",
    { kind: "match", id: 10n },
  );
  assert.equal(href, "https://example.com/mela/?utm_source=friend&match=10");
  assert.equal(matchFromLocation(new URL(href).search), 10n);
});
test("back to games removes stale replay and match navigation, preserving the deployment path", () => {
  assert.equal(
    matchLocation("https://example.com/mela/?memory=7&match=8&join=9", {
      kind: "home",
    }),
    "https://example.com/mela/",
  );
  assert.equal(
    matchLocation("https://example.com/mela/?match=8", {
      kind: "memory",
      id: 8n,
    }),
    "https://example.com/mela/?memory=8",
  );
});

test("follow links never invite a spectator into an abandoned or completed game", () => {
  assert.equal(followMatchDestination(undefined), null);
  assert.equal(followMatchDestination({ id: 10n, status: "abandoned" }), null);
  assert.equal(
    followMatchDestination({ id: 10n, status: "complete" })?.href,
    "?memory=10",
  );
  assert.equal(
    followMatchDestination({ id: 10n, status: "active" })?.href,
    "?join=10",
  );
});
