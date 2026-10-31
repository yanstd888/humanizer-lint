#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import { realpathSync } from 'node:fs';
import path from 'node:path';

import { analyzeText } from './analyze.mjs';

const parentDirectory = '..';
const { DEMO_SAMPLES } = await import(new URL([parentDirectory, 'demo', 'samples.mjs'].join('/'), import.meta.url));

const LANGUAGES = ['en', 'id', 'es', 'ms', 'fr', 'de', 'pt', 'zh'];

export function runBenchmark(iterations = 20) {
  const expected = LANGUAGES.flatMap((language) => [
    [`ai-${language}`, 'FAIL'],
    [`human-${language}`, 'PASS'],
  ]);
  const firstPass = expected.map(([id, status]) => {
    const sample = DEMO_SAMPLES[id];
    const result = analyzeText(sample.text, { language: sample.language });
    return { id, expected: status, actual: result.status, score: result.score };
  });

  const started = performance.now();
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const [id] of expected) {
      const sample = DEMO_SAMPLES[id];
      analyzeText(sample.text, { language: sample.language });
    }
  }
  const elapsed = performance.now() - started;
  const secondPass = expected.map(([id]) => {
    const sample = DEMO_SAMPLES[id];
    const result = analyzeText(sample.text, { language: sample.language });
    return { id, actual: result.status, score: result.score };
  });
  const aiScores = firstPass.filter(({ id }) => id.startsWith('ai-')).map(({ score }) => score);
  const humanScores = firstPass.filter(({ id }) => id.startsWith('human-')).map(({ score }) => score);
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const deterministic = firstPass.every((item, index) => item.actual === secondPass[index].actual && item.score === secondPass[index].score);
  const correct = firstPass.filter((item) => item.actual === item.expected).length;

  return {
    fixtures: firstPass.length,
    iterations,
    totalRuns: iterations * expected.length,
    elapsedMs: Number(elapsed.toFixed(3)),
    meanMsPerAnalysis: Number((elapsed / (iterations * expected.length)).toFixed(4)),
    meanAiScore: Number(mean(aiScores).toFixed(2)),
    meanHumanScore: Number(mean(humanScores).toFixed(2)),
    meanScoreSeparation: Number((mean(humanScores) - mean(aiScores)).toFixed(2)),
    accuracy: Number((correct / firstPass.length).toFixed(4)),
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
  if (!report.deterministic || report.accuracy !== 1 || report.meanScoreSeparation <= 0) process.exitCode = 1;
}
