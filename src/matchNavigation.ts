/** A location is a request to view a match, never permission to join its seats. */
export function matchFromLocation(search: string): bigint | null {
  const query = new URLSearchParams(search);
  if (["join", "memory", "seat"].some((key) => query.has(key))) return null;
  const value = query.get("match");
  return value && /^[1-9][0-9]{0,19}$/.test(value) ? BigInt(value) : null;
}

export function matchLocation(
  href: string,
  destination: { kind: "home" } | { kind: "match" | "memory"; id: bigint },
): string {
  const url = new URL(href);
  for (const key of ["join", "match", "memory"]) url.searchParams.delete(key);
  if (destination.kind !== "home")
    url.searchParams.set(destination.kind, String(destination.id));
  return url.href;
}

export function followMatchDestination(
  match: { id: bigint; status: string } | undefined,
) {
  if (!match) return null;
  if (match.status === "active")
    return { href: `?join=${match.id}`, label: "Follow the next match →" };
  if (match.status === "complete")
    return { href: `?memory=${match.id}`, label: "Watch the next result →" };
  return null;
}
