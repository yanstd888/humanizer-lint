// Generated from rules/{id,en,ms}-slop.json; run node scripts/sync-editorial-fallbacks.mjs.
// Static fallback preserves cross-language analysis when rule packs are unavailable.
export const DEFAULT_ID_EXCLUSIVE_WORDS = [
  "tidak",
  "karena",
  "bisa",
  "seperti",
  "dari",
  "bahwa"
];

export const DEFAULT_MS_EXCLUSIVE_WORDS = [
  "tak",
  "kerana",
  "boleh",
  "bagi",
  "daripada",
  "bahawa",
  "beliau"
];

export const DEFAULT_SPLIT_CONNECTIVES = [
  "sehingga",
  "tetapi",
  "namun",
  "karena",
  "however",
  "because",
  "while"
];

// ponytail: recognizes explicit EN/ID attribution only; use a citation parser for broader coverage.
export const DEFAULT_ATTRIBUTION_BYPASS_PATTERN = "(?:\\b(?:[Aa]ccording to)\\s+(?:(?:Dr|Prof)\\.\\s+)?(?!Dr\\b|Prof\\b)[A-Z][\\p{L}\\p{N}.-]+|\\b(?:[Mm]enurut)\\s+(?:(?:Dr|Prof)\\.\\s+)?(?!Dr\\b|Prof\\b)[A-Z][\\p{L}\\p{N}.-]+)";

export const DEFAULT_ATTRIBUTION_BYPASS = new RegExp(DEFAULT_ATTRIBUTION_BYPASS_PATTERN, 'u');

export const DEFAULT_FALLBACK_REPLACEMENTS = {
  "EXCESSIVE_NOMINALIZATION": "Replace the listed noun forms with a concrete actor and active verb.",
  "PASSIVE_BLOATING": "Name the actor, then use the active verb.",
  "SLOP_PHRASE": "Replace the stock phrase with the specific fact or action."
};
