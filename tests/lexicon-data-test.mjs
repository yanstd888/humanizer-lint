import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const parentDirectory = '..';
const project = (...parts) => new URL([parentDirectory, ...parts].join('/'), import.meta.url);
const { createAnalyzer } = await import(project('scripts', 'core', 'analyzer-core.mjs'));
const { calculateMetrics } = await import(project('scripts', 'utils', 'metrics.mjs'));
const read = async (...parts) => JSON.parse(await readFile(project(...parts), 'utf8'));

test('shared hook fallback is generated from language rule packs', async () => {
  const id = await read('rules', 'id-slop.json');
  const en = await read('rules', 'en-slop.json');
  const { RHETORICAL_HOOKS } = await import(project('scripts', 'core', 'rhetorical-hooks.mjs'));
  assert.deepEqual(RHETORICAL_HOOKS, [...id.editorial.rhetoricalHooks, ...en.editorial.rhetoricalHooks]);
});

test('shared editorial fallbacks are generated from language rule packs and match rules', async () => {
  const id = await read('rules', 'id-slop.json');
  const en = await read('rules', 'en-slop.json');
  const ms = await read('rules', 'ms-slop.json');
  const {
    DEFAULT_ID_EXCLUSIVE_WORDS,
    DEFAULT_MS_EXCLUSIVE_WORDS,
    DEFAULT_SPLIT_CONNECTIVES,
    DEFAULT_ATTRIBUTION_BYPASS,
    DEFAULT_ATTRIBUTION_BYPASS_PATTERN,
    DEFAULT_FALLBACK_REPLACEMENTS,
  } = await import(project('scripts', 'core', 'editorial-fallbacks.mjs'));

  assert.deepEqual(DEFAULT_ID_EXCLUSIVE_WORDS, id.editorial.exclusiveWords);
  assert.deepEqual(DEFAULT_MS_EXCLUSIVE_WORDS, ms.editorial.exclusiveWords);
  assert.deepEqual(DEFAULT_SPLIT_CONNECTIVES, [...id.editorial.splitConnectives, ...en.editorial.splitConnectives]);
  assert.deepEqual(DEFAULT_FALLBACK_REPLACEMENTS, en.editorial.fallbackReplacements);
  const attributionPacks = [en, id].filter((pack) => pack.editorial?.attributionBypass);
  const expectedAttributionPattern = `(?:${attributionPacks.map((pack) => pack.editorial.attributionBypass).join('|')})`;
  assert.equal(DEFAULT_ATTRIBUTION_BYPASS_PATTERN, expectedAttributionPattern);
  assert.ok(DEFAULT_ATTRIBUTION_BYPASS.test('According to Dr. Smith, test'));
  assert.ok(DEFAULT_ATTRIBUTION_BYPASS.test('Menurut Prof. Budi, test'));
});

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

test('rhetorical hooks stay data-driven and survive missing rule packs', async () => {
  const { RHETORICAL_HOOKS } = await import(project('scripts', 'core', 'rhetorical-hooks.mjs'));
  const profile = await read('profiles', 'default-human.json');
  assert.ok(RHETORICAL_HOOKS.length >= 5);
  const analyzer = createAnalyzer({ rules: {}, defaultProfile: profile, calculateMetrics });
  for (const hook of ["Here's the kicker:", 'Mengapa demikian?']) {
    const report = analyzer.analyzeText(`${hook} The team reviewed the deployment. They documented the results. They changed the config.`, { language: 'en' });
    assert.ok(report.violations.some((v) => v.type === 'RHETORICAL_SLOP' && v.match.startsWith(hook)), hook);
  }
  const core = await readFile(project('scripts', 'core', 'analyzer-core.mjs'), 'utf8');
  for (const literal of ["here's the kicker", 'mengapa demikian', 'want to know the best part', 'let that sink in', 'No prior', 'No nostalgia', 'tidak', 'karena', 'seperti', 'According to', 'Menurut', 'sehingga', 'however']) {
    assert.ok(!core.includes(literal), `analyzer-core still hardcodes: ${literal}`);
  }
});

