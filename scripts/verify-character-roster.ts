import assert from "node:assert/strict";
import { DbConnection } from "../src/module_bindings";
import { CHARACTER_PRESETS } from "../spacetimedb/src/arenaCharacter";
const clients: DbConnection[] = [];
async function connect(token?: string) {
  const c = await new Promise<DbConnection>((resolve, reject) =>
    DbConnection.builder()
      .withUri("http://127.0.0.1:3000")
      .withDatabaseName(process.env.TEST_SPACETIME_DB || "mela-v3-moments-0915")
      .withToken(token)
      .onConnect(resolve)
      .onConnectError((_c, e) => reject(e))
      .build(),
  );
  clients.push(c);
  await new Promise<void>((resolve, reject) =>
    c
      .subscriptionBuilder()
      .onApplied(() => resolve())
      .onError(reject)
      .subscribe(
        [
          "my_saved_arena_characters",
          "my_arena_character_entries",
          "arena_character_entry",
          "match",
          "arena_state",
          "arena_production",
          "arena_frame",
          "match_memory",
        ].map((t) => `SELECT * FROM ${t}`),
      ),
  );
  return c;
}
async function until(f: () => boolean, label: string, ms = 80000) {
  const end = Date.now() + ms;
  while (!f()) {
    if (Date.now() > end) throw Error(label);
    await new Promise((r) => setTimeout(r, 30));
  }
}
try {
  const owner = await connect(),
    stranger = await connect();
  const original = JSON.stringify(CHARACTER_PRESETS[0]);
  await Promise.all([
    owner.reducers.saveArenaCharacter({ character: original, parentId: 0n }),
    owner.reducers.saveArenaCharacter({ character: original, parentId: 0n }),
  ]);
  assert.equal(
    [...owner.db.mySavedArenaCharacters.iter()].length,
    1,
    "repeat save retains identity",
  );
  const first = [...owner.db.mySavedArenaCharacters.iter()][0];
  assert.equal(
    [...stranger.db.mySavedArenaCharacters.iter()].length,
    0,
    "unused roster stays private",
  );
  await assert.rejects(() =>
    stranger.reducers.saveArenaCharacter({
      character: JSON.stringify(CHARACTER_PRESETS[1]),
      parentId: first.id,
    }),
  );
  await assert.rejects(() =>
    owner.reducers.saveArenaCharacter({
      character: '{"name":"broken"}',
      parentId: 0n,
    }),
  );
  const launch = {
    gameKind: "bridge_breakers",
    mode: "agents",
    amber: original,
    teal: JSON.stringify(CHARACTER_PRESETS[1]),
    amberId: first.id,
    tealId: 0n,
    courseId: 0n,
    agent: undefined,
  };
  await assert.rejects(() =>
    stranger.reducers.createSavedCharacterArena(launch),
  );
  await owner.reducers.createSavedCharacterArena({
    ...launch,
    amber: '{"name":"Forged"}',
  });
  const latest = () =>
    [...owner.db.match.iter()]
      .filter((m) => m.playerIdentity.isEqual(owner.identity!))
      .sort((a, b) => Number(b.id - a.id))[0];
  const match = latest().id;
  assert.equal(
    owner.db.arenaProduction.matchId.find(match)!.amber,
    original,
    "server saved tactics override forged browser fields",
  );
  const edited = JSON.stringify({
    ...CHARACTER_PRESETS[0],
    name: "Chai Fox II",
    pace: "steady",
  });
  await owner.reducers.saveArenaCharacter({
    character: edited,
    parentId: first.id,
  });
  const editions = [...owner.db.mySavedArenaCharacters.iter()];
  assert.equal(editions.length, 2);
  assert.equal(editions.find((c) => c.id !== first.id)!.edition, 2);
  assert.equal(
    owner.db.arenaProduction.matchId.find(match)!.amber,
    original,
    "edition does not rewrite active match",
  );
  await until(
    () => owner.db.matchMemory.matchId.find(match) !== null,
    "autonomous saved-character duel",
  );
  assert.equal(
    [...owner.db.myArenaCharacterEntries.iter()].find(
      (e) => e.matchId === match,
    )!.amberId,
    first.id,
  );
  assert.equal([...stranger.db.myArenaCharacterEntries.iter()].length, 0);
  const resumed = await connect(owner.token);
  assert.equal(
    [...resumed.db.mySavedArenaCharacters.iter()].length,
    2,
    "roster survives reconnect",
  );
  await owner.reducers.createSavedCharacterArena({
    ...launch,
    gameKind: "mela_heist",
  });
  const heist = latest().id;
  await until(
    () => owner.db.matchMemory.matchId.find(heist) !== null,
    "same character another arena",
  );
  assert.equal(
    [...owner.db.myArenaCharacterEntries.iter()].filter(
      (e) => e.amberId === first.id,
    ).length,
    2,
  );
  assert.equal(owner.db.arenaProduction.matchId.find(match)!.amber, original);
  console.log(
    JSON.stringify({
      checks:
        "PASS: private roster, owner authorization, duplicate save, immutable editions, forged traits ignored, reconnect, two complete autonomous games",
      character: String(first.id),
      matches: [String(match), String(heist)],
    }),
  );
} finally {
  for (const c of clients) c.disconnect();
}
