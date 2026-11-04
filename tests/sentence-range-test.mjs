import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const parentDirectory = '..';
const project = (...parts) => new URL([parentDirectory, ...parts].join('/'), import.meta.url);
const { analyzeText } = await import(project('scripts', 'analyze.mjs'));
const tech = () => readFile(project('tests', 'fixtures', 'probes', 'tech-readme.md'), 'utf8');

test('one missing sentence-range side is a warning and does not fail the range gate', async () => {
  const text = await tech();
  const missingLong = analyzeText(text, { language: 'en' });
  const finding = missingLong.violations.find((v) => v.type === 'MISSING_SENTENCE_RANGE');
  assert.equal(finding.severity, 'warn');
  assert.notEqual(missingLong.status, 'FAIL');
  assert.equal(missingLong.score, 100);
  assert.ok(!missingLong.failedGates.includes('sentenceRange'));
  const missingShort = analyzeText(text, { language: 'en', profile: { thresholds: { shortSentenceRatio: 1, longSentenceRatio: 0 } } });
  assert.equal(missingShort.violations.find((v) => v.type === 'MISSING_SENTENCE_RANGE').severity, 'warn');
  assert.ok(!missingShort.failedGates.includes('sentenceRange'));
});

test('missing both sides remains an error and fails the range gate', () => {
  const text = Array(10).fill('The quiet workers deliver the brown boxes today.').join(' ');
  const result = analyzeText(text, { language: 'en' });
  assert.equal(result.violations.find((v) => v.type === 'MISSING_SENTENCE_RANGE').severity, 'error');
  assert.ok(result.failedGates.includes('sentenceRange'));
  assert.equal(result.status, 'FAIL');
});
