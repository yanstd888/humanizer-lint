import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const langs = ['en', 'id', 'ms', 'es', 'fr', 'de', 'pt', 'zh'];
const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'));

async function buildAnalyzer(customRules = null) {
  const { createAnalyzer } = await import(pathToFileURL(path.join(projectRoot, 'scripts/core/analyzer-core.mjs')));
  const { calculateMetrics } = await import(pathToFileURL(path.join(projectRoot, 'scripts/utils/metrics.mjs')));
  const rules = customRules ?? Object.fromEntries(await Promise.all(langs.map(async (l) => [l, await readJson(path.join(projectRoot, `rules/${l}-slop.json`))])));
  const defaultProfile = await readJson(path.join(projectRoot, 'profiles/default-human.json'));
  return createAnalyzer({ rules, defaultProfile, calculateMetrics });
}

test('standalone: attribution bypass works in mixed EN/ID and cross-language texts', async () => {
  const analyzer = await buildAnalyzer();

  const cases = [
    // Indonesian text with English attribution prefix
    { text: 'According to Dr. Smith, para ahli percaya bahwa metode ini sangat efektif untuk diterapkan.', lang: 'id' },
    // English text with Indonesian attribution prefix
    { text: 'Menurut Prof. Budi, experts believe this approach will scale reliably across clusters.', lang: 'en' },
    // Spanish text with English attribution prefix
    { text: 'According to Dr. Smith, expertos creen que la solución es completamente viable para todos.', lang: 'es' },
    // Malay text with Indonesian attribution prefix
    { text: 'Menurut Prof. Budi, para pakar percaya bahawa strategi ini berkesan untuk jangka panjang.', lang: 'ms' },
  ];

  for (const c of cases) {
    const res = analyzer.analyzeText(c.text, { language: c.lang });
    const auth = res.violations.filter((v) => v.type === 'BORROWED_AUTHORITY');
    assert.equal(auth.length, 0, `Expected attribution bypass in ${c.lang}: "${c.text}"`);
  }

  // Without attribution, BORROWED_AUTHORITY must be detected
  assert.ok(analyzer.analyzeText('Para ahli percaya bahwa metode ini sangat efektif untuk diterapkan.', { language: 'id' })
    .violations.some((v) => v.type === 'BORROWED_AUTHORITY'));
  assert.ok(analyzer.analyzeText('Experts believe this approach will scale reliably across clusters.', { language: 'en' })
    .violations.some((v) => v.type === 'BORROWED_AUTHORITY'));
});

test('standalone: attribution bypass works with custom caller rules lacking editorial bypass', async () => {
  const customRules = {
    en: {
      patterns: [{ id: 'EN053', type: 'BORROWED_AUTHORITY', pattern: String.raw`\bexperts (?:believe|say|claim)\b`, fixInstruction: 'Check context.' }],
    },
    id: {
      patterns: [{ id: 'ID048', type: 'BORROWED_AUTHORITY', pattern: String.raw`\bpara ahli (?:menyebut|percaya|mengatakan)\b`, fixInstruction: 'Periksa konteks.' }],
    },
  };

  const analyzer = await buildAnalyzer(customRules);

  const attributedTexts = [
    { text: 'According to Dr. Smith, experts believe this finding is confirmed.', lang: 'en' },
    { text: 'Menurut Prof. Budi, para ahli percaya bahwa temuan ini terbukti.', lang: 'id' },
  ];

  for (const { text, lang } of attributedTexts) {
    const res = analyzer.analyzeText(text, { language: lang });
    assert.equal(res.violations.filter((v) => v.type === 'BORROWED_AUTHORITY').length, 0);
  }

  const unattributedTexts = [
    { text: 'Experts believe this finding is confirmed.', lang: 'en', ruleId: 'EN053' },
    { text: 'Para ahli percaya bahwa temuan ini terbukti.', lang: 'id', ruleId: 'ID048' },
  ];

  for (const { text, lang, ruleId } of unattributedTexts) {
    const res = analyzer.analyzeText(text, { language: lang });
    assert.equal(res.violations.length, 1);
    assert.equal(res.violations[0].ruleId, ruleId);
  }
});

test('standalone: cross-language split connectives in long sentences provide split suggestions', async () => {
  const analyzer = await buildAnalyzer();

  const cases = [
    // English text containing Indonesian connective 'namun'
    { text: 'It is important to note that the engineering team reviewed all deployment scripts namun the overall procedure still required manual oversight and verification from the leads.', lang: 'en', expected: 'namun' },
    // Indonesian text containing English connective 'however'
    { text: 'Tidak dapat dipungkiri bahwa arsitektur sistem baru ini sangat handal however implementasi konfigurasi lapangan masih membutuhkan pemantauan berkala dari tim teknis terkait.', lang: 'id', expected: 'however' },
    // Malay text containing English connective 'because'
    { text: 'Tidak dapat dinafikan bahawa pelaksanaan proses migrasi data ini adalah amat mencabar because sistem legasi tidak mempunyai struktur data yang seragam mengikut piawaian moden terkini.', lang: 'ms', expected: 'because' },
  ];

  for (const c of cases) {
    const res = analyzer.analyzeText(c.text, { language: c.lang });
    const splits = res.violations.map((v) => v.splitSuggestion).filter(Boolean);
    assert.ok(splits.length > 0, `Expected split suggestion in ${c.lang}`);
    assert.ok(splits.some((s) => s.includes(`“${c.expected}”`)), `Expected split suggestion containing "${c.expected}" in ${c.lang}`);
  }
});

