/** Presentation identity, never an authentication credential. */
export function guestName(identity: string): string {
  if (!/^[a-f0-9]{64}$/i.test(identity)) throw new Error("Invalid identity");
  const colors = [
    "Mango",
    "Teal",
    "Sunny",
    "Coral",
    "Mint",
    "Indigo",
    "Amber",
    "Silver",
  ];
  const things = [
    "Kite",
    "Pencil",
    "Comet",
    "Marble",
    "Peacock",
    "Spark",
    "Tiger",
    "Cloud",
  ];
  const n = Number.parseInt(identity.slice(-8), 16);
  return `${colors[n % colors.length]} ${things[(n >>> 3) % things.length]} ${100 + (n % 900)}`;
}

export const ENTRY_GAMES = [
  "lobby",
  "book_cricket",
  "pen_fight",
  "dots_boxes",
  "gilli_danda",
  "four_row",
  "last_stick",
] as const;
export function validEntryGame(kind: string): boolean {
  return (ENTRY_GAMES as readonly string[]).includes(kind);
}

/** Claims come from SpacetimeDB-validated JWTs, never reducer arguments. */
export function isProtectedIdentity(
  jwt:
    | {
        issuer?: string;
        audience?: readonly string[];
        fullPayload?: Record<string, unknown>;
      }
    | undefined,
): boolean {
  return Boolean(
    jwt?.issuer === "https://auth.spacetimedb.com/oidc" &&
    jwt.audience?.includes("client_034JneP1uzy8V3MhC39IXp") &&
    jwt.fullPayload?.email_verified === true &&
    typeof jwt.fullPayload?.email === "string" &&
    jwt.fullPayload.email.includes("@"),
  );
}
