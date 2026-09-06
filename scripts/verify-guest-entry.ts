import assert from "node:assert/strict";
import { DbConnection } from "../src/module_bindings";
const database = process.env.TEST_SPACETIME_DB || "mela-guest-0906";
const clients: DbConnection[] = [];
async function connect(token?: string) {
  const c = await new Promise<DbConnection>((resolve, reject) =>
    DbConnection.builder()
      .withUri("http://127.0.0.1:3000")
      .withDatabaseName(database)
      .withToken(token)
      .onConnect((c) => resolve(c))
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
          "player_profile",
          "match",
          "match_spectator",
          "my_account_status",
          "my_identity_link",
        ].map((t) => `SELECT * FROM ${t}`),
      ),
  );
  return c;
}
async function until(f: () => boolean) {
  const end = Date.now() + 10000;
  while (!f()) {
    if (Date.now() > end) throw Error("Subscription did not converge");
    await new Promise((r) => setTimeout(r, 25));
  }
}
try {
  const a = await connect(),
    b = await connect();
  const own = (c: DbConnection) =>
    [...c.db.playerProfile.iter()].find((p) => p.identity.isEqual(c.identity!));
  assert.equal(own(a), undefined);
  await assert.rejects(() => a.reducers.enterGame({ gameKind: "invalid" }));
  await assert.rejects(() =>
    a.reducers.joinMatchAsSpectator({ matchId: 999999999n }),
  );
  assert.equal(own(a), undefined, "invalid entry does not create a profile");
  await Promise.all([
    a.reducers.enterGame({ gameKind: "pen_fight" }),
    a.reducers.enterGame({ gameKind: "pen_fight" }),
  ]);
  await until(() => Boolean(own(a)));
  const mine = () =>
    [...a.db.match.iter()].filter((m) => m.playerIdentity.isEqual(a.identity!));
  assert.equal(mine().length, 1, "duplicate entry creates one match");
  const match = mine()[0];
  await a.reducers.enterGame({ gameKind: "book_cricket" });
  assert.equal(mine().length, 1, "entry resumes current live game");
  await b.reducers.joinMatchAsSpectator({ matchId: match.id });
  await b.reducers.joinMatchAsSpectator({ matchId: match.id });
  await until(() =>
    [...a.db.matchSpectator.iter()].some((s) =>
      s.identity.isEqual(b.identity!),
    ),
  );
  assert.ok(own(b), "crowd joins with generated profile and no email");
  assert.equal(
    [...b.db.matchSpectator.iter()].filter((s) =>
      s.identity.isEqual(b.identity!),
    ).length,
    1,
  );
  await b.reducers.onboard({ displayName: "Guest Crowd QA" });
  await until(() => own(b)?.displayName === "Guest Crowd QA");
  await assert.rejects(() =>
    b.reducers.completeProfileLink({ nonce: "a".repeat(64) }),
  );
  assert.equal([...b.db.myAccountStatus.iter()][0].protected, false);
  for (const gameKind of [
    "book_cricket",
    "dots_boxes",
    "gilli_danda",
    "four_row",
    "last_stick",
  ]) {
    const c = await connect();
    await c.reducers.enterGame({ gameKind });
    await until(() =>
      [...c.db.match.iter()].some(
        (m) => m.playerIdentity.isEqual(c.identity!) && m.gameKind === gameKind,
      ),
    );
  }
  console.log(
    "PASS: six direct guest game entries, no-form spectator entry, duplicate/resume safety, invalid rollback, nickname, anonymous recovery rejection, realtime convergence.",
  );
} finally {
  for (const c of clients) c.disconnect();
}