test('standalone: fallback suggested replacement hints match across languages and custom rules', async () => {
  const analyzer = await buildAnalyzer();

  // In Malay, MS002 triggers SLOP_PHRASE
  const msSample = 'Tidak dapat dinafikan bahawa pelaksanaan projek ini telah berjaya mencapai matlamat yang ditetapkan oleh pengurusan kanan syarikat.';
  const resMs = analyzer.analyzeText(msSample, { language: 'ms' });
  const repMs = resMs.violations.map((v) => v.suggestedReplacement).filter(Boolean);
  assert.ok(repMs.length > 0);
  assert.ok(repMs.includes('Replace the stock phrase with the specific fact or action.'));

  // Custom rule without pack replacement or suggestedReplacement
  const customRules = {
    en: {
      patterns: [{ id: 'CUSTOM01', type: 'SLOP_PHRASE', pattern: String.raw`\bthe fact of the matter is\b`, fixInstruction: 'Remove.' }],
    },
  };
  const analyzerCustom = await buildAnalyzer(customRules);
  const customSample = 'The fact of the matter is that this code works.';
  const resC = analyzerCustom.analyzeText(customSample, { language: 'en' });
  assert.equal(resC.violations[0]?.suggestedReplacement, 'Replace the stock phrase with the specific fact or action.');
  const unusualType = await buildAnalyzer({ en: { patterns: [{ id: 'CUSTOM02', type: 'toString', pattern: 'needle', fixInstruction: 'Review.' }] } });
  const unusual = unusualType.analyzeText('A needle.', { language: 'en' });
  assert.equal(unusual.violations.find((v) => v.ruleId === 'CUSTOM02')?.suggestedReplacement, undefined);
});

test('standalone: language detection tie breaking survives partial rules lacking exclusiveWords', async () => {
  const partialRules = {
    ms: { stopwords: ['dan', 'yang', 'untuk', 'tidak'], patterns: [] },
    id: { stopwords: ['dan', 'yang', 'untuk', 'tidak'], patterns: [] },
  };
  const analyzer = await buildAnalyzer(partialRules);

  const sample = 'dan yang untuk tidak';
  const res = analyzer.analyzeText(sample, { language: 'auto' });
  assert.equal(res.language, 'id');
});

test('standalone: browser lazy rule loader preserves analyzer functionality', async () => {
  const { createRuleLoader } = await import(pathToFileURL(path.join(projectRoot, 'demo/rules-loader.mjs')));
  const loader = createRuleLoader(async (lang) => readJson(path.join(projectRoot, `rules/${lang}-slop.json`)));
  const profile = await readJson(path.join(projectRoot, 'profiles/default-human.json'));
  const { createAnalyzer } = await import(pathToFileURL(path.join(projectRoot, 'scripts/core/analyzer-core.mjs')));
  const { calculateMetrics } = await import(pathToFileURL(path.join(projectRoot, 'scripts/utils/metrics.mjs')));

  const expectations = {
    en: {
      sample: 'It is important to note that according to Dr. Smith, the architecture remains fully resilient.',
      status: 'FAIL',
      score: 95,
      ruleIds: ['EN020'],
    },
    id: {
      sample: 'Tidak dapat dipungkiri bahwa menurut Prof. Budi, infrastruktur sistem tetap berjalan dengan lancar.',
      status: 'FAIL',
      score: 95,
      ruleIds: ['ID003'],
    },
    ms: {
      sample: 'Tidak dapat dinafikan bahawa menurut Prof. Budi, sistem maklumat beroperasi mengikut keperluan pelanggan.',
      status: 'FAIL',
      score: 95,
      ruleIds: ['MS002'],
    },
    es: {
      sample: 'Es importante destacar que según el Dr. Smith, la solución mantiene alta disponibilidad.',
      status: 'SKIP',
      score: 100,
      ruleIds: [],
    },
  };

  for (const [lang, exp] of Object.entries(expectations)) {
    const { rules } = await loader.load(lang);
    const analyzer = createAnalyzer({ rules, defaultProfile: profile, calculateMetrics });
    const res = analyzer.analyzeText(exp.sample, { language: lang });
    assert.equal(res.status, exp.status, `Status mismatch for ${lang}`);
    assert.equal(res.score, exp.score, `Score mismatch for ${lang}`);
    assert.deepEqual(res.violations.map((v) => v.ruleId), exp.ruleIds, `RuleId mismatch for ${lang}`);
  }
});
