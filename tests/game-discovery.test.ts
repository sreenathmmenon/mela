import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeDiscovery } from "../src/HomeDiscovery";

const render = (
  intent: "solo" | "friends" | "human_agent" | "agent_duel",
  busy = false,
) =>
  renderToStaticMarkup(
    createElement(HomeDiscovery, {
      intent,
      busy,
      live: [],
      onChoose: () => {},
      onWatch: () => {},
    }),
  );

test("illustrated discovery keeps ten accessible game buttons and unique SVG definitions", () => {
  const html = render("solo");
  assert.equal((html.match(/<button /g) ?? []).length, 10);
  assert.equal((html.match(/class="game-cover"/g) ?? []).length, 10);
  assert.ok(html.indexOf("Pen Fight") < html.indexOf("Stick Cricket"));
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of html.matchAll(/url\(#([^)]+)\)/g))
    assert.ok(ids.includes(match[1]), `missing SVG definition ${match[1]}`);
  assert.equal(
    (html.match(/aria-hidden="true" focusable="false"/g) ?? []).length,
    10,
  );
});

test("illustrated friend and agent shelves retain only five supported games", () => {
  for (const intent of ["friends", "human_agent", "agent_duel"] as const) {
    const html = render(intent);
    assert.equal((html.match(/<button /g) ?? []).length, 5);
    assert.ok(html.includes("Pen Fight") && html.includes("Mela Heist"));
    assert.ok(
      !html.includes("Book Cricket") && !html.includes("Stick Cricket"),
    );
  }
});

test("connection or mutation pending disables every illustrated game card", () => {
  assert.equal((render("solo", true).match(/disabled=""/g) ?? []).length, 10);
});

test("solo cards have a named play action without ten repeated visible Play captions", () => {
  const html = render("solo");
  assert.equal(
    (html.match(/class="discovery-sr-only">Play /g) ?? []).length,
    10,
  );
  assert.equal((html.match(/aria-label=/g) ?? []).length, 1); // Games region only; preserve native card names.
  assert.equal((html.match(/<b>/g) ?? []).length, 0);
  assert.equal((render("friends").match(/<b>/g) ?? []).length, 5);
});