test('language rule packs drive exclusive words, attribution bypass and split connectives', async () => {
  const en = await read('rules', 'en-slop.json');
  const id = await read('rules', 'id-slop.json');
  const ms = await read('rules', 'ms-slop.json');
  const profile = await read('profiles', 'default-human.json');

  assert.ok(id.editorial?.exclusiveWords?.length);
  assert.ok(ms.editorial?.exclusiveWords?.length);
  assert.ok(en.editorial?.attributionBypass);
  assert.ok(id.editorial?.attributionBypass);
  assert.ok(en.editorial?.splitConnectives?.length);
  assert.ok(id.editorial?.splitConnectives?.length);

  const analyzer = createAnalyzer({ rules: { en, id, ms }, defaultProfile: profile, calculateMetrics });
  const sample = 'Tidak dapat dipungkiri bahwa pengembangan sistem ini sangat penting namun implementasi konfigurasi lapangan masih membutuhkan pemantauan berkala dari tim teknis terkait. Pengoptimalan konfigurasi dilakukan sebelum operator membuka akses produksi. Tim lalu memeriksa log yang jauh lebih rinci untuk memastikan hasil pengujian tetap dapat ditelusuri.';
  const report = analyzer.analyzeText(sample, { language: 'id' });
  assert.ok(report.violations.some((v) => v.splitSuggestion?.includes('namun')));
});

test('language rule packs drive replacement hints', async () => {
  const en = await read('rules', 'en-slop.json');
  const id = await read('rules', 'id-slop.json');
  const profile = await read('profiles', 'default-human.json');
  assert.ok(en.editorial?.replacements?.length);
  assert.ok(id.editorial?.replacements?.length);
  const delve = 'The team will delve into the deployment notes and then review the audit trail once more.';
  const analyzeEnglish = (pack) => createAnalyzer({ rules: { en: pack }, defaultProfile: profile, calculateMetrics }).analyzeText(delve, { language: 'en' });
  assert.ok(analyzeEnglish(en).violations.some((v) => v.type === 'SLOP_PHRASE' && v.suggestedReplacement === 'examine / explore'));
  assert.ok(!analyzeEnglish({ ...en, editorial: { ...en.editorial, replacements: [] } }).violations.some((v) => v.suggestedReplacement === 'examine / explore'));
  const indonesian = 'Tidak dapat dipungkiri bahwa pengimplementasian sistem ini dilakukan oleh tim karena jadwal berubah dan layanan harus tetap tersedia untuk pelanggan. Pengoptimalan konfigurasi dilakukan sebelum operator membuka akses produksi. Tim lalu memeriksa log yang jauh lebih rinci untuk memastikan hasil pengujian tetap dapat ditelusuri.';
  assert.ok(createAnalyzer({ rules: { id }, defaultProfile: profile, calculateMetrics })
    .analyzeText(indonesian, { language: 'id' }).violations.some((v) => v.type === 'SLOP_PHRASE' && v.suggestedReplacement === 'state the concrete claim directly'));
});

test('optional rule metadata does not change analysis', async () => {
  const en = await read('rules', 'en-slop.json');
  const profile = await read('profiles', 'default-human.json');
  const text = "Here's the kicker: The team reviewed the deployment. They documented the results. They changed the config.";
  const base = createAnalyzer({ rules: { en }, defaultProfile: profile, calculateMetrics }).analyzeText(text, { language: 'en' });
  const annotated = { ...en, patterns: en.patterns.map((rule) => ({ ...rule, note: 'known false-positive caveat', source: 'manual' })) };
  const marked = createAnalyzer({ rules: { en: annotated }, defaultProfile: profile, calculateMetrics }).analyzeText(text, { language: 'en' });
  assert.equal(marked.status, base.status);
  assert.deepEqual(marked.violations, base.violations);
});
