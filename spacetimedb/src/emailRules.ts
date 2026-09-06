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

/**
 * Decide what to do with a private contact before a profile exists. A contact
 * can be written by an interrupted welcome flow, but it is not a person or a
 * claim on an email until the profile reducer commits. Only that incomplete
 * state may be repaired or replaced; established profiles remain immutable.
 */
export function emailOnboardingPlan(input: {
  hasProfile: boolean;
  address: string;
  contact?: { email: string; source: string };
}): "insert" | "keep" | "replace" | "reject" {
  if (!input.contact) return "insert";
  if (!input.hasProfile)
    return input.contact.email === input.address &&
      input.contact.source === "user_supplied"
      ? "keep"
      : "replace";
  return input.contact.email === input.address &&
    input.contact.source === "user_supplied"
    ? "keep"
    : "reject";
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
