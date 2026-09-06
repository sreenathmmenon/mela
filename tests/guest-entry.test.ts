import assert from "node:assert/strict";
import { test } from "node:test";
import {
  guestName,
  validEntryGame,
  ENTRY_GAMES,
  isProtectedIdentity,
} from "../spacetimedb/src/guestRules";
import { analyticsPath, safeReturnPath } from "../src/accountFlow";

test("guest nicknames are deterministic, valid-length presentation only", () => {
  for (let i = 0; i < 1000; i++) {
    const id = i.toString(16).padStart(64, "0");
    assert.equal(guestName(id), guestName(id));
    assert.ok(guestName(id).length <= 24);
    assert.match(guestName(id), /^[A-Za-z]+ [A-Za-z]+ \d{3}$/);
  }
  assert.throws(() => guestName("not-an-identity"));
});
test("entry only accepts the six implemented games and lobby", () => {
  assert.equal(ENTRY_GAMES.length, 7);
  for (const game of ENTRY_GAMES) assert.ok(validEntryGame(game));
  for (const game of ["", "Pen Fight", "constructor", "unknown"])
    assert.equal(validEntryGame(game), false);
});
test("protected recovery requires exact provider, client, and verified email claims", () => {
  const jwt = {
    issuer: "https://auth.spacetimedb.com/oidc",
    audience: ["client_034JneP1uzy8V3MhC39IXp"],
    fullPayload: { email: "test@example.com", email_verified: true },
  };
  assert.ok(isProtectedIdentity(jwt));
  for (const bad of [
    undefined,
    {},
    { ...jwt, issuer: "https://attacker.invalid" },
    { ...jwt, audience: ["another-client"] },
    { ...jwt, fullPayload: {} },
    {
      ...jwt,
      fullPayload: { email: "test@example.com", email_verified: false },
    },
    {
      ...jwt,
      fullPayload: { email: "test@example.com", email_verified: "true" },
    },
  ])
    assert.equal(isProtectedIdentity(bad), false);
});
test("auth return paths stay local and strip callback credentials", () => {
  for (const bad of [
    null,
    "https://attacker.invalid",
    "//attacker.invalid",
    "/\\attacker.invalid",
    "/callback?code=secret",
  ])
    assert.equal(safeReturnPath(bad), "/");
  assert.equal(safeReturnPath("/?join=7&code=secret&state=secret"), "/?join=7");
  assert.equal(safeReturnPath("/?memory=7"), "/?memory=7");
});
test("analytics never records auth, invite identifiers, or arbitrary query values", () => {
  assert.equal(
    analyticsPath("https://mela.invalid/callback?code=secret"),
    "/sign-in",
  );
  assert.equal(
    analyticsPath("/?join=7&email=private@example.com"),
    "/crowd-invite",
  );
  assert.equal(analyticsPath("/?memory=7"), "/memory");
  assert.equal(analyticsPath("/?email=private@example.com#token"), "/");
});
