import assert from "node:assert/strict";
import test from "node:test";
import {
  NAME_MAX,
  NAME_MIN,
  checkDisplayName,
} from "../spacetimedb/src/displayNameRules.ts";

/**
 * The bar these tests hold: a name reaches a projector in a room full of
 * people. Blocking an obscenity matters, but wrongly rejecting a real person's
 * name matters more — so the real-name cases below are the ones to protect
 * when this filter is next touched.
 */

test("ordinary names are accepted", () => {
  for (const name of [
    "Sreenath",
    "Nila",
    "Arjun K",
    "Ann-Marie",
    "O'Brien",
    "José",
    "Zoë",
    "Kumar123",
    "Anushka",
    "Prithvi",
  ]) {
    assert.equal(checkDisplayName(name).ok, true, `${name} should be allowed`);
  }
});

test("names in non-Latin scripts are accepted", () => {
  // Rejecting these would exclude the audience Mela is actually built for.
  for (const name of ["чувак", "श्रीनाथ", "ശ്രീനാഥ്", "李明"]) {
    assert.equal(checkDisplayName(name).ok, true, `${name} should be allowed`);
  }
});

test("real names that collide with blocked words are not rejected", () => {
  // Each of these has broken a naive substring filter in a shipped product.
  for (const name of [
    "Shital", // contains "shit"
    "Scunthorpe", // the canonical example
    "Dickens",
    "Cassidy", // contains "ass"
    "Assam",
    "Bassist",
    "Kamini", // skeleton of "kamina"
    "Nagar", // skeleton of "nigga"
    "Fick", // skeleton of "fuck", but no leet substitution
    "Nigel",
    "Nigeria",
    "Analiese",
    "Cockburn",
  ]) {
    const result = checkDisplayName(name);
    assert.equal(result.ok, true, `${name} should be allowed`);
  }
});

test("plain obscenities are blocked", () => {
  for (const name of [
    "fuck",
    "FUCK",
    "Bitch",
    "motherfucker",
    "chutiya",
    "madarchod",
  ]) {
    const result = checkDisplayName(name);
    assert.equal(result.ok, false, `${name} should be blocked`);
    assert.equal(result.reason, "profanity");
  }
});

test("evasion by separators, repeats and leetspeak is blocked", () => {
  for (const name of ["f-u-c-k", "F U C K", "fuuuck", "f0ck", "sh1t", "Fu*ck"]) {
    assert.equal(
      checkDisplayName(name).ok,
      false,
      `${name} should be blocked`,
    );
  }
});

test("leet evasion is caught but the same spelling as a real surname is not", () => {
  // The pair that forced the digit rule: both fold to the same skeleton, and
  // only the one showing evidence of evasion may be rejected.
  assert.equal(checkDisplayName("f0ck").ok, false);
  assert.equal(checkDisplayName("Fick").ok, true);
});

test("system and bot names are reserved", () => {
  for (const name of ["MelaBot", "melabot", "admin", "Operator", "system"]) {
    const result = checkDisplayName(name);
    assert.equal(result.ok, false, `${name} should be reserved`);
    assert.equal(result.reason, "reserved");
  }
});

test("length limits are enforced on the trimmed name", () => {
  assert.equal(checkDisplayName("a").reason, "too-short");
  assert.equal(checkDisplayName("  a  ").reason, "too-short");
  assert.equal(checkDisplayName("").reason, "blank");
  assert.equal(checkDisplayName("   ").reason, "blank");
  assert.equal(checkDisplayName("x".repeat(NAME_MAX)).ok, true);
  assert.equal(checkDisplayName("x".repeat(NAME_MAX + 1)).reason, "too-long");
  assert.equal(checkDisplayName("x".repeat(NAME_MIN)).ok, true);
});

test("markup and invisible characters cannot reach the stage", () => {
  assert.equal(checkDisplayName("<script>").reason, "structural");
  assert.equal(checkDisplayName("a<b>c").reason, "structural");
  // Zero-width space: two names that render identically must not both pass.
  assert.equal(checkDisplayName("Ni​la").reason, "invisible");
  // Right-to-left override reverses the text around it on screen.
  assert.equal(checkDisplayName("Ni‮la").reason, "invisible");
});

test("names with no letters at all are rejected", () => {
  for (const name of ["🎉🎉", "...", "!!!!"]) {
    assert.equal(checkDisplayName(name).ok, false, `${name} should be blocked`);
  }
});

test("a rejection never echoes the rejected text back", () => {
  // Echoing the input is how a filtered word ends up rendered anyway.
  const result = checkDisplayName("fuck");
  assert.equal(result.ok, false);
  assert.ok(!result.message?.toLowerCase().includes("fuck"));
});
