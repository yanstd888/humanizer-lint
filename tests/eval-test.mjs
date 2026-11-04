import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const parentDirectory = '..';
const { summarize, validateCorpus, evaluate, parseOptions, checkRegression } = await import(new URL([parentDirectory, 'scripts', 'eval.mjs'].join('/'), import.meta.url));

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
  const report = (en, id, devCorpus = [{ id: 'sample', text: 'original' }]) => ({ byLanguageSplit: { 'en:dev': en, 'id:dev': id }, devCorpus });
  const baseline = report({ fpr: 0.1, tpr: 0.8 }, { fpr: 0.2, tpr: 0.9 });
  assert.deepEqual(checkRegression(report({ fpr: 0.12, tpr: 0.78 }, { fpr: 0.2, tpr: 0.9 }), baseline), []);
  assert.deepEqual(checkRegression(report({ fpr: 0.121, tpr: 0.779 }, { fpr: 0.2, tpr: 0.9 }), baseline), ['en:dev fpr regression', 'en:dev tpr regression']);
  assert.throws(() => checkRegression(report({ fpr: 0.1, tpr: null }, { fpr: 0.2, tpr: 0.9 }), baseline), /Insufficient/);
  assert.throws(() => checkRegression(report({ fpr: 0.1, tpr: 0.8 }, { fpr: 0.2, tpr: 0.9 }, [{ id: 'sample', text: 'modified' }]), baseline), /corpus/i);
  assert.throws(() => checkRegression(report({ fpr: 0.1, tpr: 0.8 }, { fpr: 0.2, tpr: 0.9 }), { ...baseline, devCorpus: undefined }), /corpus/i);
});

test('test or all split cannot be swept', () => {
  assert.throws(() => parseOptions(['--split', 'test', '--sweep', 'passScore=70,80']), /dev/i);
  assert.throws(() => parseOptions(['--split', 'all', '--sweep', 'passScore=70,80']), /dev/i);
  assert.equal(parseOptions(['--split', 'dev', '--sweep', 'passScore=70,80']).sweep.values.length, 2);
});
