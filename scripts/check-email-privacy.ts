// Local reducer/subscription integration check. No email provider calls.
import assert from "node:assert/strict";
import { DbConnection } from "../src/module_bindings";
const host = "http://127.0.0.1:3000";
const database = process.env.TEST_DATABASE || "mela-pen-feel-0906";
const connections: DbConnection[] = [];
async function connect() {
  return new Promise<DbConnection>((resolve, reject) => {
    const db = DbConnection.builder()
      .withUri(host)
      .withDatabaseName(database)
      .onConnect((c) => resolve(c))
      .onConnectError((_c, e) => reject(e))
      .build();
    connections.push(db);
  });
}
async function subscribe(db: DbConnection, sql: string) {
  return new Promise<void>((resolve, reject) =>
    db
      .subscriptionBuilder()
      .onApplied(() => resolve())
      .onError((ctx) => reject(ctx.event))
      .subscribe(sql),
  );
}
try {
  const a = await connect(),
    b = await connect();
  await subscribe(a, "SELECT * FROM my_email_contact");
  await subscribe(b, "SELECT * FROM my_email_contact");
  assert.equal([...b.db.myEmailContact.iter()].length, 0);
  await assert.rejects(a.reducers.onboard({ displayName: "EmailRuleQA" }));
  await assert.rejects(
    a.reducers.onboardWithEmail({
      displayName: "EmailRuleQA",
      email: "old@users.invalid",
    }),
  );
  await a.reducers.onboardWithEmail({
    displayName: "EmailRuleQA",
    email: "rules@example.com",
  });
  // Wait on the actual subscription update, not a simulated store.
  if (![...a.db.myEmailContact.iter()].length)
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("subscription timeout")),
        3000,
      );
      a.db.myEmailContact.onInsert(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  const own = [...a.db.myEmailContact.iter()];
  assert.equal(own.length, 1);
  assert.equal(own[0].email, "rules@example.com");
  assert.equal(own[0].verified, false);
  assert.equal(
    [...b.db.myEmailContact.iter()].length,
    0,
    "second identity cannot read first email",
  );
  await assert.rejects(subscribe(b, "SELECT * FROM email_contact"));
  await assert.rejects(
    a.reducers.onboardWithEmail({
      displayName: "EmailRuleQA",
      email: "different@example.com",
    }),
  );
  await a.reducers.onboardWithEmail({
    displayName: "EmailRuleQA",
    email: "rules@example.com",
  });
  assert.equal([...a.db.myEmailContact.iter()].length, 1);
  console.log(
    "PASS: real reducer validation, immutable contact, retry safety, own-view subscription, cross-identity privacy, private-table denial.",
  );
} finally {
  for (const db of connections) db.disconnect();
}
