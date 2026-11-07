import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, copyFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const parentDirectory = '..';
const { summarize, validateCorpus, evaluate, parseOptions, checkRegression, developmentPrompts } = await import(new URL([parentDirectory, 'scripts', 'eval.mjs'].join('/'), import.meta.url));
const { analyzeText } = await import(new URL([parentDirectory, 'index.mjs'].join('/'), import.meta.url));
const miniCorpus = fileURLToPath(new URL([parentDirectory, 'tests', 'fixtures', 'eval-mini', 'corpus'].join('/'), import.meta.url));
const miniBaseline = fileURLToPath(new URL([parentDirectory, 'tests', 'fixtures', 'eval-mini', 'eval-baseline.json'].join('/'), import.meta.url));
const runCli = (args, env) => spawnSync(process.execPath, [fileURLToPath(new URL([parentDirectory, 'scripts', 'eval.mjs'].join('/'), import.meta.url)), ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
const copyDir = async (from, to) => {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (entry.isDirectory()) await copyDir(path.join(from, entry.name), path.join(to, entry.name));
    else await copyFile(path.join(from, entry.name), path.join(to, entry.name));
  }
};

test('evaluation counts skip separately and computes confusion, Wilson and tied AUC', () => {
  const rows = [
    { label: 'ai', status: 'FAIL', score: 20 },
    { label: 'ai', status: 'PASS', score: 50 },
    { label: 'human', status: 'FAIL', score: 50 },
    { label: 'human', status: 'PASS', score: 90 },
    { label: 'human', status: 'SKIP', score: 100 },
  ];
  const report = summarize(rows);
  assert.deepEqual(report.confusion, { tp: 1, fn: 1, fp: 1, tn: 1, skipped: 1 });
  assert.equal(report.tpr, 0.5);
  assert.equal(report.fpr, 0.5);
  assert.equal(report.precision, 0.5);
  assert.equal(report.f1, 0.5);
  assert.equal(report.auc, 0.875);
  assert.ok(Math.abs(report.tprWilson95[0] - 0.094531) < 0.00001);
  assert.ok(Math.abs(report.tprWilson95[1] - 0.905469) < 0.00001);
  assert.equal(report.scores.human.median, 70);
});

test('manifest rejects missing files, duplicates, unsafe paths and unverified human labels', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'humanizer-eval-'));
  try {
    await mkdir(path.join(dir, 'human', 'en'), { recursive: true });
    await writeFile(path.join(dir, 'human', 'en', 'a.txt'), 'sample');
    const item = { id: 'a', file: 'human/en/a.txt', lang: 'en', label: 'human', genre: 'technical-doc', split: 'dev', wordCount: 1, provenance: 'author-written', license: 'MIT', retrievedDate: '2026-11-04', firstPublishedYear: 2019 };
    assert.equal((await validateCorpus(dir, [item], {})).length, 1);
    await assert.rejects(validateCorpus(dir, [{ ...item, wordCount: 2 }], {}), /wordCount/i);
    await assert.rejects(validateCorpus(dir, [item, item], {}), /duplicate/i);
    const { firstPublishedYear, ...unverified } = item;
    await assert.rejects(validateCorpus(dir, [unverified], {}), /human/i);
    await assert.rejects(validateCorpus(dir, [{ ...item, file: 'missing.txt' }], {}), /file/i);
    await assert.rejects(validateCorpus(dir, [{ ...item, file: path.resolve(dir, 'a.txt') }], {}), /path/i);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('manifest rejects identical text across development and holdout splits', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'humanizer-eval-leak-'));
  try {
    await writeFile(path.join(dir, 'dev.txt'), 'First sentence.\nSecond sentence.');
    await writeFile(path.join(dir, 'test.txt'), 'First sentence.\r\nSecond sentence.');
    const item = { id: 'dev', file: 'dev.txt', lang: 'en', label: 'human', genre: 'news', split: 'dev', wordCount: 4, provenance: 'author-written', license: 'MIT', retrievedDate: '2026-11-04', firstPublishedYear: 2019 };
    const holdout = { ...item, id: 'holdout', file: 'test.txt', split: 'test' };
    await assert.rejects(validateCorpus(dir, [item, holdout], {}), /cross-split duplicate/i);
    assert.equal((await validateCorpus(dir, [item, { ...holdout, split: 'dev' }], {})).length, 2);
    await writeFile(path.join(dir, 'test.txt'), 'Different sentence.\nSecond sentence.');
    assert.equal((await validateCorpus(dir, [item, holdout], {})).length, 2);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('evaluation groups and rule counts are deterministic', () => {
  const rows = [
    { id: 'b', lang: 'id', genre: 'marketing', split: 'dev', adversarial: 'none', label: 'ai', status: 'FAIL', score: 40, violations: [{ type: 'RULE' }, { type: 'RULE' }] },
    { id: 'a', lang: 'id', genre: 'marketing', split: 'dev', adversarial: 'none', label: 'human', status: 'PASS', score: 90, violations: [{ type: 'RULE' }] },
  ];
  const a = evaluate(rows);
  assert.equal(JSON.stringify(a), JSON.stringify(evaluate(rows.slice().reverse())));
  assert.deepEqual(a.rules.find((r) => r.ruleId === 'RULE'), { ruleId: 'RULE', human: 1, ai: 1 });
});

test('CLI produces deterministic output and default sweep reproduces the default', () => {
  const script = new URL([parentDirectory, 'scripts', 'eval.mjs'].join('/'), import.meta.url);
  const run = (args) => spawnSync(process.execPath, [fileURLToPath(script), ...args], { encoding: 'utf8' });
  const first = run(['--json']);
  const second = run(['--json']);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  const sweep = run(['--json', '--sweep', 'passScore=80']);
  assert.equal(sweep.status, 0, sweep.stderr);
  const value = JSON.parse(sweep.stdout);
  assert.deepEqual(value.sweep[0].aggregate, value.aggregate);
});

test('regression check enforces both metrics per language and rejects missing data', () => {
  const report = (en, id, devCorpus = [{ id: 'sample', text: 'original' }]) => ({ byLanguageSplit: { 'en:dev': en, 'id:dev': id }, devCorpus, devPrompts: {} });
  const baseline = report({ fpr: 0.1, tpr: 0.8 }, { fpr: 0.2, tpr: 0.9 });
  assert.deepEqual(checkRegression(report({ fpr: 0.12, tpr: 0.78 }, { fpr: 0.2, tpr: 0.9 }), baseline), []);
  assert.deepEqual(checkRegression(report({ fpr: 0.121, tpr: 0.779 }, { fpr: 0.2, tpr: 0.9 }), baseline), ['en:dev fpr regression', 'en:dev tpr regression']);
  assert.throws(() => checkRegression(report({ fpr: 0.1, tpr: null }, { fpr: 0.2, tpr: 0.9 }), baseline), /Insufficient/);
  assert.throws(() => checkRegression(report({ fpr: 0.1, tpr: 0.8 }, { fpr: 0.2, tpr: 0.9 }, [{ id: 'sample', text: 'modified' }]), baseline), /corpus/i);
  assert.throws(() => checkRegression(report({ fpr: 0.1, tpr: 0.8 }, { fpr: 0.2, tpr: 0.9 }), { ...baseline, devCorpus: undefined }), /corpus/i);
});

test('development prompt provenance participates in baseline identity', () => {
  const entries = [{ split: 'dev', label: 'ai', promptId: 'b' }, { split: 'test', label: 'ai', promptId: 'secret' }, { split: 'dev', label: 'ai', promptId: 'a' }];
  const selected = developmentPrompts(entries, { a: { text: 'one' }, b: { text: 'two' }, secret: { text: 'holdout' } });
  assert.deepEqual(selected, { a: { text: 'one' }, b: { text: 'two' } });
  const metrics = { 'en:dev': { fpr: 0, tpr: 1 }, 'id:dev': { fpr: 0, tpr: 1 } };
  const baseline = { devCorpus: [], devPrompts: selected, byLanguageSplit: metrics };
  assert.deepEqual(checkRegression(baseline, baseline), []);
  assert.throws(() => checkRegression({ ...baseline, devPrompts: { ...selected, a: { text: 'changed' } } }, baseline), /prompt/i);
  assert.throws(() => checkRegression({ ...baseline, devPrompts: undefined }, baseline), /prompt/i);
});

test('table output reports each dev group and rule counts', () => {
  const script = fileURLToPath(new URL([parentDirectory, 'scripts', 'eval.mjs'].join('/'), import.meta.url));
  const result = spawnSync(process.execPath, [script, '--split', 'dev', '--table'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Group metrics/);
  assert.match(result.stdout, /Rule counts \(dev documents\)/);
  assert.match(result.stdout, /legal-formal/);
  assert.match(result.stdout, /tprWilson95/);
  assert.match(result.stdout, /fprWilson95/);
  const sweep = spawnSync(process.execPath, [script, '--split', 'dev', '--table', '--sweep', 'passScore=70,80'], { encoding: 'utf8' });
  assert.equal(sweep.status, 0, sweep.stderr);
  assert.match(sweep.stdout, /Sweep passScore=70/);
  assert.match(sweep.stdout, /Sweep passScore=80/);
});

test('test or all split cannot be swept', () => {
  assert.throws(() => parseOptions(['--split', 'test', '--sweep', 'passScore=70,80']), /dev/i);
  assert.throws(() => parseOptions(['--split', 'all', '--sweep', 'passScore=70,80']), /dev/i);
  assert.equal(parseOptions(['--split', 'dev', '--sweep', 'passScore=70,80']).sweep.values.length, 2);
});

test('mini corpus validates and reproduces known confusion, Wilson, AUC and rule counts', async () => {
  const manifest = JSON.parse(await readFile(path.join(miniCorpus, 'manifest.json'), 'utf8'));
  const prompts = JSON.parse(await readFile(path.join(miniCorpus, 'prompts.json'), 'utf8'));
  const entries = await validateCorpus(miniCorpus, manifest, prompts);
  assert.equal(entries.length, manifest.length);
  const rows = entries.map((entry) => {
    const outcome = analyzeText(entry.text, { language: entry.lang, sourcePath: entry.file });
    return { ...entry, status: outcome.status, score: outcome.score, violations: outcome.violations };
  });
  const report = evaluate(rows.filter((row) => row.split === 'dev'));
  assert.equal(evaluate(rows).aggregate.n, 11);
  // Values characterized from the synthetic mini corpus; update deliberately when analyzer behavior changes.
  assert.deepEqual(report.aggregate.confusion, { tp: 2, fn: 2, fp: 2, tn: 2, skipped: 2 });
  assert.equal(report.aggregate.n, 10);
  assert.equal(report.aggregate.tpr, 0.5);
  assert.equal(report.aggregate.fpr, 0.5);
  assert.equal(report.aggregate.precision, 0.5);
  assert.equal(report.aggregate.f1, 0.5);
  assert.deepEqual(report.aggregate.tprWilson95, [0.150039, 0.849961]);
  assert.deepEqual(report.aggregate.fprWilson95, [0.150039, 0.849961]);
  assert.equal(report.aggregate.auc, 0.4375);
  assert.deepEqual(report.aggregate.scores, { ai: { n: 4, median: 90, p10: 73, p90: 100 }, human: { n: 4, median: 86, p10: 51, p90: 100 } });
  for (const key of ['en:dev', 'id:dev']) {
    const group = report.byLanguageSplit[key];
    assert.deepEqual(group.confusion, { tp: 1, fn: 1, fp: 1, tn: 1, skipped: 1 });
    assert.deepEqual(group.tprWilson95, [0.094531, 0.905469]);
    assert.equal(group.auc, 0.375);
  }
  assert.deepEqual(report.rules.find((r) => r.ruleId === 'MISSING_SENTENCE_RANGE'), { ruleId: 'MISSING_SENTENCE_RANGE', human: 2, ai: 0 });
  assert.deepEqual(report.rules.find((r) => r.ruleId === 'EN044'), { ruleId: 'EN044', human: 1, ai: 0 });
  assert.equal(JSON.stringify(report), JSON.stringify(evaluate(rows.filter((row) => row.split === 'dev').reverse())));
  assert.deepEqual(report.groups.map((g) => `${g.lang}:${g.genre}:${g.split}:${g.adversarial}`), [
    'en:blog-opinion:dev:none',
    'en:email-chat:dev:humanize-prompt',
    'en:email-chat:dev:none',
    'en:technical-doc:dev:none',
    'id:blog-opinion:dev:none',
    'id:blog-opinion:dev:synonym-swap',
    'id:email-chat:dev:none',
    'id:email-chat:dev:paraphrase',
    'id:technical-doc:dev:none',
  ]);
});

test('mini corpus manifest entries are rejected when metadata is malformed', async () => {
  const manifest = JSON.parse(await readFile(path.join(miniCorpus, 'manifest.json'), 'utf8'));
  const prompts = JSON.parse(await readFile(path.join(miniCorpus, 'prompts.json'), 'utf8'));
  const ai = manifest.find((item) => item.label === 'ai');
  const human = manifest.find((item) => item.verifiedHumanNote);
  await assert.rejects(validateCorpus(miniCorpus, [...manifest, { ...ai, id: ai.id }], prompts), /duplicate/i);
  await assert.rejects(validateCorpus(miniCorpus, [{ ...ai, wordCount: ai.wordCount + 1 }], prompts), /wordCount/i);
  await assert.rejects(validateCorpus(miniCorpus, [{ ...ai, file: 'ai/en/does-not-exist.txt' }], prompts), /file/i);
  await assert.rejects(validateCorpus(miniCorpus, [{ ...ai, file: [parentDirectory, 'escape.txt'].join('/') }], prompts), /path/i);
  await assert.rejects(validateCorpus(miniCorpus, [{ ...ai, generator: '  ' }], prompts), /AI provenance/i);
  await assert.rejects(validateCorpus(miniCorpus, [{ ...ai, promptId: 'unknown' }], prompts), /AI provenance/i);
  await assert.rejects(validateCorpus(miniCorpus, [ai, { ...ai, id: 'x' }], prompts), /duplicate file/i);
  const { verifiedHumanNote, ...unverified } = human;
  await assert.rejects(validateCorpus(miniCorpus, [unverified], prompts), /human provenance/i);
  await assert.rejects(validateCorpus(miniCorpus, [{ ...human, retrievedDate: '04-11-2026' }], prompts), /retrievedDate/i);
  await assert.rejects(validateCorpus(miniCorpus, [{ ...human, genre: 'poetry' }], prompts), /metadata/i);
});

test('CLI runs the mini corpus deterministically and reproduces the default profile in sweep', () => {
  const env = { HUMANIZER_EVAL_CORPUS: miniCorpus };
  const first = runCli(['--json'], env);
  const second = runCli(['--json'], env);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  const sweep = runCli(['--json', '--sweep', 'passScore=70,80'], env);
  assert.equal(sweep.status, 0, sweep.stderr);
  const value = JSON.parse(sweep.stdout);
  // passScore is score-only: no mini-corpus status flips between 70 and 80, so the 80 entry must reproduce the default aggregate exactly.
  assert.equal(value.sweep.length, 2);
  assert.equal(value.sweep[0].parameter, 'passScore');
  assert.deepEqual(value.sweep.find((entry) => entry.value === 80).aggregate, value.aggregate);
  assert.deepEqual(value.sweep.find((entry) => entry.value === 70).aggregate.confusion, value.aggregate.confusion);
  const testSplit = runCli(['--json', '--split', 'test'], env);
  assert.equal(testSplit.status, 0, testSplit.stderr);
  assert.equal(JSON.parse(testSplit.stdout).aggregate.n, 1);
  const bad = runCli(['--genre', 'poetry'], env);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /Invalid genre/);
});

test('current development corpus matches its recorded regression baseline', () => {
  const result = runCli(['--check', '--table'], { HUMANIZER_EVAL_CORPUS: '' });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /Regression:/);
});

