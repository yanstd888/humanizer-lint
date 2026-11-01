import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const projectRoot = '..';
const projectModule = (...segments) => new URL([projectRoot, ...segments].join('/'), import.meta.url);
const { sanitizeMarkdown } = await import(projectModule('scripts', 'utils', 'sanitizer.mjs'));
const { isCJKText, normalizeLocale, tokenizeText, tokenizeWords } = await import(projectModule('scripts', 'utils', 'tokenizer.mjs'));
const {
  adjacentDelta,
  compressionRatio,
  coefficientOfVariation,
  mattr,
  mean,
  standardDeviation,
} = await import(projectModule('scripts', 'utils', 'metrics.mjs'));
const { analyzeText, runAnalyzeCli } = await import(projectModule('scripts', 'analyze.mjs'));
const { createBrowserAnalyzer } = await import(projectModule('demo', 'analyzer-browser.mjs'));
const { I18N } = await import(projectModule('demo', 'i18n.mjs'));
const { fingerprintSamples, runFingerprintCli } = await import(projectModule('scripts', 'fingerprint.mjs'));
const { lintCopywriting, lintCodeComments, lintUiAndAccessibility } = await import(projectModule('scripts', 'utils', 'domain-linters.mjs'));
const { runBenchmark } = await import(projectModule('scripts', 'benchmark.mjs'));

let rootPath = decodeURIComponent(projectModule().pathname);
if (/^\/[A-Za-z]:/.test(rootPath)) rootPath = rootPath.slice(1);
const root = path.resolve(rootPath);
const fixture = async (name) => readFile(path.join(root, 'tests', 'fixtures', name), 'utf8');
const sourceFile = async (...segments) => (await readFile(path.join(root, ...segments), 'utf8')).replaceAll(String.fromCharCode(13), '');
async function sourceMjsFiles(directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!['.git', '.pages-dist', '.wrangler', 'node_modules'].includes(entry.name)) files.push(...await sourceMjsFiles(path.join(directory, entry.name)));
    } else if (entry.name.endsWith('.mjs')) {
      files.push(path.join(directory, entry.name));
    }
  }
  return files;
}
const browserParityAvailable = (() => {
  try {
    return typeof CompressionStream === 'function' && Boolean(new CompressionStream('deflate-raw'));
  } catch {
    return false;
  }
})();

test('diagnostic selection honors exact offsets for repeated phrases', async () => {
  const { diagnosticSelection } = await import(projectModule('demo', 'presentation.mjs'));
  const text = '🙂 game changer. Another game changer.';
  const start = text.lastIndexOf('game changer');
  assert.deepEqual(diagnosticSelection(text, { match: 'game changer', charOffset: { start, end: start + 12 }, sourceScope: 'match' }), { start, end: start + 12 });
  assert.equal(diagnosticSelection(text, { match: 'game changer', charOffset: { start: 0, end: 12 }, sourceScope: 'match' }), null);
});

test('short inputs present rhythm gate as skipped rather than healthy or low', async () => {
  const { rhythmGateSkipped } = await import(projectModule('demo', 'presentation.mjs'));
  assert.equal(rhythmGateSkipped({ metrics: { sentenceCount: 7 }, targets: { minSentencesForStats: 8 } }), true);
  assert.equal(rhythmGateSkipped({ metrics: { sentenceCount: 8 }, targets: { minSentencesForStats: 8 } }), false);
});

test('method steps are localized in every non-English interface', () => {
  const keys = ['howLexicalTitle', 'howLexicalText', 'howRhythmTitle', 'howRhythmText', 'howDiversityTitle', 'howDiversityText', 'howStructureTitle', 'howStructureText', 'howVerifyTitle', 'howVerifyText'];
  for (const lang of ['id', 'es', 'ms', 'fr', 'de', 'pt', 'zh']) {
    for (const key of keys) assert.notEqual(I18N[lang][key], I18N.en[key], `${lang}.${key} falls back to English`);
  }
});

