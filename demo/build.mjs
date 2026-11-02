import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { I18N } from './i18n.mjs';
import { SEO_FAQ } from './seo-copy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'demo');
const output = path.join(root, '.pages-dist');
const siteUrl = 'https://humanizer.aiclub.ai.id/';

const copy = async (from, to = from) => {
  const destination = path.join(output, to);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(root, from), destination, { recursive: true });
};

function jsonLd(version, language = 'en') {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://humanizer.aiclub.ai.id/#website',
        name: 'Humanizer-Lint',
        alternateName: ['humanizer-lint', 'AICLUB Humanizer Lint'],
        url: siteUrl,
        inLanguage: ['en', 'id', 'es', 'ms', 'fr', 'de', 'pt', 'zh'],
        publisher: { '@id': 'https://humanizer.aiclub.ai.id/#organization' },
      },
      {
        '@type': 'Organization',
        '@id': 'https://humanizer.aiclub.ai.id/#organization',
        name: 'AICLUB.ai.id',
        url: 'https://aiclub.ai.id/',
        logo: { '@type': 'ImageObject', url: 'https://humanizer.aiclub.ai.id/favicon.svg' },
        sameAs: [
          'https://github.com/yanstd888/humanizer-lint',
          'https://www.skills.sh/yanstd888/humanizer-lint/humanizer-lint',
          'https://www.npmjs.com/package/humanizer-lint',
        ],
      },
      {
        '@type': ['SoftwareApplication', 'SoftwareSourceCode'],
        license: 'https://spdx.org/licenses/MIT.html',
        name: 'humanizer-lint',
        description: language === 'en' || language === 'id' ? I18N[language].canonicalPosition : I18N[language].description,
        url: siteUrl,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Cross-platform (Node.js >= 18.3, Web Browser)',
        softwareVersion: version,
        inLanguage: ['en', 'id', 'es', 'ms', 'fr', 'de', 'pt', 'zh'],
        featureList: [
          'Burstiness coefficient of variation (CV)',
          'Adjacent Rhythm Delta',
          'Adaptive MATTR lexical diversity',
          'Deterministic fixed-Huffman DEFLATE ratio',
          'Author voice fingerprinting',
          'Eight multilingual anti-slop rule packs',
          'Experimental Intl.Segmenter rhythm diagnostics for other languages',
        ],
        author: { '@type': 'Person', name: 'Muhammad Dian (yanstd888)', url: 'https://github.com/yanstd888' },
        codeRepository: 'https://github.com/yanstd888/humanizer-lint',
        keywords: ['ai humanizer', 'prose linter', 'anti-slop linter', 'sentence burstiness checker', 'markdown prose linter', 'humanizer bahasa indonesia', 'humanizador de texto IA', 'humaniseur de texte IA', 'KI-Floskeln entfernen', '消除AI写作腔'],
        installUrl: 'https://www.skills.sh/yanstd888/humanizer-lint/humanizer-lint',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: SEO_FAQ[language].map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })),
      },
    ],
  }).replaceAll('<', '\\u003c');
}

function renderTemplate(template, values) {
  return template.replace(/\{\{([A-Za-z0-9]+)\}\}/g, (match, key) => {
    if (typeof values[key] !== 'string') throw new Error(`Missing template value: ${key}`);
    return values[key];
  });
}

function renderIndex(template, version, language = 'en', canonicalPath = '') {
  const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const values = I18N[language];
  let html = renderTemplate(template, { ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, escapeHtml(value)])), jsonLd: jsonLd(version, language) });
  html = html.replace('<html lang="en">', `<html lang="${language}">`);
  html = html.replace(/(<([a-z][a-z0-9]*)\b[^>]*\bdata-i18n="([A-Za-z0-9]+)"[^>]*>)([^<]*)(<\/\2>)/gi,
    (match, open, tag, key, text, close) => typeof values[key] === 'string' ? `${open}${escapeHtml(values[key])}${close}` : match);
  html = html.replace('rel="canonical" href="https://humanizer.aiclub.ai.id/"', `rel="canonical" href="${siteUrl}${canonicalPath}"`);
  html = html.replace('property="og:url" content="https://humanizer.aiclub.ai.id/"', `property="og:url" content="${siteUrl}${canonicalPath}"`);
  return html;
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all([
  copy('demo/app.mjs', 'app.mjs'),
  copy('demo/rules-loader.mjs', 'rules-loader.mjs'),
  copy('demo/i18n.mjs', 'i18n.mjs'),
  copy('demo/seo-copy.mjs', 'seo-copy.mjs'),
  copy('benchmark/fixtures.mjs', 'benchmark/fixtures.mjs'),
  copy('demo/styles.css', 'styles.css'),
  copy('demo/public/404.html', '404.html'),
  copy('demo/public/_headers', '_headers'),
  copy('demo/public/fonts', 'fonts'),
  copy('demo/public/favicon.ico', 'favicon.ico'),
  copy('demo/public/favicon.svg', 'favicon.svg'),
  copy('demo/public/og-image.svg', 'og-image.svg'),
  copy('demo/public/og-image.png', 'og-image.png'),
  copy('demo/public/robots.txt', 'robots.txt'),
  copy('demo/public/sitemap.xml', 'sitemap.xml'),
  copy('demo/public/llms.txt', 'llms.txt'),
  copy('scripts/core', 'scripts/core'),
  copy('scripts/utils/sanitizer.mjs', 'scripts/utils/sanitizer.mjs'),
  copy('scripts/utils/sanitizer-mapped.mjs', 'scripts/utils/sanitizer-mapped.mjs'),
  copy('scripts/utils/tokenizer.mjs', 'scripts/utils/tokenizer.mjs'),
  copy('scripts/utils/metrics-core.mjs', 'scripts/utils/metrics-core.mjs'),
  copy('scripts/utils/domain-linters.mjs', 'scripts/utils/domain-linters.mjs'),
  copy('rules', 'rules'),
  copy('profiles', 'profiles'),
]);

const ruleCodes = ['id', 'en', 'es', 'ms', 'fr', 'de', 'pt', 'zh'];
const [indexTemplate, fullReferenceTemplate, profile, packageJson, ruleEntries] = await Promise.all([
  readFile(path.join(source, 'index.html'), 'utf8'),
  readFile(path.join(source, 'public', 'llms-full.md'), 'utf8'),
  readFile(path.join(root, 'profiles', 'default-human.json'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse),
  Promise.all(ruleCodes.map(async (code) => [code, JSON.parse(await readFile(path.join(root, 'rules', `${code}-slop.json`), 'utf8'))])),
]);
const ruleCatalog = Object.fromEntries(ruleEntries);
await Promise.all([
  writeFile(path.join(output, 'index.html'), renderIndex(indexTemplate, packageJson.version), 'utf8'),
  writeFile(path.join(output, 'llms-full.txt'), renderTemplate(fullReferenceTemplate, {
    ruleCatalog: JSON.stringify(ruleCatalog, null, 2),
    defaultProfile: JSON.stringify(JSON.parse(profile), null, 2),
  }), 'utf8'),
]);

for (const language of ruleCodes) {
  const directory = path.join(output, language);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'index.html'), renderIndex(indexTemplate, packageJson.version, language, `${language}/`), 'utf8');
}

for (const name of ['analyzer-browser.mjs', 'presentation.mjs', 'samples.mjs']) {
  const browserModule = await readFile(path.join(source, name), 'utf8');
  await writeFile(path.join(output, name), browserModule.replace("const projectRoot = '..';", "const projectRoot = '.';"), 'utf8');
}

console.log(`Built ${output}`);
