import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const parentDirectory = '..';
const source = (...parts) => new URL([parentDirectory, ...parts].join('/'), import.meta.url);
const { analyzeText } = await import(source('scripts', 'analyze.mjs'));
const { markdownFormatting } = await import(source('scripts', 'core', 'markdown-findings.mjs'));

test('long malformed ignore marker does not cause backtracking stall', () => {
  const script = `import { applyIgnoreDirectives } from './scripts/core/ignore-directives.mjs'; applyIgnoreDirectives('!' + ' '.repeat(200000) + 'X');`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { cwd: fileURLToPath(source()), timeout: 5000 });
  assert.equal(result.status, 0, result.error?.message ?? result.stderr?.toString());
});

test('HTML alternate comment ending does not conceal later headings', () => {
  const text = '<!-- hidden --!>\n# ✨ Visible\n';
  const findings = markdownFormatting(text, [true, true], { sentences: [] });
  assert.ok(findings.some((finding) => finding.type === 'DECORATIVE_HEADING'));
});
const read = async (name) => readFile(source('tests', 'fixtures', 'probes', `${name}.md`), 'utf8');

test('short and long texts expose rhythm coverage without changing status', async () => {
  const seven = analyzeText(await read('evasion-id'), { language: 'id' });
  assert.equal(seven.status, 'PASS');
  assert.equal(seven.rhythmEvaluated, false);
  assert.equal(seven.warning, 'Rhythm statistics skipped: fewer than 8 sentences; only lexical, structural and domain checks ran.');
  assert.deepEqual(seven.failedGates, []);
  const ten = analyzeText(await read('evasion-id-10'), { language: 'id' });
  assert.equal(ten.rhythmEvaluated, true);
  assert.equal(ten.status, 'FAIL');
  assert.deepEqual(ten.failedGates, ['score', 'burstinessCV', 'adjacentDelta', 'sentenceRange']);
  const lexical = analyzeText(await read('ai-en'), { language: 'en' });
  assert.deepEqual(lexical.failedGates, ['forbiddenFinding', 'score']);
  const short = analyzeText('A short sentence.', { language: 'en' });
  assert.equal(short.rhythmEvaluated, false);
  assert.equal(short.warning, 'Text too short for statistical stylometry (< 8 sentences)');
  assert.deepEqual(short.failedGates, []);
});

test('failed gates identify actual causes including short lexical failures', async () => {
  const short = analyzeText('In conclusion, this solution is important.', { language: 'en' });
  assert.equal(short.status, 'FAIL');
  assert.ok(short.failedGates.includes('errorFinding'));
  const failed = analyzeText(await read('tech-readme'), { language: 'en' });
  assert.notEqual(failed.status, 'FAIL');
  assert.ok(!failed.failedGates.includes('sentenceRange'));
  assert.ok(!failed.failedGates.includes('score'));
  const scored = analyzeText(await read('human-en'), { language: 'en', profile: { thresholds: { passScore: 101 } } });
  assert.equal(scored.status, 'FAIL');
  assert.ok(scored.failedGates.includes('score'));
});

test('long-sentence gate waiver stops at 18 words', async () => {
  const text = await read('tech-readme');
  const variant = (suffix) => text.replace('using sudo.', `using sudo ${suffix}.`).replace('be ignored.', `be ignored ${suffix}.`);
  const under = analyzeText(variant('immediately'), { language: 'en' });
  const boundary = analyzeText(variant('promptly now'), { language: 'en' });
  assert.equal(under.status, 'PASS');
  assert.equal(boundary.status, 'FAIL');
  assert.ok(boundary.failedGates.includes('sentenceRange'));
});

test('human and brief CLI disclose rhythm coverage and failed gates', async () => {
  const script = fileURLToPath(source('scripts', 'analyze.mjs'));
  const text = await read('evasion-id');
  const human = spawnSync(process.execPath, [script, '--stdin', '--lang', 'id'], { input: text, encoding: 'utf8' });
  assert.equal(human.status, 0);
  assert.match(human.stdout, /Rhythm evaluated: no/);
  assert.match(human.stdout, /Warning: Rhythm statistics skipped/);
  const failure = spawnSync(process.execPath, [script, '--stdin', '--lang', 'id'], { input: await read('evasion-id-10'), encoding: 'utf8' });
  assert.equal(failure.status, 1);
  assert.match(failure.stdout, /Failed gates: score, burstinessCV, adjacentDelta, sentenceRange/);
  const brief = spawnSync(process.execPath, [script, '--stdin', '--lang', 'id', '--json', '--brief'], { input: text, encoding: 'utf8' });
  assert.equal(brief.status, 0);
  const result = JSON.parse(brief.stdout);
  assert.equal(result.rhythmEvaluated, false);
  assert.match(result.warning, /Rhythm statistics skipped/);
  assert.deepEqual(result.failedGates, []);
});