test('result labels are localized rather than silently falling back to English', () => {
  for (const lang of ['id', 'es', 'ms', 'fr', 'de', 'pt', 'zh']) {
    for (const key of ['gateRhythm', 'gateLexical', 'gateDomain', 'gateVerdict', 'metricRhythmHelp', 'metricLexicalHelp', 'metricLow', 'metricShort', 'metricLong', 'metricPhrases']) {
      assert.notEqual(I18N[lang][key], I18N.en[key], `${lang}.${key}`);
    }
  }
});

test('static sample buttons and language examples remain discoverable', async () => {
  const index = await sourceFile('demo', 'index.html');
  assert.match(index, /id="sample-list"><button[^>]+aria-label=/);
  const examples = { en: 'delve', id: 'di era digital', es: 'cabe destacar que', ms: 'dalam era digital kini', fr: 'il est important de noter que', de: 'es ist wichtig zu beachten', pt: 'vale ressaltar que', zh: '值得注意的是' };
  for (const [language, example] of Object.entries(examples)) {
    const pack = JSON.parse(await sourceFile('rules', `${language}-slop.json`));
    assert.ok(index.includes(example), language);
    assert.ok(pack.patterns.some((rule) => new RegExp(rule.pattern, 'iu').test(example)), language);
  }
  assert.match(index, /Experimental rhythm diagnostics via/);
});

test('browser analyzer matches CLI results', { skip: !browserParityAvailable }, async () => {
  const [idRules, enRules, defaultProfile] = await Promise.all([
    readFile(path.join(root, 'rules', 'id-slop.json'), 'utf8').then(JSON.parse),
    readFile(path.join(root, 'rules', 'en-slop.json'), 'utf8').then(JSON.parse),
    readFile(path.join(root, 'profiles', 'default-human.json'), 'utf8').then(JSON.parse),
  ]);
  const browser = createBrowserAnalyzer({ rules: { id: idRules, en: enRules }, defaultProfile });
  for (const [name, language] of [['ai-sample-id.txt', 'id'], ['ai-sample-en.txt', 'en'], ['human-sample-id.txt', 'id'], ['human-sample-en.txt', 'en']]) {
    const text = await fixture(name);
    assert.deepEqual(await browser.analyzeTextAsync(text, { language }), analyzeText(text, { language }));
  }
});

test('demo chrome has complete eight-language copy and official domain metadata', async () => {
  const index = await readFile(path.join(root, 'demo', 'index.html'), 'utf8');
  const app = await readFile(path.join(root, 'demo', 'app.mjs'), 'utf8');
  const languageCodes = ['en', 'id', 'es', 'ms', 'fr', 'de', 'pt', 'zh'];
  const requiredKeys = Object.keys(I18N.en);
  for (const language of languageCodes) {
    assert.ok(I18N[language], language);
    for (const key of requiredKeys) assert.ok(I18N[language][key], `${language}.${key}`);
    assert.ok(I18N[language].pageTitle);
    assert.ok(I18N[language].description);
    assert.ok(I18N[language].analyze);
    assert.ok(I18N[language].themeToDark);
    assert.doesNotMatch(I18N[language].pageTitle, /\p{Extended_Pictographic}/u);
    assert.match(index, new RegExp(`class="picker-option[^"]*" data-language="${language}"`));
    assert.match(index, new RegExp(`hreflang="${language}"`));
  }
  assert.match(index, /<html lang="en">/);
  assert.match(index, /https:\/\/humanizer\.aiclub\.ai\.id/);
  assert.match(app, /UI_LANGUAGE_CODES/);
  for (const key of ['cvMin', 'rhythmDeltaMin', 'mattrMin']) assert.ok(app.includes(`report.targets.${key}`), key);
  assert.match(app, /humanizer-lint\.language/);
  assert.match(app, /humanizer-lint\.theme/);
  assert.match(index, /id="interface-language"/);
  assert.doesNotMatch(index, /class="language-button"/);
  assert.match(index, /href="https:\/\/aiclub\.ai\.id" target="_blank" rel="noopener noreferrer">Website/);
  assert.match(index, /href="https:\/\/t\.me\/aiclub_id" target="_blank" rel="noopener noreferrer">Telegram/);
});

