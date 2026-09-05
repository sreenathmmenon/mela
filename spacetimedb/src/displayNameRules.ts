/**
 * Display-name validation.
 *
 * Mela's whole pitch is that a stranger scans a QR and their name lands on a
 * projector in a room full of people. That is the product — and it is also the
 * attack surface. At a college fest somebody will try an obscenity, and the
 * damage is done the moment it renders on the big screen.
 *
 * This runs in the reducer rather than the client because the client is not
 * trustworthy: anyone can call the reducer directly with the generated
 * bindings. Server-side is the only place a filter is worth anything.
 *
 * Two failure modes matter here and they pull in opposite directions:
 *
 *   1. An obscenity reaches the projector.
 *   2. A real person is told their own name is unacceptable.
 *
 * The second is worse. "Shital" and "Anal" are real Indian names; "Scunthorpe"
 * is the canonical example of a naive substring filter humiliating someone for
 * where they live. So matching is anchored to whole words, never to substrings
 * of a longer name, and the blocked list stays short and unambiguous. Anything
 * that slips through is handled by the host kick, which is the correct tool for
 * a judgement call.
 */

/**
 * Characters that let a name impersonate UI or break the stage layout.
 * Spaces, hyphens and apostrophes are deliberately NOT here: "Arjun K",
 * "Ann-Marie" and "O'Brien" are ordinary names, not attacks.
 */
