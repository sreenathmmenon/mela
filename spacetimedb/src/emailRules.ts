/** Email is contact data, never an authentication or game-authority credential. */
export function realEmail(value: string): string {
  const email = value.trim().toLowerCase();
  const [local, domain] = email.split("@");
  if (
    email.length > 254 ||
    !local ||
    local.length > 64 ||
    !/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(
      email,
    ) ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..") ||
    /\.(invalid|test|localhost|example)$/i.test(domain)
  )
    throw new Error(
      "Enter your real email address to receive your welcome email.",
    );
  return email;
}

export function legacyEmail(identity: string): string {
  if (!/^[a-f0-9]{64}$/i.test(identity)) throw new Error("Invalid identity");
  return `${identity.toLowerCase()}@users.invalid`;
}

export function migrateLegacyContacts(ctx: any) {
  if (ctx.db.emailMigration.id.find(1)) return;
  for (const profile of ctx.db.playerProfile.iter()) {
    if (!ctx.db.emailContact.identity.find(profile.identity))
      ctx.db.emailContact.insert({
        identity: profile.identity,
        email: legacyEmail(profile.identity.toHexString()),
        source: "legacy_placeholder",
        verified: false,
        createdAt: ctx.timestamp,
      });
  }
  ctx.db.emailMigration.insert({ id: 1 });
}