test('Pages build prevents the full technical SEO, security, and accessibility audit set from regressing', async () => {
  const dist = path.join(root, '.pages-dist');
  const index = await readFile(path.join(dist, 'index.html'), 'utf8');
  const headers = await readFile(path.join(dist, '_headers'), 'utf8');
  const robots = (await readFile(path.join(dist, 'robots.txt'), 'utf8')).replaceAll(String.fromCharCode(13), '');
  const missing = await readFile(path.join(dist, '404.html'), 'utf8');
  const favicon = await readFile(path.join(dist, 'favicon.ico'));
  for (const asset of ['404.html', '_headers', 'favicon.ico', 'favicon.svg', 'robots.txt', 'sitemap.xml']) {
    await readFile(path.join(dist, asset));
  }
  await assert.rejects(readFile(path.join(dist, '_redirects')));

  assert.match(missing, /<meta name="robots" content="noindex">/);
  assert.match(missing, /404: Page Not Found/);
  assert.match(missing, /https:\/\/humanizer\.aiclub\.ai\.id\//);
  assert.deepEqual([...favicon.subarray(0, 6)], [0, 0, 1, 0, 1, 0]);
  assert.match(index, /<link rel="icon" href="\/favicon\.ico" sizes="any">/);
  assert.match(index, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml">/);
  assert.match(index, /<link rel="apple-touch-icon" href="\/favicon\.svg">/);
  assert.match(index, /max-image-preview:large/);

  const schemaMatch = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(schemaMatch);
  const schema = JSON.parse(schemaMatch[1]);
  const graph = new Map(schema['@graph'].map((node) => [node['@type'], node]));
  assert.equal(graph.get('WebSite').publisher['@id'], 'https://humanizer.aiclub.ai.id/#organization');
  assert.equal(graph.get('Organization').name, 'AICLUB.ai.id');
  assert.ok(graph.has('SoftwareApplication'));
  assert.ok(graph.has('FAQPage'));

  for (const header of [
    'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
    "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'",
    'X-Frame-Options: DENY',
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'Permissions-Policy: accelerometer=()',
    'Last-Modified: Sat, 31 Oct 2026 00:00:00 GMT',
    'ETag: W/"humanizer-lint-1.5.0-seo-audit"',
    'Cache-Control: public, max-age=0, must-revalidate',
  ]) assert.match(headers, new RegExp(header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  for (const crawler of ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Googlebot', 'Bingbot', 'Applebot', 'Applebot-Extended', 'Amazonbot', 'YouBot', 'DuckAssistBot', 'Bytespider', 'CCBot']) {
    assert.ok(robots.includes(`User-agent: ${crawler}\nAllow: /`), crawler);
  }
  assert.match(robots, /^Sitemap: https:\/\/humanizer\.aiclub\.ai\.id\/sitemap\.xml$/m);

  for (const [, tag, attributes, body] of index.matchAll(/<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
    assert.ok(/\baria-label=/.test(attributes) || body.replace(/<[^>]+>/g, '').trim(), `${tag} is missing an accessible name`);
  }
  assert.match(index, /<summary aria-label="Interface language" data-i18n-aria-label="languageToggle">/);
  assert.match(index, /id="analysis-language"/);
  assert.match(index, /<label for="text"/);
  assert.match(await sourceFile('demo', 'app.mjs'), /button\.textContent = sampleLabel\(id\)/);
  assert.match(await sourceFile('demo', 'app.mjs'), /button\.append\(type, location, instruction, replacement, split\)/);
  assert.match(index, /id="gate-rhythm"/);
  assert.match(index, /id="gate-verdict"/);
});

test('demo samples preserve verified multilingual outcomes and shareable state', async () => {
  const { DEMO_SAMPLES } = await import(projectModule('demo', 'samples.mjs'));
  const { buildAutoFixPrompt, diagnosticExcerpt, languageLabel, parseDemoQuery } = await import(projectModule('demo', 'presentation.mjs'));
  const expected = Object.fromEntries(['en', 'id', 'es', 'ms', 'fr', 'de', 'pt', 'zh'].flatMap((language) => [
    [`ai-${language}`, { language, status: 'FAIL', maxScore: 67 }],
    [`human-${language}`, { language, status: 'PASS', minScore: 85 }],
  ]));

  for (const [id, expectation] of Object.entries(expected)) {
    const sample = DEMO_SAMPLES[id];
    assert.equal(sample.language, expectation.language, id);
    const report = analyzeText(sample.text, { language: expectation.language });
    assert.equal(report.status, expectation.status, id);
    if (expectation.maxScore != null) assert.ok(report.score < 68, `${id}: ${report.score}`);
    if (expectation.minScore != null) assert.ok(report.score >= expectation.minScore, `${id}: ${report.score}`);
    if (id.startsWith('ai-')) {
      const types = new Set(report.violations.map((violation) => violation.type));
      assert.ok(types.has('SLOP_PHRASE'), id);
      if (report.metrics.sentenceCount >= 8) {
        assert.ok(types.has('MONOTONOUS_RHYTHM'), id);
        assert.ok(types.has('LOW_BURSTINESS'), id);
      } else {
        assert.match(report.deliveryGate.rhythmAndStylometry.status, /^SKIP/, id);
      }
    } else {
      assert.equal(report.violations.length, 0, id);
    }
  }

  assert.deepEqual(parseDemoQuery('?sample=ai-es&lang=en&targetLang=es'), { sample: 'ai-es', language: 'en', targetLang: 'es' });
  assert.deepEqual(parseDemoQuery('?sample=unknown&lang=fr&targetLang=bad'), { sample: null, language: 'fr', targetLang: null });
  assert.equal(languageLabel('zh'), '中文 / Mandarin (Tier 1 Pack)');
  assert.equal(languageLabel('universal'), 'Universal Stylometry (Tier 2)');

  const source = DEMO_SAMPLES['ai-id'].text;
  const report = analyzeText(source, { language: 'id' });
  const first = report.violations[0];
  assert.match(diagnosticExcerpt(source, first), /Di era digital/);
  const prompt = buildAutoFixPrompt({ text: source, report });
  assert.match(prompt, /Bahasa Indonesia \(Tier 1 Pack\)/);
  assert.match(prompt, /LOW_BURSTINESS/);
  assert.match(prompt, /burstinessCV/);
  assert.match(prompt, /Di era digital/);
});


test('reference layout keeps install beside hero and samples inside editor', async () => {
  const html = await readFile(projectModule('demo', 'index.html'), 'utf8');
  assert.match(html, /<div class="hero-layout">[\s\S]*?<section class="intro"[\s\S]*?<section class="install-panel"/);
  assert.match(html, /<div class="input-panel"><section class="samples"/);
  assert.match(html, /class="workbench-heading"/);
  assert.match(html, /class="result-empty"/);
});

test('header and footer preserve navigation and mobile menu', async () => {
  const html = await readFile(projectModule('demo', 'index.html'), 'utf8');
  assert.match(html, /<details class="mobile-menu">/);
  for (const href of ['#workspace', '#how-title', '#coverage-title', '#faq-title', 'https://t.me/aiclub_id', 'https://www.npmjs.com/package/humanizer-lint']) assert.ok(html.includes(`href="${href}"`));
  assert.equal((html.match(/href="#faq-title"/g) ?? []).length, 2);
  assert.match(html, /class="footer-brand"/);
});

test('source and built body contain no unresolved template placeholders', async () => {
  for (const name of ['demo/index.html', '.pages-dist/index.html']) {
    const html = await readFile(projectModule(...name.split('/')), 'utf8');
    assert.doesNotMatch(html.slice(html.indexOf('<body')), /\{\{[A-Za-z0-9]+\}\}/);
  }
});
