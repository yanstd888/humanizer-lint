#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

import { analyzeText } from './analyze.mjs';

const parentDirectory = '..';
const { DEMO_SAMPLES } = await import(new URL([parentDirectory, 'demo', 'samples.mjs'].join('/'), import.meta.url));

const LANGUAGES = ['en', 'id', 'es', 'ms', 'fr', 'de', 'pt', 'zh'];
const CORPUS = [['id-formal-legal.txt', 'id'], ['id-en-mixed-tech.md', 'id'], ['en-pre-llm-essay.txt', 'en'], ['translated-docs.txt', 'en'], ['clean-ui-component.tsx', 'en']];
const DOMAIN_SAMPLES = [
  { id: 'domain-copy', text: 'Click here', domain: 'copywriting', type: 'WEAK_CTA', expected: 'FOUND' },
  { id: 'domain-code', text: '// Import dependencies', domain: 'code', type: 'TAUTOLOGICAL_CODE_COMMENT', expected: 'FOUND' },
  { id: 'domain-ui', text: '<img src="photo.jpg">', domain: 'ui', type: 'MISSING_IMG_ALT', expected: 'FOUND' },
  { id: 'domain-ui-clean', text: '<img src="photo.jpg" alt="A tree">', domain: 'ui', type: 'MISSING_IMG_ALT', expected: 'NOT_FOUND' },
];
function runDomainSample(sample) {
  const result = analyzeText(sample.text, { language: 'en', domain: sample.domain });
  return { id: sample.id, expected: sample.expected, actual: result.violations.some((violation) => violation.type === sample.type) ? 'FOUND' : 'NOT_FOUND', score: result.score };
}

export function runBenchmark(iterations = 20) {
  const expected = LANGUAGES.flatMap((language) => [
    [`ai-${language}`, 'FAIL'],
    [`human-${language}`, 'PASS'],
  ]);
  const firstPass = expected.map(([id, status]) => {
    const sample = DEMO_SAMPLES[id];
    const result = analyzeText(sample.text, { language: sample.language });
    return { id, expected: status, actual: result.status, score: result.score };
  }).concat(DOMAIN_SAMPLES.map(runDomainSample));

  const started = performance.now();
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const [id] of expected) {
      const sample = DEMO_SAMPLES[id];
      analyzeText(sample.text, { language: sample.language });
    }
    for (const sample of DOMAIN_SAMPLES) runDomainSample(sample);
  }
  const elapsed = performance.now() - started;
  const secondPass = expected.map(([id]) => {
    const sample = DEMO_SAMPLES[id];
    const result = analyzeText(sample.text, { language: sample.language });
    return { id, actual: result.status, score: result.score };
  }).concat(DOMAIN_SAMPLES.map(runDomainSample));
  const aiScores = firstPass.filter(({ id }) => id.startsWith('ai-')).map(({ score }) => score);
  const humanScores = firstPass.filter(({ id }) => id.startsWith('human-')).map(({ score }) => score);
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const deterministic = firstPass.every((item, index) => item.actual === secondPass[index].actual && item.score === secondPass[index].score);
  const correct = firstPass.filter((item) => item.actual === item.expected).length;
  const corpusResults = CORPUS.map(([file, language]) => {
    const text = readFileSync(new URL([parentDirectory, 'tests', 'corpus', file].join('/'), import.meta.url), 'utf8');
    const { status, score } = analyzeText(text, { language, sourcePath: file });
    return { file, language, expected: 'not FAIL', status, score };
  });
  const falsePositives = corpusResults.filter((item) => item.status === 'FAIL').length;
  const evaluated = corpusResults.filter((item) => item.status !== 'SKIP').length;

  return {
    fixtures: firstPass.length,
    syntheticDomainFixtures: DOMAIN_SAMPLES.length,
    iterations,
    totalRuns: iterations * firstPass.length,
    elapsedMs: Number(elapsed.toFixed(3)),
    meanMsPerAnalysis: Number((elapsed / (iterations * firstPass.length)).toFixed(4)),
    meanAiScore: Number(mean(aiScores).toFixed(2)),
    meanHumanScore: Number(mean(humanScores).toFixed(2)),
    meanScoreSeparation: Number((mean(humanScores) - mean(aiScores)).toFixed(2)),
    syntheticFixturePassRate: Number((correct / firstPass.length).toFixed(4)),
    realWorldCorpus: { complete: false, total: corpusResults.length, evaluated, skipped: corpusResults.length - evaluated, falsePositives, falsePositiveRate: evaluated ? falsePositives / evaluated : null, caveat: 'Assumed clean, not independently adjudicated; small non-random corpus, not a population estimate. SKIP is excluded from the denominator.', results: corpusResults },
    deterministic,
    results: firstPass,
  };
}

function currentModulePath() {
  let value = decodeURIComponent(new URL(import.meta.url).pathname);
  if (/^\/[A-Za-z]:/.test(value)) value = value.slice(1);
  return path.resolve(value);
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(currentModulePath())) {
  const report = runBenchmark();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.deterministic || report.syntheticFixturePassRate !== 1 || report.meanScoreSeparation <= 0) process.exitCode = 1;
}
