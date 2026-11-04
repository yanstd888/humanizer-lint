import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const runAnalyzer = (args, input) => spawnSync(process.execPath, [path.join(root, 'scripts', 'analyze.mjs'), ...args], { input, encoding: 'utf8' });
const readme = readFileSync(path.join(root, 'README.md'), 'utf8').replace(/\r\n/g, '\n');
const markers = [...readme.matchAll(/<!--\s*(BEGIN|END):generated:([^\s>]+)\s*-->/gu)].map((match) => `${match[1]}:${match[2]}`).sort();
assert.deepEqual(markers, ['BEGIN:id-after', 'BEGIN:id-before', 'BEGIN:json-example', 'END:id-after', 'END:id-before', 'END:json-example'], 'unexpected or missing generated marker');
const table = readme.split('### Analyzer\n')[1]?.split('### Voice fingerprint\n')[0];
if (!table) throw new Error('README analyzer reference missing');
const help = execFileSync(process.execPath, [path.join(root, 'scripts', 'analyze.mjs'), '--help'], { encoding: 'utf8' });
const flags = [...new Set(help.match(/--[a-z][a-z-]+/g))];
const documentedFlags = new Set([...table.matchAll(/^\| `(--[a-z][a-z-]+)(?=[ `])/gm)].map((match) => match[1]));
for (const flag of flags) if (!documentedFlags.has(flag)) throw new Error(`README analyzer table missing ${flag}`);
const block = readme.match(/<!-- BEGIN:generated:json-example -->\n([\s\S]*?)\n<!-- END:generated:json-example -->/);
if (!block || (readme.match(/<!-- (?:BEGIN|END):generated:json-example -->/g) ?? []).length !== 2) throw new Error('README generated JSON block missing or duplicated');
const example = block[1].match(/^```json\n([\s\S]*?)\n```$/)?.[1];
if (!example) throw new Error('README JSON example missing');
const expected = JSON.parse(example);
const actual = JSON.parse(execFileSync(process.execPath, [path.join(root, 'scripts', 'analyze.mjs'), '--stdin', '--json'], { input: 'A short sentence.', encoding: 'utf8' }));
for (const key of Object.keys(expected)) assert.deepEqual(expected[key], actual[key], `README JSON example differs for ${key}`);
for (const [label, status, score] of [['Before', 'FAIL', 95], ['After', 'PASS', 100]]) {
  const section = readme.split(`### ${label} —`)[1]?.split('```text\n')[1]?.split('\n```')[0];
  assert.ok(section, `README ${label} example missing`);
  const run = runAnalyzer(['--stdin', '--lang', 'en', '--json'], section);
  const result = JSON.parse(run.stdout);
  assert.equal(result.status, status);
  assert.equal(result.score, score);
}
for (const name of ['id-before', 'id-after']) {
  const markers = readme.match(new RegExp(`<!-- (?:BEGIN|END):generated:${name} -->`, 'g')) ?? [];
  assert.equal(markers.length, 2, `README ${name} markers missing or duplicated`);
  const section = readme.match(new RegExp(`<!-- BEGIN:generated:${name} -->\\n\\*\\*(?:Before|After) — (PASS|FAIL|SKIP), score (\\d+):\\*\\*\\n\\n> ([^\\n]+)\\n<!-- END:generated:${name} -->`));
  assert.ok(section, `README ${name} block missing or malformed`);
  const run = runAnalyzer(['--stdin', '--lang', 'id', '--json'], section[3]);
  const result = JSON.parse(run.stdout);
  assert.equal(result.status, section[1], `README ${name} status`);
  assert.equal(result.score, Number(section[2]), `README ${name} score`);
  assert.equal(result.violations.some((v) => v.type === 'SLOP_PHRASE'), name === 'id-before', `README ${name} lexical findings`);
}
console.log(`docs snapshot: ${flags.length} CLI flags, JSON values, and examples verified`);