test('CLI reports a friendly error when the corpus directory is absent', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'humanizer-eval-empty-'));
  try {
    const result = runCli(['--json'], { HUMANIZER_EVAL_CORPUS: dir });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Evaluation corpus missing/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('CLI --check passes on the recorded mini baseline and stays fail-closed on drift', async () => {
  const env = { HUMANIZER_EVAL_CORPUS: miniCorpus };
  const matching = runCli(['--check', '--table'], env);
  assert.equal(matching.status, 0, matching.stderr);
  assert.doesNotMatch(matching.stdout, /Regression:/);

  const dir = await mkdtemp(path.join(os.tmpdir(), 'humanizer-eval-mini-'));
  try {
    await copyDir(miniCorpus, path.join(dir, 'corpus'));
    await copyFile(miniBaseline, path.join(dir, 'eval-baseline.json'));
    const drifted = { HUMANIZER_EVAL_CORPUS: path.join(dir, 'corpus') };

    const regressed = JSON.parse(await readFile(miniBaseline, 'utf8'));
    regressed.byLanguageSplit['en:dev'].fpr -= 0.05;
    await writeFile(path.join(dir, 'eval-baseline.json'), JSON.stringify(regressed));
    const failing = runCli(['--check', '--table'], drifted);
    assert.equal(failing.status, 1);
    assert.match(failing.stdout, /Regression: en:dev fpr regression/);

    const sameWords = await readFile(path.join(miniCorpus, 'human', 'en', 'blog-opinion-05.txt'), 'utf8');
    await writeFile(path.join(dir, 'corpus', 'human', 'en', 'blog-opinion-05.txt'), sameWords.replace('I broke', 'I fixed'));
    const tampered = runCli(['--check'], drifted);
    assert.equal(tampered.status, 2);
    assert.match(tampered.stderr, /corpus/i);

    await writeFile(path.join(dir, 'eval-baseline.json'), JSON.stringify({ ...regressed, devPrompts: { 'mini-ai-01': { text: 'changed' } } }));
    const reprompted = runCli(['--check'], drifted);
    assert.equal(reprompted.status, 2);
    assert.match(reprompted.stderr, /prompt/i);

    await rm(path.join(dir, 'eval-baseline.json'));
    const orphan = runCli(['--check'], drifted);
    assert.equal(orphan.status, 2);
    assert.match(orphan.stderr, /ENOENT|eval:/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
