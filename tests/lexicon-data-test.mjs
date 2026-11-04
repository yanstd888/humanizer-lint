import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const parentDirectory = '..';
const project = (...parts) => new URL([parentDirectory, ...parts].join('/'), import.meta.url);
const { createAnalyzer } = await import(project('scripts', 'core', 'analyzer-core.mjs'));
const { calculateMetrics } = await import(project('scripts', 'utils', 'metrics.mjs'));
const read = async (...parts) => JSON.parse(await readFile(project(...parts), 'utf8'));

test('language rule packs drive paired contrast patterns', async () => {
  const en = await read('rules', 'en-slop.json');
  const profile = await read('profiles', 'default-human.json');
  assert.ok(en.editorial?.pairedContrasts?.length);
  const rules = { en: { ...en, editorial: { ...en.editorial, pairedContrasts: [{ first: '^alfa ', second: '^bravo ' }] } } };
  const analyzer = createAnalyzer({ rules, defaultProfile: profile, calculateMetrics });
  assert.ok(analyzer.analyzeText('Alfa works. Bravo wins.', { language: 'en' }).violations.some((v) => v.type === 'NOT_X_BUT_Y'));
  assert.ok(!analyzer.analyzeText('Alfa works.\n\nBravo wins.', { language: 'en' }).violations.some((v) => v.type === 'NOT_X_BUT_Y'));
});

test('language rule packs drive decision openers', async () => {
  const en = await read('rules', 'en-slop.json');
  const id = await read('rules', 'id-slop.json');
  const profile = await read('profiles', 'default-human.json');
  assert.ok(en.editorial?.decisionOpeners?.length);
  assert.ok(id.editorial?.decisionOpeners?.length);
  const rules = { en: { ...en, editorial: { ...en.editorial, decisionOpeners: ['^we propose'] } } };
  const analyzer = createAnalyzer({ rules, defaultProfile: profile, calculateMetrics });
  const lead = `${Array(3).fill('The project team reviewed the deployment plan and confirmed that every service remained available during testing.').join(' ')} We propose the first option.`;
  assert.ok(analyzer.analyzeText(lead, { language: 'en' }).violations.some((v) => v.type === 'DELAYED_DECISION_LEAD'));
});
