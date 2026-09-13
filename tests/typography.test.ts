import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("both interface typefaces ship as real licensed WOFF2 assets", () => {
  for (const [file, license] of [
    ["outfit-latin", "Outfit"],
    ["dm-sans-latin", "DM-Sans"],
  ]) {
    const font = readFileSync(
      new URL(`../public/fonts/${file}.woff2`, import.meta.url),
    );
    assert.equal(font.subarray(0, 4).toString(), "wOF2");
    assert.ok(font.length > 1000);
    assert.match(
      read(`public/fonts/${license}-OFL.txt`),
      /SIL OPEN FONT LICENSE/,
    );
  }
});

test("cold entry preloads the same local fonts used by the interface", () => {
  const html = read("index.html");
  const css = read("public/fonts/fonts.css");
  assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/);
  for (const name of ["outfit-latin", "dm-sans-latin"]) {
    assert.ok(html.includes(`/fonts/${name}.woff2`));
    assert.ok(css.includes(`./${name}.woff2`));
  }
  assert.match(css, /font-weight: 400 700/);
  assert.match(css, /font-display: swap/);
});

test("discovery does not reintroduce the rejected typeface", () => {
  for (const path of [
    "src/productExperience.css",
    "src/interfaceTypography.css",
    "src/accountControls.css",
  ]) {
    assert.doesNotMatch(read(path), /Instrument Sans|Georgia|Fraunces/);
  }
  assert.match(read("src/mela.css"), /--font-display: "Outfit"/);
  assert.match(read("src/mela.css"), /"DM Sans"/);
});
