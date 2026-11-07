import { promises as fs } from 'node:fs';
const { readFile, writeFile } = fs;

const parentDirectory = '..';
const root = new URL(`${parentDirectory}/`, import.meta.url);
const [id, en, ms] = await Promise.all(['id', 'en', 'ms'].map(async (language) => JSON.parse(await readFile(new URL(`rules/${language}-slop.json`, root), 'utf8'))));

const idExclusiveWords = id.editorial.exclusiveWords;
const msExclusiveWords = ms.editorial.exclusiveWords;
const splitConnectives = [...id.editorial.splitConnectives, ...en.editorial.splitConnectives];
const fallbackReplacements = en.editorial.fallbackReplacements;
const attributionPacks = [en, id].filter((pack) => pack.editorial?.attributionBypass);
const attributionBypassPattern = `(?:${attributionPacks.map((pack) => pack.editorial.attributionBypass).join('|')})`;

const output = `// Generated from rules/{id,en,ms}-slop.json; run node scripts/sync-editorial-fallbacks.mjs.
// Static fallback preserves cross-language analysis when rule packs are unavailable.
export const DEFAULT_ID_EXCLUSIVE_WORDS = ${JSON.stringify(idExclusiveWords, null, 2)};

export const DEFAULT_MS_EXCLUSIVE_WORDS = ${JSON.stringify(msExclusiveWords, null, 2)};

export const DEFAULT_SPLIT_CONNECTIVES = ${JSON.stringify(splitConnectives, null, 2)};

// ponytail: recognizes explicit EN/ID attribution only; use a citation parser for broader coverage.
export const DEFAULT_ATTRIBUTION_BYPASS_PATTERN = ${JSON.stringify(attributionBypassPattern)};

export const DEFAULT_ATTRIBUTION_BYPASS = new RegExp(DEFAULT_ATTRIBUTION_BYPASS_PATTERN, 'u');

export const DEFAULT_FALLBACK_REPLACEMENTS = ${JSON.stringify(fallbackReplacements, null, 2)};
`;

await writeFile(new URL('scripts/core/editorial-fallbacks.mjs', root), output);
console.log('Synchronized scripts/core/editorial-fallbacks.mjs');
