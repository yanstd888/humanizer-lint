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

test('rhetorical hooks survive lazy-loaded explicit, mixed and universal languages', async () => {
  const { createRuleLoader } = await import(project('demo', 'rules-loader.mjs'));
  const profile = await read('profiles', 'default-human.json');
  const loader = createRuleLoader(async (language) => read('rules', `${language}-slop.json`));
  for (const language of ['en', 'id', 'es', 'universal']) {
    const { rules } = await loader.load(language);
    const analyzer = createAnalyzer({ rules, defaultProfile: profile, calculateMetrics });
    for (const hook of ["Here's the kicker:", 'Mengapa demikian?']) {
      const report = analyzer.analyzeText(`${hook} The team reviewed the deployment. They documented the results. They changed the config.`, { language });
      assert.ok(report.violations.some((v) => v.type === 'RHETORICAL_SLOP' && v.match.startsWith(hook)), `${language}: ${hook}`);
    }
  }
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
