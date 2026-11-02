import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { I18N } = await import(pathToFileURL(path.join(root, 'demo', 'i18n.mjs')));

test('localized coverage copy contains its specified editorial intents', async () => {
  const phrases = {
    id: ['humanizer bahasa indonesia', 'perbaiki tulisan AI yang kaku', 'hilangkan kata klise AI', 'ubah tulisan AI jadi natural', 'editor gaya bahasa dan ritme kalimat', 'audit artikel SEO dan dokumentasi teknis'],
    ms: ['semak ritma ayat dan frasa klise', 'humanizer teks bahasa melayu', 'perbaiki gaya penulisan AI yang kaku'],
    es: ['humanizador de texto IA', 'editor de estilo y corrector de ritmo', 'quitar clichés de escritura IA'],
    fr: ['humaniseur de texte IA', 'éditeur de prose et analyseur stylométrique', 'corriger le style robotique'],
    de: ['KI-Text humanisieren', 'KI-Floskeln entfernen', 'Satzrhythmus und Stil prüfen'],
    pt: ['humanizador de texto IA', 'editor de estilo e corretor de ritmo textual', 'remover clichês de IA'],
    zh: ['AI文章润色与人性化', '消除AI写作腔', '句式节奏与词汇多样性分析', '提升文章可读性'],
  };
  for (const [lang, intents] of Object.entries(phrases)) {
    const page = await readFile(path.join(root, '.pages-dist', lang, 'index.html'), 'utf8');
    const copy = page.match(/<p data-i18n="seoCoverage">([^<]*)<\/p>/u)?.[1].toLocaleLowerCase('und');
    assert.ok(copy, `${lang}: visible copy missing`);
    for (const intent of intents) assert.ok(copy.includes(intent.toLocaleLowerCase('und')), `${lang}: ${intent}`);
  }
});

test('localized generated pages expose locale, metadata, reciprocal routes and raster preview', async () => {
  const codes = ['en', 'id', 'es', 'ms', 'fr', 'de', 'pt', 'zh'];
  const canonical = JSON.parse(await readFile(path.join(root, 'meta', 'canonical.json'), 'utf8'));
  assert.equal(I18N.en.canonicalPosition, canonical.canonicalEn);
  assert.equal(I18N.id.canonicalPosition, canonical.canonicalId);
  for (const code of codes) {
    const html = await readFile(path.join('.pages-dist', code, 'index.html'), 'utf8');
    if (code !== 'en') {
      assert.notEqual(I18N[code].canonicalPosition, I18N.en.canonicalPosition, `${code}: canonical explanation falls back to English`);
      assert.notEqual(I18N[code].seoDetails, I18N.en.seoDetails, `${code}: diagnostics explanation falls back to English`);
    }
    assert.ok(html.includes(I18N[code].seoDetails), `${code}: diagnostics explanation not rendered`);
    assert.ok(html.includes(I18N[code].canonicalPosition), `${code}: canonical explanation not rendered`);
    if (code === 'en' || code === 'id') {
      assert.equal(I18N[code].description, I18N[code].canonicalPosition);
      assert.ok(I18N[code].pageTitle.length < 60, `${code}: title length`);
      for (const selector of ['property="og:title"', 'name="twitter:title"']) {
        assert.ok(html.includes(`<meta ${selector} content="${I18N[code].pageTitle}"`), `${code}: ${selector}`);
      }
      for (const selector of ['name="description"', 'property="og:description"', 'name="twitter:description"']) {
        assert.ok(html.includes(`<meta ${selector} content="${I18N[code].canonicalPosition}"`), `${code}: ${selector}`);
      }
    }
    if (code !== 'en') {
      for (const key of ['useCaseWritingTitle', 'useCaseWritingText', 'useCaseAgentTitle', 'useCaseAgentText', 'useCaseVoiceTitle', 'useCaseVoiceText', 'coverageOtherTitle', 'coverageOtherPrefix', 'coverageOtherSuffix', 'navAnalyzer', 'navMethod', 'navLanguages', 'navCommunity', 'footerNote']) {
        assert.notEqual(I18N[code][key], I18N.en[key], `${code}: ${key} falls back to English`);
        assert.ok(html.includes(I18N[code][key]), `${code}: ${key} is not rendered`);
      }
    }
    assert.ok(html.includes(`<html lang="${code}">`));
    assert.ok(html.includes(`<title>${I18N[code].pageTitle}</title>`));
    assert.ok(html.includes(`href="https://humanizer.aiclub.ai.id/${code}/"`));
    assert.ok(html.includes(I18N[code].heading));
    assert.ok(html.includes(`<h2 id="coverage-title" data-i18n="seoCoverageTitle">${I18N[code].seoCoverageTitle}</h2>`), `${code}: coverage title`);
    if (code !== 'en') assert.notEqual(I18N[code].seoCoverageTitle, I18N.en.seoCoverageTitle, `${code}: coverage title falls back to English`);
    assert.doesNotMatch(html, /(?:100\+|(?:más de|mais de|plus de|über|lebih)\s+100|100\s*多种)/iu, `${code}: unsupported language-count claim`);
    assert.match(I18N[code].seoAnswer2, /(?:experi|expéri|eksper|实验)/iu, `${code}: experimental scope`);
    for (const alternate of codes) assert.ok(html.includes(`hreflang="${alternate}" href="https://humanizer.aiclub.ai.id/${alternate}/"`));
    assert.ok(html.includes('og-image.png'));
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
    const app = graph.find((item) => [item['@type']].flat().includes('SoftwareApplication'));
    assert.equal(app.description, code === 'en' || code === 'id' ? I18N[code].canonicalPosition : I18N[code].description);
    const faq = graph.find((item) => item['@type'] === 'FAQPage');
    for (let i = 0; i < faq.mainEntity.length; i += 1) {
      assert.equal(faq.mainEntity[i].name, I18N[code][`seoQuestion${i}`]);
      assert.equal(faq.mainEntity[i].acceptedAnswer.text, I18N[code][`seoAnswer${i}`]);
    }
  }
  const sitemap = await readFile('.pages-dist/sitemap.xml', 'utf8');
  for (const code of codes) assert.ok(sitemap.includes(`<loc>https://humanizer.aiclub.ai.id/${code}/</loc>`));
  for (const asset of ['llms.txt', 'llms-full.txt']) assert.ok(sitemap.includes(`<loc>https://humanizer.aiclub.ai.id/${asset}</loc>`));
  const png = await readFile('.pages-dist/og-image.png');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});
