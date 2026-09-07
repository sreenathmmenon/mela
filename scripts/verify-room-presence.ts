import assert from "node:assert/strict";
import { DbConnection } from "../src/module_bindings";

const clients: DbConnection[] = [];
async function connect(token?: string) {
  const c = await new Promise<DbConnection>((resolve, reject) =>
    DbConnection.builder()
      .withUri("http://127.0.0.1:3000")
      .withDatabaseName(process.env.TEST_SPACETIME_DB || "mela-guest-0906")
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
      .onError((e) => reject(e.event))
      .subscribe(
        [
          "match",
          "room_activity",
          "match_spectator",
          "player_profile",
          "world_presence",
          "last_stick_state",
          "match_memory",
        ].map((t) => `SELECT * FROM ${t}`),
      ),
  );
  return c;
}
async function until(f: () => boolean) {
  const end = Date.now() + 10000;
  while (!f()) {
    if (Date.now() > end) throw Error("Room subscription failed to converge");
    await new Promise((r) => setTimeout(r, 25));
  }
}
try {
  const host = await connect(),
    watcher = await connect(),
    stranger = await connect();
  await host.reducers.enterGame({ gameKind: "pen_fight" });
  const m = [...host.db.match.iter()].find((m) =>
    m.playerIdentity.isEqual(host.identity!),
  )!;
  const room = () =>
    [...stranger.db.roomActivity.iter()].find((r) => r.matchId === m.id);
  assert.equal(
    room(),
    undefined,
    "an unfinished match alone is not an open room",
  );
  await assert.rejects(() =>
    stranger.reducers.setRoomPresence({ matchId: m.id }),
  );
  await host.reducers.setRoomPresence({ matchId: m.id });
  await until(() => room()?.hostPresent === true);
  await watcher.reducers.joinMatchAsSpectator({ matchId: m.id });
  assert.equal(room()?.spectators, 0, "membership alone is not presence");
  await watcher.reducers.setRoomPresence({ matchId: m.id });
  await until(() => room()?.spectators === 1);
  const sibling = await connect(watcher.token);
  await sibling.reducers.setRoomPresence({ matchId: m.id });
  assert.equal(room()?.spectators, 1, "same identity in two tabs counts once");
  watcher.disconnect();
  await sibling.reducers.setRoomPresence({ matchId: m.id });
  await until(() => room()?.spectators === 1);
  await sibling.reducers.setRoomPresence({ matchId: undefined });
  await until(() => room()?.spectators === 0);
  assert.ok(
    [...stranger.db.matchSpectator.iter()].some((s) => s.matchId === m.id),
    "leaving does not erase durable membership",
  );
  await host.reducers.setRoomPresence({ matchId: undefined });
  await until(() => !room()?.hostPresent);
  await host.reducers.setRoomPresence({ matchId: m.id });
  await until(() => room()?.hostPresent === true);
  const hostToken = host.token;
  host.disconnect();
  await until(() => !room()?.hostPresent);
  const returned = await connect(hostToken);
  await returned.reducers.setRoomPresence({ matchId: m.id });
  await until(() => room()?.hostPresent === true);
  await assert.rejects(() =>
    returned.reducers.setRoomPresence({ matchId: 999999999n }),
  );
  assert.equal(
    room()?.hostPresent,
    true,
    "invalid request preserves current presence",
  );
  const finisher = await connect();
  await finisher.reducers.enterGame({ gameKind: "last_stick" });
  const finalMatch = [...finisher.db.match.iter()].find((m) =>
    m.playerIdentity.isEqual(finisher.identity!),
  )!;
  await finisher.reducers.setRoomPresence({ matchId: finalMatch.id });
  await until(
    () =>
      stranger.db.roomActivity.matchId.find(finalMatch.id)?.hostPresent ===
      true,
  );
  while (finisher.db.match.id.find(finalMatch.id)?.status === "active") {
    await until(
      () =>
        finisher.db.lastStickState.matchId.find(finalMatch.id)?.turn !==
        "melabot",
    );
    const state = finisher.db.lastStickState.matchId.find(finalMatch.id)!;
    if (state.turn === "complete") break;
    await finisher.reducers.playStrategyMove({
      matchId: finalMatch.id,
      revision: state.revision,
      choice: 1,
    });
  }
  await until(
    () =>
      stranger.db.matchMemory.matchId.find(finalMatch.id) !== null &&
      !stranger.db.roomActivity.matchId.find(finalMatch.id),
  );
  assert.ok(stranger.db.matchMemory.matchId.find(finalMatch.id));
  await assert.rejects(() =>
    finisher.reducers.setRoomPresence({ matchId: finalMatch.id }),
  );
  console.log(
    "PASS: authorized room entry, saved-vs-connected membership, realtime host leave/resume/disconnect/reconnect, duplicate-tab deduplication, invalid-action rollback, completed room removed with durable memory retained.",
  );
} finally {
  for (const c of clients) c.disconnect();
}
