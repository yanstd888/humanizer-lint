import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const parentDirectory = '..';
const projectModule = (...segments) => new URL([parentDirectory, ...segments].join('/'), import.meta.url);
const { analyzeText } = await import(projectModule('scripts', 'analyze.mjs'));

let rootPath = decodeURIComponent(projectModule().pathname);
if (/^\/[A-Za-z]:/.test(rootPath)) rootPath = rootPath.slice(1);
const probesDirectory = path.join(path.resolve(rootPath), 'tests', 'fixtures', 'probes');
const probe = async (name) => (await readFile(path.join(probesDirectory, `${name}.md`), 'utf8')).replaceAll(String.fromCharCode(13), '');
const analyzeProbe = async (name) => analyzeText(await probe(name), { language: 'auto', sourcePath: `${name}.md` });

// Expectations from the quality-pass task, section 1. Probes whose target state is not
// reached at the baseline commit are marked { todo: true } and flip to enforced asserts as
// the corresponding task (T2, T3, T5) lands.

test('probe ai-id stays FAIL', async () => {
  assert.equal((await analyzeProbe('ai-id')).status, 'FAIL');
});

test('probe ai-en stays FAIL', async () => {
  assert.equal((await analyzeProbe('ai-en')).status, 'FAIL');
});

test('probe human-id stays PASS', async () => {
  assert.equal((await analyzeProbe('human-id')).status, 'PASS');
});

test('probe human-en stays PASS', async () => {
  assert.equal((await analyzeProbe('human-en')).status, 'PASS');
});

test('probe evasion-id-10 stays FAIL', async () => {
  assert.equal((await analyzeProbe('evasion-id-10')).status, 'FAIL');
});

// T3: a clean technical README must stop failing on the sentence-range gate.
test('probe tech-readme is not FAIL', { todo: true }, async () => {
  assert.notEqual((await analyzeProbe('tech-readme')).status, 'FAIL');
});

// T2: a 7-sentence text must disclose that rhythm statistics were skipped.
test('probe evasion-id carries the rhythm-not-evaluated marker', async () => {
  const result = await analyzeProbe('evasion-id');
  assert.equal(result.rhythmEvaluated, false);
  assert.match(result.warning ?? '', /Rhythm statistics skipped/);
});
