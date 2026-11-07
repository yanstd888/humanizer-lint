import { promises as fs } from 'node:fs';
const { readFile, writeFile } = fs;

const parentDirectory = '..';
const root = new URL(`${parentDirectory}/`, import.meta.url);
const packs = await Promise.all(['id', 'en'].map(async (language) => JSON.parse(await readFile(new URL(`rules/${language}-slop.json`, root), 'utf8'))));
const hooks = packs.flatMap((pack) => pack.editorial.rhetoricalHooks);
const output = `// Generated from rules/{id,en}-slop.json; run node scripts/sync-rhetorical-hooks.mjs.\n// Static fallback preserves cross-language analysis when rule packs are unavailable.\nexport const RHETORICAL_HOOKS = ${JSON.stringify(hooks, null, 2)};\n`;
await writeFile(new URL('scripts/core/rhetorical-hooks.mjs', root), output);
