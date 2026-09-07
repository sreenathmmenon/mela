import test from "node:test";
import assert from "node:assert/strict";
import { summarizeRoom } from "../spacetimedb/src/roomRules";

test("empty and spectator-only rooms are not advertised as hosted", () => {
  assert.deepEqual(summarizeRoom("host", []), {
    hostPresent: false,
    spectators: 0,
  });
  assert.deepEqual(
    summarizeRoom("host", [{ identity: "watcher", spectator: true }]),
    { hostPresent: false, spectators: 1 },
  );
});
test("spectator counts deduplicate tabs and exclude non-spectator participants", () => {
  assert.deepEqual(
    summarizeRoom("host", [
      { identity: "host", spectator: false },
      { identity: "watcher", spectator: true },
      { identity: "watcher", spectator: true },
      { identity: "agent", spectator: false },
    ]),
    { hostPresent: true, spectators: 1 },
  );
});