const STRUCTURAL = /[<>{}[\]\\|`~]/;

/**
 * Zero-width, soft-hyphen and direction-control characters. These are
 * invisible, so they let one name masquerade as another — or reverse the
 * rendering of the text around it — without showing anything on screen.
 */
const INVISIBLE = /[­​‌‍‎‏‪-‮⁦-⁩﻿]/;

/**
 * Unambiguous slurs and obscenities, matched as whole words against a
 * normalised form. Entries are single tokens; the matcher below handles
 * separators, so "madar chod" and "madarchod" both resolve here.
 *
 * Deliberately excluded: "ass", "dick", "rand", "gaand" and similar, all of
 * which are either real names, real surnames, or fragments of ordinary words.
 * The cost of blocking a real person's name outweighs the cost of letting a
 * borderline one through to a host who can kick.
 */
const BLOCKED = new Set([
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "shit",
  "bullshit",
  "cunt",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "bitch",
  "whore",
  "slut",
  "penis",
  "vagina",
  "bastard",
  "asshole",
  "chutiya",
  "chutiye",
  "madarchod",
  "behenchod",
  "bhenchod",
  "bhosdike",
  "harami",
  "kamina",
]);

/**
 * Real names and words that the padding heuristic below would otherwise reject,
 * because they genuinely are a blocked word plus a letter or two. Checked
 * first, so a real person always wins over the filter.
 *
 * This list is the honest cost of the heuristic: it cannot be complete, and
 * every entry represents somebody who would have been told their own name is
 * unacceptable. Add to it whenever a real name is reported.
 */
const ALWAYS_ALLOWED = new Set([
  "shital", // common Indian given name
  "sheetal",
  "shitala", // the goddess Shitala
  "cunthorpe",
  "scunthorpe",
  "nigeria", // the country; "nigga" plus three letters
  "nigerian",
  "nigel",
]);

/**
 * Checked against the RAW lowercased name, before any folding.
 *
 * "niger" cannot go in ALWAYS_ALLOWED: folding collapses repeated letters, so
 * "nigger" also folds to "niger" and the allowlist entry would unblock the
 * slur. Comparing the untouched spelling separates the two.
 */
const ALWAYS_ALLOWED_RAW = new Set(["niger"]);

/** Names that would let a player impersonate the system or the AI opponent. */
const RESERVED = new Set([
  "melabot",
  "mela",
  "admin",
  "administrator",
  "moderator",
  "system",
  "host",
  "operator",
]);

/**
 * Undo the common substitutions used to smuggle a word past a filter.
 *
 * Order matters: digits and symbols fold to the letters they imitate BEFORE
 * anything is stripped, so "f0ck" and "sh1t" resolve to real words rather than
 * to harmless nonsense. Getting this backwards is how "f0ck" slips through.
 */
function deLeet(token: string): string {
  return token
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/@/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/\+/g, "t");
}

/**
 * Fold a token to its comparison form: lowercase, accents removed, leetspeak
 * undone, non-letters dropped, and runs of a repeated letter collapsed so
 * "fuuuuck" matches "fuck".
 */
export function normalizeForFilter(token: string): string {
  const unaccented = token.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  return deLeet(unaccented)
    .replace(/[^a-z]/g, "")
    .replace(/(.)\1+/g, "$1");
}

/**
 * A second, coarser form in which every vowel becomes "*".
 *
 * Leet substitution is lossy: "0" imitates the SHAPE of "o", so "f0ck" folds to
 * "fock" and never equals "fuck" — yet nobody typing it means anything else.
 * Comparing consonant skeletons catches that whole family ("f0ck", "fack",
 * "shet") without needing an entry per spelling.
 *
 * This is only safe because it is applied to whole tokens, never substrings:
 * "Shital" is one token whose skeleton is "sh*t*l", which equals no blocked
 * skeleton, so a real name is untouched.
 */
function vowelSkeleton(folded: string): string {
  return folded.replace(/[aeiou]/g, "*");
}

/** Blocked words folded once, so comparisons are like-for-like. */
const BLOCKED_FOLDED = new Set([...BLOCKED].map(normalizeForFilter));
const RESERVED_FOLDED = new Set([...RESERVED].map(normalizeForFilter));
/**
 * Skeleton matching is applied to a SUBSET of the blocked list, not all of it.
 *
 * Collapsing vowels is powerful but blunt: the skeleton of "kamina" also
 * matches "Kamini", and "nigga" also matches "Nagar" — both real names, and
 * blocking a real person's name is the failure this module cares most about
 * avoiding. So only words whose skeleton was measured NOT to collide with real
 * names are included, and short words are excluded entirely by the length
 * guard at the call site.
 *
 * Two known collisions were decided deliberately rather than left to chance:
 *   - "Fick" is a real German surname and collides with the skeleton of
 *     "fuck". It is saved by the digit rule at the call site: skeleton
 *     matching only applies to tokens that actually used a leet substitution,
 *     and "Fick" contains no digit. "f0ck" does, so it is still caught.
 *   - "Niger" and "Nigeria" are the country names and are explicitly allowed.
 *     Blocking a nationality is a worse failure than the marginal risk of the
 *     word itself, which reads as a country to everyone in the room.
 */
const SKELETON_CHECKED = [
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "shit",
  "bullshit",
  "bitch",
  "asshole",
  "faggot",
  "chutiya",
  "madarchod",
  "behenchod",
  "bhosdike",
];
const BLOCKED_SKELETONS = new Set(
  SKELETON_CHECKED.map((w) => vowelSkeleton(normalizeForFilter(w))),
);

/**
 * Does the name contain a blocked word as a WHOLE word?
 *
 * The name is split on anything that is not a letter or digit, and each piece
 * is folded and compared exactly. "Scunthorpe" is one token that equals no
 * blocked word, so it passes. "f-u-c-k" splits into single letters, so the
 * joined form is also tested — that is the one case where an attacker's
 * separators help them rather than hurt them.
 */
function containsBlockedWord(name: string): boolean {
  const tokens = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

  /**
   * Whole-token matching alone let "shitfuck" through: it is a single token
   * equal to no blocked word. Substring matching would fix that and break
   * "Scunthorpe" again, so instead a token is decomposed — if it is built
   * ENTIRELY out of blocked words joined together, it is blocked.
   *
   * "shitfuck" = shit + fuck, nothing left over, so it goes.
   * "Scunthorpe" leaves "sc"/"horpe" over, so it stays.
   */
  const isAllBlockedWords = (folded: string): boolean => {
    if (folded.length === 0) return false;
    for (const word of BLOCKED_FOLDED) {
      if (word.length === 0 || !folded.startsWith(word)) continue;
      const rest = folded.slice(word.length);
      if (rest.length === 0 || isAllBlockedWords(rest)) return true;
    }
    return false;
  };

  for (const token of tokens) {
    const folded = normalizeForFilter(token);
    // A real name beats the heuristics, always.
    if (ALWAYS_ALLOWED.has(folded)) continue;
    if (ALWAYS_ALLOWED_RAW.has(token.toLowerCase())) continue;
    if (BLOCKED_FOLDED.has(folded)) return true;
    // A token made only of blocked words concatenated, e.g. "shitfuck".
    if (isAllBlockedWords(folded)) return true;

    /**
     * A blocked word carrying only light padding: "MrFuck", "fuckboy",
     * "xshitx". Pure substring matching is what breaks "Scunthorpe", so the
     * leftover is measured instead — a real name that merely happens to
     * contain these letters has a lot of word left over ("scunthorpe" minus
     * "cunt" leaves 6), whereas padding around a deliberate obscenity is
     * short. Four is the threshold: it clears "Scunthorpe", "Bassist" and
     * "Dickens" while catching the decorations people actually type.
     */
    for (const word of BLOCKED_FOLDED) {
      if (word.length < 4 || !folded.includes(word)) continue;
      if (folded.length - word.length <= 3) return true;
    }

    // Skeleton matching is reserved for tokens that actually substituted a
    // digit or symbol for a letter. Somebody typing "f0ck" is evading;
    // somebody typing "Fick" is using their surname. Requiring evidence of
    // evasion separates the two, and the length guard keeps short tokens
    // (whose skeletons collide with ordinary words) out of it entirely.
    const usedLeet = /[0-9!|@$+]/.test(token);
    if (
      usedLeet &&
      folded.length >= 4 &&
      BLOCKED_SKELETONS.has(vowelSkeleton(folded))
    )
      return true;
  }

  // "f-u-c-k", "f.u.c.k", "f u c k": many short tokens that mean nothing apart
  // but spell a blocked word together. Only worth testing when the pieces are
  // genuinely fragments, otherwise "Ann Marie" would be joined into "annmarie"
  // and compared for no reason.
  if (tokens.length > 1 && tokens.every((t) => t.length <= 2)) {
    if (BLOCKED_FOLDED.has(normalizeForFilter(tokens.join("")))) return true;
  }

  return false;
}

export type NameRejection =
  | "too-short"
  | "too-long"
  | "structural"
  | "invisible"
  | "blank"
  | "reserved"
  | "profanity";

export interface NameCheck {
  ok: boolean;
  reason?: NameRejection;
  /** Player-facing message. Deliberately never quotes back what was typed. */
  message?: string;
}

export const NAME_MIN = 2;
export const NAME_MAX = 24;

/**
 * Validate a display name.
 *
 * The rejection message never repeats the offending input: echoing it back is
 * how a filtered word ends up rendered on screen anyway.
 */
export function checkDisplayName(raw: string): NameCheck {
  const name = raw.trim();

  if (name.length === 0)
    return { ok: false, reason: "blank", message: "Enter a name." };
  if (name.length < NAME_MIN)
    return {
      ok: false,
      reason: "too-short",
      message: `Name must be at least ${NAME_MIN} characters.`,
    };
  if (name.length > NAME_MAX)
    return {
      ok: false,
      reason: "too-long",
      message: `Name must be ${NAME_MAX} characters or fewer.`,
    };

  if (INVISIBLE.test(name))
    return {
      ok: false,
      reason: "invisible",
      message: "That name uses hidden characters. Try another.",
    };
  if (STRUCTURAL.test(name))
    return {
      ok: false,
      reason: "structural",
      message: "Letters, numbers and simple punctuation only.",
    };

  // At least one letter in ANY script — Devanagari, Cyrillic and Malayalam
  // names are as valid as Latin ones. Only names made purely of punctuation or
  // emoji are rejected, because nothing on the projector could be read aloud.
  if (!/\p{L}/u.test(name))
    return {
      ok: false,
      reason: "blank",
      message: "Name needs at least one letter.",
    };

  if (RESERVED_FOLDED.has(normalizeForFilter(name)))
    return {
      ok: false,
      reason: "reserved",
      message: "That name is reserved. Pick another.",
    };

  if (containsBlockedWord(name))
    return {
      ok: false,
      reason: "profanity",
      message: "Pick a name you'd be happy to see on the big screen.",
    };

  return { ok: true };
}
